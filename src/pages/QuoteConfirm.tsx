import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [labResponse, setLabResponse] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountAmount, setDiscountAmount] = useState("");
  const [additionalSamplePrices, setAdditionalSamplePrices] = useState<Record<string, string>>({});
  const [additionalHeaderPrices, setAdditionalHeaderPrices] = useState<Record<string, string>>({});
  const [originalQuoteData, setOriginalQuoteData] = useState<any>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!quoteId) return;

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/confirm-quote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quoteId,
            action: 'get',
          }),
        });

        if (!response.ok) {
          toast({
            title: "Error",
            description: "Quote not found or invalid link.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { quote: data, items } = await response.json();

        setQuote(data);
        setQuoteItems(items || []);
        
        // Store original data for comparison
        setOriginalQuoteData({
          items: items?.map((item: any) => ({ id: item.id, price: item.price })),
          discount_type: data.discount_type,
          discount_amount: data.discount_amount,
        });
        
        // Initialize additional pricing defaults
        const samplePrices: Record<string, string> = {};
        const headerPrices: Record<string, string> = {};
        items?.forEach((item: any) => {
          samplePrices[item.id] = "60";
          headerPrices[item.id] = "30";
        });
        setAdditionalSamplePrices(samplePrices);
        setAdditionalHeaderPrices(headerPrices);
        
        // Calculate automatic discount based on subtotal
        if (items && items.length > 0) {
          const subtotal = items.reduce((sum: number, item: any) => {
            const basePrice = parseFloat(String(item.price || "0"));
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

          // Apply automatic discount if not already set
          if (!data.discount_amount) {
            if (subtotal < 1200) {
              setDiscountType("percentage");
              setDiscountAmount("5");
            } else {
              setDiscountType("percentage");
              setDiscountAmount("10");
            }
          } else {
            const dbDiscountType = data.discount_type;
            if (dbDiscountType === "percentage" || dbDiscountType === "fixed") {
              setDiscountType(dbDiscountType);
            }
            const discountValue = data.discount_amount;
            if (typeof discountValue === 'number') {
              setDiscountAmount(String(discountValue));
            } else {
              setDiscountAmount("");
            }
          }
        }
        
        const lockedStatuses = ['approved', 'awaiting_customer_approval', 'rejected', 'paid', 'shipped', 'in_transit', 'delivered', 'testing_in_progress', 'completed'];
        if (lockedStatuses.includes(data.status)) {
          setConfirmed(true);
        }
      } catch (error) {
        console.error('Error fetching quote:', error);
        toast({
          title: "Error",
          description: "Failed to load quote details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [quoteId, toast]);

  const handleItemPriceChange = (itemId: string, newPrice: string) => {
    setQuoteItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, price: newPrice } : item
      )
    );
  };

  const calculateTotal = () => {
    const subtotal = quoteItems.reduce((sum, item) => {
      const basePrice = parseFloat(item.price || "0");
      const additionalSamples = item.additional_samples || 0;
      const additionalHeaders = item.additional_report_headers || 0;
      
      let itemTotal = basePrice;
      
      // Add additional samples cost
      if (additionalSamples > 0) {
        const productName = item.products?.name || "";
        if (["Tirzepatide", "Semaglutide", "Retatrutide"].includes(productName)) {
          const samplePrice = parseFloat(additionalSamplePrices[item.id] || "60");
          itemTotal += additionalSamples * samplePrice;
        }
      }
      
      // Add additional headers cost
      if (additionalHeaders > 0) {
        const headerPrice = parseFloat(additionalHeaderPrices[item.id] || "30");
        itemTotal += additionalHeaders * headerPrice;
      }
      
      return sum + itemTotal;
    }, 0);

    let discount = 0;
    if (discountAmount) {
      const discountValue = parseFloat(discountAmount);
      if (discountType === "percentage") {
        discount = (subtotal * discountValue) / 100;
      } else {
        discount = discountValue;
      }
    }

    return {
      subtotal,
      discount,
      total: subtotal - discount
    };
  };

  const checkIfChangesWereMade = () => {
    // Check if prices changed
    const pricesChanged = quoteItems.some(item => {
      const original = originalQuoteData?.items?.find((orig: any) => orig.id === item.id);
      return original && parseFloat(item.price) !== parseFloat(original.price);
    });

    // Check if discount changed
    const discountChanged = 
      discountAmount !== String(originalQuoteData?.discount_amount || "") ||
      (discountAmount && discountType !== originalQuoteData?.discount_type);

    return pricesChanged || discountChanged;
  };

  const handleConfirm = async () => {
    if (!quoteId) return;

    setConfirming(true);

    try {
      const changesWereMade = checkIfChangesWereMade();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/confirm-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId,
          action: 'update',
          updates: {
            status: changesWereMade ? 'awaiting_customer_approval' : 'approved',
            lab_quote_number: quoteNumber || null,
            lab_response: labResponse,
            discount_type: discountAmount ? discountType : null,
            discount_amount: discountAmount ? parseFloat(discountAmount) : null,
            items: quoteItems.map(item => ({
              id: item.id,
              price: parseFloat(item.price || "0"),
              additional_sample_price: parseFloat(additionalSamplePrices[item.id] || "60"),
              additional_header_price: parseFloat(additionalHeaderPrices[item.id] || "30"),
            })),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm quote');
      }

      toast({
        title: changesWereMade ? "Quote Updated" : "Quote Confirmed",
        description: changesWereMade 
          ? "The quote has been updated and sent to customer for approval."
          : "The quote has been approved successfully.",
      });
      setConfirmed(true);
    } catch (error) {
      console.error('Error confirming quote:', error);
      toast({
        title: "Error",
        description: "Failed to confirm quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleReject = async () => {
    if (!quoteId) return;

    setConfirming(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/confirm-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId,
          action: 'update',
          updates: {
            status: 'rejected',
            lab_response: labResponse || 'Quote rejected by vendor',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject quote');
      }

      toast({
        title: "Quote Rejected",
        description: "The quote has been rejected.",
      });
      setConfirmed(true);
    } catch (error) {
      console.error('Error rejecting quote:', error);
      toast({
        title: "Error",
        description: "Failed to reject quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
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
    const isRejected = quote.status === 'rejected';
    const isAwaitingCustomerApproval = quote.status === 'awaiting_customer_approval';
    
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className={`flex items-center gap-2 ${isRejected ? 'text-destructive' : 'text-success'}`}>
              <CheckCircle2 className="h-6 w-6" />
              <CardTitle>
                {isRejected ? 'Quote Rejected' : isAwaitingCustomerApproval ? 'Quote Updated' : 'Quote Confirmed'}
              </CardTitle>
            </div>
            <CardDescription>
              {isRejected 
                ? "This quote has been rejected."
                : isAwaitingCustomerApproval
                ? "The quote has been updated with changes and sent to the customer for approval."
                : "Thank you for confirming the quote. The customer has been notified."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Quote Number:</strong> {quote.quote_number || "Not assigned"}</p>
              <p><strong>Lab:</strong> {quote.labs.name}</p>
              <p><strong>Status:</strong> {quote.status.replace(/_/g, ' ')}</p>
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

          <div className="space-y-4">
            <Label className="text-sm font-medium">Quote Items</Label>
            <div className="space-y-4">
              {quoteItems.map((item, index) => {
                const productName = item.products?.name || "";
                const qualifiesForAdditionalSamplePricing = 
                  productName.toLowerCase().includes("tirzepatide") || 
                  productName.toLowerCase().includes("semaglutide") || 
                  productName.toLowerCase().includes("retatrutide");

                let itemTotal = parseFloat(item.price || "0");
                if ((item.additional_samples || 0) > 0 && qualifiesForAdditionalSamplePricing) {
                  const samplePrice = parseFloat(additionalSamplePrices[item.id] || "60");
                  itemTotal += (item.additional_samples || 0) * samplePrice;
                }
                if ((item.additional_report_headers || 0) > 0) {
                  const headerPrice = parseFloat(additionalHeaderPrices[item.id] || "30");
                  itemTotal += (item.additional_report_headers || 0) * headerPrice;
                }

                return (
                  <Card key={item.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-base">
                          {index + 1}. {productName}
                        </div>
                      </div>

                      <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                        <div><strong>Client:</strong> {item.client || "—"}</div>
                        <div><strong>Sample:</strong> {item.sample || "—"}</div>
                        <div><strong>Manufacturer:</strong> {item.manufacturer || "—"}</div>
                        <div><strong>Batch:</strong> {item.batch || "—"}</div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor={`price-${item.id}`} className="text-sm">Base Price ($)</Label>
                        <Input
                          id={`price-${item.id}`}
                          type="number"
                          step="0.01"
                          value={item.price || ""}
                          onChange={(e) => handleItemPriceChange(item.id, e.target.value)}
                          className="w-32 text-right"
                        />
                      </div>

                      {(item.additional_samples || 0) > 0 && qualifiesForAdditionalSamplePricing && (
                        <div className="bg-green-50 dark:bg-green-950/20 border-l-2 border-green-500 p-3 rounded space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <Label htmlFor={`sample-price-${item.id}`} className="text-sm">
                              Price per Additional Sample ($)
                            </Label>
                            <Input
                              id={`sample-price-${item.id}`}
                              type="number"
                              step="0.01"
                              value={additionalSamplePrices[item.id] || "60"}
                              onChange={(e) => setAdditionalSamplePrices(prev => ({
                                ...prev,
                                [item.id]: e.target.value
                              }))}
                              className="w-24 text-right"
                            />
                          </div>
                          <div className="text-sm">
                            <strong>Additional Samples:</strong> {item.additional_samples} × ${parseFloat(additionalSamplePrices[item.id] || "60").toFixed(2)} = <strong>${((item.additional_samples || 0) * parseFloat(additionalSamplePrices[item.id] || "60")).toFixed(2)}</strong>
                          </div>
                        </div>
                      )}

                      {(item.additional_report_headers || 0) > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-500 p-3 rounded space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <Label htmlFor={`header-price-${item.id}`} className="text-sm">
                              Price per Additional Header ($)
                            </Label>
                            <Input
                              id={`header-price-${item.id}`}
                              type="number"
                              step="0.01"
                              value={additionalHeaderPrices[item.id] || "30"}
                              onChange={(e) => setAdditionalHeaderPrices(prev => ({
                                ...prev,
                                [item.id]: e.target.value
                              }))}
                              className="w-24 text-right"
                            />
                          </div>
                          <div className="text-sm">
                            <strong>Additional Report Headers:</strong> {item.additional_report_headers} × ${parseFloat(additionalHeaderPrices[item.id] || "30").toFixed(2)} = <strong>${((item.additional_report_headers || 0) * parseFloat(additionalHeaderPrices[item.id] || "30")).toFixed(2)}</strong>
                          </div>
                          
                          {item.additional_headers_data && item.additional_headers_data.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {item.additional_headers_data.map((header: any, headerIndex: number) => (
                                <Card key={headerIndex} className="bg-amber-100/50 dark:bg-amber-900/20">
                                  <CardContent className="p-3">
                                    <div className="font-semibold text-xs mb-2">Header #{headerIndex + 1}:</div>
                                    <div className="text-xs space-y-0.5">
                                      <div><strong>Client:</strong> {header.client || "—"}</div>
                                      <div><strong>Sample:</strong> {header.sample || "—"}</div>
                                      <div><strong>Manufacturer:</strong> {header.manufacturer || "—"}</div>
                                      <div><strong>Batch:</strong> {header.batch || "—"}</div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="bg-muted p-3 rounded-md flex justify-between items-center font-semibold">
                        <span>Item Total:</span>
                        <span>${itemTotal.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <Label className="text-sm font-medium">Discount (Optional)</Label>
            <div className="flex gap-2">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                className="h-10 rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
              <Input
                type="number"
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder={discountType === "percentage" ? "0" : "0.00"}
                className="flex-1"
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${calculateTotal().subtotal.toFixed(2)}</span>
            </div>
            {calculateTotal().discount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Discount:</span>
                <span>-${calculateTotal().discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span>${calculateTotal().total.toFixed(2)}</span>
            </div>
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

          <div className="flex gap-2">
            <Button
              onClick={handleReject}
              disabled={confirming}
              variant="destructive"
              className="flex-1"
            >
              {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Quote
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1"
            >
              {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve Quote
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteConfirm;
