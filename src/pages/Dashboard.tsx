import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Clock, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "@/components/StatusBadge";
import { PullToRefreshWrapper } from "@/components/PullToRefresh";
import { UsageWidget } from "@/components/UsageWidget";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useUserRole } from "@/hooks/useUserRole";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const { impersonatedUser, isImpersonatingCustomer } = useImpersonation();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [activeQuotes, setActiveQuotes] = useState<Quote[]>([]);
  const [shipmentsInProgress, setShipmentsInProgress] = useState<ShipmentInProgress[]>([]);
  const [avgCompletionDays, setAvgCompletionDays] = useState<number | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [showOnboarding, setShowOnboarding] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Determine which user_id to filter by
      const targetUserId = isImpersonatingCustomer && impersonatedUser?.id 
        ? impersonatedUser.id 
        : user.id;

      // Fetch active quotes (not completed)
      const { data: quotesData, error: quotesError } = await supabase
        .from("quotes")
        .select("id, quote_number, status, created_at, labs(name), shipped_date")
        .eq("user_id", targetUserId)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);

      if (quotesError) throw quotesError;
      setActiveQuotes(quotesData || []);

      // Calculate status counts
      const counts: Record<string, number> = {};
      quotesData?.forEach(quote => {
        counts[quote.status] = (counts[quote.status] || 0) + 1;
      });
      setStatusCounts(counts);

      // Fetch shipments in progress
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from("quotes")
        .select("id, quote_number, status, tracking_number, shipped_date, labs(name)")
        .eq("user_id", targetUserId)
        .in("status", ["shipped", "in_transit", "delivered", "testing_in_progress"])
        .order("shipped_date", { ascending: false });

      if (shipmentsError) throw shipmentsError;
      setShipmentsInProgress(shipmentsData || []);

      // Calculate average completion time (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: completedQuotes, error: completedError } = await supabase
        .from("quotes")
        .select("id, shipped_date, updated_at, status")
        .eq("user_id", targetUserId)
        .eq("status", "completed")
        .gte("updated_at", ninetyDaysAgo.toISOString());

      if (completedError) throw completedError;

      if (completedQuotes && completedQuotes.length > 0) {
        // Calculate average days from shipped_date to completion (updated_at)
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
          setAvgCompletionDays(Math.round(totalDays / validCount));
        }
      } else {
        setAvgCompletionDays(null);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roleLoading) return;
    
    fetchDashboardData();
    checkOnboardingStatus();

    // Set up realtime subscription
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes'
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roleLoading, isImpersonatingCustomer, impersonatedUser?.id]);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      if (profile && !profile.onboarding_completed) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    }
  };

  const handleRefresh = async () => {
    await fetchDashboardData();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p>Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {showOnboarding && (
        <OnboardingTutorial onComplete={() => setShowOnboarding(false)} />
      )}
      <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Quick overview of your lab operations</p>
          </div>

          {/* Usage Widget */}
          <UsageWidget />

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeQuotes.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Quotes in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Shipments in Transit</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{shipmentsInProgress.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active shipments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {avgCompletionDays !== null ? `${avgCompletionDays} days` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Last 90 days average
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Breakdown */}
          {Object.keys(statusCounts).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quote Status Breakdown</CardTitle>
                <CardDescription>Distribution of active quotes by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2">
                      <StatusBadge status={status} />
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Quotes List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Quotes</CardTitle>
                <CardDescription>Recent quotes that need attention</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/quotes")}>
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {activeQuotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 opacity-50 mb-3" />
                  <p>No active quotes</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate("/quotes")}
                    className="mt-2"
                  >
                    Create your first quote
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeQuotes.slice(0, 5).map((quote) => (
                    <div
                      key={quote.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate("/quotes")}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {quote.quote_number || `Quote ${quote.id.slice(0, 8)}`}
                          </p>
                          <StatusBadge status={quote.status} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {quote.labs.name}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipments in Progress */}
          {shipmentsInProgress.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Shipments in Progress</CardTitle>
                  <CardDescription>Track your active shipments</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/quotes")}>
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {shipmentsInProgress.slice(0, 5).map((shipment) => (
                    <div
                      key={shipment.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => navigate("/quotes")}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <p className="font-medium truncate">
                            {shipment.quote_number || "No Quote #"}
                          </p>
                          <StatusBadge status={shipment.status} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {shipment.labs.name}
                        </p>
                        {shipment.tracking_number && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            Tracking: {shipment.tracking_number}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start text-left"
                  onClick={() => navigate("/quotes")}
                >
                  <FileText className="h-5 w-5 mb-2" />
                  <span className="font-medium">Create Quote</span>
                  <span className="text-xs text-muted-foreground">Start a new quote request</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start text-left"
                  onClick={() => navigate("/compounds")}
                >
                  <TrendingUp className="h-5 w-5 mb-2" />
                  <span className="font-medium">Manage Compounds</span>
                  <span className="text-xs text-muted-foreground">Add or update compounds</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start text-left"
                  onClick={() => navigate("/labs")}
                >
                  <Package className="h-5 w-5 mb-2" />
                  <span className="font-medium">View Labs</span>
                  <span className="text-xs text-muted-foreground">Manage lab vendors</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PullToRefreshWrapper>
    </Layout>
  );
};

export default Dashboard;
