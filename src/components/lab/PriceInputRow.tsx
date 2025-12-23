import React, { memo } from "react";
import { Input } from "@/components/ui/input";

interface PriceInputRowProps {
  label: string;
  itemId: string;
  value: string;
  defaultValue: string;
  isModified: boolean;
  canEdit: boolean;
  displayValue: number;
  onChange: (itemId: string, value: string) => void;
}

export const PriceInputRow = memo(function PriceInputRow({
  label,
  itemId,
  value,
  defaultValue,
  isModified,
  canEdit,
  displayValue,
  onChange,
}: PriceInputRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      {canEdit ? (
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-sm">$</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            className={`w-24 h-8 text-right text-sm ${isModified ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}`}
            value={value ?? defaultValue}
            onChange={(e) => onChange(itemId, e.target.value)}
            placeholder="0.00"
          />
        </div>
      ) : (
        <span className="text-sm font-medium">${displayValue.toFixed(2)}</span>
      )}
    </div>
  );
});
