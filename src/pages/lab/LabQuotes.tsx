import { useEffect, useState, memo, useCallback } from "react";
import LabLayout from "@/components/lab/LabLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useLabPermissions } from "@/hooks/useLabPermissions";
import { usePrefetchQuoteItems } from "@/hooks/useQuoteItems";
import { format } from "date-fns";
import { Eye, Check, X, Lock, ChevronLeft, ChevronRight } from "lucide-react";
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
}

// Memoized pending quote row component
const PendingQuoteRow = memo(({ 
  quote, 
  permissions, 
  onOpen,
  onHover
}: { 
  quote: Quote; 
  permissions: { canApproveQuotes: boolean }; 
  onOpen: (quote: Quote) => void;
  onHover: (quoteId: string) => void;
}) => (
  <TableRow key={quote.id} onMouseEnter={() => onHover(quote.id)}>
    <TableCell className="font-medium">
      {quote.quote_number || "Pending"}
    </TableCell>
    <TableCell>
      {format(new Date(quote.created_at), "MMM d, yyyy")}
    </TableCell>
    <TableCell>
      <Badge variant="outline">{quote.status}</Badge>
    </TableCell>
    <TableCell className="max-w-xs truncate">
      {quote.notes || "-"}
    </TableCell>
    <TableCell className="text-right">
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpen(quote)}
        >
          <Eye className="h-4 w-4 mr-1" />
          {permissions.canApproveQuotes ? "Review" : "View"}
        </Button>
      </div>
    </TableCell>
  </TableRow>
));
PendingQuoteRow.displayName = "PendingQuoteRow";

// Memoized historical quote row component
const HistoricalQuoteRow = memo(({ 
  quote, 
  onOpen,
  onHover
}: { 
  quote: Quote; 
  onOpen: (quote: Quote) => void;
  onHover: (quoteId: string) => void;
}) => (
  <TableRow key={quote.id} onMouseEnter={() => onHover(quote.id)}>
    <TableCell className="font-medium">
      {quote.quote_number || "N/A"}
    </TableCell>
    <TableCell>
      {format(new Date(quote.created_at), "MMM d, yyyy")}
    </TableCell>
    <TableCell>
      <Badge 
        variant={quote.status === "completed" ? "default" : "destructive"}
      >
        {quote.status}
      </Badge>
    </TableCell>
    <TableCell className="max-w-xs truncate">
      {quote.notes || "-"}
    </TableCell>
    <TableCell className="text-right">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onOpen(quote)}
      >
        <Eye className="h-4 w-4 mr-1" />
        View
      </Button>
    </TableCell>
  </TableRow>
));
HistoricalQuoteRow.displayName = "HistoricalQuoteRow";

