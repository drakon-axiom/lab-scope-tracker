import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { PullToRefreshWrapper } from "@/components/PullToRefresh";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { ArrowLeft, Copy, CreditCard, Truck, ChevronRight } from "lucide-react";

interface Quote {
  id: string;
  lab_id: string;
  quote_number: string | null;
  lab_quote_number: string | null;
  status: string;
  notes: string | null;
  tracking_number: string | null;
  shipped_date: string | null;
  created_at: string;
  tracking_updated_at: string | null;
  estimated_delivery: string | null;
  payment_status: string | null;
  payment_amount_usd: number | null;
  payment_amount_crypto: string | null;
  payment_date: string | null;
  transaction_id: string | null;
  labs: { name: string };
}

interface QuoteItem {
  id: string;
  product_id: string;
  client: string | null;
  sample: string | null;
  manufacturer: string | null;
  batch: string | null;
  price: number | null;
  additional_samples: number | null;
  additional_report_headers: number | null;
  status: string | null;
  report_url: string | null;
  products: { name: string };
}

interface TrackingHistory {
  id: string;
  status: string;
  changed_at: string;
  source: string;
}

const QuoteView = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [trackingHistory, setTrackingHistory] = useState<TrackingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuote = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, labs(name)")
        .eq("id", quoteId)
        .single();

      if (error) throw error;
      setQuote(data);
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
  }, [quoteId, navigate, toast]);

  const fetchItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("quote_items")
        .select("*, products(name)")
        .eq("quote_id", quoteId);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  }, [quoteId]);

  const fetchTrackingHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tracking_history")
        .select("id, status, changed_at, source")
        .eq("quote_id", quoteId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      setTrackingHistory(data || []);
    } catch (error) {
      console.error("Error fetching tracking history:", error);
    }
  }, [quoteId]);

  useEffect(() => {
    if (quoteId) {
      fetchQuote();
      fetchItems();
      fetchTrackingHistory();
    }
  }, [quoteId, fetchQuote, fetchItems, fetchTrackingHistory]);

  const handleRefresh = async () => {
    await Promise.all([fetchQuote(), fetchItems(), fetchTrackingHistory()]);
    toast({ title: "Quote updated", duration: 2000 });
  };

  // Swipe handlers for navigation
  const showPaymentAction = quote?.status === "approved_payment_pending";
  const showShippingAction = quote?.status === "paid_awaiting_shipping" && !quote?.tracking_number;

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (showPaymentAction) {
        navigate(`/quotes/${quoteId}/payment`);
      } else if (showShippingAction) {
        navigate(`/quotes/${quoteId}/shipping`);
      }
    },
    onSwipedRight: () => {
      navigate("/quotes");
    },
    trackMouse: false,
    trackTouch: true,
    delta: 50,
  });

  const calculateItemTotal = (item: QuoteItem): number => {
    const basePrice = item.price || 0;
    const productName = item.products.name.toLowerCase();
    const qualifies =
      productName.includes("tirzepatide") ||
      productName.includes("semaglutide") ||
      productName.includes("retatrutide");

    let total = basePrice;
    if (qualifies && (item.additional_samples || 0) > 0) {
      total += (item.additional_samples || 0) * 60;
    }
    if ((item.additional_report_headers || 0) > 0) {
      total += (item.additional_report_headers || 0) * 30;
    }
    return total;
  };

  const getTotalValue = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
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

  if (!quote) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p>Quote not found</p>
          <Button onClick={() => navigate("/quotes")} className="mt-4">
            Back to Quotes
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div {...swipeHandlers} className="space-y-4 pb-24">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/quotes")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">
                  {quote.quote_number || `Quote ${quote.id.slice(0, 8)}`}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(quote.quote_number || quote.id);
                    toast({ title: "Copied", duration: 2000 });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{quote.labs.name}</p>
            </div>
            <StatusBadge status={quote.status} />
          </div>

          {/* Swipe hint */}
          {(showPaymentAction || showShippingAction) && (
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <span>Swipe left for {showPaymentAction ? "Payment" : "Shipping"}</span>
              <ChevronRight className="h-3 w-3" />
            </div>
          )}

          {/* Quick Actions */}
          {(showPaymentAction || showShippingAction) && (
            <div className="flex gap-2">
              {showPaymentAction && (
                <Button
                  className="flex-1"
                  onClick={() => navigate(`/quotes/${quoteId}/payment`)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Add Payment
                </Button>
              )}
              {showShippingAction && (
                <Button
                  className="flex-1"
                  onClick={() => navigate(`/quotes/${quoteId}/shipping`)}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Add Shipping
                </Button>
              )}
            </div>
          )}

          {/* Quote Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quote Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-muted-foreground text-xs">Created</Label>
                  <p className="font-medium">
                    {new Date(quote.created_at).toLocaleDateString()}
                  </p>
                </div>
                {quote.lab_quote_number && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Lab Quote #</Label>
                    <p className="font-medium">{quote.lab_quote_number}</p>
                  </div>
                )}
                {quote.tracking_number && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Tracking</Label>
                    <p className="font-medium">{quote.tracking_number}</p>
                    {quote.tracking_updated_at && (
                      <p className="text-xs text-muted-foreground">
                        Updated: {new Date(quote.tracking_updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {quote.notes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Notes</Label>
                  <p className="text-sm mt-1">{quote.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          {quote.payment_status && quote.payment_status !== "pending" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-1">
                      <StatusBadge status={quote.payment_status} />
                    </div>
                  </div>
                  {quote.payment_date && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Date</Label>
                      <p className="font-medium">
                        {new Date(quote.payment_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {quote.payment_amount_usd && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Amount (USD)</Label>
                      <p className="font-medium">${quote.payment_amount_usd.toFixed(2)}</p>
                    </div>
                  )}
                  {quote.payment_amount_crypto && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Amount (Crypto)</Label>
                      <p className="font-medium">{quote.payment_amount_crypto}</p>
                    </div>
                  )}
                  {quote.transaction_id && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground text-xs">Transaction ID</Label>
                      <p className="font-mono text-xs break-all">{quote.transaction_id}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tracking History */}
          {trackingHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tracking History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {trackingHistory.map((history) => (
                    <div
                      key={history.id}
                      className="flex items-start gap-3 p-2 border rounded-lg bg-muted/50"
                    >
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <StatusBadge status={history.status} />
                          <span className="text-xs text-muted-foreground">
                            {new Date(history.changed_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quote Items */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Items</CardTitle>
                <span className="font-semibold">${getTotalValue().toFixed(2)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border rounded-lg bg-muted/30 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.products.name}</p>
                      <StatusBadge status={item.status || "pending"} />
                    </div>
                    <p className="font-semibold">${calculateItemTotal(item).toFixed(2)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>Client: {item.client || "—"}</span>
                    <span>Sample: {item.sample || "—"}</span>
                    <span>Mfg: {item.manufacturer || "—"}</span>
                    <span>Batch: {item.batch || "—"}</span>
                  </div>
                  {item.report_url && (
                    <a
                      href={item.report_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline"
                    >
                      View Report
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </PullToRefreshWrapper>
    </Layout>
  );
};

export default QuoteView;
