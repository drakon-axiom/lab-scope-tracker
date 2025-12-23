import React, { useState, memo } from "react";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type ChangeDetectionPriceRow = {
  label: string;
  original: number;
  input: string;
  parsed: number | null;
  changed: boolean;
};

export type ChangeDetectionDebugData = {
  discount: {
    original: number;
    input: string;
    parsed: number;
    changed: boolean;
  };
  base: ChangeDetectionPriceRow[];
  samples: ChangeDetectionPriceRow[];
  headers: ChangeDetectionPriceRow[];
  summary: {
    hasModifiedPrices: boolean;
    changesCount: number;
    hasDiscountChange: boolean;
    hasAnyChanges: boolean;
    resultingStatus: string;
  };
};

function BoolBadge({ value }: { value: boolean }) {
  return (
    <Badge variant={value ? "destructive" : "secondary"} className="font-mono text-[10px]">
      {String(value)}
    </Badge>
  );
}

const PriceRows = memo(function PriceRows({ title, rows }: { title: string; rows: ChangeDetectionPriceRow[] }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium">{title}</div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">No inputs set.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="rounded-md border border-border/60 bg-background/40 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-medium">{row.label}</div>
                <BoolBadge value={row.changed} />
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <div>original: {row.original}</div>
                <div>input: “{row.input}”</div>
                <div>parsed: {row.parsed === null ? "(empty/NaN)" : row.parsed}</div>
                <div>changed: {String(row.changed)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export const ChangeDetectionDebugPanel = memo(function ChangeDetectionDebugPanel({
  data,
  className,
  defaultOpen = true,
}: {
  data: ChangeDetectionDebugData;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("w-full", className)}>
      <Card className="border-border/60 bg-muted/30">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-medium">Change detection debug</div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {data.summary.resultingStatus}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Shows exactly what the lab approval flow will treat as a “change”.
              </div>
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
                <span className="ml-1 text-xs">{open ? "Hide" : "Show"}</span>
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-3 space-y-3">
            <div className="grid gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">hasModifiedPrices</span>
                <BoolBadge value={data.summary.hasModifiedPrices} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">price changes count</span>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {data.summary.changesCount}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">hasDiscountChange</span>
                <BoolBadge value={data.summary.hasDiscountChange} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">hasAnyChanges</span>
                <BoolBadge value={data.summary.hasAnyChanges} />
              </div>
            </div>

            <Separator />

            <div className="rounded-md border border-border/60 bg-background/40 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-medium">Discount</div>
                <BoolBadge value={data.discount.changed} />
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <div>original: {data.discount.original}</div>
                <div>input: “{data.discount.input}”</div>
                <div>parsed: {data.discount.parsed}</div>
                <div>changed: {String(data.discount.changed)}</div>
              </div>
            </div>

            <PriceRows title="Base price inputs" rows={data.base} />
            <PriceRows title="Variance sample price inputs" rows={data.samples} />
            <PriceRows title="Report header price inputs" rows={data.headers} />
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
});
