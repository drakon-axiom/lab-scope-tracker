import { useEffect, useState } from "react";
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

  useEffect(() => {
    const fetchLabUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLabUser(null);
          setLoading(false);
          return;
        }

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
    };

    fetchLabUser();

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchLabUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { labUser, loading };
};