export default function LabQuotes() {
  const { labUser } = useLabUser();
  const { impersonatedUser, isImpersonatingLab } = useImpersonation();
  const permissions = useLabPermissions();
  const prefetchQuoteItems = usePrefetchQuoteItems();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [historicalQuotes, setHistoricalQuotes] = useState<Quote[]>([]);
  const [historicalTotalCount, setHistoricalTotalCount] = useState(0);
  const [historicalPage, setHistoricalPage] = useState(0);
  const HISTORICAL_PAGE_SIZE = 10;
  const [loading, setLoading] = useState(true);
  const [historicalLoading, setHistoricalLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedQuoteItems, setSelectedQuoteItems] = useState<QuoteItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState("");
  const [modifiedDiscount, setModifiedDiscount] = useState("");

  const handleQuoteHover = useCallback((quoteId: string) => {
    prefetchQuoteItems(quoteId);
  }, [prefetchQuoteItems]);

  // Use impersonated lab ID if available, otherwise use the lab user's lab ID
  const effectiveLabId = (isImpersonatingLab ? impersonatedUser?.labId : null) || labUser?.lab_id;

  const fetchQuotes = async () => {
    if (!effectiveLabId) return;
    
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("lab_id", effectiveLabId)
        .in("status", ["sent_to_vendor", "awaiting_customer_approval"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast.error("Failed to load quotes");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalQuotes = async (page: number = 0) => {
    if (!effectiveLabId) return;
    
    setHistoricalLoading(true);
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .eq("lab_id", effectiveLabId)
        .in("status", ["completed", "rejected"]);

      if (countError) throw countError;
      setHistoricalTotalCount(count || 0);

      // Get paginated data
      const from = page * HISTORICAL_PAGE_SIZE;
      const to = from + HISTORICAL_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("lab_id", effectiveLabId)
        .in("status", ["completed", "rejected"])
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setHistoricalQuotes(data || []);
    } catch (error) {
      console.error("Error fetching historical quotes:", error);
    } finally {
      setHistoricalLoading(false);
    }
  };

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

  const openQuoteDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    setDialogOpen(true);
    fetchQuoteItems(quote.id);
  };

  useEffect(() => {
    fetchHistoricalQuotes(historicalPage);
  }, [historicalPage]);

  useEffect(() => {
    if (!effectiveLabId) return;

    fetchQuotes();
    fetchHistoricalQuotes(historicalPage);

    // Set up realtime subscription
    const channel = supabase
      .channel("lab-quotes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quotes",
          filter: `lab_id=eq.${effectiveLabId}`,
        },
        () => {
          fetchQuotes();
          fetchHistoricalQuotes(historicalPage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveLabId]);

  const handleApprove = async (quote: Quote) => {
    try {
      // Check if actual changes were made
      const hasDiscountChange = modifiedDiscount && parseFloat(modifiedDiscount) > 0;
      const hasActualChanges = hasDiscountChange;

      const updates: any = {
        lab_response: responseNotes || null,
      };

      if (hasActualChanges) {
        updates.status = "awaiting_customer_approval";
        if (hasDiscountChange) {
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

      // Log activity
      await supabase.from("quote_activity_log").insert({
        quote_id: quote.id,
        activity_type: hasActualChanges ? "lab_modified" : "lab_approved",
        description: hasActualChanges
          ? "Lab approved quote with modifications"
          : "Lab approved quote",
        metadata: { notes: responseNotes, discount: modifiedDiscount },
      });

      toast.success(
        hasActualChanges
          ? "Quote approved with changes. Waiting for customer approval."
          : "Quote approved successfully"
      );
      setDialogOpen(false);
      setSelectedQuote(null);
      setResponseNotes("");
      setModifiedDiscount("");
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
      setSelectedQuote(null);
      setResponseNotes("");
    } catch (error) {
      console.error("Error rejecting quote:", error);
      toast.error("Failed to reject quote");
    }
  };

  return (
    <LabLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quote Requests</h1>
          <p className="text-muted-foreground mt-1">
            Review and respond to testing requests
          </p>
        </div>

        {permissions.isReadOnly && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You have read-only access. Contact a lab admin to approve or reject quotes.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pending Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No pending quotes
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => (
                    <PendingQuoteRow
                      key={quote.id}
                      quote={quote}
                      permissions={permissions}
                      onOpen={openQuoteDialog}
                      onHover={handleQuoteHover}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Historical Quotes */}
        <Card>
          <CardHeader>
            <CardTitle>Historical Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicalLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : historicalQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No historical quotes
                    </TableCell>
                  </TableRow>
                ) : (
                  historicalQuotes.map((quote) => (
                    <HistoricalQuoteRow
                      key={quote.id}
                      quote={quote}
                      onOpen={openQuoteDialog}
                      onHover={handleQuoteHover}
                    />
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {historicalTotalCount > HISTORICAL_PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {historicalPage * HISTORICAL_PAGE_SIZE + 1} - {Math.min((historicalPage + 1) * HISTORICAL_PAGE_SIZE, historicalTotalCount)} of {historicalTotalCount}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoricalPage(p => p - 1)}
                    disabled={historicalPage === 0 || historicalLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoricalPage(p => p + 1)}
                    disabled={(historicalPage + 1) * HISTORICAL_PAGE_SIZE >= historicalTotalCount || historicalLoading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedQuote?.status === "completed" || selectedQuote?.status === "rejected" 
                  ? "Quote Details" 
                  : permissions.canApproveQuotes ? "Review Quote Request" : "View Quote Request"}
              </DialogTitle>
              <DialogDescription>
                {selectedQuote?.quote_number || selectedQuote?.lab_quote_number 
                  ? `Quote #${selectedQuote?.quote_number || selectedQuote?.lab_quote_number}`
                  : "Quote details"}
              </DialogDescription>
            </DialogHeader>
            
            {selectedQuote && (
              <div className="space-y-4">
                {/* Quote Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge 
                      variant={selectedQuote.status === "completed" ? "default" : selectedQuote.status === "rejected" ? "destructive" : "outline"}
                    >
                      {selectedQuote.status}
                    </Badge>
                  </div>
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
                </div>

                {/* Quote Items */}
                <div>
                  <Label className="text-sm font-medium">Items</Label>
                  {itemsLoading ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Loading items...</p>
                  ) : selectedQuoteItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No items found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Compound</TableHead>
                          <TableHead>Sample</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedQuoteItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.products?.name || "Unknown"}
                            </TableCell>
                            <TableCell>{item.sample || "-"}</TableCell>
                            <TableCell>{item.client || "-"}</TableCell>
                            <TableCell className="text-right">
                              {item.price ? `$${item.price.toFixed(2)}` : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

                {/* Lab Response (for historical) */}
                {selectedQuote.lab_response && (
                  <div>
                    <Label className="text-sm font-medium">Lab Response</Label>
                    <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded-md">
                      {selectedQuote.lab_response}
                    </p>
                  </div>
                )}

                {/* Action controls for pending quotes */}
                {selectedQuote.status !== "completed" && selectedQuote.status !== "rejected" && permissions.canApproveQuotes && (
                  <>
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
                      <p className="text-sm text-muted-foreground mt-1">
                        Optional: Offer a discount or modify pricing
                      </p>
                    </div>
                  </>
                )}

                {/* Read-only alert for members */}
                {selectedQuote.status !== "completed" && selectedQuote.status !== "rejected" && !permissions.canApproveQuotes && (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      You have read-only access. Contact a lab manager or admin to approve or reject quotes.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            {/* Action buttons for pending quotes */}
            {selectedQuote && selectedQuote.status !== "completed" && selectedQuote.status !== "rejected" && permissions.canApproveQuotes && (
              <DialogFooter className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => selectedQuote && handleReject(selectedQuote)}
                  disabled={!permissions.canRejectQuotes}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  onClick={() => selectedQuote && handleApprove(selectedQuote)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LabLayout>
  );
}
