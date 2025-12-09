import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = "admin" | "subscriber" | "lab" | null;

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return "subscriber" as UserRole;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return "subscriber" as UserRole;
      }
      
      return (data?.role || "subscriber") as UserRole;
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 10 * 60 * 1000, // 10 minutes - role rarely changes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  const loading = authLoading || isLoading;
  const resolvedRole = role ?? null;

  return { 
    role: resolvedRole, 
    loading, 
    isAdmin: resolvedRole === "admin", 
    isSubscriber: resolvedRole === "subscriber", 
    isLab: resolvedRole === "lab" 
  };
};
