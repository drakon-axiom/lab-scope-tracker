import { useState, useCallback, useMemo, memo } from "react";
import { usePrefetchQuoteItems } from "@/hooks/useQuoteItems";
import { useLabOpenRequestsDialog, Quote, QuoteItem } from "@/hooks/useLabOpenRequestsDialog";
import { 
  getAdditionalSamplesPrice, 
  getAdditionalHeadersPrice,
  getEffectiveSamplePrice as getEffectiveSamplePriceUtil,
  getEffectiveHeaderPrice as getEffectiveHeaderPriceUtil
} from "@/lib/priceUtils";
import { useNavigate } from "react-router-dom";
import LabLayout from "@/components/lab/LabLayout";
import { ChangeDetectionDebugPanel } from "@/components/lab/ChangeDetectionDebugPanel";
import { PriceInputRow } from "@/components/lab/PriceInputRow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useLabPermissions } from "@/hooks/useLabPermissions";
import { useLabQuotes } from "@/hooks/useLabQuotes";
import { format } from "date-fns";
import { 
  Eye, Check, X, Lock, Package, CreditCard, 
  FlaskConical, FileText, Upload, ChevronRight, RefreshCw, Loader2,
  Download, FileJson, FileSpreadsheet
} from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// QuoteItem and Quote types are imported from useLabOpenRequestsDialog

const STATUS_ORDER = [
  "sent_to_vendor",
  "awaiting_customer_approval",
  "approved_payment_pending",
  "paid_awaiting_shipping",
  "in_transit",
  "delivered",
  "testing_in_progress",
];

const STATUS_LABELS: Record<string, string> = {
  sent_to_vendor: "Pending Review",
  awaiting_customer_approval: "Awaiting Customer",
  approved_payment_pending: "Awaiting Payment",
  paid_awaiting_shipping: "Paid - Awaiting Shipment",
  in_transit: "In Transit",
  delivered: "Delivered",
  testing_in_progress: "Testing In Progress",
};

const STATUS_COLORS: Record<string, string> = {
  sent_to_vendor: "bg-yellow-500",
  awaiting_customer_approval: "bg-orange-500",
  approved_payment_pending: "bg-blue-500",
  paid_awaiting_shipping: "bg-emerald-500",
  in_transit: "bg-purple-500",
  delivered: "bg-cyan-500",
  testing_in_progress: "bg-pink-500",
};

// Memoized quote row component
interface OpenRequestRowProps {
  quote: Quote;
  getNextActionIcon: (status: string) => React.ComponentType<{ className?: string }>;
  getNextAction: (quote: Quote) => string;
  onOpen: (quote: Quote) => void;
  onHover: (quoteId: string) => void;
}

