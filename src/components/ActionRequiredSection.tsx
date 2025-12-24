import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ClipboardCheck, 
  CreditCard, 
  Package,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ActionItem {
  id: string;
  type: 'approval' | 'payment' | 'tracking';
  count: number;
  quoteIds: string[];
}

interface ActionRequiredSectionProps {
  quotesAwaitingApproval: Array<{ id: string; quote_number: string | null }>;
  quotesReadyForPayment: Array<{ id: string; quote_number: string | null }>;
  shipmentsToTrack: Array<{ id: string; quote_number: string | null; tracking_number?: string | null }>;
}

const ActionCard = memo(({ 
  icon: Icon, 
  title, 
  count, 
  colorClass, 
  bgClass,
  onClick 
}: { 
  icon: typeof AlertCircle;
  title: string;
  count: number;
  colorClass: string;
  bgClass: string;
  onClick: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <Card 
      className={`cursor-pointer border-2 transition-all hover:shadow-md ${bgClass}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${colorClass} bg-opacity-20`}>
            <Icon className={`h-5 w-5 ${colorClass.replace('bg-', 'text-')}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`${colorClass} text-white font-bold px-2 py-0.5`}
              >
                {count}
              </Badge>
              <span className="text-sm font-medium truncate">{title}</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
    className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
  >
    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
    <span className="text-sm font-medium text-green-700 dark:text-green-300">
      You're all caught up! ✓
    </span>
  </motion.div>
));
EmptyState.displayName = "EmptyState";

export const ActionRequiredSection = memo(({
  quotesAwaitingApproval,
  quotesReadyForPayment,
  shipmentsToTrack,
}: ActionRequiredSectionProps) => {
  const navigate = useNavigate();

  const hasActions = 
    quotesAwaitingApproval.length > 0 || 
    quotesReadyForPayment.length > 0 || 
    shipmentsToTrack.length > 0;

  const handleApprovalClick = () => {
    if (quotesAwaitingApproval.length === 1) {
      navigate(`/quotes/${quotesAwaitingApproval[0].id}`);
    } else {
      navigate("/quotes?status=pricing_received");
    }
  };

  const handlePaymentClick = () => {
    if (quotesReadyForPayment.length === 1) {
      navigate(`/quotes/${quotesReadyForPayment[0].id}/payment`);
    } else {
      navigate("/quotes?status=approved_payment_pending");
    }
  };

  const handleTrackingClick = () => {
    if (shipmentsToTrack.length === 1) {
      navigate(`/quotes/${shipmentsToTrack[0].id}`);
    } else {
      navigate("/quotes?status=shipped");
    }
  };

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Action Required</h3>
        </div>

        <AnimatePresence mode="wait">
          {!hasActions ? (
            <EmptyState />
          ) : (
            <motion.div 
              className="grid gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {quotesAwaitingApproval.length > 0 && (
                <ActionCard
                  icon={ClipboardCheck}
                  title={quotesAwaitingApproval.length === 1 
                    ? "quote awaiting your approval" 
                    : "quotes awaiting your approval"
                  }
                  count={quotesAwaitingApproval.length}
                  colorClass="bg-amber-500"
                  bgClass="border-amber-200 dark:border-amber-800 hover:border-amber-400"
                  onClick={handleApprovalClick}
                />
              )}

              {quotesReadyForPayment.length > 0 && (
                <ActionCard
                  icon={CreditCard}
                  title={quotesReadyForPayment.length === 1 
                    ? "quote ready for payment" 
                    : "quotes ready for payment"
                  }
                  count={quotesReadyForPayment.length}
                  colorClass="bg-blue-500"
                  bgClass="border-blue-200 dark:border-blue-800 hover:border-blue-400"
                  onClick={handlePaymentClick}
                />
              )}

              {shipmentsToTrack.length > 0 && (
                <ActionCard
                  icon={Package}
                  title={shipmentsToTrack.length === 1 
                    ? "Track your shipment" 
                    : "shipments to track"
                  }
                  count={shipmentsToTrack.length}
                  colorClass="bg-purple-500"
                  bgClass="border-purple-200 dark:border-purple-800 hover:border-purple-400"
                  onClick={handleTrackingClick}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
});

ActionRequiredSection.displayName = "ActionRequiredSection";
