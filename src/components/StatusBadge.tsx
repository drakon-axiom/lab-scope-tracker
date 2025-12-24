import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = memo(({ status }: StatusBadgeProps) => {
  const { color, label } = useMemo(() => {
    const statusLower = status.toLowerCase();
    
    // User-friendly labels mapping
    const friendlyLabels: Record<string, string> = {
      sent_to_vendor: "Waiting for Lab Pricing",
      awaiting_customer_approval: "Ready for Your Review",
      pricing_received: "Ready for Your Review",
      approved_payment_pending: "Payment Required",
      paid_awaiting_shipping: "Ship Your Samples",
      in_transit: "Samples on the Way",
      shipped: "Samples on the Way",
      testing_in_progress: "Testing in Progress",
      completed: "Complete",
      draft: "Draft",
      pending: "Pending",
      rejected: "Rejected",
      delivered: "Delivered",
      failed: "Failed",
    };

    // Color mapping
    let color: string;
    switch (statusLower) {
      case "completed":
        color = "bg-success text-white";
        break;
      case "testing_in_progress":
      case "in-progress":
        color = "bg-info text-white";
        break;
      case "draft":
      case "pending":
        color = "bg-warning text-white";
        break;
      case "sent_to_vendor":
        color = "bg-purple-500 text-white";
        break;
      case "awaiting_customer_approval":
      case "pricing_received":
        color = "bg-amber-500 text-white";
        break;
      case "approved_payment_pending":
        color = "bg-green-500 text-white";
        break;
      case "rejected":
        color = "bg-red-500 text-white";
        break;
      case "paid_awaiting_shipping":
        color = "bg-emerald-500 text-white";
        break;
      case "in_transit":
      case "shipped":
        color = "bg-blue-500 text-white";
        break;
      case "delivered":
        color = "bg-cyan-500 text-white";
        break;
      case "failed":
        color = "bg-destructive text-destructive-foreground";
        break;
      default:
        color = "bg-muted text-muted-foreground";
    }

    const label = friendlyLabels[statusLower] || status.replace(/_/g, ' ');

    return { color, label };
  }, [status]);

  return (
    <Badge className={cn("capitalize whitespace-nowrap", color)}>
      {label}
    </Badge>
  );
});

StatusBadge.displayName = "StatusBadge";

export default StatusBadge;
