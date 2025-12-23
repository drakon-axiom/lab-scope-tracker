import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/hooks/useImpersonation";

interface Quote {
  id: string;
  lab_id: string;
  quote_number: string | null;
  lab_quote_number: string | null;
  status: string;
  notes: string | null;
  tracking_number: string | null;
  shipped_date: string | null;
  created_at: string;
  tracking_updated_at: string | null;
  estimated_delivery: string | null;
  payment_status: string | null;
  payment_amount_usd: number | null;
  payment_amount_crypto: string | null;
  payment_date: string | null;
  transaction_id: string | null;
  labs: { name: string };
}

interface Product {
  id: string;
  name: string;
}

interface Lab {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

interface Manufacturer {
  id: string;
  name: string;
}

export const useQuotesData = () => {
  const { user, loading: authLoading } = useAuth();
  const { role, isAdmin, loading: roleLoading } = useUserRole();
  const { impersonatedUser, isImpersonatingCustomer } = useImpersonation();
  const queryClient = useQueryClient();

  const targetUserId = isImpersonatingCustomer && impersonatedUser?.id 
    ? impersonatedUser.id 
    : user?.id;

  const isReady = !authLoading && !roleLoading && !!targetUserId;

  // Quotes query
  const { data: quotes = [], isLoading: quotesLoading, refetch: refetchQuotes } = useQuery({
    queryKey: ["quotes", targetUserId, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("quotes")
        .select("id, lab_id, quote_number, lab_quote_number, status, notes, tracking_number, shipped_date, created_at, tracking_updated_at, estimated_delivery, payment_status, payment_amount_usd, payment_amount_crypto, payment_date, transaction_id, labs(name)")
        .order("created_at", { ascending: false });

      // Admins can see all quotes, subscribers only their own
      if (!isAdmin) {
        query = query.eq("user_id", targetUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Quote[];
    },
    enabled: isReady,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });

  // Products query - cached for longer since they rarely change
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: isReady,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });

  // Labs query - cached for longer since they rarely change
  const { data: labs = [], isLoading: labsLoading } = useQuery({
    queryKey: ["labs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labs")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Lab[];
    },
    enabled: isReady,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });

  // Clients query
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["clients", targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Client[];
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
  });

  // Manufacturers query
  const { data: manufacturers = [], isLoading: manufacturersLoading } = useQuery({
    queryKey: ["manufacturers", targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manufacturers")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Manufacturer[];
    },
    enabled: isReady,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
  });

  const loading = authLoading || roleLoading || quotesLoading || productsLoading || labsLoading;

  const invalidateQuotes = () => {
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
  };

  const invalidateClients = () => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const invalidateManufacturers = () => {
    queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
  };

  return {
    quotes,
    products,
    labs,
    clients,
    manufacturers,
    loading,
    clientsLoading,
    manufacturersLoading,
    labsLoading,
    refetchQuotes,
    invalidateQuotes,
    invalidateClients,
    invalidateManufacturers,
    isAdmin,
    role,
    targetUserId,
  };
};
