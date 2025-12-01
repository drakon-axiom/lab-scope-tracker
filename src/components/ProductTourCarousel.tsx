import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import dashboardImg from "@/assets/demo-dashboard.png";
import quoteImg from "@/assets/demo-quote-creation.png";
import trackingImg from "@/assets/demo-tracking.png";

const tourSteps = [
  {
    id: 1,
    title: "Unified Dashboard",
    description: "Monitor all your testing operations in one place. Track quote pipeline, active shipments, and usage metrics at a glance.",
    image: dashboardImg,
    highlights: [
      "Real-time pipeline metrics",
      "Shipment tracking timeline",
      "Usage monitoring"
    ]
  },
  {
    id: 2,
    title: "Quick Quote Creation",
    description: "Create professional testing quotes in seconds. Select compounds, choose labs, and generate accurate pricing instantly.",
    image: quoteImg,
    highlights: [
      "Smart compound selection",
      "Automated pricing",
      "Vendor integration"
    ]
  },
  {
    id: 3,
    title: "Automated Tracking",
    description: "Track shipments automatically with UPS integration. Get real-time updates and delivery confirmations without manual checking.",
    image: trackingImg,
    highlights: [
      "UPS API integration",
      "Automatic status updates",
      "Delivery notifications"
    ]
  }
];

export const ProductTourCarousel = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    setCurrentStep((prev) => (prev + 1) % tourSteps.length);
  };

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1 + tourSteps.length) % tourSteps.length);
  };

  const step = tourSteps[currentStep];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-2 hover:border-primary/50 transition-colors">
        <div className="relative aspect-video bg-muted/30">
          <img
            src={step.image}
            alt={step.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Step {currentStep + 1} of {tourSteps.length}
                </Badge>
              </div>
              <h3 className="text-2xl font-bold">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {step.highlights.map((highlight, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {highlight}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-1">
              {tourSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? "w-8 bg-primary"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextStep}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
