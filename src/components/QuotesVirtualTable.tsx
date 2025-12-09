import { useRef, memo, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, Pencil, Trash2, FileText, Check, Mail, RefreshCw, Download, Lock, CheckCircle2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

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

interface QuoteActions {
  view: boolean;
  edit: boolean;
  delete: boolean;
  manageItems: boolean;
  sendToVendor: boolean;
  approveReject: boolean;
  addPayment: boolean;
  addShipping: boolean;
  refreshTracking: boolean;
  exportPDF: boolean;
}

interface QuotesVirtualTableProps {
  quotes: Quote[];
  allQuotesCount: number;
  isQuoteLocked: (status: string) => boolean;
  getAvailableActions: (quote: Quote) => QuoteActions;
  onView: (quote: Quote) => void;
  onEdit: (quote: Quote) => void;
  onDelete: (quoteId: string) => void;
  onManageItems: (quote: Quote) => void;
  onApproveReject: (quote: Quote) => void;
  onAddPayment: (quote: Quote) => void;
  onAddShipping: (quote: Quote) => void;
  onGenerateLabel: (quote: Quote) => void;
  onRefreshTracking: (trackingNumber: string) => void;
  onExportPDF: (quote: Quote) => void;
  canRefreshTracking: () => boolean;
  timeUntilNextRefresh: string;
  hasValidatedCreditCard: boolean;
}

const ROW_HEIGHT = 64;
const MAX_HEIGHT = 600;

const QuoteRow = memo(({
  quote,
  isQuoteLocked,
  getAvailableActions,
  onView,
  onEdit,
  onDelete,
  onManageItems,
  onApproveReject,
  onAddPayment,
  onAddShipping,
  onGenerateLabel,
  onRefreshTracking,
  onExportPDF,
  canRefreshTracking,
  timeUntilNextRefresh,
  hasValidatedCreditCard,
}: Omit<QuotesVirtualTableProps, 'quotes' | 'allQuotesCount'> & { quote: Quote }) => {
  const locked = isQuoteLocked(quote.status);
  const actions = getAvailableActions(quote);

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(100px,1fr)_minmax(80px,1fr)_minmax(100px,1fr)_minmax(120px,1.5fr)_minmax(80px,1fr)_minmax(150px,auto)] gap-4 px-4 items-center border-b h-16",
        locked && "opacity-75",
        quote.status === 'awaiting_customer_approval' && "bg-amber-50 dark:bg-amber-950/20"
      )}
    >
      {/* Quote # */}
      <div className="flex items-center gap-2 min-w-0">
        {locked && <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
        <span className="font-medium truncate">{quote.quote_number || `Quote ${quote.id.slice(0, 8)}`}</span>
        {quote.quote_number?.startsWith('QT-') && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary flex-shrink-0">
            Auto
          </span>
        )}
      </div>

      {/* Lab */}
      <div className="truncate">{quote.labs.name}</div>

      {/* Status */}
      <div>
        {quote.status === 'awaiting_customer_approval' ? (
          <button onClick={() => onApproveReject(quote)} className="hover:opacity-80 transition-opacity">
            <StatusBadge status={quote.status} />
          </button>
        ) : (
          <StatusBadge status={quote.status} />
        )}
      </div>

      {/* Tracking */}
      <div className="hidden md:flex items-center gap-2">
        <div className="flex flex-col min-w-0">
          <span className="truncate max-w-[100px]">{quote.tracking_number || "—"}</span>
          {quote.tracking_number && quote.tracking_updated_at && (
            <span className="text-xs text-muted-foreground">
              {new Date(quote.tracking_updated_at).toLocaleDateString()}
            </span>
          )}
        </div>
        {quote.tracking_number && ['delivered', 'completed', 'testing_in_progress'].includes(quote.status) && (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 flex-shrink-0">
            <CheckCircle2 className="h-3 w-3" />
            Delivered
          </Badge>
        )}
        {quote.tracking_number && quote.status === 'in_transit' && quote.estimated_delivery && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1 flex-shrink-0">
            <Calendar className="h-3 w-3" />
            Est. {new Date(quote.estimated_delivery).toLocaleDateString()}
          </Badge>
        )}
      </div>

      {/* Created */}
      <div className="hidden sm:block text-sm">
        {new Date(quote.created_at).toLocaleDateString()}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-1 flex-shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(quote)}>
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View details</TooltipContent>
          </Tooltip>

          {actions.approveReject && (
            <Button variant="default" size="sm" className="h-8 hidden sm:inline-flex" onClick={() => onApproveReject(quote)}>
              <Check className="h-4 w-4 mr-1" />
              Review
            </Button>
          )}

          {actions.addPayment && (
            <Button variant="default" size="sm" className="h-8 hidden sm:inline-flex" onClick={() => onAddPayment(quote)}>
              💳 Pay
            </Button>
          )}

          {actions.manageItems && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" onClick={() => onManageItems(quote)}>
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{quote.status === 'draft' ? "Manage items" : "Update results"}</TooltipContent>
            </Tooltip>
          )}

          {actions.sendToVendor && (
            <Button variant="default" size="sm" className="h-8 hidden md:inline-flex" onClick={() => onView(quote)}>
              <Mail className="h-4 w-4 mr-1" />
              Send
            </Button>
          )}

          {actions.addShipping && (
            <>
              <Button variant="outline" size="sm" className="h-8 hidden sm:inline-flex" onClick={() => onAddShipping(quote)}>
                Add Shipping
              </Button>
              {hasValidatedCreditCard && (
                <Button variant="default" size="sm" className="h-8 hidden sm:inline-flex" onClick={() => onGenerateLabel(quote)}>
                  📦 Label
                </Button>
              )}
            </>
          )}

          {actions.refreshTracking && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hidden sm:inline-flex"
                    onClick={() => onRefreshTracking(quote.tracking_number!)}
                    disabled={!canRefreshTracking()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{canRefreshTracking() ? "Refresh tracking" : timeUntilNextRefresh}</TooltipContent>
            </Tooltip>
          )}

          {actions.exportPDF && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hidden lg:inline-flex" onClick={() => onExportPDF(quote)}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export PDF</TooltipContent>
            </Tooltip>
          )}

          {actions.edit && !actions.addPayment && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:inline-flex" onClick={() => onEdit(quote)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit quote</TooltipContent>
            </Tooltip>
          )}

          {actions.delete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hidden lg:inline-flex" onClick={() => onDelete(quote.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete quote</TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
});

