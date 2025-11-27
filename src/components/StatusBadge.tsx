import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
const getStatusColor = (status: string) => {
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
      case "approved":
        return "bg-green-500 text-white";
      case "payment_pending":
        return "bg-orange-500 text-white";
      case "paid":
        return "bg-emerald-500 text-white";
      case "shipped":
      case "in_transit":
        return "bg-blue-500 text-white";
      case "delivered":
        return "bg-cyan-500 text-white";
      case "failed":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Badge className={cn("capitalize", getStatusColor(status))}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
};

export default StatusBadge;
