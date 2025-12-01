import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Package, TrendingUp } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Skeleton } from "@/components/ui/skeleton";

export const UsageWidget = () => {
  const {
    subscription,
    usage,
    loading,
    getRemainingItems,
    getUsagePercentage,
    getDaysUntilReset,
  } = useSubscription();

  if (loading) {
    return (
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
  }

  if (!subscription || !usage) {
    return null;
  }

  const usagePercentage = getUsagePercentage();
  const remainingItems = getRemainingItems();
  const daysUntilReset = getDaysUntilReset();

  const getUsageColor = () => {
    if (usagePercentage >= 90) return "text-destructive";
    if (usagePercentage >= 70) return "text-warning";
    return "text-success";
  };

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
            <span className={`text-sm font-medium ${getUsageColor()}`}>
              {usagePercentage.toFixed(0)}%
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Remaining</div>
              <div className="text-lg font-semibold">{remainingItems}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">Reset in</div>
              <div className="text-lg font-semibold">{daysUntilReset}d</div>
            </div>
          </div>
        </div>

        {usagePercentage >= 80 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              {usagePercentage >= 100
                ? "You've reached your monthly limit. Upgrade to Pro for unlimited items."
                : `You're approaching your monthly limit. Only ${remainingItems} items remaining.`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
