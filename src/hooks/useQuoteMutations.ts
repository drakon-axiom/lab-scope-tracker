import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useQuoteMutations() {
  const queryClient = useQueryClient();

  const deleteQuote = useMutation({
    mutationFn: async (quoteId: string) => {
      // First delete quote items
      const { error: itemsError } = await supabase
        .from("quote_items")
        .delete()
        .eq("quote_id", quoteId);
      if (itemsError) throw itemsError;

      // Then delete the quote
      const { error } = await supabase.from("quotes").delete().eq("id", quoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const updateQuoteStatus = useMutation({
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: string }) => {
      const { error } = await supabase.from("quotes").update({ status }).eq("id", quoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const updateQuote = useMutation({
    mutationFn: async ({ quoteId, updates }: { quoteId: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from("quotes").update(updates).eq("id", quoteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  return { deleteQuote, updateQuoteStatus, updateQuote };
}
