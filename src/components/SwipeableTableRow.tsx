import { ReactNode, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Eye, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeableTableRowProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  className?: string;
}

export function SwipeableTableRow({
  children,
  onEdit,
  onDelete,
  onView,
  className,
}: SwipeableTableRowProps) {
  const [swiped, setSwiped] = useState(false);

  const handlers = useSwipeable({
    onSwipedLeft: () => setSwiped(true),
    onSwipedRight: () => setSwiped(false),
    trackMouse: false,
    trackTouch: true,
  });

  return (
    <div className="relative overflow-hidden md:contents">
      {/* Action buttons revealed on swipe (mobile only) */}
      {swiped && (
        <div className="absolute right-0 top-0 h-full bg-muted/90 flex items-center gap-1 px-2 z-10 md:hidden">
          {onView && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onView();
                setSwiped(false);
              }}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {onEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onEdit();
                setSwiped(false);
              }}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onDelete();
                setSwiped(false);
              }}
              className="h-8 w-8 p-0 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSwiped(false)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <TableRow
        {...handlers}
        className={cn(
          "transition-transform duration-200 md:transition-none",
          swiped && "-translate-x-32 md:translate-x-0",
          className
        )}
      >
        {children}
      </TableRow>
    </div>
  );
}
