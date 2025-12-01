import { useEffect, useState } from "react";
import LabLayout from "@/components/lab/LabLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { toast } from "sonner";
import { Save, DollarSign, History, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ProductPricing {
  id: string;
  price: number;
  product_id: string;
  products: {
    name: string;
    category: string | null;
  };
}

interface PricingAudit {
  id: string;
  old_price: number | null;
  new_price: number;
  changed_at: string;
  change_reason: string | null;
  products: {
    name: string;
  };
}

export default function LabSettings() {
  const { labUser } = useLabUser();
  const [pricing, setPricing] = useState<ProductPricing[]>([]);
  const [auditLog, setAuditLog] = useState<PricingAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!labUser?.lab_id) return;

    const fetchData = async () => {
      try {
        // Fetch pricing
        const { data: pricingData, error: pricingError } = await supabase
          .from("product_vendor_pricing")
          .select(`
            id,
            price,
            product_id,
            products (
              name,
              category
            )
          `)
          .eq("lab_id", labUser.lab_id)
          .eq("is_active", true)
          .order("product_id");

        if (pricingError) throw pricingError;
        setPricing(pricingData || []);

        // Fetch audit log
        const { data: auditData, error: auditError } = await supabase
          .from("pricing_audit_log")
          .select(`
            id,
            old_price,
            new_price,
            changed_at,
            change_reason,
            products (
              name
            )
          `)
          .eq("lab_id", labUser.lab_id)
          .order("changed_at", { ascending: false })
          .limit(50);

        if (auditError) throw auditError;
        setAuditLog(auditData as any || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [labUser?.lab_id]);

  // Filter and sort pricing data
  const filteredPricing = pricing
    .filter((item) =>
      item.products.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.products.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.products.name.localeCompare(b.products.name));

  const handlePriceUpdate = async (pricingId: string, productId: string, oldPrice: number, newPrice: number) => {
    if (!labUser?.lab_id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update price
      const { error: updateError } = await supabase
        .from("product_vendor_pricing")
        .update({ price: newPrice })
        .eq("id", pricingId);

      if (updateError) throw updateError;

      // Log change
      const { error: logError } = await supabase
        .from("pricing_audit_log")
        .insert({
          product_id: productId,
          lab_id: labUser.lab_id,
          old_price: oldPrice,
          new_price: newPrice,
          changed_by: user.id,
          change_reason: "Updated from lab portal",
        });

      if (logError) throw logError;

      toast.success("Price updated successfully");
      
      // Refresh data
      const { data } = await supabase
        .from("product_vendor_pricing")
        .select(`
          id,
          price,
          product_id,
          products (
            name,
            category
          )
        `)
        .eq("lab_id", labUser.lab_id)
        .eq("is_active", true);

      setPricing(data || []);
    } catch (error) {
      console.error("Error updating price:", error);
      toast.error("Failed to update price");
    }
  };

  return (
    <LabLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lab Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage pricing, test panels, and lab configuration
          </p>
        </div>

        {/* Pricing Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Test Pricing
            </CardTitle>
            <CardDescription>
              Manage your test panel pricing. Changes are logged in the audit trail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by test name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test / Compound</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredPricing.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {searchQuery ? "No tests match your search" : "No pricing configured"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPricing.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.products.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.products.category || "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newPrice = prompt(
                              `Enter new price for ${item.products.name}:`,
                              item.price.toString()
                            );
                            if (newPrice) {
                              const parsed = parseFloat(newPrice);
                              if (!isNaN(parsed) && parsed > 0) {
                                handlePriceUpdate(item.id, item.product_id, item.price, parsed);
                              }
                            }
                          }}
                        >
                          Update Price
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pricing Audit Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Pricing Audit Trail
                </CardTitle>
                <CardDescription>
                  Complete history of all pricing changes
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAuditLog(!showAuditLog)}
              >
                {showAuditLog ? "Hide" : "Show"} Audit Log
              </Button>
            </div>
          </CardHeader>
          {showAuditLog && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test / Compound</TableHead>
                    <TableHead>Old Price</TableHead>
                    <TableHead>New Price</TableHead>
                    <TableHead>Changed</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No pricing changes yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLog.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.products.name}</TableCell>
                        <TableCell>
                          {log.old_price ? `$${log.old_price.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${log.new_price.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(log.changed_at), "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.change_reason || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      </div>
    </LabLayout>
  );
}
