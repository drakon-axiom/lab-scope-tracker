import { useState } from "react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Package } from "lucide-react";

interface ShippingLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShippingLabelFormData) => Promise<void>;
  quoteId: string;
}

export interface ShippingLabelFormData {
  shipperName: string;
  shipperAddress: string;
  shipperCity: string;
  shipperState: string;
  shipperZip: string;
  shipperCountry: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientState: string;
  recipientZip: string;
  recipientCountry: string;
  packageWeight: number;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
}

export function ShippingLabelDialog({
  open,
  onOpenChange,
  onSubmit,
  quoteId,
}: ShippingLabelDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<ShippingLabelFormData>({
    shipperName: "",
    shipperAddress: "",
    shipperCity: "",
    shipperState: "",
    shipperZip: "",
    shipperCountry: "US",
    recipientName: "",
    recipientAddress: "",
    recipientCity: "",
    recipientState: "",
    recipientZip: "",
    recipientCountry: "US",
    packageWeight: 5,
    packageLength: 12,
    packageWidth: 12,
    packageHeight: 6,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Generate UPS Shipping Label"
      description="Enter shipping details to create a UPS shipping label"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Shipper Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="shipperName">Name *</Label>
              <Input
                id="shipperName"
                value={formData.shipperName}
                onChange={(e) => setFormData({ ...formData, shipperName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="shipperAddress">Address *</Label>
              <Input
                id="shipperAddress"
                value={formData.shipperAddress}
                onChange={(e) => setFormData({ ...formData, shipperAddress: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipperCity">City *</Label>
              <Input
                id="shipperCity"
                value={formData.shipperCity}
                onChange={(e) => setFormData({ ...formData, shipperCity: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipperState">State *</Label>
              <Input
                id="shipperState"
                value={formData.shipperState}
                onChange={(e) => setFormData({ ...formData, shipperState: e.target.value })}
                placeholder="e.g., CA"
                maxLength={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipperZip">ZIP Code *</Label>
              <Input
                id="shipperZip"
                value={formData.shipperZip}
                onChange={(e) => setFormData({ ...formData, shipperZip: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipperCountry">Country *</Label>
              <Input
                id="shipperCountry"
                value={formData.shipperCountry}
                onChange={(e) => setFormData({ ...formData, shipperCountry: e.target.value })}
                maxLength={2}
                required
              />
            </div>
          </div>

          <div className="border-b pb-3 pt-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Recipient Information (Lab)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="recipientName">Name *</Label>
              <Input
                id="recipientName"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="recipientAddress">Address *</Label>
              <Input
                id="recipientAddress"
                value={formData.recipientAddress}
                onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientCity">City *</Label>
              <Input
                id="recipientCity"
                value={formData.recipientCity}
                onChange={(e) => setFormData({ ...formData, recipientCity: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientState">State *</Label>
              <Input
                id="recipientState"
                value={formData.recipientState}
                onChange={(e) => setFormData({ ...formData, recipientState: e.target.value })}
                placeholder="e.g., TX"
                maxLength={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientZip">ZIP Code *</Label>
              <Input
                id="recipientZip"
                value={formData.recipientZip}
                onChange={(e) => setFormData({ ...formData, recipientZip: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientCountry">Country *</Label>
              <Input
                id="recipientCountry"
                value={formData.recipientCountry}
                onChange={(e) => setFormData({ ...formData, recipientCountry: e.target.value })}
                maxLength={2}
                required
              />
            </div>
          </div>

          <div className="border-b pb-3 pt-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Package Details
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-2 col-span-2 sm:col-span-4">
              <Label htmlFor="packageWeight">Weight (lbs) *</Label>
              <Input
                id="packageWeight"
                type="number"
                step="0.1"
                min="0.1"
                value={formData.packageWeight}
                onChange={(e) => setFormData({ ...formData, packageWeight: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="packageLength">Length (in)</Label>
              <Input
                id="packageLength"
                type="number"
                min="1"
                value={formData.packageLength}
                onChange={(e) => setFormData({ ...formData, packageLength: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="packageWidth">Width (in)</Label>
              <Input
                id="packageWidth"
                type="number"
                min="1"
                value={formData.packageWidth}
                onChange={(e) => setFormData({ ...formData, packageWidth: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="packageHeight">Height (in)</Label>
              <Input
                id="packageHeight"
                type="number"
                min="1"
                value={formData.packageHeight}
                onChange={(e) => setFormData({ ...formData, packageHeight: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Generate Label
              </>
            )}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
