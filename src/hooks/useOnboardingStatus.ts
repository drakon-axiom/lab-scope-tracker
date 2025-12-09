import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingStatus {
  onboarding_completed: boolean | null;
  onboarding_step: number | null;
}

export const useOnboardingStatus = () => {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-status", user?.id],
    queryFn: async (): Promise<OnboardingStatus | null> => {
      if (!user?.id) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, onboarding_step")
        .eq("id", user.id)
        .maybeSingle();

      return profile;
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 30 * 60 * 1000, // 30 minutes - onboarding status rarely changes
    gcTime: 60 * 60 * 1000,
  });

  return {
    showOnboarding: data ? !data.onboarding_completed : false,
    currentStep: data?.onboarding_step ?? 0,
    loading: authLoading || isLoading,
  };
};
