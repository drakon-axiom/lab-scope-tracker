import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const QuotePayment = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    payment_status: "paid_usd",
    payment_amount_usd: "",
    payment_amount_crypto: "",
    payment_date: new Date().toISOString().split("T")[0],
    transaction_id: "",
  });

  useEffect(() => {
    if (quoteId) fetchQuote();
  }, [quoteId]);

  const fetchQuote = async () => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, labs(name)")
        .eq("id", quoteId)
        .single();

      if (error) throw error;
      setQuote(data);

      // Pre-fill amount if available
      if (data.payment_amount_usd) {
        setFormData((prev) => ({
          ...prev,
          payment_amount_usd: data.payment_amount_usd.toString(),
        }));
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/quotes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload: any = {
        payment_status: formData.payment_status,
        payment_date: formData.payment_date || null,
        status: "paid_awaiting_shipping",
      };

      if (formData.payment_amount_usd) {
        payload.payment_amount_usd = parseFloat(formData.payment_amount_usd);
      }

      if (formData.payment_status === "paid_crypto") {
        payload.payment_amount_crypto = formData.payment_amount_crypto || null;
        payload.transaction_id = formData.transaction_id || null;
      }

      const { error } = await supabase
        .from("quotes")
        .update(payload)
        .eq("id", quoteId);

      if (error) throw error;

      // Log activity
      await supabase.from("quote_activity_log").insert({
        quote_id: quoteId,
        user_id: user.id,
        activity_type: "payment_recorded",
        description: `Payment recorded: $${formData.payment_amount_usd || 0} USD`,
        metadata: {
          payment_status: formData.payment_status,
          payment_amount_usd: formData.payment_amount_usd,
        },
      });

      toast({ title: "Payment recorded successfully", duration: 3000 });
      navigate(`/quotes/${quoteId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/quotes/${quoteId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Add Payment</h1>
            <p className="text-sm text-muted-foreground">
              {quote?.quote_number || `Quote ${quoteId?.slice(0, 8)}`}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Details</CardTitle>
            <CardDescription>Enter payment information for this quote</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment_status">Payment Status *</Label>
                <Select
                  value={formData.payment_status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, payment_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid_usd">Paid (USD)</SelectItem>
                    <SelectItem value="paid_crypto">Paid (Crypto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_amount_usd">Amount (USD)</Label>
                <Input
                  id="payment_amount_usd"
                  type="number"
                  step="0.01"
                  value={formData.payment_amount_usd}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_amount_usd: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              {formData.payment_status === "paid_crypto" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="payment_amount_crypto">Amount (Crypto)</Label>
                    <Input
                      id="payment_amount_crypto"
                      value={formData.payment_amount_crypto}
                      onChange={(e) =>
                        setFormData({ ...formData, payment_amount_crypto: e.target.value })
                      }
                      placeholder="e.g., 0.05 BTC"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transaction_id">Transaction ID</Label>
                    <Input
                      id="transaction_id"
                      value={formData.transaction_id}
                      onChange={(e) =>
                        setFormData({ ...formData, transaction_id: e.target.value })
                      }
                      placeholder="Blockchain transaction ID"
                    />
                  </div>
                </>
              )}

              {/* Submit Button - Fixed at bottom on mobile */}
              <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t md:relative md:bottom-auto md:border-0 md:p-0 md:bg-transparent md:pt-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/quotes/${quoteId}`)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting ? "Saving..." : "Save Payment"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default QuotePayment;
