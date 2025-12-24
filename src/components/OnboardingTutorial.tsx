import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X, ArrowRight, ArrowLeft, CheckCircle, Beaker, FileText, Package, Building2, FlaskConical, ClipboardList, Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  illustration: React.ReactNode;
  tips?: string[];
}

const steps: OnboardingStep[] = [
  {
    id: 0,
    title: "Welcome to SafeBatch!",
    description: "Your all-in-one platform for requesting, tracking, and managing lab testing for your compounds. We connect you directly with labs to streamline your testing workflow.",
    icon: <Sparkles className="h-6 w-6" />,
    illustration: (
      <div className="relative w-full h-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 rounded-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="p-4 rounded-xl bg-primary/20 animate-pulse">
            <Beaker className="h-10 w-10 text-primary" />
          </div>
          <ArrowRight className="h-6 w-6 text-muted-foreground" />
          <div className="p-4 rounded-xl bg-accent/20">
            <FileText className="h-10 w-10 text-accent" />
          </div>
          <ArrowRight className="h-6 w-6 text-muted-foreground" />
          <div className="p-4 rounded-xl bg-primary/20">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
        </div>
      </div>
    ),
    tips: [
      "Request lab testing in minutes",
      "Track your orders in real-time",
      "Access results all in one place"
    ]
  },
  {
    id: 1,
    title: "Step 1: Select a Lab",
    description: "Start by choosing from our network of trusted testing laboratories. Each lab has different specialties and pricing.",
    icon: <Building2 className="h-6 w-6" />,
    illustration: (
      <div className="relative w-full h-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-accent/5 rounded-2xl" />
        <div className="relative grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`p-3 rounded-lg border-2 transition-all ${i === 2 ? 'border-accent bg-accent/10 scale-110' : 'border-border bg-background/50'}`}
            >
              <Building2 className={`h-8 w-8 ${i === 2 ? 'text-accent' : 'text-muted-foreground'}`} />
            </div>
          ))}
        </div>
      </div>
    ),
    tips: [
      "Compare labs based on your testing needs",
      "View lab-specific pricing for compounds",
      "Request new labs if yours isn't listed"
    ]
  },
  {
    id: 2,
    title: "Step 2: Choose Compounds",
    description: "Select the compounds you need tested from our comprehensive catalog. You can test multiple compounds in a single quote.",
    icon: <FlaskConical className="h-6 w-6" />,
    illustration: (
      <div className="relative w-full h-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl" />
        <div className="relative flex flex-wrap gap-2 justify-center max-w-xs">
          {['Heavy Metals', 'Pesticides', 'Potency', 'Microbial'].map((compound, i) => (
            <Badge 
              key={compound}
              variant={i < 2 ? "default" : "outline"}
              className={`text-xs ${i < 2 ? 'bg-primary' : ''}`}
            >
              {i < 2 && <CheckCircle className="h-3 w-3 mr-1" />}
              {compound}
            </Badge>
          ))}
        </div>
      </div>
    ),
    tips: [
      "Search by compound name or category",
      "Select multiple tests per quote",
      "See estimated pricing before submitting"
    ]
  },
  {
    id: 3,
    title: "Step 3: Add Sample Details",
    description: "Provide details about your samples including batch numbers, manufacturers, and any special notes for the lab.",
    icon: <ClipboardList className="h-6 w-6" />,
    illustration: (
      <div className="relative w-full h-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-accent/5 rounded-2xl" />
        <div className="relative bg-card border rounded-lg p-3 shadow-sm w-48">
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded w-16" />
            <div className="h-3 bg-primary/30 rounded w-full" />
            <div className="h-2 bg-muted rounded w-20" />
            <div className="h-3 bg-primary/30 rounded w-3/4" />
            <div className="h-2 bg-muted rounded w-12" />
            <div className="h-3 bg-primary/30 rounded w-1/2" />
          </div>
        </div>
      </div>
    ),
    tips: [
      "Include batch/lot numbers for traceability",
      "Add manufacturer information",
      "Include any special testing instructions"
    ]
  },
  {
    id: 4,
    title: "Step 4: Submit for Pricing",
    description: "Review your quote and submit it to the lab. They'll confirm pricing and you'll be notified when it's ready for approval.",
    icon: <Send className="h-6 w-6" />,
    illustration: (
      <div className="relative w-full h-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="p-3 rounded-lg bg-card border shadow-sm">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <motion.div
            animate={{ x: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ArrowRight className="h-6 w-6 text-primary" />
          </motion.div>
          <div className="p-3 rounded-lg bg-primary/20 border border-primary/30">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
          >
            <CheckCircle className="h-6 w-6 text-green-500" />
          </motion.div>
        </div>
      </div>
    ),
    tips: [
      "Labs typically respond within 24-48 hours",
      "You'll get email notifications on updates",
      "Approve pricing to proceed with payment"
    ]
  },
  {
    id: 5,
    title: "You're All Set!",
    description: "You're ready to submit your first quote. Track your orders, manage payments, and access your lab results all from your dashboard.",
    icon: <CheckCircle className="h-6 w-6" />,
    illustration: (
      <div className="relative w-full h-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-2xl" />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative"
        >
          <div className="p-6 rounded-full bg-green-500/20">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
        </motion.div>
      </div>
    ),
    tips: [
      "View all quotes from your Dashboard",
      "Track shipping with real-time updates",
      "Download lab reports when ready"
    ]
  }
];

interface OnboardingTutorialProps {
  onComplete: () => void;
}

export const OnboardingTutorial = ({ onComplete }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
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

  const handleStartQuote = async () => {
    await markOnboardingComplete();
    setIsVisible(false);
    onComplete();
    navigate("/quotes");
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

      // Also store in localStorage as backup
      if (dontShowAgain) {
        localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      }
    } catch (error) {
      console.error("Error updating onboarding status:", error);
    }
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-xl w-full border-2 border-primary/20 shadow-2xl overflow-hidden">
        {/* Progress bar at top */}
        <div className="h-1 bg-muted">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <CardHeader className="relative pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
          
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="gap-1">
              {step.icon}
              {currentStep + 1} / {steps.length}
            </Badge>
          </div>

          {/* Step dots */}
          <div className="flex gap-1.5 mb-4">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentStep 
                    ? 'w-6 bg-primary' 
                    : index < currentStep 
                      ? 'w-1.5 bg-primary/50' 
                      : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Illustration */}
              {step.illustration}

              {/* Title and description */}
              <div className="text-center space-y-2">
                <CardTitle className="text-xl">{step.title}</CardTitle>
                <CardDescription className="text-sm">
                  {step.description}
                </CardDescription>
              </div>

              {/* Tips */}
              {step.tips && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                  {step.tips.map((tip, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer actions */}
          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevious}
                    className="gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                {!isLastStep && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                  >
                    Skip
                  </Button>
                )}
                {isLastStep ? (
                  <Button onClick={handleStartQuote} className="gap-1">
                    Create Your First Quote
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleNext} className="gap-1">
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Don't show again checkbox */}
            <div className="flex items-center justify-center gap-2 pt-1 border-t">
              <Checkbox 
                id="dontShowAgain" 
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
              <label 
                htmlFor="dontShowAgain" 
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Don't show this again
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
