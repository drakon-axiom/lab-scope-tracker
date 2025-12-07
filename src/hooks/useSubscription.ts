import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonation } from "@/hooks/useImpersonation";

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
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const { isImpersonatingCustomer, impersonatedUser } = useImpersonation();

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Use impersonated user's ID if impersonating
        const targetUserId = isImpersonatingCustomer && impersonatedUser?.id 
          ? impersonatedUser.id 
          : user.id;

        // Fetch subscription
        const { data: subData, error: subError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", targetUserId)
          .single();

        if (subError) {
          console.error("Error fetching subscription:", subError);
        } else {
          setSubscription(subData as Subscription);
        }

        // Fetch current usage
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const { data: usageData, error: usageError } = await supabase
          .from("usage_tracking")
          .select("*")
          .eq("user_id", targetUserId)
          .gte("period_start", currentMonth.toISOString())
          .single();

        if (usageError) {
          console.error("Error fetching usage:", usageError);
        } else {
          setUsage(usageData as UsageTracking);
        }
      } catch (error) {
        console.error("Error in fetchSubscriptionData:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptionData();

    // Listen to changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(() => {
      fetchSubscriptionData();
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, [isImpersonatingCustomer, impersonatedUser?.id]);

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
