import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface QuoteApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  quoteItems: any[];
  onApprove: () => void;
  onReject: () => void;
}

export const QuoteApprovalDialog = ({
  open,
  onOpenChange,
  quote,
  quoteItems,
  onApprove,
  onReject,
}: QuoteApprovalDialogProps) => {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState("");

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/confirm-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          quoteId: quote.id,
          action: 'customer_approve',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve changes');
      }

      toast({
        title: "Changes Approved",
        description: "The vendor's changes have been approved.",
      });
      onApprove();
      onOpenChange(false);
    } catch (error) {
      console.error('Error approving changes:', error);
      toast({
        title: "Error",
        description: "Failed to approve changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionNotes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide notes explaining what needs modification.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/confirm-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          quoteId: quote.id,
          action: 'customer_reject',
          notes: rejectionNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject changes');
      }

      toast({
        title: "Changes Rejected",
        description: "The vendor's changes have been rejected. Quote has been closed.",
      });
      onReject();
      onOpenChange(false);
    } catch (error) {
      console.error('Error rejecting changes:', error);
      toast({
        title: "Error",
        description: "Failed to reject changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const calculateTotal = () => {
    const subtotal = quoteItems.reduce((sum, item) => {
      const basePrice = parseFloat(item.price || "0");
      const additionalSamples = item.additional_samples || 0;
      const additionalHeaders = item.additional_report_headers || 0;
      
      let itemTotal = basePrice;
      
      if (additionalSamples > 0) {
        const productName = item.products?.name || "";
        if (["Tirzepatide", "Semaglutide", "Retatrutide"].includes(productName)) {
          itemTotal += additionalSamples * 60;
        }
      }
      
      if (additionalHeaders > 0) {
        itemTotal += additionalHeaders * 30;
      }
      
      return sum + itemTotal;
    }, 0);

    let discount = 0;
    if (quote.discount_amount) {
      if (quote.discount_type === "percentage") {
        discount = (subtotal * quote.discount_amount) / 100;
      } else {
        discount = quote.discount_amount;
      }
    }

    return {
      subtotal,
      discount,
      total: subtotal - discount
    };
  };

  const totals = calculateTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vendor Updated Quote</DialogTitle>
          <DialogDescription>
            The vendor has made changes to the quote. Please review and approve or reject the changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Vendor Changes Summary:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Updated pricing for {quoteItems.length} item{quoteItems.length !== 1 ? 's' : ''}</li>
                {quote.discount_amount && (
                  <li>Applied {quote.discount_type === "percentage" ? `${quote.discount_amount}%` : `$${quote.discount_amount}`} discount</li>
                )}
                <li>Final total: ${totals.total.toFixed(2)}</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm">
            <p><strong>Lab:</strong> {quote.labs?.name}</p>
            <p><strong>Lab Quote Number:</strong> {quote.lab_quote_number || "Not provided"}</p>
            {quote.lab_response && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="font-semibold mb-1">Vendor Message:</p>
                <p className="whitespace-pre-wrap">{quote.lab_response}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="font-medium">Updated Quote Items:</p>
            {quoteItems.map((item, index) => {
              const productName = item.products?.name || "";
              const qualifiesForAdditionalSamplePricing = 
                ["Tirzepatide", "Semaglutide", "Retatrutide"].includes(productName);

              let itemTotal = parseFloat(item.price || "0");
              if ((item.additional_samples || 0) > 0 && qualifiesForAdditionalSamplePricing) {
                itemTotal += (item.additional_samples || 0) * 60;
              }
              if ((item.additional_report_headers || 0) > 0) {
                itemTotal += (item.additional_report_headers || 0) * 30;
              }

              return (
                <Card key={item.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="font-semibold">
                      {index + 1}. {productName}
                    </div>
                    <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                      <div><strong>Client:</strong> {item.client || "—"}</div>
                      <div><strong>Sample:</strong> {item.sample || "—"}</div>
                      <div><strong>Manufacturer:</strong> {item.manufacturer || "—"}</div>
                      <div><strong>Batch:</strong> {item.batch || "—"}</div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Base Price:</span>
                      <span className="font-semibold">${parseFloat(item.price || "0").toFixed(2)}</span>
                    </div>
                    {(item.additional_samples || 0) > 0 && qualifiesForAdditionalSamplePricing && (
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Additional Samples ({item.additional_samples} × $60):</span>
                        <span>${((item.additional_samples || 0) * 60).toFixed(2)}</span>
                      </div>
                    )}
                    {(item.additional_report_headers || 0) > 0 && (
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Additional Headers ({item.additional_report_headers} × $30):</span>
                        <span>${((item.additional_report_headers || 0) * 30).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-semibold pt-2 border-t">
                      <span>Item Total:</span>
                      <span>${itemTotal.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Discount ({quote.discount_type === "percentage" ? `${quote.discount_amount}%` : `$${quote.discount_amount}`}):</span>
                <span>-${totals.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
          </div>

          {!showRejectForm ? (
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setShowRejectForm(true)}
                disabled={processing}
                variant="destructive"
                className="flex-1"
              >
                Reject Changes
              </Button>
              <Button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1"
              >
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve Changes
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="rejection-notes">Rejection Notes *</Label>
                <Textarea
                  id="rejection-notes"
                  placeholder="Explain what needs to be modified..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionNotes("");
                  }}
                  disabled={processing}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={processing || !rejectionNotes.trim()}
                  variant="destructive"
                  className="flex-1"
                >
                  {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Rejection
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
