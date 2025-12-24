import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Quote {
  id: string;
  status: string;
  [key: string]: unknown;
}

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
    onMutate: async (quoteId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["quotes"] });

      // Snapshot previous value
      const previousQuotes = queryClient.getQueryData<Quote[]>(["quotes"]);

      // Optimistically remove the quote
      queryClient.setQueryData<Quote[]>(["quotes"], (old) =>
        old?.filter((q) => q.id !== quoteId) ?? []
      );

      return { previousQuotes };
    },
    onError: (_err, _quoteId, context) => {
      // Rollback on error
      queryClient.setQueryData(["quotes"], context?.previousQuotes);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  const updateQuoteStatus = useMutation({
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: string }) => {
      const { error } = await supabase.from("quotes").update({ status }).eq("id", quoteId);
      if (error) throw error;
    },
    onMutate: async ({ quoteId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["quotes"] });

      const previousQuotes = queryClient.getQueryData<Quote[]>(["quotes"]);

      queryClient.setQueryData<Quote[]>(["quotes"], (old) =>
        old?.map((q) => (q.id === quoteId ? { ...q, status } : q)) ?? []
      );

      return { previousQuotes };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData(["quotes"], context?.previousQuotes);
    },
    onSettled: () => {
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
