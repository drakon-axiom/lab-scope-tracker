import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useAuth } from "@/hooks/useAuth";

export interface Subscription {
  id: string;
  user_id: string;
  tier: "free" | "pro" | "enterprise";
  monthly_item_limit: number;
  is_active: boolean;
  current_period_start: string;
  current_period_end: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  items_sent_this_month: number;
  period_start: string;
  period_end: string;
}

export const useSubscription = () => {
  const { user, loading: authLoading } = useAuth();
  const { isImpersonatingCustomer, impersonatedUser } = useImpersonation();

  // Determine which user_id to query
  const targetUserId = isImpersonatingCustomer && impersonatedUser?.id 
    ? impersonatedUser.id 
    : user?.id;

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }
      
      return data as Subscription | null;
    },
    enabled: !!targetUserId && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["usage", targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("usage_tracking")
        .select("*")
        .eq("user_id", targetUserId)
        .gte("period_start", currentMonth.toISOString())
        .maybeSingle();

      if (error) {
        console.error("Error fetching usage:", error);
        return null;
      }
      
      return data as UsageTracking | null;
    },
    enabled: !!targetUserId && !authLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes - usage changes more often
    gcTime: 5 * 60 * 1000,
  });

  const loading = authLoading || subLoading || usageLoading;

  const canSendItems = (itemCount: number): boolean => {
    if (!subscription || !usage) return false;
    const remainingItems = subscription.monthly_item_limit - usage.items_sent_this_month;
    return remainingItems >= itemCount;
  };

  const getRemainingItems = (): number => {
    if (!subscription || !usage) return 0;
    return Math.max(0, subscription.monthly_item_limit - usage.items_sent_this_month);
  };

  const getUsagePercentage = (): number => {
    if (!subscription || !usage) return 0;
    return (usage.items_sent_this_month / subscription.monthly_item_limit) * 100;
  };

  const getDaysUntilReset = (): number => {
    if (!subscription) return 0;
    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const diff = periodEnd.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return {
    subscription,
    usage,
    loading,
    canSendItems,
    getRemainingItems,
    getUsagePercentage,
    getDaysUntilReset,
  };
};
