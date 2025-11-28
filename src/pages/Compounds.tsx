import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, DollarSign, Wand2, Edit } from "lucide-react";
import { VendorPricingDialog } from "@/components/VendorPricingDialog";
import { BulkVendorPricingWizard } from "@/components/BulkVendorPricingWizard";

interface Compound {
  id: string;
  name: string;
  description: string | null;
  standard: string | null;
  duration_days: number | null;
}

const Compounds = () => {
  const { toast } = useToast();
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [open, setOpen] = useState(false);
  const [editingCompound, setEditingCompound] = useState<Compound | null>(null);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [selectedCompound, setSelectedCompound] = useState<{ id: string; name: string } | null>(null);
  const [bulkPricingWizardOpen, setBulkPricingWizardOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [bulkUpdateData, setBulkUpdateData] = useState({
    standard: "",
    duration_days: "",
    description: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    standard: "",
    duration_days: "",
  });

  const fetchCompounds = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching compounds",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCompounds(data || []);
    }
  };

  useEffect(() => {
    fetchCompounds();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      standard: "",
      duration_days: "",
    });
    setEditingCompound(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const submitData = {
      ...formData,
      duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
    };

    if (editingCompound) {
      const { error } = await supabase
        .from("products")
        .update(submitData)
        .eq("id", editingCompound.id);

      if (error) {
        toast({
          title: "Error updating compound",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Compound updated successfully" });
        setOpen(false);
        resetForm();
        fetchCompounds();
      }
    } else {
      const { error } = await supabase
        .from("products")
        .insert([{ ...submitData, user_id: user.id }]);

      if (error) {
        toast({
          title: "Error creating compound",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Compound created successfully" });
        setOpen(false);
        resetForm();
        fetchCompounds();
      }
    }
  };

  const handleEdit = (compound: Compound) => {
    setEditingCompound(compound);
    setFormData({
      name: compound.name,
      description: compound.description || "",
      standard: compound.standard || "",
      duration_days: compound.duration_days?.toString() || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this compound?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting compound",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Compound deleted successfully" });
      fetchCompounds();
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === compounds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(compounds.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} compound(s)?`)) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .in("id", Array.from(selectedIds));

    if (error) {
      toast({
        title: "Error deleting compounds",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `${selectedIds.size} compound(s) deleted successfully` });
      setSelectedIds(new Set());
      fetchCompounds();
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;

    const updateData: any = {};
    if (bulkUpdateData.standard) updateData.standard = bulkUpdateData.standard;
    if (bulkUpdateData.duration_days) updateData.duration_days = parseInt(bulkUpdateData.duration_days);
    if (bulkUpdateData.description) updateData.description = bulkUpdateData.description;

    if (Object.keys(updateData).length === 0) {
      toast({
        title: "No updates",
        description: "Please enter at least one field to update",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("products")
      .update(updateData)
      .in("id", Array.from(selectedIds));

    if (error) {
      toast({
        title: "Error updating compounds",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: `${selectedIds.size} compound(s) updated successfully` });
      setBulkUpdateOpen(false);
      setBulkUpdateData({ standard: "", duration_days: "", description: "" });
      setSelectedIds(new Set());
      fetchCompounds();
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Compounds</h2>
            <p className="text-muted-foreground">Manage compounds for testing</p>
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="mt-2">
                {selectedIds.size} selected
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setBulkUpdateOpen(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Bulk Update
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() => setBulkPricingWizardOpen(true)}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Bulk Pricing Setup
            </Button>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Compound
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCompound ? "Edit" : "Add"} Compound</DialogTitle>
                <DialogDescription>
                  {editingCompound ? "Update" : "Create a new"} compound entry
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Compound Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standard">Standard / Specification</Label>
                  <Input
                    id="standard"
                    value={formData.standard}
                    onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                    placeholder="e.g., HPLC-MS, HPLC-UV, LC-MS"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_days">Duration (days)</Label>
                  <Input
                    id="duration_days"
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  <p>💡 Vendor and pricing are managed through the "Manage" button in the Vendor Pricing column</p>
                </div>
                <Button type="submit" className="w-full">
                  {editingCompound ? "Update" : "Create"} Compound
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={compounds.length > 0 && selectedIds.size === compounds.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor Pricing</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compounds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No compounds found. Add your first compound to get started.
                  </TableCell>
                </TableRow>
              ) : (
                compounds.map((compound) => (
                  <TableRow key={compound.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(compound.id)}
                        onCheckedChange={() => toggleSelection(compound.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{compound.name}</TableCell>
                    <TableCell>{compound.standard || "—"}</TableCell>
                    <TableCell>
                      {compound.duration_days ? `${compound.duration_days} days` : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {compound.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCompound({ id: compound.id, name: compound.name });
                          setPricingDialogOpen(true);
                        }}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(compound)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(compound.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedCompound && (
        <VendorPricingDialog
          open={pricingDialogOpen}
          onOpenChange={setPricingDialogOpen}
          productId={selectedCompound.id}
          productName={selectedCompound.name}
        />
      )}
      
      {/* Bulk Vendor Pricing Wizard */}
      <BulkVendorPricingWizard
        open={bulkPricingWizardOpen}
        onOpenChange={setBulkPricingWizardOpen}
        onComplete={() => {
          toast({
            title: "Success",
            description: "Vendor pricing updated successfully",
          });
          fetchCompounds();
        }}
      />

      {/* Bulk Update Dialog */}
      <Dialog open={bulkUpdateOpen} onOpenChange={setBulkUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Update Compounds</DialogTitle>
            <DialogDescription>
              Update {selectedIds.size} selected compound(s). Only fill in fields you want to update.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-standard">Standard / Specification</Label>
              <Input
                id="bulk-standard"
                value={bulkUpdateData.standard}
                onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, standard: e.target.value })}
                placeholder="Leave empty to keep existing values"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-duration">Duration (days)</Label>
              <Input
                id="bulk-duration"
                type="number"
                value={bulkUpdateData.duration_days}
                onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, duration_days: e.target.value })}
                placeholder="Leave empty to keep existing values"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-description">Description</Label>
              <Textarea
                id="bulk-description"
                value={bulkUpdateData.description}
                onChange={(e) => setBulkUpdateData({ ...bulkUpdateData, description: e.target.value })}
                placeholder="Leave empty to keep existing values"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleBulkUpdate} className="flex-1">
                Update {selectedIds.size} Compound(s)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBulkUpdateOpen(false);
                  setBulkUpdateData({ standard: "", duration_days: "", description: "" });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Compounds;
