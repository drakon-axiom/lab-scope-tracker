import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";

interface PriceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compoundName: string;
  currentPrice: number;
  onSave: (newPrice: number) => void;
}

export function PriceEditDialog({
  open,
  onOpenChange,
  compoundName,
  currentPrice,
  onSave,
}: PriceEditDialogProps) {
  const [price, setPrice] = useState(currentPrice.toString());

  const handleSave = () => {
    const parsed = parseFloat(price);
    if (!isNaN(parsed) && parsed > 0) {
      onSave(parsed);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-w-[95vw] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Update Price</DialogTitle>
          <DialogDescription className="text-base">
            {compoundName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-6">
          <div className="grid gap-3">
            <Label htmlFor="price" className="text-base">
              New Price
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-10 text-lg h-14"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            Current price: <span className="font-semibold">${currentPrice.toFixed(2)}</span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 text-base"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-12 text-base">
            Save Price
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
