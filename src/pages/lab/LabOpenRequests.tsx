import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import LabLayout from "@/components/lab/LabLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useLabPermissions } from "@/hooks/useLabPermissions";
import { format } from "date-fns";
import { 
  Eye, Check, X, Edit, Lock, Package, CreditCard, 
  FlaskConical, FileText, Upload, ChevronRight, RefreshCw 
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface QuoteItem {
  id: string;
  product_id: string;
  price: number | null;
  client: string | null;
  sample: string | null;
  manufacturer: string | null;
  batch: string | null;
  additional_samples: number | null;
  additional_report_headers: number | null;
  status: string | null;
  test_results: string | null;
  report_url: string | null;
  products?: { name: string; category: string | null };
}

interface Quote {
  id: string;
  quote_number: string | null;
  lab_quote_number: string | null;
  status: string;
  created_at: string;
  notes: string | null;
  discount_amount: number | null;
  discount_type: string | null;
  lab_response: string | null;
  payment_status: string | null;
  payment_amount_usd: number | null;
  payment_date: string | null;
  tracking_number: string | null;
  shipped_date: string | null;
}

const STATUS_ORDER = [
  "sent_to_vendor",
  "awaiting_customer_approval",
  "approved_payment_pending",
  "paid_awaiting_shipping",
  "in_transit",
  "delivered",
  "testing_in_progress",
];

const STATUS_LABELS: Record<string, string> = {
  sent_to_vendor: "Pending Review",
  awaiting_customer_approval: "Awaiting Customer",
  approved_payment_pending: "Awaiting Payment",
  paid_awaiting_shipping: "Paid - Awaiting Shipment",
  in_transit: "In Transit",
  delivered: "Delivered",
  testing_in_progress: "Testing In Progress",
};

const STATUS_COLORS: Record<string, string> = {
  sent_to_vendor: "bg-yellow-500",
  awaiting_customer_approval: "bg-orange-500",
  approved_payment_pending: "bg-blue-500",
  paid_awaiting_shipping: "bg-emerald-500",
  in_transit: "bg-purple-500",
  delivered: "bg-cyan-500",
  testing_in_progress: "bg-pink-500",
};

export default function LabOpenRequests() {
  const navigate = useNavigate();
  const { labUser } = useLabUser();
  const { impersonatedUser, isImpersonatingLab } = useImpersonation();
  const permissions = useLabPermissions();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedQuoteItems, setSelectedQuoteItems] = useState<QuoteItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState("");
  const [modifiedDiscount, setModifiedDiscount] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const effectiveLabId = (isImpersonatingLab ? impersonatedUser?.labId : null) || labUser?.lab_id;

  const fetchQuotes = useCallback(async () => {
    if (!effectiveLabId) return;
    
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("lab_id", effectiveLabId)
        .not("status", "in", '("completed","rejected","draft")')
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [effectiveLabId]);

  const fetchQuoteItems = async (quoteId: string) => {
    setItemsLoading(true);
    try {
      const { data, error } = await supabase
        .from("quote_items")
        .select("*, products(name, category)")
        .eq("quote_id", quoteId);

      if (error) throw error;
      setSelectedQuoteItems(data || []);
    } catch (error) {
      console.error("Error fetching quote items:", error);
      setSelectedQuoteItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    if (!effectiveLabId) return;

    fetchQuotes();

    const channel = supabase
      .channel("lab-open-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quotes",
          filter: `lab_id=eq.${effectiveLabId}`,
        },
        () => fetchQuotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveLabId, fetchQuotes]);

  const openQuoteDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    setDialogOpen(true);
    fetchQuoteItems(quote.id);
    setResponseNotes("");
    setModifiedDiscount("");
  };

  const handleApprove = async (quote: Quote, withChanges: boolean = false) => {
    try {
      const updates: Record<string, unknown> = {
        lab_response: responseNotes || null,
      };

      if (withChanges) {
        updates.status = "awaiting_customer_approval";
        if (modifiedDiscount) {
          updates.discount_amount = parseFloat(modifiedDiscount);
          updates.discount_type = "percentage";
        }
      } else {
        updates.status = "approved_payment_pending";
      }

      const { error } = await supabase
        .from("quotes")
        .update(updates)
        .eq("id", quote.id);

      if (error) throw error;

      await supabase.from("quote_activity_log").insert({
        quote_id: quote.id,
        activity_type: withChanges ? "lab_modified" : "lab_approved",
        description: withChanges
          ? "Lab approved quote with modifications"
          : "Lab approved quote",
        metadata: { notes: responseNotes, discount: modifiedDiscount },
      });

      toast.success(
        withChanges
          ? "Quote approved with changes"
          : "Quote approved successfully"
      );
      setDialogOpen(false);
    } catch (error) {
      console.error("Error approving quote:", error);
      toast.error("Failed to approve quote");
    }
  };

  const handleReject = async (quote: Quote) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({
          status: "rejected",
          lab_response: responseNotes || "Quote rejected by lab",
        })
        .eq("id", quote.id);

      if (error) throw error;

      await supabase.from("quote_activity_log").insert({
        quote_id: quote.id,
        activity_type: "lab_rejected",
        description: "Lab rejected quote",
        metadata: { notes: responseNotes },
      });

      toast.success("Quote rejected");
      setDialogOpen(false);
    } catch (error) {
      console.error("Error rejecting quote:", error);
      toast.error("Failed to reject quote");
    }
  };

  const handleMarkTestingComplete = async (quote: Quote) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "completed" })
        .eq("id", quote.id);

      if (error) throw error;

      await supabase.from("quote_activity_log").insert({
        quote_id: quote.id,
        activity_type: "testing_completed",
        description: "Lab marked testing as complete",
      });

      toast.success("Testing marked as complete");
      setDialogOpen(false);
    } catch (error) {
      console.error("Error completing testing:", error);
      toast.error("Failed to complete testing");
    }
  };

  const handleStartTesting = async (quote: Quote) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "testing_in_progress" })
        .eq("id", quote.id);

      if (error) throw error;

      await supabase.from("quote_activity_log").insert({
        quote_id: quote.id,
        activity_type: "testing_started",
        description: "Lab started testing",
      });

      toast.success("Testing started");
      fetchQuotes();
    } catch (error) {
      console.error("Error starting testing:", error);
      toast.error("Failed to start testing");
    }
  };

  const getFilteredQuotes = () => {
    if (activeTab === "all") return quotes;
    return quotes.filter(q => q.status === activeTab);
  };

  const getStatusCounts = () => {
    const counts: Record<string, number> = { all: quotes.length };
    quotes.forEach(q => {
      counts[q.status] = (counts[q.status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();
  const filteredQuotes = getFilteredQuotes();

  const getNextAction = (quote: Quote) => {
    switch (quote.status) {
      case "sent_to_vendor":
        return permissions.canApproveQuotes ? "Review & Approve" : "View";
      case "delivered":
        return permissions.canSubmitResults ? "Start Testing" : "View";
      case "testing_in_progress":
        return permissions.canSubmitResults ? "Submit Results" : "View";
      default:
        return "View Details";
    }
  };

  const getNextActionIcon = (status: string) => {
    switch (status) {
      case "sent_to_vendor":
        return FileText;
      case "delivered":
        return FlaskConical;
      case "testing_in_progress":
        return Upload;
      default:
        return Eye;
    }
  };

  return (
    <LabLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Open Requests</h1>
            <p className="text-muted-foreground mt-1">
              Manage active testing requests through their lifecycle
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchQuotes}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {permissions.isReadOnly && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You have read-only access. Contact a lab manager or admin to take actions on requests.
            </AlertDescription>
          </Alert>
        )}

        {/* Status Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="ml-1">{statusCounts.all || 0}</Badge>
            </TabsTrigger>
            {STATUS_ORDER.map(status => (
              statusCounts[status] ? (
                <TabsTrigger key={status} value={status} className="gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
                  {STATUS_LABELS[status]}
                  <Badge variant="secondary" className="ml-1">{statusCounts[status]}</Badge>
                </TabsTrigger>
              ) : null
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredQuotes.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No requests in this status</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuotes.map((quote) => {
                        const ActionIcon = getNextActionIcon(quote.status);
                        return (
                          <TableRow 
                            key={quote.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openQuoteDialog(quote)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {quote.quote_number || quote.lab_quote_number || "Pending"}
                                </p>
                                {quote.notes && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {quote.notes}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                className="gap-1.5"
                              >
                                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[quote.status] || "bg-gray-500"}`} />
                                {STATUS_LABELS[quote.status] || quote.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(quote.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              {quote.payment_amount_usd 
                                ? `$${quote.payment_amount_usd.toFixed(2)}` 
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" className="gap-1">
                                <ActionIcon className="h-4 w-4" />
                                {getNextAction(quote)}
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Request Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Request Details
                {selectedQuote && (
                  <Badge variant="outline" className="gap-1.5 ml-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[selectedQuote.status] || "bg-gray-500"}`} />
                    {STATUS_LABELS[selectedQuote.status] || selectedQuote.status}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedQuote?.quote_number || selectedQuote?.lab_quote_number || "Quote details"}
              </DialogDescription>
            </DialogHeader>

            {selectedQuote && (
              <div className="space-y-6">
                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">{format(new Date(selectedQuote.created_at), "MMM d, yyyy")}</p>
                  </div>
                  {selectedQuote.payment_status && (
                    <div>
                      <p className="text-xs text-muted-foreground">Payment</p>
                      <p className="text-sm font-medium capitalize">{selectedQuote.payment_status}</p>
                    </div>
                  )}
                  {selectedQuote.payment_amount_usd && (
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="text-sm font-medium">${selectedQuote.payment_amount_usd.toFixed(2)}</p>
                    </div>
                  )}
                  {selectedQuote.tracking_number && (
                    <div>
                      <p className="text-xs text-muted-foreground">Tracking</p>
                      <p className="text-sm font-medium">{selectedQuote.tracking_number}</p>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Test Items ({selectedQuoteItems.length})</Label>
                  {itemsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : selectedQuoteItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No items found</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedQuoteItems.map((item, index) => (
                        <div key={item.id} className="border rounded-lg p-4 bg-muted/30">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{item.products?.name || "Unknown Compound"}</h4>
                              {item.products?.category && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {item.products.category}
                                </Badge>
                              )}
                            </div>
                            <span className="text-lg font-semibold">
                              {item.price ? `$${item.price.toFixed(2)}` : "-"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Client</p>
                              <p className="font-medium">{item.client || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Sample</p>
                              <p className="font-medium">{item.sample || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Manufacturer</p>
                              <p className="font-medium">{item.manufacturer || "-"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Batch</p>
                              <p className="font-medium">{item.batch || "-"}</p>
                            </div>
                          </div>
                          {(item.additional_samples || item.additional_report_headers) && (
                            <div className="mt-3 pt-3 border-t flex gap-4 text-sm">
                              {item.additional_samples ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">+{item.additional_samples} variance samples</Badge>
                                </div>
                              ) : null}
                              {item.additional_report_headers ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">+{item.additional_report_headers} report headers</Badge>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Total Section */}
                      <div className="flex justify-end pt-2 border-t">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-xl font-bold">
                            ${selectedQuoteItems.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {selectedQuote.notes && (
                  <div>
                    <Label className="text-sm font-medium">Customer Notes</Label>
                    <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded-md">
                      {selectedQuote.notes}
                    </p>
                  </div>
                )}

                {/* Action Forms based on status */}
                {selectedQuote.status === "sent_to_vendor" && permissions.canApproveQuotes && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Review Quote</h4>
                    <div>
                      <Label>Response Notes</Label>
                      <Textarea
                        placeholder="Add notes for the customer..."
                        value={responseNotes}
                        onChange={(e) => setResponseNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Modified Discount (%)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={modifiedDiscount}
                        onChange={(e) => setModifiedDiscount(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {selectedQuote.status === "delivered" && permissions.canSubmitResults && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Package has been delivered. Ready to begin testing?
                    </p>
                  </div>
                )}

                {/* Read-only message for members */}
                {permissions.isReadOnly && (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      You have read-only access. Contact a manager or admin to take actions.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {selectedQuote && !permissions.isReadOnly && (
              <DialogFooter className="flex flex-wrap gap-2">
                {selectedQuote.status === "sent_to_vendor" && permissions.canApproveQuotes && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(selectedQuote)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleApprove(selectedQuote, true)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Approve with Changes
                    </Button>
                    <Button onClick={() => handleApprove(selectedQuote, false)}>
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </>
                )}

                {selectedQuote.status === "delivered" && permissions.canSubmitResults && (
                  <Button onClick={() => handleStartTesting(selectedQuote)}>
                    <FlaskConical className="h-4 w-4 mr-1" />
                    Start Testing
                  </Button>
                )}

                {selectedQuote.status === "testing_in_progress" && permissions.canSubmitResults && (
                  <Button onClick={() => {
                    setDialogOpen(false);
                    navigate("/lab/results");
                  }}>
                    <Upload className="h-4 w-4 mr-1" />
                    Submit Results
                  </Button>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LabLayout>
  );
}