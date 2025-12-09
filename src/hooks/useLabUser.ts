import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LabUser {
  id: string;
  lab_id: string;
  role: string;
  lab_name?: string;
}

export const useLabUser = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Check for impersonation
  const impersonatedLabId = typeof window !== 'undefined' 
    ? sessionStorage.getItem('impersonatedLabId') 
    : null;
  const impersonatedLabName = typeof window !== 'undefined' 
    ? sessionStorage.getItem('impersonatedLabName') 
    : null;
  const impersonatedLabRole = typeof window !== 'undefined'
    ? sessionStorage.getItem('impersonatedLabRole')
    : null;

  const isImpersonating = !!impersonatedLabId;

  const { data: labUser, isLoading } = useQuery({
    queryKey: ["lab-user", user?.id, impersonatedLabId],
    queryFn: async () => {
      // If impersonating a lab, return impersonated lab data
      if (impersonatedLabId && impersonatedLabName) {
        return {
          id: "impersonated",
          lab_id: impersonatedLabId,
          role: impersonatedLabRole || "admin",
          lab_name: impersonatedLabName,
        } as LabUser;
      }

      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("lab_users")
        .select(`
          id,
          lab_id,
          role,
          labs:lab_id (name)
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching lab user:", error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        lab_id: data.lab_id,
        role: data.role,
        lab_name: (data.labs as any)?.name,
      } as LabUser;
    },
    enabled: !authLoading && (!!user?.id || !!impersonatedLabId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });

  // Listen for impersonation changes
  useEffect(() => {
    const handleImpersonationChange = () => {
      queryClient.invalidateQueries({ queryKey: ["lab-user"] });
    };
    window.addEventListener("impersonation-changed", handleImpersonationChange);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "impersonatedLabId" || e.key === "impersonatedLabRole") {
        queryClient.invalidateQueries({ queryKey: ["lab-user"] });
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("impersonation-changed", handleImpersonationChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [queryClient]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["lab-user"] });
  }, [queryClient]);

  return { 
    labUser: labUser ?? null, 
    loading: authLoading || isLoading, 
    isImpersonating, 
    refresh 
  };
};
