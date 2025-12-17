import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Download, FileJson, FileSpreadsheet, FileText, Circle, CheckCircle, Clock, Package, Truck, FlaskConical, FileCheck } from "lucide-react";
import { triggerSuccessConfetti } from "@/lib/confetti";
import StatusBadge from "@/components/StatusBadge";
import * as XLSX from "xlsx";

const ORDER_TIMELINE_STAGES = [
  { status: 'draft', label: 'Draft', icon: Circle },
  { status: 'sent_to_vendor', label: 'Sent to Lab', icon: Clock },
  { status: 'awaiting_customer_approval', label: 'Awaiting Approval', icon: Clock },
  { status: 'approved_payment_pending', label: 'Payment Pending', icon: CheckCircle },
  { status: 'paid_awaiting_shipping', label: 'Paid', icon: CheckCircle },
  { status: 'in_transit', label: 'In Transit', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: Package },
  { status: 'testing_in_progress', label: 'Testing', icon: FlaskConical },
  { status: 'completed', label: 'Completed', icon: FileCheck },
];

const OrderTimeline = ({ currentStatus }: { currentStatus: string }) => {
  const currentIndex = ORDER_TIMELINE_STAGES.findIndex(s => s.status === currentStatus);
  const isRejected = currentStatus === 'rejected';
  
  if (isRejected) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">Order Timeline</Label>
        <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
          <Circle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive font-medium">Quote was rejected</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Order Timeline</Label>
      <div className="relative">
        <div className="flex items-center justify-between">
          {ORDER_TIMELINE_STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const isPast = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;
            
            return (
              <div key={stage.status} className="flex flex-col items-center relative z-10">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                  ${isPast ? 'bg-success border-success text-success-foreground' : ''}
                  ${isCurrent ? 'bg-primary border-primary text-primary-foreground' : ''}
                  ${isFuture ? 'bg-muted border-border text-muted-foreground' : ''}
                `}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`
                  text-[10px] mt-1 text-center max-w-[60px] leading-tight
                  ${isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'}
                `}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
        {/* Progress line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-border -z-0">
          <div 
            className="h-full bg-success transition-all duration-500"
            style={{ width: `${Math.max(0, (currentIndex / (ORDER_TIMELINE_STAGES.length - 1)) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

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

        // Initialize additional pricing defaults
        const samplePrices: Record<string, string> = {};
        const headerPrices: Record<string, string> = {};
        items?.forEach((item: any) => {
          samplePrices[item.id] = "60";
          headerPrices[item.id] = "30";
        });
        setAdditionalSamplePrices(samplePrices);
        setAdditionalHeaderPrices(headerPrices);

        // Determine baseline discount for change detection:
        // - If quote already has a discount saved, use it.
        // - Otherwise, use the automatic tiered discount (5% < $1200, 10% >= $1200)
        let baselineDiscountAmount: number | null = typeof data.discount_amount === "number" ? data.discount_amount : null;
        let baselineDiscountType: "percentage" | "fixed" | null =
          baselineDiscountAmount === null
            ? null
            : data.discount_type === "fixed"
              ? "fixed"
              : "percentage";

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

          if (baselineDiscountAmount === null) {
            baselineDiscountType = "percentage";
            baselineDiscountAmount = subtotal < 1200 ? 5 : 10;
          }

          const normalizedDiscountType =
            baselineDiscountAmount === null
              ? null
              : baselineDiscountType === "fixed"
                ? "fixed"
                : "percentage";

          if (normalizedDiscountType) {
            setDiscountType(normalizedDiscountType);
            setDiscountAmount(String(baselineDiscountAmount ?? ""));
          } else {
            setDiscountType("percentage");
            setDiscountAmount("");
          }

          // Store original data for comparison
          setOriginalQuoteData({
            items: items?.map((item: any) => ({ id: item.id, price: item.price })),
            discount_type: normalizedDiscountType,
            discount_amount: baselineDiscountAmount,
          });
        } else {
          // Store original data for comparison (no items to compute baseline)
          setOriginalQuoteData({
            items: items?.map((item: any) => ({ id: item.id, price: item.price })),
            discount_type: data.discount_type ?? null,
            discount_amount: typeof data.discount_amount === "number" ? data.discount_amount : null,
          });
        }
        
        const lockedStatuses = ['approved_payment_pending', 'awaiting_customer_approval', 'rejected', 'paid_awaiting_shipping', 'in_transit', 'delivered', 'testing_in_progress', 'completed'];
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
      if (!original) return false;

      const currentPrice = typeof item.price === "number" ? item.price : parseFloat(String(item.price || "0"));
      const originalPrice = typeof original.price === "number" ? original.price : parseFloat(String(original.price || "0"));

      if (Number.isNaN(currentPrice) || Number.isNaN(originalPrice)) return false;
      return currentPrice !== originalPrice;
    });

    // Check if discount changed
    const currentDiscountAmount = discountAmount ? parseFloat(discountAmount) : null;
    const currentDiscountType = discountAmount ? discountType : null;

    const originalDiscountAmount = typeof originalQuoteData?.discount_amount === "number" ? originalQuoteData.discount_amount : null;
    const originalDiscountType = originalQuoteData?.discount_type ?? null;

    const discountChanged = currentDiscountAmount !== originalDiscountAmount || currentDiscountType !== originalDiscountType;

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
            status: changesWereMade ? 'awaiting_customer_approval' : 'approved_payment_pending',
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
      triggerSuccessConfetti();
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

  const getOrderData = () => {
    const totals = calculateTotal();
    return {
      quote_number: quote?.quote_number || `Quote ${quote?.id?.slice(0, 8)}`,
      lab: quote?.labs?.name,
      status: quote?.status?.replace(/_/g, ' '),
      created_at: quote?.created_at,
      notes: quote?.notes || '',
      items: quoteItems.map(item => {
        const productName = item.products?.name || '';
        const additionalSamples = item.additional_samples || 0;
        const additionalHeaders = item.additional_report_headers || 0;
        const samplePrice = parseFloat(additionalSamplePrices[item.id] || "60");
        const headerPrice = parseFloat(additionalHeaderPrices[item.id] || "30");
        
        // Calculate costs
        const additionalSamplesCost = ["Tirzepatide", "Semaglutide", "Retatrutide"].includes(productName) 
          ? additionalSamples * samplePrice 
          : 0;
        const additionalHeadersCost = additionalHeaders * headerPrice;
        
        // Parse additional headers data
        let headersData: Array<{client: string, sample: string, manufacturer: string, batch: string}> = [];
        if (item.additional_headers_data) {
          try {
            headersData = typeof item.additional_headers_data === 'string' 
              ? JSON.parse(item.additional_headers_data) 
              : item.additional_headers_data;
          } catch (e) {
            headersData = [];
          }
        }
        
        return {
          product: productName,
          client: item.client || '',
          sample: item.sample || '',
          manufacturer: item.manufacturer || '',
          batch: item.batch || '',
          base_price: parseFloat(item.price || 0),
          additional_samples: additionalSamples,
          additional_samples_price_each: samplePrice,
          additional_samples_total: additionalSamplesCost,
          additional_report_headers: additionalHeaders,
          additional_headers_price_each: headerPrice,
          additional_headers_total: additionalHeadersCost,
          additional_headers_data: headersData,
          item_total: parseFloat(item.price || 0) + additionalSamplesCost + additionalHeadersCost,
        };
      }),
      subtotal: totals.subtotal,
      discount: totals.discount,
      discount_type: discountType,
      discount_amount: discountAmount ? parseFloat(discountAmount) : 0,
      total: totals.total,
    };
  };

  const downloadJSON = () => {
    const data = getOrderData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${quote?.quote_number || quote?.id?.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const data = getOrderData();
    const rows: string[][] = [];
    
    // Header info
    rows.push(['Quote Number:', data.quote_number]);
    rows.push(['Lab:', data.lab || '']);
    rows.push(['Status:', data.status || '']);
    rows.push(['Notes:', data.notes]);
    rows.push([]);
    
    // Items header
    rows.push(['Product', 'Client', 'Sample', 'Manufacturer', 'Batch', 'Base Price', 'Add. Samples', 'Samples Cost', 'Add. Headers', 'Headers Cost', 'Item Total']);
    
    data.items.forEach(item => {
      rows.push([
        item.product,
        item.client,
        item.sample,
        item.manufacturer,
        item.batch,
        `$${item.base_price.toFixed(2)}`,
        item.additional_samples.toString(),
        `$${item.additional_samples_total.toFixed(2)}`,
        item.additional_report_headers.toString(),
        `$${item.additional_headers_total.toFixed(2)}`,
        `$${item.item_total.toFixed(2)}`,
      ]);
      
      // Add additional headers details if present
      if (item.additional_headers_data && item.additional_headers_data.length > 0) {
        item.additional_headers_data.forEach((header, idx) => {
          rows.push([
            `  └ Additional Header ${idx + 1}`,
            header.client || '',
            header.sample || '',
            header.manufacturer || '',
            header.batch || '',
            '', '', '', '', '', '',
          ]);
        });
      }
    });
    
    rows.push([]);
    rows.push(['', '', '', '', '', '', '', '', '', 'Subtotal:', `$${data.subtotal.toFixed(2)}`]);
    rows.push(['', '', '', '', '', '', '', '', '', `Discount (${data.discount_type === 'percentage' ? data.discount_amount + '%' : 'Fixed'}):`, `-$${data.discount.toFixed(2)}`]);
    rows.push(['', '', '', '', '', '', '', '', '', 'TOTAL:', `$${data.total.toFixed(2)}`]);
    
    const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${quote?.quote_number || quote?.id?.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const data = getOrderData();
    const wsData: (string | number)[][] = [
      ['ORDER DETAILS'],
      ['Quote Number:', data.quote_number],
      ['Lab:', data.lab || ''],
      ['Status:', data.status || ''],
      ['Notes:', data.notes],
      [],
      ['Product', 'Client', 'Sample', 'Manufacturer', 'Batch', 'Base Price', 'Add. Samples', 'Samples Cost', 'Add. Headers', 'Headers Cost', 'Item Total'],
    ];
    
    data.items.forEach(item => {
      wsData.push([
        item.product,
        item.client,
        item.sample,
        item.manufacturer,
        item.batch,
        item.base_price,
        item.additional_samples,
        item.additional_samples_total,
        item.additional_report_headers,
        item.additional_headers_total,
        item.item_total,
      ]);
      
      // Add additional headers details if present
      if (item.additional_headers_data && item.additional_headers_data.length > 0) {
        item.additional_headers_data.forEach((header, idx) => {
          wsData.push([
            `  └ Additional Header ${idx + 1}`,
            header.client || '',
            header.sample || '',
            header.manufacturer || '',
            header.batch || '',
            '', '', '', '', '', '',
          ]);
        });
      }
    });
    
    wsData.push([]);
    wsData.push(['', '', '', '', '', '', '', '', '', 'Subtotal:', data.subtotal]);
    wsData.push(['', '', '', '', '', '', '', '', '', `Discount (${data.discount_type === 'percentage' ? data.discount_amount + '%' : 'Fixed'}):`, -data.discount]);
    wsData.push(['', '', '', '', '', '', '', '', '', 'TOTAL:', data.total]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Order');
    XLSX.writeFile(wb, `order-${quote?.quote_number || quote?.id?.slice(0, 8)}.xlsx`);
  };

  const downloadText = () => {
    const data = getOrderData();
    let text = `ORDER DETAILS\n${'='.repeat(60)}\n\n`;
    text += `Quote Number: ${data.quote_number}\n`;
    text += `Lab: ${data.lab}\n`;
    text += `Status: ${data.status}\n`;
    if (data.notes) text += `Notes: ${data.notes}\n`;
    text += `\nITEMS\n${'-'.repeat(60)}\n\n`;
    
    data.items.forEach((item, index) => {
      text += `${index + 1}. ${item.product}\n`;
      text += `   Client: ${item.client}\n`;
      text += `   Sample: ${item.sample}\n`;
      text += `   Manufacturer: ${item.manufacturer}\n`;
      text += `   Batch: ${item.batch}\n`;
      text += `   Base Price: $${item.base_price.toFixed(2)}\n`;
      
      if (item.additional_samples > 0) {
        text += `   Additional Samples: ${item.additional_samples} × $${item.additional_samples_price_each.toFixed(2)} = $${item.additional_samples_total.toFixed(2)}\n`;
      }
      
      if (item.additional_report_headers > 0) {
        text += `   Additional Report Headers: ${item.additional_report_headers} × $${item.additional_headers_price_each.toFixed(2)} = $${item.additional_headers_total.toFixed(2)}\n`;
        
        if (item.additional_headers_data && item.additional_headers_data.length > 0) {
          text += `   Additional Header Details:\n`;
          item.additional_headers_data.forEach((header, idx) => {
            text += `     Header ${idx + 1}:\n`;
            text += `       Client: ${header.client || 'N/A'}\n`;
            text += `       Sample: ${header.sample || 'N/A'}\n`;
            text += `       Manufacturer: ${header.manufacturer || 'N/A'}\n`;
            text += `       Batch: ${header.batch || 'N/A'}\n`;
          });
        }
      }
      
      text += `   Item Total: $${item.item_total.toFixed(2)}\n\n`;
    });
    
    text += `${'-'.repeat(60)}\n`;
    text += `Subtotal: $${data.subtotal.toFixed(2)}\n`;
    text += `Discount (${data.discount_type === 'percentage' ? data.discount_amount + '%' : 'Fixed $' + data.discount_amount}): -$${data.discount.toFixed(2)}\n`;
    text += `TOTAL: $${data.total.toFixed(2)}\n`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${quote?.quote_number || quote?.id?.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
    const isApproved = quote.status === 'approved_payment_pending';
    
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className={`flex items-center gap-2 ${isRejected ? 'text-destructive' : 'text-success'}`}>
              <CheckCircle2 className="h-6 w-6" />
              <CardTitle>
                {isRejected ? 'Quote Rejected' : isAwaitingCustomerApproval ? 'Quote Updated' : 'Quote Approved'}
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
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Quote Number:</span>
                <span>{quote.quote_number || `Quote ${quote.id.slice(0, 8)}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Lab:</span>
                <span>{quote.labs.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                <StatusBadge status={quote.status} />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <OrderTimeline currentStatus={quote.status} />
            </div>
            
            {!isRejected && (
              <div className="border-t pt-4 space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Order Details
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={downloadJSON} className="justify-start">
                    <FileJson className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadCSV} className="justify-start">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadExcel} className="justify-start">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadText} className="justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Text
                  </Button>
                </div>
              </div>
            )}
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
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">Lab:</span>
              <span>{quote.labs.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Current Status:</span>
              <StatusBadge status={quote.status} />
            </div>
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
