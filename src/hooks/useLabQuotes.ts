import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Quote {
  id: string;
  quote_number: string | null;
  lab_quote_number: string | null;
  status: string;
  created_at: string;
  notes: string | null;
  discount_amount: number | null;
  discount_type: string | null;
  lab_response: string | null;
  payment_status: string | null;
  payment_amount_usd: number | null;
  payment_date: string | null;
  tracking_number: string | null;
  shipped_date: string | null;
}

export function useLabQuotes(labId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    data: quotes = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["lab-quotes", labId],
    queryFn: async () => {
      if (!labId) return [];

      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("lab_id", labId)
        .not("status", "in", '("completed","rejected","draft")')
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Quote[];
    },
    enabled: !!labId,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!labId) return;

    const channel = supabase
      .channel(`lab-quotes-${labId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quotes",
          filter: `lab_id=eq.${labId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["lab-quotes", labId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [labId, queryClient]);

  return {
    quotes,
    loading,
    error,
    refetch,
  };
}
