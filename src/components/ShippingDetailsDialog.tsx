import { useState } from "react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Loader2 } from "lucide-react";

interface ShippingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ShippingFormData) => void;
  onRefreshTracking?: (trackingNumber: string) => void;
  initialData?: ShippingFormData;
  isSubmitting?: boolean;
}

export interface ShippingFormData {
  tracking_number: string;
  shipped_date: string;
}

export function ShippingDetailsDialog({
  open,
  onOpenChange,
  onSubmit,
  onRefreshTracking,
  initialData,
  isSubmitting = false,
}: ShippingDetailsDialogProps) {
  const [formData, setFormData] = useState<ShippingFormData>(
    initialData || {
      tracking_number: "",
      shipped_date: "",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Shipping Details"
      description="Enter tracking information for this shipment"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tracking_number">Tracking Number *</Label>
          <div className="flex gap-2">
            <Input
              id="tracking_number"
              value={formData.tracking_number}
              onChange={(e) =>
                setFormData({ ...formData, tracking_number: e.target.value })
              }
              placeholder="Enter UPS tracking number"
              required
              className="flex-1"
            />
            {formData.tracking_number && onRefreshTracking && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => onRefreshTracking(formData.tracking_number)}
                title="Refresh UPS tracking"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="shipped_date">Shipped Date</Label>
          <Input
            id="shipped_date"
            type="date"
            value={formData.shipped_date}
            onChange={(e) =>
              setFormData({ ...formData, shipped_date: e.target.value })
            }
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Shipping"
            )}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