const OpenRequestRow = memo(({ 
  quote, 
  getNextActionIcon, 
  getNextAction, 
  onOpen,
  onHover
}: OpenRequestRowProps) => {
  const ActionIcon = getNextActionIcon(quote.status);
  return (
    <TableRow 
      key={quote.id} 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onOpen(quote)}
      onMouseEnter={() => onHover(quote.id)}
    >
      <TableCell>
        <div>
          <p className="font-medium">
            {quote.quote_number || quote.lab_quote_number || "Pending"}
          </p>
          {quote.notes && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {quote.notes}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge 
          variant="outline"
          className="gap-1.5"
        >
          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[quote.status] || "bg-gray-500"}`} />
          {STATUS_LABELS[quote.status] || quote.status}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {format(new Date(quote.created_at), "MMM d, yyyy")}
      </TableCell>
      <TableCell>
        {quote.payment_amount_usd 
          ? `$${quote.payment_amount_usd.toFixed(2)}` 
          : "-"}
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="ghost" className="gap-1">
          <ActionIcon className="h-4 w-4" />
          {getNextAction(quote)}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
});
OpenRequestRow.displayName = "OpenRequestRow";

export default function LabOpenRequests() {
  const navigate = useNavigate();
  const prefetchQuoteItems = usePrefetchQuoteItems();
  const { labUser } = useLabUser();
  const { impersonatedUser, isImpersonatingLab } = useImpersonation();
  const permissions = useLabPermissions();
  
  const effectiveLabId = (isImpersonatingLab ? impersonatedUser?.labId : null) || labUser?.lab_id;
  
  const { quotes, loading, refetch } = useLabQuotes(effectiveLabId);
  
  // Use reducer-based dialog state management
  const { state: dialogState, actions: dialogActions } = useLabOpenRequestsDialog();
  const {
    isOpen: dialogOpen,
    selectedQuote,
    selectedQuoteItems,
    itemsLoading,
    responseNotes,
    modifiedDiscount,
    modifiedPrices,
    modifiedSamplePrices,
    modifiedHeaderPrices,
    savingApproval,
  } = dialogState;

  const [activeTab, setActiveTab] = useState("all");

  const handleQuoteHover = useCallback((quoteId: string) => {
    prefetchQuoteItems(quoteId);
  }, [prefetchQuoteItems]);

  const fetchQuoteItems = useCallback(async (quoteId: string) => {
    dialogActions.setItemsLoading(true);
    try {
      const { data, error } = await supabase
        .from("quote_items")
        .select("*, products(name, category)")
        .eq("quote_id", quoteId);

      if (error) throw error;
      dialogActions.setQuoteItems(data || []);
    } catch (error) {
      console.error("Error fetching quote items:", error);
      dialogActions.setQuoteItems([]);
    }
  }, [dialogActions]);

  const openQuoteDialog = useCallback((quote: Quote) => {
    dialogActions.openDialog(quote);
    fetchQuoteItems(quote.id);
  }, [dialogActions, fetchQuoteItems]);

  const setDialogOpen = useCallback((open: boolean) => {
    if (!open) {
      dialogActions.closeDialog();
    }
  }, [dialogActions]);

  // Expose price change handlers and setters from the reducer
  const { 
    handlePriceChange, 
    handleSamplePriceChange, 
    handleHeaderPriceChange,
    setResponseNotes,
    setModifiedDiscount,
    setSavingApproval,
  } = dialogActions;

  // Get modified or default additional samples price
  const getEffectiveSamplePrice = (item: QuoteItem): number => {
    return getEffectiveSamplePriceUtil(item, modifiedSamplePrices);
  };

  // Get modified or default additional headers price  
  const getEffectiveHeaderPrice = (item: QuoteItem): number => {
    return getEffectiveHeaderPriceUtil(item, modifiedHeaderPrices);
  };

  const getItemPrice = (item: QuoteItem): number => {
    if (modifiedPrices[item.id] !== undefined && modifiedPrices[item.id] !== "") {
      return parseFloat(modifiedPrices[item.id]) || 0;
    }
    return item.price || 0;
  };

  // Get total price for an item including all components
  const getItemTotalPrice = (item: QuoteItem): number => {
    return getItemPrice(item) + getEffectiveSamplePrice(item) + getEffectiveHeaderPrice(item);
  };

  // Get detailed list of all modified changes
  const getModifiedChanges = () => {
    const changes: { type: string; item?: string; original: number; modified: number }[] = [];
    
    // Check base price changes
    Object.keys(modifiedPrices).forEach(itemId => {
      const item = selectedQuoteItems.find(i => i.id === itemId);
      if (!item) return;
      const newPrice = parseFloat(modifiedPrices[itemId]);
      const originalPrice = item.price || 0;
      if (!isNaN(newPrice) && newPrice !== originalPrice) {
        changes.push({
          type: 'Base Price',
          item: item.products?.name || 'Unknown',
          original: originalPrice,
          modified: newPrice
        });
      }
    });
    
    // Check sample price changes
    Object.keys(modifiedSamplePrices).forEach(itemId => {
      const item = selectedQuoteItems.find(i => i.id === itemId);
      if (!item) return;
      const newPrice = parseFloat(modifiedSamplePrices[itemId]);
      const originalPrice = getAdditionalSamplesPrice(item);
      if (!isNaN(newPrice) && newPrice !== originalPrice) {
        changes.push({
          type: 'Variance Samples',
          item: item.products?.name || 'Unknown',
          original: originalPrice,
          modified: newPrice
        });
      }
    });
    
    // Check header price changes
    Object.keys(modifiedHeaderPrices).forEach(itemId => {
      const item = selectedQuoteItems.find(i => i.id === itemId);
      if (!item) return;
      const newPrice = parseFloat(modifiedHeaderPrices[itemId]);
      const originalPrice = getAdditionalHeadersPrice(item);
      if (!isNaN(newPrice) && newPrice !== originalPrice) {
        changes.push({
          type: 'Report Headers',
          item: item.products?.name || 'Unknown',
          original: originalPrice,
          modified: newPrice
        });
      }
    });
    
    return changes;
  };

  const hasModifiedPrices = () => {
    return getModifiedChanges().length > 0;
  };
  
  // Check if discount was changed
  const getDiscountChange = (quote: Quote | null) => {
    if (!quote) return null;
    const originalDiscount = quote.discount_amount || 0;
    const newDiscount = modifiedDiscount ? parseFloat(modifiedDiscount) : 0;
    if (!isNaN(newDiscount) && newDiscount !== originalDiscount) {
      return { original: originalDiscount, modified: newDiscount };
    }
    return null;
  };
  
  const hasAnyChanges = (quote: Quote | null) => {
    return hasModifiedPrices() || getDiscountChange(quote) !== null;
  };

  const getChangeDetectionDebugData = (quote: Quote) => {
    const originalDiscount = quote.discount_amount || 0;
    const parsedDiscount = modifiedDiscount ? Number.parseFloat(modifiedDiscount) : 0;
    const discountChanged = !Number.isNaN(parsedDiscount) && parsedDiscount !== originalDiscount;

    const base = Object.entries(modifiedPrices).map(([itemId, input]) => {
      const item = selectedQuoteItems.find((i) => i.id === itemId);
      const original = item?.price || 0;
      const parsed = input.trim() === "" ? null : Number.parseFloat(input);
      const changed = parsed !== null && !Number.isNaN(parsed) && parsed !== original;

      return {
        label: item?.products?.name ? `Base · ${item.products.name}` : `Base · ${itemId}`,
        original,
        input,
        parsed: parsed === null || Number.isNaN(parsed) ? null : parsed,
        changed,
      };
    });

    const samples = Object.entries(modifiedSamplePrices).map(([itemId, input]) => {
      const item = selectedQuoteItems.find((i) => i.id === itemId);
      const original = item ? getAdditionalSamplesPrice(item) : 0;
      const parsed = input.trim() === "" ? null : Number.parseFloat(input);
      const changed = parsed !== null && !Number.isNaN(parsed) && parsed !== original;

      return {
        label: item?.products?.name ? `Variance · ${item.products.name}` : `Variance · ${itemId}`,
        original,
        input,
        parsed: parsed === null || Number.isNaN(parsed) ? null : parsed,
        changed,
      };
    });

    const headers = Object.entries(modifiedHeaderPrices).map(([itemId, input]) => {
      const item = selectedQuoteItems.find((i) => i.id === itemId);
      const original = item ? getAdditionalHeadersPrice(item) : 0;
      const parsed = input.trim() === "" ? null : Number.parseFloat(input);
      const changed = parsed !== null && !Number.isNaN(parsed) && parsed !== original;

      return {
        label: item?.products?.name ? `Headers · ${item.products.name}` : `Headers · ${itemId}`,
        original,
        input,
        parsed: parsed === null || Number.isNaN(parsed) ? null : parsed,
        changed,
      };
    });

    const priceChangesCount = getModifiedChanges().length;
    const hasPriceChanges = priceChangesCount > 0;
    const hasDiscountChange = getDiscountChange(quote) !== null;
    const hasAny = hasPriceChanges || hasDiscountChange;

    return {
      discount: {
        original: originalDiscount,
        input: modifiedDiscount,
        parsed: Number.isNaN(parsedDiscount) ? 0 : parsedDiscount,
        changed: discountChanged,
      },
      base,
      samples,
      headers,
      summary: {
        hasModifiedPrices: hasPriceChanges,
        changesCount: priceChangesCount,
        hasDiscountChange,
        hasAnyChanges: hasAny,
        resultingStatus: hasAny ? "awaiting_customer_approval" : "approved_payment_pending",
      },
    };
  };

  // Download helper functions
  const getOrderData = (quote: Quote, items: QuoteItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + getItemTotalPrice(item), 0);
    const discountPercent = quote.discount_amount || 0;
    const discountAmount = discountPercent > 0 ? subtotal * (discountPercent / 100) : 0;
    const total = subtotal - discountAmount;

    return {
      quote_number: quote.quote_number || quote.lab_quote_number || `Quote ${quote.id.slice(0, 8)}`,
      status: quote.status?.replace(/_/g, ' '),
      created_at: quote.created_at,
      notes: quote.notes || '',
      items: items.map(item => {
        const productName = item.products?.name || '';
        const additionalSamples = item.additional_samples || 0;
        const additionalHeaders = item.additional_report_headers || 0;
        const samplePrice = getEffectiveSamplePrice(item);
        const headerPrice = getEffectiveHeaderPrice(item);
        const basePrice = getItemPrice(item);
        
        return {
          product: productName,
          client: item.client || '',
          sample: item.sample || '',
          manufacturer: item.manufacturer || '',
          batch: item.batch || '',
          base_price: basePrice,
          additional_samples: additionalSamples,
          additional_samples_total: samplePrice,
          additional_report_headers: additionalHeaders,
          additional_headers_total: headerPrice,
          item_total: basePrice + samplePrice + headerPrice,
        };
      }),
      subtotal,
      discount: discountAmount,
      discount_type: 'percentage',
      discount_amount: discountPercent,
      total,
    };
  };

  const downloadJSON = (quote: Quote, items: QuoteItem[]) => {
    const data = getOrderData(quote, items);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${quote.quote_number || quote.lab_quote_number || quote.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (quote: Quote, items: QuoteItem[]) => {
    const data = getOrderData(quote, items);
    const rows: string[][] = [];
    
    rows.push(['Quote Number:', data.quote_number]);
    rows.push(['Status:', data.status || '']);
    rows.push(['Notes:', data.notes]);
    rows.push([]);
    
    rows.push(['Product', 'Client', 'Sample', 'Manufacturer', 'Batch', 'Base Price', 'Add. Samples Cost', 'Add. Headers Cost', 'Item Total']);
    
    data.items.forEach(item => {
      rows.push([
        item.product,
        item.client,
        item.sample,
        item.manufacturer,
        item.batch,
        `$${item.base_price.toFixed(2)}`,
        `$${item.additional_samples_total.toFixed(2)}`,
        `$${item.additional_headers_total.toFixed(2)}`,
        `$${item.item_total.toFixed(2)}`,
      ]);
    });
    
    rows.push([]);
    rows.push(['', '', '', '', '', '', '', 'Subtotal:', `$${data.subtotal.toFixed(2)}`]);
    rows.push(['', '', '', '', '', '', '', `Discount (${data.discount_amount}%):`, `-$${data.discount.toFixed(2)}`]);
    rows.push(['', '', '', '', '', '', '', 'TOTAL:', `$${data.total.toFixed(2)}`]);
    
    const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${quote.quote_number || quote.lab_quote_number || quote.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = async (quote: Quote, items: QuoteItem[]) => {
    const XLSX = await import("xlsx");
    const data = getOrderData(quote, items);
    const wsData: (string | number)[][] = [
      ['ORDER DETAILS'],
      ['Quote Number:', data.quote_number],
      ['Status:', data.status || ''],
      ['Notes:', data.notes],
      [],
      ['Product', 'Client', 'Sample', 'Manufacturer', 'Batch', 'Base Price', 'Add. Samples Cost', 'Add. Headers Cost', 'Item Total'],
    ];
    
    data.items.forEach(item => {
      wsData.push([
        item.product,
        item.client,
        item.sample,
        item.manufacturer,
        item.batch,
        item.base_price,
        item.additional_samples_total,
        item.additional_headers_total,
        item.item_total,
      ]);
    });
    
    wsData.push([]);
    wsData.push(['', '', '', '', '', '', '', 'Subtotal:', data.subtotal]);
    wsData.push(['', '', '', '', '', '', '', `Discount (${data.discount_amount}%):`, -data.discount]);
    wsData.push(['', '', '', '', '', '', '', 'TOTAL:', data.total]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Order');
    XLSX.writeFile(wb, `order-${quote.quote_number || quote.lab_quote_number || quote.id.slice(0, 8)}.xlsx`);
  };

  const downloadText = (quote: Quote, items: QuoteItem[]) => {
    const data = getOrderData(quote, items);
    let text = `ORDER DETAILS\n${'='.repeat(60)}\n\n`;
    text += `Quote Number: ${data.quote_number}\n`;
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
        text += `   Additional Samples Cost: $${item.additional_samples_total.toFixed(2)}\n`;
      }
      if (item.additional_report_headers > 0) {
        text += `   Additional Headers Cost: $${item.additional_headers_total.toFixed(2)}\n`;
      }
      text += `   Item Total: $${item.item_total.toFixed(2)}\n\n`;
    });
    
    text += `${'-'.repeat(60)}\n`;
    text += `Subtotal: $${data.subtotal.toFixed(2)}\n`;
    text += `Discount (${data.discount_amount}%): -$${data.discount.toFixed(2)}\n`;
    text += `TOTAL: $${data.total.toFixed(2)}\n`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${quote.quote_number || quote.lab_quote_number || quote.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApprove = async (quote: Quote) => {
    setSavingApproval(true);
    try {
      // Auto-detect if actual changes were made
      const discountChange = getDiscountChange(quote);
      const hasDiscountChange = discountChange !== null;
      const hasPriceChanges = hasModifiedPrices();
      const hasActualChanges = hasDiscountChange || hasPriceChanges;

      // If approving with changes, update any modified item prices
      if (hasActualChanges && hasPriceChanges) {
        // Update each item with modified prices (base, sample, header)
        for (const item of selectedQuoteItems) {
          const updates: Record<string, unknown> = {};
          
          // Check if base price was modified
          if (modifiedPrices[item.id] !== undefined && modifiedPrices[item.id] !== "") {
            const newPrice = parseFloat(modifiedPrices[item.id]);
            if (!isNaN(newPrice)) {
              updates.price = newPrice;
            }
          }
          
          // Check if additional samples price was modified - store in additional_headers_data
          const hasModifiedSamplePrice = modifiedSamplePrices[item.id] !== undefined && modifiedSamplePrices[item.id] !== "";
          const hasModifiedHeaderPrice = modifiedHeaderPrices[item.id] !== undefined && modifiedHeaderPrices[item.id] !== "";
          
          if (hasModifiedSamplePrice || hasModifiedHeaderPrice) {
            // Get existing additional_headers_data or create new
            const existingData = (item as any).additional_headers_data || {};
            const newData = { ...existingData };
            
            if (hasModifiedSamplePrice) {
              newData.modified_samples_total = parseFloat(modifiedSamplePrices[item.id]) || 0;
            }
            if (hasModifiedHeaderPrice) {
              newData.modified_headers_total = parseFloat(modifiedHeaderPrices[item.id]) || 0;
            }
            
            updates.additional_headers_data = newData;
          }
          
          // Only update if there are changes
          if (Object.keys(updates).length > 0) {
            const { error: itemError } = await supabase
              .from("quote_items")
              .update(updates)
              .eq("id", item.id);
            
            if (itemError) {
              console.error("Error updating item prices:", itemError);
              throw itemError;
            }
          }
        }
      }

      const updates: Record<string, unknown> = {
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

      await supabase.from("quote_activity_log").insert({
        quote_id: quote.id,
        activity_type: hasActualChanges ? "lab_modified" : "lab_approved",
        description: hasActualChanges
          ? "Lab approved quote with modifications"
          : "Lab approved quote",
        metadata: { 
          notes: responseNotes, 
          discount: modifiedDiscount,
          modified_base_prices: Object.keys(modifiedPrices).length > 0 ? modifiedPrices : null,
          modified_sample_prices: Object.keys(modifiedSamplePrices).length > 0 ? modifiedSamplePrices : null,
          modified_header_prices: Object.keys(modifiedHeaderPrices).length > 0 ? modifiedHeaderPrices : null
        },
      });

      toast.success(
        hasActualChanges
          ? "Quote approved with changes"
          : "Quote approved successfully"
      );
      setDialogOpen(false);
    } catch (error) {
      console.error("Error approving quote:", error);
      toast.error("Failed to approve quote");
    } finally {
      setSavingApproval(false);
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
    } catch (error) {
      console.error("Error rejecting quote:", error);
      toast.error("Failed to reject quote");
    }
  };

  const handleMarkTestingComplete = async (quote: Quote) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "completed" })
        .eq("id", quote.id);

      if (error) throw error;

      await supabase.from("quote_activity_log").insert({
        quote_id: quote.id,
        activity_type: "testing_completed",
        description: "Lab marked testing as complete",
      });

      toast.success("Testing marked as complete");
      setDialogOpen(false);
    } catch (error) {
      console.error("Error completing testing:", error);
      toast.error("Failed to complete testing");
    }
  };

  const handleStartTesting = async (quote: Quote) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "testing_in_progress" })
        .eq("id", quote.id);

      if (error) throw error;

      await supabase.from("quote_activity_log").insert({
        quote_id: quote.id,
        activity_type: "testing_started",
        description: "Lab started testing",
      });

      toast.success("Testing started");
      refetch();
    } catch (error) {
      console.error("Error starting testing:", error);
      toast.error("Failed to start testing");
    }
  };

  const filteredQuotes = useMemo(() => {
    if (activeTab === "all") return quotes;
    return quotes.filter(q => q.status === activeTab);
  }, [quotes, activeTab]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: quotes.length };
    quotes.forEach(q => {
      counts[q.status] = (counts[q.status] || 0) + 1;
    });
    return counts;
  }, [quotes]);

  const getNextAction = useCallback((quote: Quote) => {
    switch (quote.status) {
      case "sent_to_vendor":
        return permissions.canApproveQuotes ? "Review & Approve" : "View";
      case "delivered":
        return permissions.canSubmitResults ? "Start Testing" : "View";
      case "testing_in_progress":
        return permissions.canSubmitResults ? "Submit Results" : "View";
      default:
        return "View Details";
    }
  }, [permissions.canApproveQuotes, permissions.canSubmitResults]);

  const getNextActionIcon = useCallback((status: string) => {
    switch (status) {
      case "sent_to_vendor":
        return FileText;
      case "delivered":
        return FlaskConical;
      case "testing_in_progress":
        return Upload;
      default:
        return Eye;
    }
  }, []);

  return (
    <LabLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Open Requests</h1>
            <p className="text-muted-foreground mt-1">
              Manage active testing requests through their lifecycle
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {permissions.isReadOnly && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You have read-only access. Contact a lab manager or admin to take actions on requests.
            </AlertDescription>
          </Alert>
        )}

        {/* Status Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="ml-1">{statusCounts.all || 0}</Badge>
            </TabsTrigger>
            {STATUS_ORDER.map(status => (
              statusCounts[status] ? (
                <TabsTrigger key={status} value={status} className="gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
                  {STATUS_LABELS[status]}
                  <Badge variant="secondary" className="ml-1">{statusCounts[status]}</Badge>
                </TabsTrigger>
              ) : null
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredQuotes.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No requests in this status</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuotes.map((quote) => (
                        <OpenRequestRow
                          key={quote.id}
                          quote={quote}
                          getNextActionIcon={getNextActionIcon}
                          getNextAction={getNextAction}
                          onOpen={openQuoteDialog}
                          onHover={handleQuoteHover}
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Request Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Request Details
                {selectedQuote && (
                  <Badge variant="outline" className="gap-1.5 ml-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[selectedQuote.status] || "bg-gray-500"}`} />
                    {STATUS_LABELS[selectedQuote.status] || selectedQuote.status}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedQuote?.quote_number || selectedQuote?.lab_quote_number || "Quote details"}
              </DialogDescription>
            </DialogHeader>

            {selectedQuote && (
              <div className="space-y-6">
                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
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
                  {selectedQuote.tracking_number && (
                    <div>
                      <p className="text-xs text-muted-foreground">Tracking</p>
                      <p className="text-sm font-medium">{selectedQuote.tracking_number}</p>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Test Items ({selectedQuoteItems.length})</Label>
                  {itemsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : selectedQuoteItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No items found</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedQuoteItems.map((item, index) => {
                        const canEditPrice = selectedQuote?.status === "sent_to_vendor" && permissions.canApproveQuotes;
                        const currentBasePrice = getItemPrice(item);
                        const originalPrice = item.price || 0;
                        const isPriceModified = modifiedPrices[item.id] !== undefined && 
                          parseFloat(modifiedPrices[item.id]) !== originalPrice;
                        
                        const hasSamples = item.additional_samples && item.additional_samples > 0;
                        const hasHeaders = item.additional_report_headers && item.additional_report_headers > 0;
                        const defaultSamplePrice = getAdditionalSamplesPrice(item);
                        const defaultHeaderPrice = getAdditionalHeadersPrice(item);
                        const effectiveSamplePrice = getEffectiveSamplePrice(item);
                        const effectiveHeaderPrice = getEffectiveHeaderPrice(item);
                        const isSamplePriceModified = modifiedSamplePrices[item.id] !== undefined;
                        const isHeaderPriceModified = modifiedHeaderPrices[item.id] !== undefined;
                        const itemTotal = getItemTotalPrice(item);
                        
                        return (
                          <div key={item.id} className="border rounded-lg p-4 bg-muted/30">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium">{item.products?.name || "Unknown Compound"}</h4>
                                {item.products?.category && (
                                  <Badge variant="secondary" className="mt-1 text-xs">
                                    {item.products.category}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold">${itemTotal.toFixed(2)}</p>
                                {(isPriceModified || isSamplePriceModified || isHeaderPriceModified) && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                                    Modified
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Client</p>
                                <p className="font-medium">{item.client || "-"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Sample</p>
                                <p className="font-medium">{item.sample || "-"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Manufacturer</p>
                                <p className="font-medium">{item.manufacturer || "-"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Batch</p>
                                <p className="font-medium">{item.batch || "-"}</p>
                              </div>
                            </div>
                            
                            {/* Pricing breakdown section */}
                            <div className="mt-3 pt-3 border-t space-y-2">
                              {/* Base price row */}
                              <PriceInputRow
                                label="Base test price"
                                itemId={item.id}
                                value={modifiedPrices[item.id]}
                                defaultValue={item.price?.toString() || ""}
                                isModified={isPriceModified}
                                canEdit={canEditPrice}
                                displayValue={currentBasePrice}
                                onChange={handlePriceChange}
                              />
                              
                              {/* Additional samples row */}
                              {hasSamples && (
                                <PriceInputRow
                                  label={`+${item.additional_samples} variance sample${item.additional_samples > 1 ? 's' : ''} @ $60 each`}
                                  itemId={item.id}
                                  value={modifiedSamplePrices[item.id]}
                                  defaultValue={defaultSamplePrice.toString()}
                                  isModified={isSamplePriceModified}
                                  canEdit={canEditPrice}
                                  displayValue={effectiveSamplePrice}
                                  onChange={handleSamplePriceChange}
                                />
                              )}
                              
                              {/* Additional headers row */}
                              {hasHeaders && (
                                <PriceInputRow
                                  label={`+${item.additional_report_headers} report header${item.additional_report_headers > 1 ? 's' : ''} @ $30 each`}
                                  itemId={item.id}
                                  value={modifiedHeaderPrices[item.id]}
                                  defaultValue={defaultHeaderPrice.toString()}
                                  isModified={isHeaderPriceModified}
                                  canEdit={canEditPrice}
                                  displayValue={effectiveHeaderPrice}
                                  onChange={handleHeaderPriceChange}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Total Section with Discount */}
                      <div className="flex justify-end pt-2 border-t">
                        <div className="text-right space-y-1">
                          {(() => {
                            const subtotal = selectedQuoteItems.reduce((sum, item) => sum + getItemTotalPrice(item), 0);
                            const discountPercent = modifiedDiscount ? parseFloat(modifiedDiscount) : (selectedQuote?.discount_amount || 0);
                            const discountAmount = discountPercent > 0 ? subtotal * (discountPercent / 100) : 0;
                            const total = subtotal - discountAmount;
                            
                            return (
                              <>
                                <div className="flex justify-between gap-8">
                                  <span className="text-sm text-muted-foreground">Subtotal</span>
                                  <span className="text-sm font-medium">${subtotal.toFixed(2)}</span>
                                </div>
                                {discountPercent > 0 && (
                                  <div className="flex justify-between gap-8 text-green-600">
                                    <span className="text-sm">Discount ({discountPercent}%)</span>
                                    <span className="text-sm font-medium">-${discountAmount.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between gap-8 pt-1 border-t">
                                  <span className="text-sm text-muted-foreground">Total</span>
                                  <span className="text-xl font-bold">${total.toFixed(2)}</span>
                                </div>
                              </>
                            );
                          })()}
                          {hasModifiedPrices() && (
                            <p className="text-xs text-orange-600 mt-1">Includes modified prices</p>
                          )}
                        </div>
                      </div>
                    </div>
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

                {/* Download Options */}
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                    <Download className="h-4 w-4" />
                    Download Order Details
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button variant="outline" size="sm" onClick={() => downloadJSON(selectedQuote, selectedQuoteItems)} className="justify-start">
                      <FileJson className="h-4 w-4 mr-2" />
                      JSON
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadCSV(selectedQuote, selectedQuoteItems)} className="justify-start">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadExcel(selectedQuote, selectedQuoteItems)} className="justify-start">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadText(selectedQuote, selectedQuoteItems)} className="justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Text
                    </Button>
                  </div>
                </div>

                {/* Action Forms based on status */}
                {selectedQuote.status === "sent_to_vendor" && permissions.canApproveQuotes && (
                  <div className="space-y-4 border-t pt-4">
                    <h4 className="font-medium">Review Quote</h4>
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
                    </div>
                    
                    {/* Changes Preview */}
                    {hasAnyChanges(selectedQuote) && (
                      <div className="mt-4 p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                        <h5 className="font-medium text-orange-800 dark:text-orange-200 mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Changes Detected - Customer Approval Required
                        </h5>
                        <div className="space-y-2 text-sm">
                          {getModifiedChanges().map((change, idx) => (
                            <div key={idx} className="flex items-center justify-between py-1 border-b border-orange-200 dark:border-orange-800 last:border-0">
                              <div>
                                <span className="font-medium text-orange-900 dark:text-orange-100">{change.type}</span>
                                <span className="text-orange-700 dark:text-orange-300 ml-1">({change.item})</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground line-through">${change.original.toFixed(2)}</span>
                                <span className="text-orange-600 dark:text-orange-400">→</span>
                                <span className="font-medium text-orange-900 dark:text-orange-100">${change.modified.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                          {getDiscountChange(selectedQuote) && (
                            <div className="flex items-center justify-between py-1 border-b border-orange-200 dark:border-orange-800 last:border-0">
                              <div>
                                <span className="font-medium text-orange-900 dark:text-orange-100">Discount</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground line-through">{getDiscountChange(selectedQuote)!.original}%</span>
                                <span className="text-orange-600 dark:text-orange-400">→</span>
                                <span className="font-medium text-orange-900 dark:text-orange-100">{getDiscountChange(selectedQuote)!.modified}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-3">
                          These changes will require customer approval before the quote proceeds.
                        </p>
                      </div>
                    )}
                    
                    {!hasAnyChanges(selectedQuote) && (
                      <div className="mt-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                          <Check className="h-4 w-4" />
                          No pricing changes. Quote will be approved directly.
                        </p>
                      </div>
                    )}
                    
                    {selectedQuote.status === "sent_to_vendor" && permissions.canApproveQuotes && (
                      <div className="mt-4">
                        <ChangeDetectionDebugPanel data={getChangeDetectionDebugData(selectedQuote)} />
                      </div>
                    )}
                  </div>
                )}

                {selectedQuote.status === "delivered" && permissions.canSubmitResults && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Package has been delivered. Ready to begin testing?
                    </p>
                  </div>
                )}

                {/* Read-only message for members */}
                {permissions.isReadOnly && (
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      You have read-only access. Contact a manager or admin to take actions.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {selectedQuote && !permissions.isReadOnly && (
              <DialogFooter className="flex flex-wrap gap-2">
                {selectedQuote.status === "sent_to_vendor" && permissions.canApproveQuotes && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(selectedQuote)}
                      disabled={savingApproval}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedQuote)}
                      disabled={savingApproval}
                    >
                      {savingApproval ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Approve
                    </Button>
                  </>
                )}

                {selectedQuote.status === "delivered" && permissions.canSubmitResults && (
                  <Button onClick={() => handleStartTesting(selectedQuote)}>
                    <FlaskConical className="h-4 w-4 mr-1" />
                    Start Testing
                  </Button>
                )}

                {selectedQuote.status === "testing_in_progress" && permissions.canSubmitResults && (
                  <Button onClick={() => {
                    setDialogOpen(false);
                    navigate("/lab/results");
                  }}>
                    <Upload className="h-4 w-4 mr-1" />
                    Submit Results
                  </Button>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LabLayout>
  );
}