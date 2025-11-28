import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import { VendorPricingDialog } from "@/components/VendorPricingDialog";

interface TestingType {
  id: string;
  name: string;
  description: string | null;
  vendor: string | null;
  standard: string | null;
  price: number | null;
  duration_days: number | null;
}

const TestingTypes = () => {
  const { toast } = useToast();
  const [testingTypes, setTestingTypes] = useState<TestingType[]>([]);
  const [open, setOpen] = useState(false);
  const [editingType, setEditingType] = useState<TestingType | null>(null);
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    vendor: "",
    standard: "",
    price: "",
    duration_days: "",
  });

  const fetchTestingTypes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching testing types",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTestingTypes(data || []);
    }
  };

  useEffect(() => {
    fetchTestingTypes();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      vendor: "",
      standard: "",
      price: "",
      duration_days: "",
    });
    setEditingType(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const submitData = {
      ...formData,
      price: formData.price ? parseFloat(formData.price) : null,
      duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
    };

    if (editingType) {
      const { error } = await supabase
        .from("products")
        .update(submitData)
        .eq("id", editingType.id);

      if (error) {
        toast({
          title: "Error updating testing type",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Testing type updated successfully" });
        setOpen(false);
        resetForm();
        fetchTestingTypes();
      }
    } else {
      const { error } = await supabase
        .from("products")
        .insert([{ ...submitData, user_id: user.id }]);

      if (error) {
        toast({
          title: "Error creating testing type",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Testing type created successfully" });
        setOpen(false);
        resetForm();
        fetchTestingTypes();
      }
    }
  };

  const handleEdit = (type: TestingType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      description: type.description || "",
      vendor: type.vendor || "",
      standard: type.standard || "",
      price: type.price?.toString() || "",
      duration_days: type.duration_days?.toString() || "",
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this testing type?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting testing type",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Testing type deleted successfully" });
      fetchTestingTypes();
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Testing Types</h2>
            <p className="text-muted-foreground">Manage types of testing procedures</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Testing Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingType ? "Edit" : "Add"} Testing Type</DialogTitle>
                <DialogDescription>
                  {editingType ? "Update" : "Create a new"} testing type entry
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Test Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="e.g., Janoshik"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="standard">Standard / Specification</Label>
                  <Input
                    id="standard"
                    value={formData.standard}
                    onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                    placeholder="e.g., HPLC, LC-MS, GCMS"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
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
                <Button type="submit" className="w-full">
                  {editingType ? "Update" : "Create"} Testing Type
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Standard</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Vendor Pricing</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testingTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No testing types found. Add your first testing type to get started.
                  </TableCell>
                </TableRow>
              ) : (
                testingTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell>{type.vendor || "—"}</TableCell>
                    <TableCell>{type.standard || "—"}</TableCell>
                    <TableCell>
                      {type.price ? `$${type.price.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell>
                      {type.duration_days ? `${type.duration_days} days` : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {type.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct({ id: type.id, name: type.name });
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
                        onClick={() => handleEdit(type)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(type.id)}
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

      {selectedProduct && (
        <VendorPricingDialog
          open={pricingDialogOpen}
          onOpenChange={setPricingDialogOpen}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
        />
      )}
    </Layout>
  );
};

export default TestingTypes;
