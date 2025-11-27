import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FlaskConical, FileCheck, TestTube } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ShipmentsTimeline } from "@/components/ShipmentsTimeline";
import { QuotePipelineCard } from "@/components/QuotePipelineCard";

const Dashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    labs: 0,
    testingTypes: 0,
    testRecords: 0,
    pendingTests: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [productsData, labsData, testingTypesData, testRecordsData, pendingData] = 
        await Promise.all([
          supabase.from("products").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("labs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("products").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("test_records").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("test_records").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "pending"),
        ]);

      setStats({
        products: productsData.count || 0,
        labs: labsData.count || 0,
        testingTypes: testingTypesData.count || 0,
        testRecords: testRecordsData.count || 0,
        pendingTests: pendingData.count || 0,
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: "Products", value: stats.products, icon: Package, link: "/products", color: "text-primary" },
    { title: "Labs", value: stats.labs, icon: FlaskConical, link: "/labs", color: "text-accent" },
    { title: "Testing Types", value: stats.testingTypes, icon: FileCheck, link: "/testing-types", color: "text-info" },
    { title: "Test Records", value: stats.testRecords, icon: TestTube, link: "/test-records", color: "text-muted-foreground" },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your testing management system</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Link key={stat.title} to={stat.link}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {stats.pendingTests > 0 && (
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="text-lg">Pending Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                You have {stats.pendingTests} test{stats.pendingTests !== 1 ? "s" : ""} pending review.
              </p>
              <Link to="/test-records">
                <Button>View Test Records</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/products">
                <Button variant="outline" className="w-full justify-start">
                  <Package className="mr-2 h-4 w-4" />
                  Manage Products
                </Button>
              </Link>
              <Link to="/labs">
                <Button variant="outline" className="w-full justify-start">
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Manage Labs
                </Button>
              </Link>
              <Link to="/testing-types">
                <Button variant="outline" className="w-full justify-start">
                  <FileCheck className="mr-2 h-4 w-4" />
                  Manage Testing Types
                </Button>
              </Link>
              <Link to="/test-records">
                <Button variant="outline" className="w-full justify-start">
                  <TestTube className="mr-2 h-4 w-4" />
                  View Test Records
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Add your products that need testing</p>
              <p>2. Register the labs you work with</p>
              <p>3. Define the types of testing you perform</p>
              <p>4. Create test records to track your testing progress</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Shipments Timeline */}
        <ShipmentsTimeline />
        
        {/* Quote Pipeline Card */}
        <QuotePipelineCard />
      </div>
    </Layout>
  );
};

export default Dashboard;
