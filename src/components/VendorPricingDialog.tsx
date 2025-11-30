import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VendorPricing {
  id: string;
  lab_id: string;
  price: number;
  is_active: boolean;
  notes: string | null;
  labs: { name: string };
}

interface Lab {
  id: string;
  name: string;
}

interface VendorPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string; // This is the compound name
}

export function VendorPricingDialog({ open, onOpenChange, productId, productName }: VendorPricingDialogProps) {
  const [pricings, setPricings] = useState<VendorPricing[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPricing, setNewPricing] = useState({
    lab_id: "",
    price: "",
    notes: "",
    is_active: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPricings();
      fetchLabs();
    }
  }, [open, productId]);

  const fetchPricings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_vendor_pricing")
        .select("*, labs(name)")
        .eq("product_id", productId)
        .order("labs(name)");

      if (error) throw error;
      setPricings(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching vendor pricing",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLabs = async () => {
    try {
      const { data, error } = await supabase
        .from("labs")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setLabs(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching labs",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleAdd = async () => {
    if (!newPricing.lab_id || !newPricing.price) {
      toast({
        title: "Missing fields",
        description: "Please select a vendor and enter a price",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("product_vendor_pricing")
        .insert({
          product_id: productId,
          lab_id: newPricing.lab_id,
          price: parseFloat(newPricing.price),
          notes: newPricing.notes || null,
          is_active: newPricing.is_active,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vendor pricing added",
        duration: 3000,
      });

      setNewPricing({ lab_id: "", price: "", notes: "", is_active: true });
      setShowAddForm(false);
      fetchPricings();
    } catch (error: any) {
      toast({
        title: "Error adding vendor pricing",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("product_vendor_pricing")
        .update({ is_active: !currentActive })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vendor pricing updated",
        duration: 3000,
      });

      fetchPricings();
    } catch (error: any) {
      toast({
        title: "Error updating vendor pricing",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vendor pricing?")) return;

    try {
      const { error } = await supabase
        .from("product_vendor_pricing")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vendor pricing deleted",
        duration: 3000,
      });

      fetchPricings();
    } catch (error: any) {
      toast({
        title: "Error deleting vendor pricing",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const availableLabs = labs.filter(
    lab => !pricings.some(p => p.lab_id === lab.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Vendor Pricing - {productName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No vendor-specific pricing set
                      </TableCell>
                    </TableRow>
                  ) : (
                    pricings.map((pricing) => (
                      <TableRow key={pricing.id}>
                        <TableCell className="font-medium">{pricing.labs.name}</TableCell>
                        <TableCell>${pricing.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={pricing.is_active ? "default" : "secondary"}>
                            {pricing.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {pricing.notes || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(pricing.id, pricing.is_active)}
                            >
                              <Switch checked={pricing.is_active} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(pricing.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {!showAddForm ? (
                <Button
                  onClick={() => setShowAddForm(true)}
                  disabled={availableLabs.length === 0}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vendor Pricing
                </Button>
              ) : (
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">Add Vendor Pricing</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Vendor</Label>
                      <Select
                        value={newPricing.lab_id}
                        onValueChange={(value) => setNewPricing({ ...newPricing, lab_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableLabs.map((lab) => (
                            <SelectItem key={lab.id} value={lab.id}>
                              {lab.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newPricing.price}
                        onChange={(e) => setNewPricing({ ...newPricing, price: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Special conditions, discounts, etc."
                      value={newPricing.notes}
                      onChange={(e) => setNewPricing({ ...newPricing, notes: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newPricing.is_active}
                      onCheckedChange={(checked) => setNewPricing({ ...newPricing, is_active: checked })}
                    />
                    <Label>Active</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleAdd}>Add Pricing</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewPricing({ lab_id: "", price: "", notes: "", is_active: true });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
