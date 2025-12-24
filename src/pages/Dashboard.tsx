import { memo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Clock, TrendingUp, FileText, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "@/components/StatusBadge";
import { PullToRefreshWrapper } from "@/components/PullToRefresh";
import { UsageWidget } from "@/components/UsageWidget";
import { OnboardingTutorial } from "@/components/OnboardingTutorial";
import { ActionRequiredSection } from "@/components/ActionRequiredSection";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { Skeleton } from "@/components/ui/skeleton";

// Memoized quote card to prevent unnecessary re-renders
const QuoteCard = memo(({ quote, onClick }: { quote: any; onClick: () => void }) => (
  <div
    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
    onClick={onClick}
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
));
QuoteCard.displayName = "QuoteCard";

// Memoized shipment card
const ShipmentCard = memo(({ shipment, onClick }: { shipment: any; onClick: () => void }) => (
  <div
    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
    onClick={onClick}
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
));
ShipmentCard.displayName = "ShipmentCard";

// Loading skeleton
const DashboardSkeleton = () => (
  <Layout>
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64" />
    </div>
  </Layout>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { 
    activeQuotes, 
    shipmentsInProgress, 
    avgCompletionDays, 
    statusCounts,
    quotesAwaitingApproval,
    quotesReadyForPayment,
    shipmentsToTrack,
    loading, 
    refetch 
  } = useDashboardData();
  const { showOnboarding, loading: onboardingLoading } = useOnboardingStatus();

  const handleRefresh = async () => {
    await refetch();
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <Layout>
      {showOnboarding && !onboardingLoading && (
        <OnboardingTutorial onComplete={() => {}} />
      )}
      <PullToRefreshWrapper onRefresh={handleRefresh}>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Quick overview of your lab operations</p>
          </div>
          {/* Action Required Section */}
          <ActionRequiredSection
            quotesAwaitingApproval={quotesAwaitingApproval}
            quotesReadyForPayment={quotesReadyForPayment}
            shipmentsToTrack={shipmentsToTrack}
          />

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

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start text-left"
                  onClick={() => navigate("/quotes/new")}
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
              </div>
            </CardContent>
          </Card>

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
                    onClick={() => navigate("/quotes/new")}
                    className="mt-2"
                  >
                    Create your first quote
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeQuotes.slice(0, 5).map((quote) => (
                    <QuoteCard 
                      key={quote.id} 
                      quote={quote} 
                      onClick={() => navigate("/quotes")} 
                    />
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
                    <ShipmentCard 
                      key={shipment.id} 
                      shipment={shipment} 
                      onClick={() => navigate("/quotes")} 
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PullToRefreshWrapper>
    </Layout>
  );
};

export default Dashboard;
