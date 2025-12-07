import { useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Percent, DollarSign } from "lucide-react";

interface ProductPricing {
  id: string;
  price: number;
  product_id: string;
  products: {
    name: string;
    category: string | null;
  };
}

interface BulkPriceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pricing: ProductPricing[];
  categories: string[];
  onSave: (updates: { id: string; product_id: string; oldPrice: number; newPrice: number }[]) => Promise<void>;
}

type AdjustmentType = "percentage" | "fixed";
type AdjustmentDirection = "increase" | "decrease";

export function BulkPriceEditDialog({
  open,
  onOpenChange,
  pricing,
  categories,
  onSave,
}: BulkPriceEditDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("percentage");
  const [adjustmentDirection, setAdjustmentDirection] = useState<AdjustmentDirection>("increase");
  const [adjustmentValue, setAdjustmentValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  const filteredPricing = useMemo(() => {
    return pricing.filter(
      (item) => selectedCategory === "all" || item.products.category === selectedCategory
    );
  }, [pricing, selectedCategory]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredPricing.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleItem = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const calculateNewPrice = (currentPrice: number): number => {
    const value = parseFloat(adjustmentValue) || 0;
    if (value === 0) return currentPrice;

    if (adjustmentType === "percentage") {
      const multiplier = adjustmentDirection === "increase" 
        ? 1 + value / 100 
        : 1 - value / 100;
      return Math.max(0.01, Math.round(currentPrice * multiplier * 100) / 100);
    } else {
      const change = adjustmentDirection === "increase" ? value : -value;
      return Math.max(0.01, Math.round((currentPrice + change) * 100) / 100);
    }
  };

  const previewUpdates = useMemo(() => {
    return filteredPricing
      .filter((item) => selectedIds.has(item.id))
      .map((item) => ({
        ...item,
        newPrice: calculateNewPrice(item.price),
      }));
  }, [filteredPricing, selectedIds, adjustmentType, adjustmentDirection, adjustmentValue]);

  const hasChanges = previewUpdates.some((item) => item.price !== item.newPrice);

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      const updates = previewUpdates
        .filter((item) => item.price !== item.newPrice)
        .map((item) => ({
          id: item.id,
          product_id: item.product_id,
          oldPrice: item.price,
          newPrice: item.newPrice,
        }));

      await onSave(updates);
      onOpenChange(false);
      // Reset state
      setSelectedIds(new Set());
      setAdjustmentValue("");
    } finally {
      setSaving(false);
    }
  };

  const allSelected = filteredPricing.length > 0 && 
    filteredPricing.every((p) => selectedIds.has(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Price Edit</DialogTitle>
          <DialogDescription>
            Select compounds and apply price adjustments in bulk
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Adjustment Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as AdjustmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Percentage
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Fixed Amount
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={adjustmentDirection} onValueChange={(v) => setAdjustmentDirection(v as AdjustmentDirection)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <div className="relative">
                {adjustmentType === "fixed" && (
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(e.target.value)}
                  className={adjustmentType === "fixed" ? "pl-8" : ""}
                  placeholder={adjustmentType === "percentage" ? "e.g. 10" : "e.g. 5.00"}
                />
                {adjustmentType === "percentage" && (
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-3">
            <Label className="shrink-0">Filter by Category:</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selection List */}
          <div className="border rounded-md flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                id="select-all"
              />
              <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All ({selectedIds.size} of {filteredPricing.length} selected)
              </Label>
            </div>

            <ScrollArea className="flex-1 max-h-[250px]">
              <div className="divide-y">
                {filteredPricing.map((item) => {
                  const newPrice = calculateNewPrice(item.price);
                  const isSelected = selectedIds.has(item.id);
                  const hasChange = isSelected && item.price !== newPrice;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleItem(item.id)}
                        id={`item-${item.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{item.products.name}</span>
                          {item.products.category && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {item.products.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm shrink-0">
                        <span className={hasChange ? "text-muted-foreground line-through" : "font-semibold"}>
                          ${item.price.toFixed(2)}
                        </span>
                        {hasChange && (
                          <>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className={`font-semibold ${
                              newPrice > item.price ? "text-green-600" : "text-red-600"
                            }`}>
                              ${newPrice.toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Summary */}
          {previewUpdates.length > 0 && hasChanges && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {previewUpdates.filter((p) => p.price !== p.newPrice).length} price(s) will be updated
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? "Saving..." : "Apply Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