QuoteRow.displayName = "QuoteRow";

export const QuotesVirtualTable = memo(function QuotesVirtualTable({
  quotes,
  allQuotesCount,
  isQuoteLocked,
  getAvailableActions,
  onView,
  onEdit,
  onDelete,
  onManageItems,
  onApproveReject,
  onAddPayment,
  onAddShipping,
  onGenerateLabel,
  onRefreshTracking,
  onExportPDF,
  canRefreshTracking,
  timeUntilNextRefresh,
  hasValidatedCreditCard,
}: QuotesVirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: quotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => ROW_HEIGHT, []),
    overscan: 15,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const containerHeight = useMemo(() => {
    if (quotes.length === 0) return 100;
    return Math.min(totalSize + 2, MAX_HEIGHT);
  }, [quotes.length, totalSize]);

  if (quotes.length === 0) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[minmax(100px,1fr)_minmax(80px,1fr)_minmax(100px,1fr)_minmax(120px,1.5fr)_minmax(80px,1fr)_minmax(150px,auto)] gap-4 px-4 py-3 bg-muted/50 font-medium text-sm">
          <div>Quote #</div>
          <div>Lab</div>
          <div>Status</div>
          <div className="hidden md:block">Tracking</div>
          <div className="hidden sm:block">Created</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="py-8 text-center text-muted-foreground">
          {allQuotesCount === 0
            ? "No quotes yet. Create your first quote to get started."
            : "No quotes match your filters."}
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[minmax(100px,1fr)_minmax(80px,1fr)_minmax(100px,1fr)_minmax(120px,1.5fr)_minmax(80px,1fr)_minmax(150px,auto)] gap-4 px-4 py-3 bg-muted/50 font-medium text-sm sticky top-0 z-10">
        <div>Quote #</div>
        <div>Lab</div>
        <div>Status</div>
        <div className="hidden md:block">Tracking</div>
        <div className="hidden sm:block">Created</div>
        <div className="text-right">Actions</div>
      </div>
      
      {/* Virtualized rows */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: containerHeight, maxHeight: MAX_HEIGHT }}
      >
        <div style={{ height: totalSize, width: "100%", position: "relative" }}>
          {virtualRows.map((virtualRow) => {
            const quote = quotes[virtualRow.index];
            return (
              <div
                key={quote.id}
                style={{
                  position: "absolute",
                  top: virtualRow.start,
                  left: 0,
                  width: "100%",
                  height: ROW_HEIGHT,
                }}
              >
                <QuoteRow
                  quote={quote}
                  isQuoteLocked={isQuoteLocked}
                  getAvailableActions={getAvailableActions}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onManageItems={onManageItems}
                  onApproveReject={onApproveReject}
                  onAddPayment={onAddPayment}
                  onAddShipping={onAddShipping}
                  onGenerateLabel={onGenerateLabel}
                  onRefreshTracking={onRefreshTracking}
                  onExportPDF={onExportPDF}
                  canRefreshTracking={canRefreshTracking}
                  timeUntilNextRefresh={timeUntilNextRefresh}
                  hasValidatedCreditCard={hasValidatedCreditCard}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
