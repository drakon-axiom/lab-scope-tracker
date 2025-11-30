import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Package, RefreshCw, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface ActiveShipment {
  id: string;
  quote_number: string | null;
  tracking_number: string;
  status: string;
  shipped_date: string | null;
  tracking_updated_at: string | null;
  labs: { name: string };
}

export function ShipmentsTimeline() {
  const [shipments, setShipments] = useState<ActiveShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchActiveShipments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("quotes")
        .select("id, quote_number, tracking_number, status, shipped_date, tracking_updated_at, labs(name)")
        .eq("user_id", user.id)
        .not("tracking_number", "is", null)
        .neq("status", "delivered")
        .order("shipped_date", { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error: any) {
      console.error("Error fetching shipments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveShipments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("quotes-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quotes",
        },
        () => {
          fetchActiveShipments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      toast({
        title: "Refreshing tracking...",
        description: "Updating all active shipments",
        duration: 3000,
      });

      const { error } = await supabase.functions.invoke("update-ups-tracking", {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Tracking updated",
        description: "All shipments have been refreshed",
        duration: 3000,
      });

      // Refresh the list
      setTimeout(() => fetchActiveShipments(), 2000);
    } catch (error: any) {
      toast({
        title: "Failed to refresh",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_transit": return "bg-blue-500";
      case "sent_to_vendor": return "bg-purple-500";
      case "testing_in_progress": return "bg-yellow-500";
      default: return "bg-muted";
    }
  };

  const getDaysSince = (date: string | null) => {
    if (!date) return null;
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Active Shipments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading shipments...</div>
        </CardContent>
      </Card>
    );
  }

  if (shipments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Active Shipments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">No active shipments</p>
            <Link to="/quotes">
              <Button variant="outline" size="sm">
                Create Quote
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Active Shipments ({shipments.length})
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          {/* Shipments */}
          <div className="space-y-6">
            {shipments.map((shipment, index) => {
              const daysSince = getDaysSince(shipment.shipped_date);
              const isStale = shipment.tracking_updated_at 
                ? (Date.now() - new Date(shipment.tracking_updated_at).getTime()) / (1000 * 60 * 60) > 4
                : true;

              return (
                <div key={shipment.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(shipment.status)}`}
                  />

                  {/* Content */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link to="/quotes" className="font-medium text-sm hover:underline">
                        {shipment.quote_number || `Quote #${shipment.id.slice(0, 8)}`}
                      </Link>
                      <StatusBadge status={shipment.status} />
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <span>Lab: {shipment.labs.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Tracking: {shipment.tracking_number}</span>
                        {isStale && (
                          <span className="inline-flex items-center gap-1 text-warning">
                            <TrendingUp className="h-3 w-3" />
                            Stale
                          </span>
                        )}
                      </div>
                      {daysSince !== null && (
                        <div>
                          {daysSince === 0 && "Shipped today"}
                          {daysSince === 1 && "Shipped yesterday"}
                          {daysSince > 1 && `Shipped ${daysSince} days ago`}
                        </div>
                      )}
                      {shipment.tracking_updated_at && (
                        <div className="text-xs">
                          Last checked: {new Date(shipment.tracking_updated_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <Link to="/quotes">
            <Button variant="outline" className="w-full" size="sm">
              View All Quotes
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
