import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useImpersonation } from "@/hooks/useImpersonation";

interface Quote {
  id: string;
  quote_number: string | null;
  status: string;
  created_at: string;
  labs: { name: string };
  shipped_date: string | null;
}

interface ShipmentInProgress {
  id: string;
  quote_number: string | null;
  status: string;
  tracking_number: string | null;
  shipped_date: string | null;
  labs: { name: string };
}

interface ActionRequiredQuote {
  id: string;
  quote_number: string | null;
  tracking_number?: string | null;
}

interface DashboardData {
  activeQuotes: Quote[];
  shipmentsInProgress: ShipmentInProgress[];
  avgCompletionDays: number | null;
  statusCounts: Record<string, number>;
  quotesAwaitingApproval: ActionRequiredQuote[];
  quotesReadyForPayment: ActionRequiredQuote[];
  shipmentsToTrack: ActionRequiredQuote[];
}

export const useDashboardData = () => {
  const { user, loading: authLoading } = useAuth();
  const { impersonatedUser, isImpersonatingCustomer } = useImpersonation();
  const queryClient = useQueryClient();

  const targetUserId = isImpersonatingCustomer && impersonatedUser?.id 
    ? impersonatedUser.id 
    : user?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard", targetUserId],
    queryFn: async (): Promise<DashboardData> => {
      if (!targetUserId) {
        return { 
          activeQuotes: [], 
          shipmentsInProgress: [], 
          avgCompletionDays: null, 
          statusCounts: {},
          quotesAwaitingApproval: [],
          quotesReadyForPayment: [],
          shipmentsToTrack: [],
        };
      }

      // Fetch all data in parallel
      const [
        quotesResult, 
        shipmentsResult, 
        completedResult,
        awaitingApprovalResult,
        readyForPaymentResult,
        shipmentsToTrackResult,
      ] = await Promise.all([
        // Active quotes
        supabase
          .from("quotes")
          .select("id, quote_number, status, created_at, labs(name), shipped_date")
          .eq("user_id", targetUserId)
          .neq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(10),
        
        // Shipments in progress
        supabase
          .from("quotes")
          .select("id, quote_number, status, tracking_number, shipped_date, labs(name)")
          .eq("user_id", targetUserId)
          .in("status", ["shipped", "in_transit", "delivered", "testing_in_progress"])
          .order("shipped_date", { ascending: false }),
        
        // Completed quotes for avg calculation (last 90 days)
        (() => {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          return supabase
            .from("quotes")
            .select("id, shipped_date, updated_at, status")
            .eq("user_id", targetUserId)
            .eq("status", "completed")
            .gte("updated_at", ninetyDaysAgo.toISOString());
        })(),

        // Quotes awaiting approval (pricing_received status)
        supabase
          .from("quotes")
          .select("id, quote_number")
          .eq("user_id", targetUserId)
          .eq("status", "pricing_received")
          .order("created_at", { ascending: false }),

        // Quotes ready for payment (approved_payment_pending status)
        supabase
          .from("quotes")
          .select("id, quote_number")
          .eq("user_id", targetUserId)
          .eq("status", "approved_payment_pending")
          .order("created_at", { ascending: false }),

        // Shipments to track (shipped, in_transit statuses with tracking)
        supabase
          .from("quotes")
          .select("id, quote_number, tracking_number")
          .eq("user_id", targetUserId)
          .in("status", ["shipped", "in_transit"])
          .not("tracking_number", "is", null)
          .order("shipped_date", { ascending: false }),
      ]);

      const activeQuotes = (quotesResult.data || []) as Quote[];
      const shipmentsInProgress = (shipmentsResult.data || []) as ShipmentInProgress[];
      const quotesAwaitingApproval = (awaitingApprovalResult.data || []) as ActionRequiredQuote[];
      const quotesReadyForPayment = (readyForPaymentResult.data || []) as ActionRequiredQuote[];
      const shipmentsToTrack = (shipmentsToTrackResult.data || []) as ActionRequiredQuote[];

      // Calculate status counts
      const statusCounts: Record<string, number> = {};
      activeQuotes.forEach(quote => {
        statusCounts[quote.status] = (statusCounts[quote.status] || 0) + 1;
      });

      // Calculate average completion time
      let avgCompletionDays: number | null = null;
      const completedQuotes = completedResult.data || [];
      if (completedQuotes.length > 0) {
        let totalDays = 0;
        let validCount = 0;

        for (const quote of completedQuotes) {
          if (quote.shipped_date) {
            const shippedDate = new Date(quote.shipped_date);
            const completedDate = new Date(quote.updated_at);
            const daysDiff = Math.round((completedDate.getTime() - shippedDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff >= 0) {
              totalDays += daysDiff;
              validCount++;
            }
          }
        }

        if (validCount > 0) {
          avgCompletionDays = Math.round(totalDays / validCount);
        }
      }

      return { 
        activeQuotes, 
        shipmentsInProgress, 
        avgCompletionDays, 
        statusCounts,
        quotesAwaitingApproval,
        quotesReadyForPayment,
        shipmentsToTrack,
      };
    },
    enabled: !!targetUserId && !authLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });

  return {
    activeQuotes: data?.activeQuotes || [],
    shipmentsInProgress: data?.shipmentsInProgress || [],
    avgCompletionDays: data?.avgCompletionDays || null,
    statusCounts: data?.statusCounts || {},
    quotesAwaitingApproval: data?.quotesAwaitingApproval || [],
    quotesReadyForPayment: data?.quotesReadyForPayment || [],
    shipmentsToTrack: data?.shipmentsToTrack || [],
    loading: authLoading || isLoading,
    error,
    refetch,
  };
};
