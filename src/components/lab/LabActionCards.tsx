import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  CreditCard, 
  Package, 
  FlaskConical,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";

interface LabActionCardsProps {
  newRequests: number;
  paymentsReported: number;
  readyToShip: number;
  testsInProgress: number;
}

interface ActionCardProps {
  icon: typeof FileText;
  count: number;
  title: string;
  subtitle: string;
  buttonText: string;
  onClick: () => void;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

const ActionCard = memo(({
  icon: Icon,
  count,
  title,
  subtitle,
  buttonText,
  onClick,
  colorClass,
  bgClass,
  borderClass,
}: ActionCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <Card className={`overflow-hidden border-2 ${borderClass} ${bgClass}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-full ${colorClass} bg-opacity-20 flex-shrink-0`}>
            <Icon className={`h-6 w-6 ${colorClass.replace('bg-', 'text-')}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-2xl font-bold ${colorClass.replace('bg-', 'text-')}`}>
                {count}
              </span>
              <span className="font-semibold text-foreground truncate">{title}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{subtitle}</p>
            <Button 
              size="sm" 
              onClick={onClick}
              className="w-full sm:w-auto"
              variant={count > 0 ? "default" : "outline"}
            >
              {buttonText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
));
ActionCard.displayName = "ActionCard";

const EmptyState = memo(() => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="col-span-full flex items-center justify-center gap-2 p-6 rounded-lg bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 border-dashed"
  >
    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
    <span className="text-lg font-medium text-green-700 dark:text-green-300">
      All caught up! No pending actions.
    </span>
  </motion.div>
));
EmptyState.displayName = "EmptyState";

export const LabActionCards = memo(({
  newRequests,
  paymentsReported,
  readyToShip,
  testsInProgress,
}: LabActionCardsProps) => {
  const navigate = useNavigate();

  const hasAnyActions = newRequests > 0 || paymentsReported > 0 || readyToShip > 0 || testsInProgress > 0;

  const actionCards = [
    {
      icon: FileText,
      count: newRequests,
      title: "New Requests",
      subtitle: "Need pricing response",
      buttonText: "Review Now",
      onClick: () => navigate("/lab/open-requests"),
      colorClass: "bg-red-500",
      bgClass: "bg-red-50/50 dark:bg-red-950/20",
      borderClass: "border-red-200 dark:border-red-800",
      show: true,
    },
    {
      icon: CreditCard,
      count: paymentsReported,
      title: "Payments Reported",
      subtitle: "Verify and ship samples",
      buttonText: "View Payments",
      onClick: () => navigate("/lab/payments"),
      colorClass: "bg-amber-500",
      bgClass: "bg-amber-50/50 dark:bg-amber-950/20",
      borderClass: "border-amber-200 dark:border-amber-800",
      show: true,
    },
    {
      icon: Package,
      count: readyToShip,
      title: "Ready to Ship",
      subtitle: "Add tracking info",
      buttonText: "Add Tracking",
      onClick: () => navigate("/lab/shipping"),
      colorClass: "bg-blue-500",
      bgClass: "bg-blue-50/50 dark:bg-blue-950/20",
      borderClass: "border-blue-200 dark:border-blue-800",
      show: true,
    },
    {
      icon: FlaskConical,
      count: testsInProgress,
      title: "Tests in Progress",
      subtitle: "Submit results when ready",
      buttonText: "View Tests",
      onClick: () => navigate("/lab/results"),
      colorClass: "bg-purple-500",
      bgClass: "bg-purple-50/50 dark:bg-purple-950/20",
      borderClass: "border-purple-200 dark:border-purple-800",
      show: true,
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          {hasAnyActions && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </>
          )}
          {!hasAnyActions && (
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          )}
        </span>
        Action Required
      </h2>
      
      {!hasAnyActions ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {actionCards
            .filter(card => card.show && card.count > 0)
            .map((card) => (
              <ActionCard key={card.title} {...card} />
            ))}
        </div>
      )}
    </div>
  );
});

LabActionCards.displayName = "LabActionCards";
