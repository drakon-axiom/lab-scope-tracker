import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { getCategoryColors } from "@/lib/categoryColors";
import { cn } from "@/lib/utils";

interface Compound {
  id: string;
  name: string;
  description: string | null;
  standard: string | null;
  category: string | null;
  aliases: string[] | null;
  duration_days: number | null;
  created_at: string;
  updated_at: string;
}

interface VendorPricing {
  id: string;
  lab_id: string;
  lab_name: string;
  price: number;
  is_active: boolean;
  notes: string | null;
  updated_at: string;
}

interface QuoteUsage {
  id: string;
  quote_id: string;
  quote_number: string | null;
  quote_status: string;
  quote_created_at: string;
  lab_name: string;
  price: number | null;
  sample: string | null;
  client: string | null;
}

const CompoundDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [compound, setCompound] = useState<Compound | null>(null);
  const [vendorPricing, setVendorPricing] = useState<VendorPricing[]>([]);
  const [quoteUsage, setQuoteUsage] = useState<QuoteUsage[]>([]);

  useEffect(() => {
    if (id) {
      fetchCompoundDetails();
    }
  }, [id]);

  const fetchCompoundDetails = async () => {
    try {
      setLoading(true);

      // Fetch compound details
      const { data: compoundData, error: compoundError } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (compoundError) throw compoundError;
      setCompound(compoundData);

      // Fetch vendor pricing with lab names
      const { data: pricingData, error: pricingError } = await supabase
        .from("product_vendor_pricing")
        .select(`
          id,
          lab_id,
          price,
          is_active,
          notes,
          updated_at,
          labs (name)
        `)
        .eq("product_id", id)
        .order("is_active", { ascending: false })
        .order("updated_at", { ascending: false });

      if (pricingError) throw pricingError;

      const formattedPricing = pricingData?.map((pricing: any) => ({
        id: pricing.id,
        lab_id: pricing.lab_id,
        lab_name: pricing.labs?.name || "Unknown Lab",
        price: pricing.price,
        is_active: pricing.is_active,
        notes: pricing.notes,
        updated_at: pricing.updated_at,
      })) || [];

      setVendorPricing(formattedPricing);

      // Fetch quote usage history
      const { data: usageData, error: usageError } = await supabase
        .from("quote_items")
        .select(`
          id,
          quote_id,
          price,
          sample,
          client,
          quotes (
            quote_number,
            status,
            created_at,
            lab_id,
            labs (name)
          )
        `)
        .eq("product_id", id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (usageError) throw usageError;

      const formattedUsage = usageData?.map((item: any) => ({
        id: item.id,
        quote_id: item.quote_id,
        quote_number: item.quotes?.quote_number || "N/A",
        quote_status: item.quotes?.status || "unknown",
        quote_created_at: item.quotes?.created_at || "",
        lab_name: item.quotes?.labs?.name || "Unknown Lab",
        price: item.price,
        sample: item.sample,
        client: item.client,
      })) || [];

      setQuoteUsage(formattedUsage);
    } catch (error: any) {
      console.error("Error fetching compound details:", error);
      toast.error("Failed to load compound details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!compound) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Compound not found</p>
          <Button onClick={() => navigate("/compounds")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Compounds
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/compounds")}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Compounds
            </Button>
            <div className="flex items-center gap-4 mb-2">
              {compound.category && (() => {
                const CategoryIcon = getCategoryIcon(compound.category);
                const colors = getCategoryColors(compound.category);
                return (
                  <div className={cn("p-3 rounded-lg", colors.bg)}>
                    <CategoryIcon className={cn("h-8 w-8", colors.text)} />
                  </div>
                );
              })()}
              <div>
                <h1 className="text-3xl font-bold">{compound.name}</h1>
                {compound.category && (
                  <Badge className={cn("mt-2 flex items-center gap-1.5 w-fit", getCategoryColors(compound.category).bg, getCategoryColors(compound.category).text)}>
                    {(() => {
                      const CategoryIcon = getCategoryIcon(compound.category);
                      return <CategoryIcon className="h-3.5 w-3.5" />;
                    })()}
                    <span>{compound.category}</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
              <p className="mt-1">{compound.description || "No description available"}</p>
            </div>
            {compound.standard && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Standard</h3>
                <p className="mt-1">{compound.standard}</p>
              </div>
            )}
            {compound.duration_days && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Duration</h3>
                <p className="mt-1">{compound.duration_days} days</p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
              <p className="mt-1">{new Date(compound.created_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Aliases */}
        {compound.aliases && compound.aliases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Aliases</CardTitle>
              <CardDescription>Alternative names for this compound</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {compound.aliases.map((alias, index) => (
                  <Badge key={index} variant="outline">
                    {alias}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendor Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Vendor Pricing</CardTitle>
            <CardDescription>
              Pricing information from different vendors ({vendorPricing.length} vendor{vendorPricing.length !== 1 ? 's' : ''})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vendorPricing.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorPricing.map((pricing) => (
                    <TableRow key={pricing.id}>
                      <TableCell className="font-medium">{pricing.lab_name}</TableCell>
                      <TableCell>${pricing.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={pricing.is_active ? "default" : "secondary"}>
                          {pricing.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {pricing.notes || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(pricing.updated_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No vendor pricing configured for this compound
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quote Usage History */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Usage History</CardTitle>
            <CardDescription>
              Recent quotes using this compound ({quoteUsage.length} usage{quoteUsage.length !== 1 ? 's' : ''})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quoteUsage.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Sample</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quoteUsage.map((usage) => (
                    <TableRow 
                      key={usage.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/quotes?selected=${usage.quote_id}`)}
                    >
                      <TableCell className="font-medium">{usage.quote_number}</TableCell>
                      <TableCell>{usage.client || "-"}</TableCell>
                      <TableCell>{usage.sample || "-"}</TableCell>
                      <TableCell>{usage.lab_name}</TableCell>
                      <TableCell>
                        {usage.price ? `$${usage.price.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{usage.quote_status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(usage.quote_created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                This compound has not been used in any quotes yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default CompoundDetails;
