import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface PipelineStats {
  draft: number;
  sent_to_vendor: number;
  approved_payment_pending: number;
  paid: number;
  shipped: number;
  in_transit: number;
  delivered: number;
  testing_in_progress: number;
  completed: number;
}

const statusLabels: Record<keyof PipelineStats, string> = {
  draft: "Draft",
  sent_to_vendor: "Sent to Vendor",
  approved_payment_pending: "Approved - Payment Pending",
  paid: "Paid",
  shipped: "Shipped",
  in_transit: "In Transit",
  delivered: "Delivered",
  testing_in_progress: "Testing in Progress",
  completed: "Completed",
};

export const QuotePipelineCard = () => {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPipelineStats();

    const channel = supabase
      .channel('quote-pipeline-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes'
        },
        () => fetchPipelineStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPipelineStats = async () => {
    try {
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('status');

      if (error) throw error;

      const stats: PipelineStats = {
        draft: 0,
        sent_to_vendor: 0,
        approved_payment_pending: 0,
        paid: 0,
        shipped: 0,
        in_transit: 0,
        delivered: 0,
        testing_in_progress: 0,
        completed: 0,
      };

      quotes?.forEach(quote => {
        if (stats.hasOwnProperty(quote.status)) {
          stats[quote.status as keyof PipelineStats]++;
        }
      });

      setStats(stats);
    } catch (error) {
      console.error('Error fetching pipeline stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quote Pipeline</CardTitle>
          <CardDescription>Overview of quotes by status</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quote Pipeline</CardTitle>
        <CardDescription>Overview of quotes by status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {stats && Object.entries(stats).map(([status, count]) => (
            <div 
              key={status} 
              className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
            >
              <span className="text-sm font-medium text-muted-foreground">
                {statusLabels[status as keyof PipelineStats]}
              </span>
              <span className="text-2xl font-bold text-foreground">{count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
