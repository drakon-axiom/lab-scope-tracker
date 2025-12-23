import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useQuoteItems(quoteId: string | null) {
  return useQuery({
    queryKey: ["quote-items", quoteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_items")
        .select("*, products(name, category)")
        .eq("quote_id", quoteId!);
      if (error) throw error;
      return data;
    },
    enabled: !!quoteId,
    staleTime: 60 * 1000,
  });
}

export function usePrefetchQuoteItems() {
  const queryClient = useQueryClient();

  return useCallback((quoteId: string) => {
    queryClient.prefetchQuery({
      queryKey: ["quote-items", quoteId],
      queryFn: async () => {
        const { data } = await supabase
          .from("quote_items")
          .select("*, products(name, category)")
          .eq("quote_id", quoteId);
        return data;
      },
      staleTime: 60 * 1000,
    });
  }, [queryClient]);
}
