import { memo, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Package, TrendingUp } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Skeleton } from "@/components/ui/skeleton";

const UsageWidgetSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48 mt-2" />
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-8 w-full" />
    </CardContent>
  </Card>
);

export const UsageWidget = memo(() => {
  const {
    subscription,
    usage,
    loading,
    getRemainingItems,
    getUsagePercentage,
    getDaysUntilReset,
  } = useSubscription();

  // Memoize computed values
  const usageData = useMemo(() => {
    if (!subscription || !usage) return null;
    
    const percentage = getUsagePercentage();
    const remaining = getRemainingItems();
    const daysReset = getDaysUntilReset();
    
    let color = "text-success";
    if (percentage >= 90) color = "text-destructive";
    else if (percentage >= 70) color = "text-warning";
    
    return { percentage, remaining, daysReset, color };
  }, [subscription, usage, getUsagePercentage, getRemainingItems, getDaysUntilReset]);

  if (loading) {
    return <UsageWidgetSkeleton />;
  }

  if (!subscription || !usage || !usageData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Monthly Usage
          </CardTitle>
          <Badge variant={subscription.tier === "free" ? "secondary" : "default"}>
            {subscription.tier.toUpperCase()}
          </Badge>
        </div>
        <CardDescription>
          {usage.items_sent_this_month} of {subscription.monthly_item_limit} items used
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Usage</span>
            <span className={`text-sm font-medium ${usageData.color}`}>
              {usageData.percentage.toFixed(0)}%
            </span>
          </div>
          <Progress value={usageData.percentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Remaining</div>
              <div className="text-lg font-semibold">{usageData.remaining}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Reset in</div>
              <div className="text-lg font-semibold">{usageData.daysReset}d</div>
            </div>
          </div>
        </div>

        {usageData.percentage >= 80 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              {usageData.percentage >= 100
                ? "You've reached your monthly limit. Upgrade to Pro for unlimited items."
                : `You're approaching your monthly limit. Only ${usageData.remaining} items remaining.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

UsageWidget.displayName = "UsageWidget";
