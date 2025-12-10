import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft } from "lucide-react";

const QuoteShipping = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tracking_number: "",
    shipped_date: new Date().toISOString().split("T")[0],
  });

  // Swipe handlers for navigation
  const swipeHandlers = useSwipeable({
    onSwipedRight: () => {
      navigate(`/quotes/${quoteId}`);
    },
    trackMouse: false,
    trackTouch: true,
    delta: 50,
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

      // Pre-fill if already has tracking
      if (data.tracking_number) {
        setFormData({
          tracking_number: data.tracking_number,
          shipped_date: data.shipped_date || "",
        });
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

    if (!formData.tracking_number.trim()) {
      toast({
        title: "Missing tracking number",
        description: "Please enter a tracking number",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        tracking_number: formData.tracking_number,
        shipped_date: formData.shipped_date || null,
        status: "in_transit",
      };

      const { error } = await supabase
        .from("quotes")
        .update(payload)
        .eq("id", quoteId);

      if (error) throw error;

      // Log activity
      await supabase.from("quote_activity_log").insert({
        quote_id: quoteId,
        user_id: user.id,
        activity_type: "shipping_added",
        description: "Shipping details added - package in transit",
        metadata: {
          tracking_number: formData.tracking_number,
          shipped_date: formData.shipped_date,
        },
      });

      toast({
        title: "Shipping details added",
        description: "Quote status updated to In Transit",
        duration: 3000,
      });
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
      <div {...swipeHandlers} className="space-y-4 pb-24">
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
            <h1 className="text-xl font-bold">Add Shipping</h1>
            <p className="text-sm text-muted-foreground">
              {quote?.quote_number || `Quote ${quoteId?.slice(0, 8)}`}
            </p>
          </div>
        </div>

        {/* Swipe hint */}
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <ChevronLeft className="h-3 w-3" />
          <span>Swipe right for Quote Details</span>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipping Details</CardTitle>
            <CardDescription>Enter tracking information for this shipment</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tracking_number">Tracking Number *</Label>
                <Input
                  id="tracking_number"
                  value={formData.tracking_number}
                  onChange={(e) =>
                    setFormData({ ...formData, tracking_number: e.target.value })
                  }
                  placeholder="Enter UPS tracking number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipped_date">Shipped Date</Label>
                <Input
                  id="shipped_date"
                  type="date"
                  value={formData.shipped_date}
                  onChange={(e) =>
                    setFormData({ ...formData, shipped_date: e.target.value })
                  }
                />
              </div>

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
                    {submitting ? "Saving..." : "Save Shipping"}
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

export default QuoteShipping;
