import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Centralized auth hook to prevent multiple auth.getUser() calls
export const useAuth = () => {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change often
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Invalidate user query on auth state change
      queryClient.setQueryData(["auth", "user"], session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear(); // Clear all cached data on sign out
  }, [queryClient]);

  return {
    user: user ?? null,
    loading: isLoading,
    error,
    signOut,
    isAuthenticated: !!user,
  };
};

// Get user ID synchronously from cache if available
export const useUserId = () => {
  const { user } = useAuth();
  return user?.id ?? null;
};
