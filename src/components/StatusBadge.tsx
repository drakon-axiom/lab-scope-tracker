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
      case "in_transit":
        return "bg-info text-white";
      case "draft":
      case "pending":
        return "bg-warning text-white";
      case "sent_to_vendor":
      case "approved":
      case "shipped":
      case "delivered":
        return "bg-blue-500 text-white";
      case "test_records_generated":
        return "bg-purple-500 text-white";
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
