import { useEffect, useState } from "react";
import LabLayout from "@/components/lab/LabLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useLabPermissions } from "@/hooks/useLabPermissions";
import { format } from "date-fns";
import { Eye, Check, X, Edit, Lock } from "lucide-react";
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

interface Quote {
  id: string;
  quote_number: string | null;
  status: string;
  created_at: string;
  notes: string | null;
  discount_amount: number | null;
  discount_type: string | null;
}

export default function LabQuotes() {
  const { labUser } = useLabUser();
  const { impersonatedUser, isImpersonatingLab } = useImpersonation();
  const permissions = useLabPermissions();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState("");
  const [modifiedDiscount, setModifiedDiscount] = useState("");

  // Use impersonated lab ID if available, otherwise use the lab user's lab ID
  const effectiveLabId = (isImpersonatingLab ? impersonatedUser?.labId : null) || labUser?.lab_id;

  useEffect(() => {
    if (!effectiveLabId) return;

    const fetchQuotes = async () => {
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

    fetchQuotes();

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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveLabId]);

  const handleApprove = async (quote: Quote, withChanges: boolean = false) => {
    try {
      const updates: any = {
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

      // Log activity
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
                    <TableRow key={quote.id}>
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
                            onClick={() => {
                              setSelectedQuote(quote);
                              setDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {permissions.canApproveQuotes ? "Review" : "View"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{permissions.canApproveQuotes ? "Review Quote Request" : "View Quote Request"}</DialogTitle>
              <DialogDescription>
                {permissions.canApproveQuotes 
                  ? "Review and respond to this quote request"
                  : "View quote details (read-only access)"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {permissions.canApproveQuotes ? (
                <>
                  <div>
                    <Label>Response Notes</Label>
                    <Textarea
                      placeholder="Add notes for the customer..."
                      value={responseNotes}
                      onChange={(e) => setResponseNotes(e.target.value)}
                      rows={4}
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
              ) : (
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    You have read-only access. Contact a lab manager or admin to approve or reject quotes.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            {permissions.canApproveQuotes && (
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
                  variant="outline"
                  onClick={() => selectedQuote && handleApprove(selectedQuote, true)}
                  disabled={!permissions.canModifyQuotePricing}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Approve with Changes
                </Button>
                <Button
                  onClick={() => selectedQuote && handleApprove(selectedQuote, false)}
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
