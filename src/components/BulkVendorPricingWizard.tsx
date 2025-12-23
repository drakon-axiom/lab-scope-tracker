import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuotesData } from "@/hooks/useQuotesData";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  standard: string | null;
}

interface Lab {
  id: string;
  name: string;
}

interface BulkPricingEntry {
  product_id: string;
  lab_id: string;
  price: string;
  selected: boolean;
}

interface BulkVendorPricingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function BulkVendorPricingWizard({ open, onOpenChange, onComplete }: BulkVendorPricingWizardProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const { labs } = useQuotesData();
  const [selectedLab, setSelectedLab] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  const [entries, setEntries] = useState<BulkPricingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open]);

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, name, standard")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching compounds",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleApplyBulkPrice = () => {
    if (!selectedLab || !bulkPrice) {
      toast({
        title: "Missing fields",
        description: "Please select a vendor and enter a price",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    const newEntries = products.map(product => ({
      product_id: product.id,
      lab_id: selectedLab,
      price: bulkPrice,
      selected: true,
    }));

    setEntries(newEntries);
  };

  const toggleEntry = (productId: string) => {
    setEntries(entries.map(e => 
      e.product_id === productId ? { ...e, selected: !e.selected } : e
    ));
  };

  const updateEntryPrice = (productId: string, price: string) => {
    setEntries(entries.map(e => 
      e.product_id === productId ? { ...e, price } : e
    ));
  };

  const handleSubmit = async () => {
    const selectedEntries = entries.filter(e => e.selected && parseFloat(e.price) > 0);
    
    if (selectedEntries.length === 0) {
      toast({
        title: "No entries selected",
        description: "Please select at least one compound with a valid price",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check for existing pricing to avoid duplicates
      const { data: existing } = await supabase
        .from("product_vendor_pricing")
        .select("product_id, lab_id")
        .in("product_id", selectedEntries.map(e => e.product_id))
        .eq("lab_id", selectedLab);

      const existingSet = new Set(existing?.map(e => `${e.product_id}-${e.lab_id}`) || []);
      
      const newEntries = selectedEntries.filter(e => 
        !existingSet.has(`${e.product_id}-${e.lab_id}`)
      );

      if (newEntries.length === 0) {
        toast({
          title: "Already exists",
          description: "All selected compounds already have pricing for this vendor",
          variant: "destructive",
          duration: 4000,
        });
        setLoading(false);
        return;
      }

      const insertData = newEntries.map(entry => ({
        product_id: entry.product_id,
        lab_id: entry.lab_id,
        price: parseFloat(entry.price),
        is_active: true,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from("product_vendor_pricing")
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added pricing for ${newEntries.length} compound(s)`,
        duration: 3000,
      });

      onComplete?.();
      onOpenChange(false);
      setEntries([]);
      setSelectedLab("");
      setBulkPrice("");
    } catch (error: any) {
      toast({
        title: "Error adding bulk pricing",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || "";
  };

  const selectedCount = entries.filter(e => e.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Bulk Vendor Pricing Setup
          </DialogTitle>
          <DialogDescription>
            Quickly configure pricing for multiple compounds at once
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
            <h3 className="font-semibold">Step 1: Set Base Pricing</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select value={selectedLab} onValueChange={setSelectedLab}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {labs.map((lab) => (
                      <SelectItem key={lab.id} value={lab.id}>
                        {lab.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Base Price (applies to all)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={handleApplyBulkPrice}
              disabled={!selectedLab || !bulkPrice}
              className="w-full"
            >
              Apply to All Compounds
            </Button>
          </div>

          {entries.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Step 2: Review & Customize</h3>
                <Badge variant="secondary">
                  {selectedCount} of {entries.length} selected
                </Badge>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedCount === entries.length && entries.length > 0}
                        onCheckedChange={(checked) => {
                          setEntries(entries.map(e => ({ ...e, selected: !!checked })));
                        }}
                      />
                    </TableHead>
                    <TableHead>Compound</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.product_id}>
                      <TableCell>
                        <Checkbox
                          checked={entry.selected}
                          onCheckedChange={() => toggleEntry(entry.product_id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {getProductName(entry.product_id)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.price}
                          onChange={(e) => updateEntryPrice(entry.product_id, e.target.value)}
                          className="w-32"
                          disabled={!entry.selected}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={loading || selectedCount === 0}
            className="flex-1"
          >
            {loading ? "Adding..." : `Add Pricing for ${selectedCount} Compound(s)`}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
