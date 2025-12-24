import { useState, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Package, 
  DollarSign, 
  Layers, 
  Percent, 
  Eye,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface QuoteItem {
  id: string;
  product_id: string;
  price: number | null;
  client: string | null;
  sample: string | null;
  manufacturer: string | null;
  batch: string | null;
  additional_samples: number | null;
  additional_report_headers: number | null;
  status: string | null;
  products?: { name: string; category: string | null };
}

interface Quote {
  id: string;
  quote_number: string | null;
  lab_quote_number: string | null;
  status: string;
  created_at: string;
  notes: string | null;
  discount_amount: number | null;
  discount_type: string | null;
}

interface VendorPricing {
  product_id: string;
  price: number;
}

interface PricingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote;
  items: QuoteItem[];
  vendorPricing: VendorPricing[];
  onComplete: (prices: Record<string, string>, discount: string) => void;
}

const ADDITIONAL_SAMPLE_PRICE = 60;
const ADDITIONAL_HEADER_PRICE = 30;

const steps = [
  {
    id: 1,
    title: "Review Compounds",
    description: "Review customer's requested testing",
    icon: Package,
    helpText: "This shows all the compounds and tests the customer has requested. Review the items to understand what pricing is needed."
  },
  {
    id: 2,
    title: "Set Base Prices",
    description: "Price each compound from your catalog",
    icon: DollarSign,
    helpText: "Enter the base price for each test. Suggested prices from your pricing catalog are shown if available. You can accept or modify these."
  },
  {
    id: 3,
    title: "Additional Charges",
    description: "Review variance samples & report headers",
    icon: Layers,
    helpText: "Additional samples (variance testing) cost $60 each and additional report headers cost $30 each. These are auto-calculated but you can modify them."
  },
  {
    id: 4,
    title: "Apply Discount",
    description: "Optional discount for this order",
    icon: Percent,
    helpText: "Apply a percentage discount to the entire order. This is optional and will be shown to the customer for approval."
  },
  {
    id: 5,
    title: "Preview & Submit",
    description: "Review final pricing before sending",
    icon: Eye,
    helpText: "Review the complete pricing breakdown before submitting. The customer will see this quote and can approve or request changes."
  },
];

const HelpIcon = memo(({ helpText }: { helpText: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="ml-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{helpText}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
));
HelpIcon.displayName = "HelpIcon";

const StepIndicator = memo(({ 
  currentStep, 
  totalSteps 
}: { 
  currentStep: number; 
  totalSteps: number; 
}) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
      <div key={step} className="flex items-center">
        <motion.div
          initial={false}
          animate={{
            scale: step === currentStep ? 1.1 : 1,
            backgroundColor: step <= currentStep ? "hsl(var(--primary))" : "hsl(var(--muted))"
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step <= currentStep ? "text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {step < currentStep ? <Check className="h-4 w-4" /> : step}
        </motion.div>
        {step < totalSteps && (
          <div className={`w-8 h-0.5 mx-1 ${
            step < currentStep ? "bg-primary" : "bg-muted"
          }`} />
        )}
      </div>
    ))}
  </div>
));
StepIndicator.displayName = "StepIndicator";

