import React, { memo } from "react";
import { Check, Circle, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TimelineStep {
  key: string;
  label: string;
  description: string;
  estimatedTime?: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    key: "draft",
    label: "Draft",
    description: "Quote is being prepared and hasn't been sent to the lab yet.",
  },
  {
    key: "sent",
    label: "Sent to Lab",
    description: "Quote has been submitted to the lab for pricing review.",
    estimatedTime: "1-2 business days",
  },
  {
    key: "pricing_ready",
    label: "Pricing Ready",
    description: "Lab has reviewed and provided pricing. Awaiting your approval.",
  },
  {
    key: "approved",
    label: "Approved",
    description: "You've approved the quote. Payment is now required.",
  },
  {
    key: "paid",
    label: "Paid",
    description: "Payment received. Waiting for sample shipment.",
  },
  {
    key: "shipped",
    label: "Shipped",
    description: "Samples have been shipped to the lab.",
    estimatedTime: "2-5 business days for delivery",
  },
  {
    key: "testing",
    label: "Testing",
    description: "Lab is actively testing your samples.",
    estimatedTime: "5-10 business days",
  },
  {
    key: "complete",
    label: "Complete",
    description: "All testing is complete. Reports are available.",
  },
];

// Map database status values to timeline step keys
const STATUS_MAP: Record<string, string> = {
  draft: "draft",
  sent: "sent",
  pending: "sent",
  quoted: "pricing_ready",
  approved: "approved",
  approved_payment_pending: "approved",
  paid: "paid",
  paid_awaiting_shipping: "paid",
  shipped: "shipped",
  in_transit: "shipped",
  delivered: "testing",
  testing: "testing",
  in_progress: "testing",
  completed: "complete",
  complete: "complete",
  rejected: "draft", // Special case handled separately
};

interface QuoteStatusTimelineProps {
  status: string;
  estimatedDelivery?: string | null;
  shippedDate?: string | null;
  className?: string;
}

const QuoteStatusTimeline = memo(function QuoteStatusTimeline({
  status,
  estimatedDelivery,
  shippedDate,
  className,
}: QuoteStatusTimelineProps) {
  const normalizedStatus = STATUS_MAP[status.toLowerCase()] || "draft";
  const currentStepIndex = TIMELINE_STEPS.findIndex(
    (step) => step.key === normalizedStatus
  );
  const isRejected = status.toLowerCase() === "rejected";

  const getStepState = (index: number): "completed" | "current" | "future" => {
    if (index < currentStepIndex) return "completed";
    if (index === currentStepIndex) return "current";
    return "future";
  };

  const getEstimatedTime = (step: TimelineStep, index: number): string | null => {
    if (index !== currentStepIndex) return null;
    
    // If we have actual estimated delivery and we're in shipped/testing phase
    if (estimatedDelivery && (step.key === "shipped" || step.key === "testing")) {
      const estDate = new Date(estimatedDelivery);
      const now = new Date();
      const daysLeft = Math.ceil((estDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0) {
        return `Est. ${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`;
      } else if (daysLeft === 0) {
        return "Expected today";
      }
    }
    
    return step.estimatedTime || null;
  };

  if (isRejected) {
    return (
      <div className={cn("p-4 rounded-lg border border-destructive/30 bg-destructive/5", className)}>
        <div className="flex items-center gap-2 text-destructive">
          <Circle className="h-5 w-5 fill-destructive" />
          <span className="font-medium">Quote Rejected</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          This quote was rejected. Please create a new quote or contact support.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("relative", className)}>
        {/* Mobile: Vertical timeline */}
        <div className="md:hidden space-y-0">
          {TIMELINE_STEPS.map((step, index) => {
            const state = getStepState(index);
            const estimatedTime = getEstimatedTime(step, index);
            
            return (
              <div key={step.key} className="flex gap-3">
                {/* Line and dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      state === "completed" && "bg-primary text-primary-foreground",
                      state === "current" && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                      state === "future" && "bg-muted border-2 border-muted-foreground/30"
                    )}
                  >
                    {state === "completed" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : state === "current" ? (
                      <Circle className="h-2.5 w-2.5 fill-current" />
                    ) : (
                      <Circle className="h-2.5 w-2.5 text-muted-foreground/50" />
                    )}
                  </div>
                  {index < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "w-0.5 h-8 transition-colors",
                        state === "completed" ? "bg-primary" : "bg-muted-foreground/20"
                      )}
                    />
                  )}
                </div>
                
                {/* Content */}
                <div className="pb-6">
                  <p
                    className={cn(
                      "font-medium text-sm",
                      state === "completed" && "text-foreground",
                      state === "current" && "text-primary",
                      state === "future" && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  {state === "current" && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  )}
                  {estimatedTime && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{estimatedTime}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: Horizontal timeline */}
        <div className="hidden md:block">
          <div className="flex items-start justify-between relative">
            {/* Background line */}
            <div className="absolute top-3 left-0 right-0 h-0.5 bg-muted-foreground/20" />
            {/* Progress line */}
            <div
              className="absolute top-3 left-0 h-0.5 bg-primary transition-all duration-500"
              style={{
                width: `${(currentStepIndex / (TIMELINE_STEPS.length - 1)) * 100}%`,
              }}
            />

            {TIMELINE_STEPS.map((step, index) => {
              const state = getStepState(index);
              const estimatedTime = getEstimatedTime(step, index);

              return (
                <Tooltip key={step.key}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center relative z-10 cursor-help">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all",
                          state === "completed" && "bg-primary text-primary-foreground",
                          state === "current" && "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110",
                          state === "future" && "bg-background border-2 border-muted-foreground/30"
                        )}
                      >
                        {state === "completed" ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : state === "current" ? (
                          <Circle className="h-2.5 w-2.5 fill-current" />
                        ) : (
                          <Circle className="h-2.5 w-2.5 text-muted-foreground/50" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs mt-2 font-medium text-center max-w-[80px]",
                          state === "completed" && "text-foreground",
                          state === "current" && "text-primary",
                          state === "future" && "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                      {estimatedTime && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          <span className="max-w-[70px] text-center">{estimatedTime}</span>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                    {step.estimatedTime && state === "future" && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {step.estimatedTime}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});

export default QuoteStatusTimeline;
