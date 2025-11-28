import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { Eye, Pencil, Package, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Quote {
  id: string;
  lab_id: string;
  quote_number: string | null;
  status: string;
  notes: string | null;
  tracking_number: string | null;
  shipped_date: string | null;
  created_at: string;
  tracking_updated_at: string | null;
  payment_status: string | null;
  payment_amount_usd: number | null;
  payment_amount_crypto: string | null;
  payment_date: string | null;
  transaction_id: string | null;
  labs: { name: string };
}

interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  color: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "draft", title: "Draft", status: "draft", color: "bg-muted" },
  { id: "sent_to_vendor", title: "Sent to Vendor", status: "sent_to_vendor", color: "bg-blue-100" },
  { id: "approved", title: "Approved", status: "approved", color: "bg-green-100" },
  { id: "payment_pending", title: "Payment Pending", status: "payment_pending", color: "bg-yellow-100" },
  { id: "paid", title: "Paid", status: "paid", color: "bg-emerald-100" },
  { id: "shipped", title: "Shipped", status: "shipped", color: "bg-purple-100" },
  { id: "in_transit", title: "In Transit", status: "in_transit", color: "bg-indigo-100" },
  { id: "delivered", title: "Delivered", status: "delivered", color: "bg-cyan-100" },
  { id: "testing_in_progress", title: "Testing in Progress", status: "testing_in_progress", color: "bg-orange-100" },
  { id: "completed", title: "Completed", status: "completed", color: "bg-green-200" },
];

interface QuoteKanbanBoardProps {
  quotes: Quote[];
  onStatusUpdate: (quoteId: string, newStatus: string) => void;
  onViewQuote: (quote: Quote) => void;
  onEditQuote: (quote: Quote) => void;
  onManageItems: (quote: Quote) => void;
}

// Helper function to check if quote is locked (paid or later status)
const isQuoteLocked = (status: string) => {
  const lockedStatuses = ['paid', 'shipped', 'in_transit', 'delivered', 'testing_in_progress', 'completed'];
  return lockedStatuses.includes(status);
};

export function QuoteKanbanBoard({
  quotes,
  onStatusUpdate,
  onViewQuote,
  onEditQuote,
  onManageItems,
}: QuoteKanbanBoardProps) {
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const quote = quotes.find((q) => q.id === event.active.id);
    setActiveQuote(quote || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Check if the quote is locked before allowing status change
      const quote = quotes.find((q) => q.id === active.id);
      if (quote && isQuoteLocked(quote.status)) {
        setActiveQuote(null);
        setOverId(null);
        return; // Prevent status update for locked quotes
      }

      // Check if dropping on a column
      const column = KANBAN_COLUMNS.find(col => col.id === over.id);
      if (column) {
        onStatusUpdate(active.id as string, column.status);
      }
    }

    setActiveQuote(null);
    setOverId(null);
  };

  const getQuotesForColumn = (status: string) => {
    return quotes.filter((quote) => quote.status === status);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
        {KANBAN_COLUMNS.map((column) => {
          const columnQuotes = getQuotesForColumn(column.status);

          return (
            <KanbanColumn
              key={column.id}
              column={column}
              quotes={columnQuotes}
              isOver={overId === column.id}
              onViewQuote={onViewQuote}
              onEditQuote={onEditQuote}
              onManageItems={onManageItems}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeQuote ? (
          <QuoteCard
            quote={activeQuote}
            isDragging
            onViewQuote={() => {}}
            onEditQuote={() => {}}
            onManageItems={() => {}}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  column: KanbanColumn;
  quotes: Quote[];
  isOver: boolean;
  onViewQuote: (quote: Quote) => void;
  onEditQuote: (quote: Quote) => void;
  onManageItems: (quote: Quote) => void;
}

function KanbanColumn({
  column,
  quotes,
  isOver,
  onViewQuote,
  onEditQuote,
  onManageItems,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-80 flex flex-col transition-all",
        isOver && "ring-2 ring-primary"
      )}
    >
      <div className={cn("rounded-t-lg p-4 border-b-2 border-border", column.color)}>
        <h3 className="font-semibold text-sm flex items-center justify-between">
          <span>{column.title}</span>
          <Badge variant="secondary" className="ml-2">
            {quotes.length}
          </Badge>
        </h3>
      </div>

      <div
        className="flex-1 bg-muted/30 rounded-b-lg p-2 space-y-2 min-h-[400px] border border-t-0 border-border"
        style={{ minHeight: "500px" }}
      >
        {quotes.map((quote) => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            onViewQuote={onViewQuote}
            onEditQuote={onEditQuote}
            onManageItems={onManageItems}
            isLocked={isQuoteLocked(quote.status)}
          />
        ))}

        {quotes.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Drop quotes here
          </div>
        )}
      </div>
    </div>
  );
}

interface QuoteCardProps {
  quote: Quote;
  isDragging?: boolean;
  isLocked?: boolean;
  onViewQuote: (quote: Quote) => void;
  onEditQuote: (quote: Quote) => void;
  onManageItems: (quote: Quote) => void;
}

function QuoteCard({
  quote,
  isDragging = false,
  isLocked = false,
  onViewQuote,
  onEditQuote,
  onManageItems,
}: QuoteCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: quote.id,
    disabled: isLocked,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...(isLocked ? {} : listeners)}
      {...attributes}
      className={cn(
        "transition-all hover:shadow-md animate-fade-in",
        !isLocked && "cursor-grab active:cursor-grabbing",
        isLocked && "opacity-75",
        isDragging && "opacity-50 rotate-2 shadow-xl scale-105"
      )}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              {isLocked && (
                <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              <h4 className="font-medium text-sm">
                {quote.quote_number || "No Quote #"}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{quote.labs.name}</p>
          </div>
          <StatusBadge status={quote.status} />
        </div>

        {quote.tracking_number && (
          <div className="text-xs">
            <span className="text-muted-foreground">Tracking:</span>{" "}
            <span className="font-mono">{quote.tracking_number}</span>
          </div>
        )}

        {quote.payment_status && quote.payment_status !== "pending" && (
          <div className="text-xs">
            <Badge variant="outline" className="text-xs">
              {quote.payment_status === "paid_usd" && "Paid (USD)"}
              {quote.payment_status === "paid_crypto" && "Paid (Crypto)"}
            </Badge>
          </div>
        )}

        {quote.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2">{quote.notes}</p>
        )}

        <div className="text-xs text-muted-foreground">
          {new Date(quote.created_at).toLocaleDateString()}
        </div>

        <div className="flex gap-1 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1 text-xs"
            onClick={() => onViewQuote(quote)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1 text-xs"
            onClick={() => onEditQuote(quote)}
            disabled={isLocked}
            title={isLocked ? "Cannot edit paid quotes" : "Edit quote"}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1 text-xs"
            onClick={() => onManageItems(quote)}
            disabled={isLocked}
            title={isLocked ? "Cannot modify items in paid quotes" : "Manage items"}
          >
            <Package className="h-3 w-3 mr-1" />
            Items
          </Button>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
