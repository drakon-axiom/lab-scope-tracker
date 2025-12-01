import { useEffect, useState } from "react";
import LabLayout from "@/components/lab/LabLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { format } from "date-fns";
import { CheckCircle2, AlertCircle } from "lucide-react";
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

interface Quote {
  id: string;
  quote_number: string | null;
  payment_status: string | null;
  payment_amount_usd: number | null;
  payment_amount_crypto: string | null;
  payment_date: string | null;
  transaction_id: string | null;
}

export default function LabPayments() {
  const { labUser } = useLabUser();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!labUser?.lab_id) return;

    const fetchPayments = async () => {
      try {
        const { data, error } = await supabase
          .from("quotes")
          .select("id, quote_number, payment_status, payment_amount_usd, payment_amount_crypto, payment_date, transaction_id")
          .eq("lab_id", labUser.lab_id)
          .eq("status", "approved_payment_pending")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setQuotes(data || []);
      } catch (error) {
        console.error("Error fetching payments:", error);
        toast.error("Failed to load payments");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [labUser?.lab_id]);

  const handleMarkReceived = async (quote: Quote) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({
          payment_status: "received",
          lab_response: notes || "Payment received",
        })
        .eq("id", quote.id);

      if (error) throw error;

      await supabase.from("quote_activity_log").insert({
        quote_id: quote.id,
        activity_type: "payment_confirmed",
        description: "Lab confirmed payment received",
        metadata: { notes },
      });

      toast.success("Payment marked as received");
      setDialogOpen(false);
      setSelectedQuote(null);
      setNotes("");
    } catch (error) {
      console.error("Error marking payment:", error);
      toast.error("Failed to update payment status");
    }
  };

  const handleRequestClarification = async (quote: Quote) => {
    try {
      await supabase.from("quote_activity_log").insert({
        quote_id: quote.id,
        activity_type: "payment_clarification_needed",
        description: "Lab requested payment clarification",
        metadata: { notes },
      });

      toast.success("Clarification request sent");
      setDialogOpen(false);
      setSelectedQuote(null);
      setNotes("");
    } catch (error) {
      console.error("Error requesting clarification:", error);
      toast.error("Failed to send clarification request");
    }
  };

  return (
    <LabLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Review reported payments from customers
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Amount (USD)</TableHead>
                  <TableHead>Crypto Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No pending payments
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {quote.quote_number || "N/A"}
                      </TableCell>
                      <TableCell>
                        ${quote.payment_amount_usd?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell>{quote.payment_amount_crypto || "-"}</TableCell>
                      <TableCell>
                        {quote.payment_date
                          ? format(new Date(quote.payment_date), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {quote.transaction_id || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{quote.payment_status || "pending"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedQuote(quote);
                            setDialogOpen(true);
                          }}
                        >
                          Review
                        </Button>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Payment</DialogTitle>
              <DialogDescription>
                Confirm receipt or request clarification
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add notes about this payment..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => selectedQuote && handleRequestClarification(selectedQuote)}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Request Clarification
              </Button>
              <Button
                onClick={() => selectedQuote && handleMarkReceived(selectedQuote)}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark as Received
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LabLayout>
  );
}
