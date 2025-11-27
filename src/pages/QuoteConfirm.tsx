import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";

const QuoteConfirm = () => {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [labResponse, setLabResponse] = useState("");

  useEffect(() => {
    const fetchQuote = async () => {
      if (!quoteId) return;

      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          labs (name, contact_email)
        `)
        .eq("id", quoteId)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Quote not found or invalid link.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setQuote(data);
      if (data.status === "approved") {
        setConfirmed(true);
      }
      setLoading(false);
    };

    fetchQuote();
  }, [quoteId, toast]);

  const handleConfirm = async () => {
    if (!quoteId) return;

    setConfirming(true);

    const { error } = await supabase
      .from("quotes")
      .update({
        status: "approved",
        quote_number: quoteNumber || null,
        lab_response: labResponse,
      })
      .eq("id", quoteId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to confirm quote. Please try again.",
        variant: "destructive",
      });
      setConfirming(false);
      return;
    }

    toast({
      title: "Quote Confirmed",
      description: "The quote has been approved successfully.",
    });
    setConfirmed(true);
    setConfirming(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This quote confirmation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-6 w-6" />
              <CardTitle>Quote Confirmed</CardTitle>
            </div>
            <CardDescription>
              Thank you for confirming the quote. The customer has been notified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Quote Number:</strong> {quote.quote_number || "Not assigned"}</p>
              <p><strong>Lab:</strong> {quote.labs.name}</p>
              <p><strong>Status:</strong> Approved</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Confirm Quote</CardTitle>
          <CardDescription>
            Review and confirm the quote details below. You can also provide payment information or additional notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 text-sm">
            <p><strong>Lab:</strong> {quote.labs.name}</p>
            <p><strong>Current Status:</strong> {quote.status.replace(/_/g, ' ')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote-number" className="text-sm font-medium">
              Quote Number
            </Label>
            <Input
              id="quote-number"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              placeholder="Enter your quote number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lab-response" className="text-sm font-medium">
              Message to Customer (Optional)
            </Label>
            <p className="text-sm text-muted-foreground">
              Provide payment information, updated pricing, or any other details the customer needs to know.
            </p>
            <Textarea
              id="lab-response"
              value={labResponse}
              onChange={(e) => setLabResponse(e.target.value)}
              placeholder="e.g., Payment information: Wire transfer to account #123456. Updated quote total: $500. Expected turnaround: 5-7 business days."
              rows={6}
            />
          </div>

          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full"
          >
            {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Quote
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteConfirm;
