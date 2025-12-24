import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Save, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  category: string | null;
  standard: string | null;
}

interface VendorPricing {
  id: string;
  product_id: string;
  price: number;
  is_active: boolean;
}

interface LabCompoundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labId: string;
  labName: string;
}

export function LabCompoundsDialog({ open, onOpenChange, labId, labName }: LabCompoundsDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [existingPricing, setExistingPricing] = useState<VendorPricing[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Track changes: { productId: { selected: boolean, price: string } }
  const [changes, setChanges] = useState<Record<string, { selected: boolean; price: string }>>({});
  
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, labId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, category, standard")
        .order("name");

      if (productsError) throw productsError;

      // Fetch existing pricing for this lab
      const { data: pricingData, error: pricingError } = await supabase
        .from("product_vendor_pricing")
        .select("id, product_id, price, is_active")
        .eq("lab_id", labId);

      if (pricingError) throw pricingError;

      setProducts(productsData || []);
      setExistingPricing(pricingData || []);
      
      // Initialize changes with existing data
      const initialChanges: Record<string, { selected: boolean; price: string }> = {};
      (pricingData || []).forEach((p) => {
        initialChanges[p.product_id] = {
          selected: p.is_active,
          price: p.price.toString(),
        };
      });
      setChanges(initialChanges);
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query) ||
        p.standard?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleToggle = (productId: string, checked: boolean) => {
    setChanges((prev) => ({
      ...prev,
      [productId]: {
        selected: checked,
        price: prev[productId]?.price || "",
      },
    }));
  };

  const handlePriceChange = (productId: string, price: string) => {
    setChanges((prev) => ({
      ...prev,
      [productId]: {
        selected: prev[productId]?.selected ?? false,
        price,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const existingMap = new Map(existingPricing.map((p) => [p.product_id, p]));
      
      const toInsert: any[] = [];
      const toUpdate: { id: string; price: number; is_active: boolean }[] = [];
      const toDelete: string[] = [];

      Object.entries(changes).forEach(([productId, { selected, price }]) => {
        const existing = existingMap.get(productId);
        const priceNum = parseFloat(price) || 0;

        if (selected && priceNum > 0) {
          if (existing) {
            // Update if price or active status changed
            if (existing.price !== priceNum || existing.is_active !== selected) {
              toUpdate.push({ id: existing.id, price: priceNum, is_active: true });
            }
          } else {
            // Insert new
            toInsert.push({
              product_id: productId,
              lab_id: labId,
              price: priceNum,
              is_active: true,
              user_id: user.id,
            });
          }
        } else if (!selected && existing) {
          // Deactivate or delete
          toUpdate.push({ id: existing.id, price: existing.price, is_active: false });
        }
      });

      // Perform operations
      if (toInsert.length > 0) {
        const { error } = await supabase.from("product_vendor_pricing").insert(toInsert);
        if (error) throw error;
      }

      for (const update of toUpdate) {
        const { error } = await supabase
          .from("product_vendor_pricing")
          .update({ price: update.price, is_active: update.is_active })
          .eq("id", update.id);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Compound pricing updated for ${labName}`,
        duration: 3000,
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error saving pricing",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = Object.values(changes).filter((c) => c.selected && parseFloat(c.price) > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Manage Compounds - {labName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search compounds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="secondary">{selectedCount} compounds with pricing</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading compounds...</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Active</TableHead>
                  <TableHead>Compound</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead className="w-32">Price ($)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No compounds found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const change = changes[product.id];
                    const isSelected = change?.selected ?? false;
                    const price = change?.price ?? "";

                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleToggle(product.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge variant="outline">{product.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {product.standard || "—"}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={price}
                            onChange={(e) => handlePriceChange(product.id, e.target.value)}
                            className="w-24"
                            disabled={!isSelected}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
