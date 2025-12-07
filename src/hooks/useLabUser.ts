import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LabUser {
  id: string;
  lab_id: string;
  role: string;
  lab_name?: string;
}

export const useLabUser = () => {
  const [labUser, setLabUser] = useState<LabUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchLabUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLabUser(null);
        setLoading(false);
        return;
      }

      // Check for impersonation
      const impersonatedLabId = sessionStorage.getItem("impersonatedLabId");
      const impersonatedLabName = sessionStorage.getItem("impersonatedLabName");
      const impersonatedLabRole = sessionStorage.getItem("impersonatedLabRole");
      
      if (impersonatedLabId && impersonatedLabName) {
        setLabUser({
          id: "impersonated",
          lab_id: impersonatedLabId,
          role: impersonatedLabRole || "admin",
          lab_name: impersonatedLabName,
        });
        setIsImpersonating(true);
        setLoading(false);
        return;
      }

      setIsImpersonating(false);

      const { data, error } = await supabase
        .from("lab_users")
        .select(`
          id,
          lab_id,
          role,
          labs:lab_id (
            name
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (error) {
        console.error("Error fetching lab user:", error);
        setLabUser(null);
      } else if (data) {
        setLabUser({
          id: data.id,
          lab_id: data.lab_id,
          role: data.role,
          lab_name: (data.labs as any)?.name,
        });
      }
    } catch (error) {
      console.error("Error in fetchLabUser:", error);
      setLabUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabUser();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchLabUser();
    });

    // Listen to custom impersonation events (same-tab)
    const handleImpersonationChange = () => {
      fetchLabUser();
    };
    window.addEventListener("impersonation-changed", handleImpersonationChange);

    // Listen to storage changes for impersonation (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "impersonatedLabId" || e.key === "impersonatedLabRole") {
        fetchLabUser();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("impersonation-changed", handleImpersonationChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [fetchLabUser]);

  // Force refresh function for same-tab updates
  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return { labUser, loading, isImpersonating, refresh };
};
