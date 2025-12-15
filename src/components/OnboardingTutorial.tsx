import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ArrowRight, CheckCircle, Beaker, FileText, CreditCard, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    route: string;
  };
}

const steps: OnboardingStep[] = [
  {
    id: 0,
    title: "Welcome to SafeBatch!",
    description: "We make it easy to request lab testing for your compounds. Let's show you how it works.",
    icon: <CheckCircle className="h-8 w-8 text-primary" />,
  },
  {
    id: 1,
    title: "Request Testing",
    description: "Create a quote by selecting the compounds you need tested and your preferred lab. We'll send your request directly to the lab for pricing confirmation.",
    icon: <FileText className="h-8 w-8 text-accent" />,
    action: {
      label: "Create Your First Quote",
      route: "/quotes",
    },
  },
  {
    id: 2,
    title: "Track Your Orders",
    description: "Once approved, track payments, shipping, and testing progress in real-time. You'll get notified at every step of the process.",
    icon: <Package className="h-8 w-8 text-primary" />,
  },
  {
    id: 3,
    title: "Get Your Results",
    description: "When testing is complete, your lab reports will be available right here. No more digging through emails!",
    icon: <Beaker className="h-8 w-8 text-primary" />,
  },
];

interface OnboardingTutorialProps {
  onComplete: () => void;
}

export const OnboardingTutorial = ({ onComplete }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = async () => {
    await markOnboardingComplete();
    setIsVisible(false);
    onComplete();
  };

  const handleComplete = async () => {
    await markOnboardingComplete();
    setIsVisible(false);
    onComplete();
    
    toast({
      title: "Welcome aboard!",
      description: "You're all set to start creating quotes and managing testing workflows.",
    });
  };

  const markOnboardingComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("profiles")
        .update({ 
          onboarding_completed: true,
          onboarding_step: steps.length 
        })
        .eq("id", user.id);
    } catch (error) {
      console.error("Error updating onboarding status:", error);
    }
  };

  const handleActionClick = () => {
    const step = steps[currentStep];
    if (step.action) {
      navigate(step.action.route);
      handleComplete();
    }
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2 border-primary/20 shadow-2xl animate-scale-in">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">
              Step {currentStep + 1} of {steps.length}
            </Badge>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              {step.icon}
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{step.title}</CardTitle>
              <CardDescription className="text-base">
                {step.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between gap-4 pt-4">
            <Button
              variant="ghost"
              onClick={handleSkip}
            >
              Skip Tutorial
            </Button>

            <div className="flex gap-2">
              {step.action ? (
                <Button onClick={handleActionClick}>
                  {step.action.label} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {currentStep === 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <FileText className="h-6 w-6 text-accent mx-auto mb-2" />
                <p className="text-sm font-medium">Easy Quotes</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Package className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Live Tracking</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Beaker className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Lab Results</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