export const PricingWizard = memo(({
  open,
  onOpenChange,
  quote,
  items,
  vendorPricing,
  onComplete,
}: PricingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [samplePrices, setSamplePrices] = useState<Record<string, string>>({});
  const [headerPrices, setHeaderPrices] = useState<Record<string, string>>({});
  const [discount, setDiscount] = useState("");

  // Reset wizard when opened
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setCurrentStep(1);
      // Initialize prices from existing values or suggestions
      const initialPrices: Record<string, string> = {};
      items.forEach(item => {
        if (item.price) {
          initialPrices[item.id] = item.price.toString();
        } else {
          const suggested = vendorPricing.find(p => p.product_id === item.product_id);
          if (suggested) {
            initialPrices[item.id] = suggested.price.toString();
          }
        }
      });
      setPrices(initialPrices);
      setSamplePrices({});
      setHeaderPrices({});
      setDiscount(quote.discount_amount?.toString() || "");
    }
    onOpenChange(newOpen);
  };

  // Get suggested price for an item
  const getSuggestedPrice = (item: QuoteItem): number | null => {
    const pricing = vendorPricing.find(p => p.product_id === item.product_id);
    return pricing?.price || null;
  };

  // Get effective base price
  const getBasePrice = (item: QuoteItem): number => {
    if (prices[item.id] !== undefined && prices[item.id] !== "") {
      return parseFloat(prices[item.id]) || 0;
    }
    return item.price || getSuggestedPrice(item) || 0;
  };

  // Get additional samples price
  const getAdditionalSamplesPrice = (item: QuoteItem): number => {
    if (!item.additional_samples || item.additional_samples === 0) return 0;
    if (samplePrices[item.id] !== undefined && samplePrices[item.id] !== "") {
      return parseFloat(samplePrices[item.id]) || 0;
    }
    return item.additional_samples * ADDITIONAL_SAMPLE_PRICE;
  };

  // Get additional headers price
  const getAdditionalHeadersPrice = (item: QuoteItem): number => {
    if (!item.additional_report_headers || item.additional_report_headers === 0) return 0;
    if (headerPrices[item.id] !== undefined && headerPrices[item.id] !== "") {
      return parseFloat(headerPrices[item.id]) || 0;
    }
    return item.additional_report_headers * ADDITIONAL_HEADER_PRICE;
  };

  // Calculate totals
  const calculations = useMemo(() => {
    const itemTotals = items.map(item => ({
      item,
      base: getBasePrice(item),
      samples: getAdditionalSamplesPrice(item),
      headers: getAdditionalHeadersPrice(item),
      total: getBasePrice(item) + getAdditionalSamplesPrice(item) + getAdditionalHeadersPrice(item)
    }));

    const subtotal = itemTotals.reduce((sum, i) => sum + i.total, 0);
    const discountPercent = parseFloat(discount) || 0;
    const discountAmount = subtotal * (discountPercent / 100);
    const grandTotal = subtotal - discountAmount;

    return { itemTotals, subtotal, discountPercent, discountAmount, grandTotal };
  }, [items, prices, samplePrices, headerPrices, discount]);

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Merge all prices into a single object for the parent
    const allPrices = { ...prices };
    onComplete(allPrices, discount);
    onOpenChange(false);
  };

  const currentStepInfo = steps[currentStep - 1];
  const StepIcon = currentStepInfo.icon;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pricing Wizard
          </DialogTitle>
          <DialogDescription>
            Step-by-step guide to price this quote
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} totalSteps={5} />

        {/* Step Header */}
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg mb-4">
          <div className="p-2 rounded-full bg-primary/10">
            <StepIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-semibold">{currentStepInfo.title}</h3>
              <HelpIcon helpText={currentStepInfo.helpText} />
            </div>
            <p className="text-sm text-muted-foreground">{currentStepInfo.description}</p>
          </div>
          <Badge variant="outline">Step {currentStep} of 5</Badge>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 1: Review Compounds */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    Requested Compounds
                    <HelpIcon helpText="These are all the compounds the customer wants tested. Each row shows the compound name and sample details." />
                  </CardTitle>
                  <CardDescription>
                    {items.length} item{items.length !== 1 ? 's' : ''} in this request
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Compound</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Sample</TableHead>
                        <TableHead>Manufacturer</TableHead>
                        <TableHead>
                          <span className="flex items-center">
                            Add. Samples
                            <HelpIcon helpText="Number of additional variance samples requested ($60 each)" />
                          </span>
                        </TableHead>
                        <TableHead>
                          <span className="flex items-center">
                            Add. Headers
                            <HelpIcon helpText="Number of additional report headers requested ($30 each)" />
                          </span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.products?.name || "Unknown"}
                            {item.products?.category && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {item.products.category}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{item.client || "-"}</TableCell>
                          <TableCell>{item.sample || "-"}</TableCell>
                          <TableCell>{item.manufacturer || "-"}</TableCell>
                          <TableCell>{item.additional_samples || 0}</TableCell>
                          <TableCell>{item.additional_report_headers || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Set Base Prices */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    Set Base Prices
                    <HelpIcon helpText="Enter the base testing price for each compound. If you have preset pricing in your catalog, suggested prices are shown." />
                  </CardTitle>
                  <CardDescription>
                    Set the base testing price for each compound
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => {
                    const suggested = getSuggestedPrice(item);
                    const currentPrice = prices[item.id] ?? (item.price?.toString() || suggested?.toString() || "");
                    
                    return (
                      <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.products?.name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.client} • {item.sample}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-28 text-right"
                              value={currentPrice}
                              onChange={(e) => setPrices({ ...prices, [item.id]: e.target.value })}
                              placeholder="0.00"
                            />
                            <HelpIcon helpText="Enter the base price for this test. This is the main testing fee before any additional charges." />
                          </div>
                          {suggested !== null && (
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline"
                              onClick={() => setPrices({ ...prices, [item.id]: suggested.toString() })}
                            >
                              Suggested: ${suggested.toFixed(2)}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Additional Charges */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    Additional Charges
                    <HelpIcon helpText="These charges are auto-calculated based on additional samples and headers requested. You can modify them if needed." />
                  </CardTitle>
                  <CardDescription>
                    Review and adjust additional sample and header charges
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.filter(item => (item.additional_samples || 0) > 0 || (item.additional_report_headers || 0) > 0).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No additional samples or headers requested for this order.</p>
                      <p className="text-sm mt-1">You can proceed to the next step.</p>
                    </div>
                  ) : (
                    items.filter(item => (item.additional_samples || 0) > 0 || (item.additional_report_headers || 0) > 0).map((item) => (
                      <div key={item.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{item.products?.name || "Unknown"}</p>
                        </div>
                        
                        {(item.additional_samples || 0) > 0 && (
                          <div className="flex items-center justify-between pl-4">
                            <div className="flex items-center">
                              <span className="text-sm text-muted-foreground">
                                Variance Samples ({item.additional_samples} × $60)
                              </span>
                              <HelpIcon helpText="Additional samples for variance testing. Default is $60 per sample but you can adjust this." />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-28 text-right"
                                value={samplePrices[item.id] ?? (item.additional_samples! * ADDITIONAL_SAMPLE_PRICE).toString()}
                                onChange={(e) => setSamplePrices({ ...samplePrices, [item.id]: e.target.value })}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        )}
                        
                        {(item.additional_report_headers || 0) > 0 && (
                          <div className="flex items-center justify-between pl-4">
                            <div className="flex items-center">
                              <span className="text-sm text-muted-foreground">
                                Report Headers ({item.additional_report_headers} × $30)
                              </span>
                              <HelpIcon helpText="Additional report headers requested. Default is $30 per header but you can adjust this." />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-28 text-right"
                                value={headerPrices[item.id] ?? (item.additional_report_headers! * ADDITIONAL_HEADER_PRICE).toString()}
                                onChange={(e) => setHeaderPrices({ ...headerPrices, [item.id]: e.target.value })}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: Apply Discount */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    Apply Discount
                    <HelpIcon helpText="You can offer a percentage discount on the total order. This is optional and will be shown to the customer for their approval." />
                  </CardTitle>
                  <CardDescription>
                    Optional percentage discount for this order
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-w-sm mx-auto space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="discount" className="flex items-center">
                        Discount Percentage
                        <HelpIcon helpText="Enter a percentage (0-100). For example, 10 means 10% off the total." />
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="discount"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          className="text-right text-lg"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          placeholder="0"
                        />
                        <span className="text-xl font-medium text-muted-foreground">%</span>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>${calculations.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount ({calculations.discountPercent}%):</span>
                        <span>-${calculations.discountAmount.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span>${calculations.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                      <p>Leave at 0 for no discount.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Preview & Submit */}
            {currentStep === 5 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    Pricing Summary
                    <HelpIcon helpText="This is exactly what the customer will see. Review everything before submitting." />
                  </CardTitle>
                  <CardDescription>
                    Review the complete pricing before sending to customer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Base</TableHead>
                        <TableHead className="text-right">Add. Samples</TableHead>
                        <TableHead className="text-right">Add. Headers</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculations.itemTotals.map(({ item, base, samples, headers, total }) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.products?.name || "Unknown"}
                          </TableCell>
                          <TableCell className="text-right">${base.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {samples > 0 ? `$${samples.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {headers > 0 ? `$${headers.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">${total.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <Separator />

                  <div className="space-y-2 text-right">
                    <div className="flex justify-end gap-8">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="w-24">${calculations.subtotal.toFixed(2)}</span>
                    </div>
                    {calculations.discountPercent > 0 && (
                      <div className="flex justify-end gap-8 text-green-600">
                        <span>Discount ({calculations.discountPercent}%):</span>
                        <span className="w-24">-${calculations.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-end gap-8 text-lg font-bold">
                      <span>Grand Total:</span>
                      <span className="w-24">${calculations.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm text-center">
                      <Check className="h-4 w-4 inline mr-1 text-primary" />
                      Once submitted, the customer will receive this quote and can approve or request changes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          {currentStep < 5 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-1" />
              Submit Quote
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

PricingWizard.displayName = "PricingWizard";
