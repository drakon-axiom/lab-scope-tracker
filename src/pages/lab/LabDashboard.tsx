import { useEffect, useState } from "react";
import LabLayout from "@/components/lab/LabLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { FileText, CreditCard, Package, FlaskConical, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { LabActionCards } from "@/components/lab/LabActionCards";

interface DashboardStats {
  new_requests: number;
  awaiting_action: number;
  payments_reported: number;
  ready_to_ship: number;
  results_pending: number;
  shipped_samples: number;
}

interface RecentActivity {
  id: string;
  quote_number: string | null;
  status: string;
  created_at: string;
  activity_type: string;
}

export default function LabDashboard() {
  const { labUser } = useLabUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!labUser?.lab_id) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch quotes for this lab
        const { data: quotes, error } = await supabase
          .from("quotes")
          .select("*")
          .eq("lab_id", labUser.lab_id);

        if (error) throw error;

        // Calculate stats
        const stats: DashboardStats = {
          new_requests: quotes?.filter(q => q.status === "sent_to_vendor").length || 0,
          awaiting_action: quotes?.filter(q => 
            ["sent_to_vendor", "awaiting_customer_approval"].includes(q.status)
          ).length || 0,
          payments_reported: quotes?.filter(q => 
            q.status === "approved_payment_pending" && q.payment_status === "paid"
          ).length || 0,
          ready_to_ship: quotes?.filter(q => 
            q.status === "paid_awaiting_shipping"
          ).length || 0,
          shipped_samples: quotes?.filter(q => 
            ["in_transit", "delivered"].includes(q.status)
          ).length || 0,
          results_pending: quotes?.filter(q => 
            q.status === "testing_in_progress"
          ).length || 0,
        };

        setStats(stats);

        // Fetch recent activity
        const { data: activity } = await supabase
          .from("quote_activity_log")
          .select(`
            id,
            activity_type,
            created_at,
            quotes:quote_id (
              quote_number,
              status
            )
          `)
          .in("quote_id", quotes?.map(q => q.id) || [])
          .order("created_at", { ascending: false })
          .limit(10);

        if (activity) {
          setRecentActivity(
            activity.map(a => ({
              id: a.id,
              quote_number: (a.quotes as any)?.quote_number || "N/A",
              status: (a.quotes as any)?.status || "",
              created_at: a.created_at,
              activity_type: a.activity_type,
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [labUser?.lab_id]);

  if (loading) {
    return (
      <LabLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </LabLayout>
    );
  }

  const statCards = [
    { title: "New Requests", value: stats?.new_requests || 0, icon: FileText, color: "text-blue-500" },
    { title: "Awaiting Action", value: stats?.awaiting_action || 0, icon: Clock, color: "text-amber-500" },
    { title: "Payments Reported", value: stats?.payments_reported || 0, icon: CreditCard, color: "text-green-500" },
    { title: "Shipped Samples", value: stats?.shipped_samples || 0, icon: Package, color: "text-purple-500" },
    { title: "Results Pending", value: stats?.results_pending || 0, icon: FlaskConical, color: "text-cyan-500" },
    { title: "Completed", value: 0, icon: CheckCircle2, color: "text-emerald-500" },
  ];

  return (
    <LabLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back to {labUser?.lab_name || "your lab"} portal
          </p>
        </div>

        {/* Action Cards */}
        <LabActionCards
          newRequests={stats?.new_requests || 0}
          paymentsReported={stats?.payments_reported || 0}
          readyToShip={stats?.ready_to_ship || 0}
          testsInProgress={stats?.results_pending || 0}
        />

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">Quote {activity.quote_number}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {activity.activity_type.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{activity.status}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(activity.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LabLayout>
  );
}
