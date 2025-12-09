import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = memo(({ status }: StatusBadgeProps) => {
  const statusColor = useMemo(() => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-success text-white";
      case "testing_in_progress":
      case "in-progress":
        return "bg-info text-white";
      case "draft":
      case "pending":
        return "bg-warning text-white";
      case "sent_to_vendor":
        return "bg-purple-500 text-white";
      case "awaiting_customer_approval":
        return "bg-amber-500 text-white";
      case "approved_payment_pending":
        return "bg-green-500 text-white";
      case "rejected":
        return "bg-red-500 text-white";
      case "paid_awaiting_shipping":
        return "bg-emerald-500 text-white";
      case "in_transit":
        return "bg-blue-500 text-white";
      case "delivered":
        return "bg-cyan-500 text-white";
      case "failed":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  }, [status]);

  return (
    <Badge className={cn("capitalize", statusColor)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
});

StatusBadge.displayName = "StatusBadge";

export default StatusBadge;
