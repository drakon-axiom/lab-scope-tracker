import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

interface TestRecord {
  id: string;
  product_id: string;
  lab_id: string;
  status: string;
  date_submitted: string | null;
  date_completed: string | null;
  test_results: string | null;
  notes: string | null;
  client: string | null;
  sample: string | null;
  manufacturer: string | null;
  batch: string | null;
  products: { name: string };
  labs: { name: string };
}

interface Product {
  id: string;
  name: string;
}

interface Lab {
  id: string;
  name: string;
}


const TestRecords = () => {
  const { toast } = useToast();
  const [testRecords, setTestRecords] = useState<TestRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TestRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<TestRecord | null>(null);
  const [formData, setFormData] = useState({
    product_id: "",
    lab_id: "",
    status: "pending",
    date_submitted: "",
    date_completed: "",
    test_results: "",
    notes: "",
    client: "",
    sample: "",
    manufacturer: "",
    batch: "",
  });

  const fetchTestRecords = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("test_records")
      .select(`
        *,
        products(name),
        labs(name)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching test records",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setTestRecords(data || []);
    }
  };

  const fetchOptions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [productsData, labsData] = await Promise.all([
      supabase.from("products").select("id, name").eq("user_id", user.id),
      supabase.from("labs").select("id, name").eq("user_id", user.id),
    ]);

    setProducts(productsData.data || []);
    setLabs(labsData.data || []);
  };

  useEffect(() => {
    fetchTestRecords();
    fetchOptions();
  }, []);

  const resetForm = () => {
    setFormData({
      product_id: "",
      lab_id: "",
      status: "pending",
      date_submitted: "",
      date_completed: "",
      test_results: "",
      notes: "",
      client: "",
      sample: "",
      manufacturer: "",
      batch: "",
    });
    setEditingRecord(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const submitData = {
      ...formData,
      date_submitted: formData.date_submitted || null,
      date_completed: formData.date_completed || null,
    };

    if (editingRecord) {
      const { error } = await supabase
        .from("test_records")
        .update(submitData)
        .eq("id", editingRecord.id);

      if (error) {
        toast({
          title: "Error updating test record",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Test record updated successfully" });
        setOpen(false);
        resetForm();
        fetchTestRecords();
      }
    } else {
      const { error } = await supabase
        .from("test_records")
        .insert([{ ...submitData, user_id: user.id }]);

      if (error) {
        toast({
          title: "Error creating test record",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Test record created successfully" });
        setOpen(false);
        resetForm();
        fetchTestRecords();
      }
    }
  };

  const handleEdit = (record: TestRecord) => {
    setEditingRecord(record);
    setFormData({
      product_id: record.product_id,
      lab_id: record.lab_id,
      status: record.status,
      date_submitted: record.date_submitted || "",
      date_completed: record.date_completed || "",
      test_results: record.test_results || "",
      notes: record.notes || "",
      client: record.client || "",
      sample: record.sample || "",
      manufacturer: record.manufacturer || "",
      batch: record.batch || "",
    });
    setOpen(true);
  };

  const handleView = (record: TestRecord) => {
    setViewingRecord(record);
    setViewOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this test record?")) return;

    const { error } = await supabase.from("test_records").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting test record",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Test record deleted successfully" });
      fetchTestRecords();
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Test Records</h2>
            <p className="text-muted-foreground">Track all your testing activities</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Test Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRecord ? "Edit" : "Add"} Test Record</DialogTitle>
                <DialogDescription>
                  {editingRecord ? "Update" : "Create a new"} test record entry
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Product</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lab">Lab</Label>
                  <Select
                    value={formData.lab_id}
                    onValueChange={(value) => setFormData({ ...formData, lab_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lab" />
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
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Input
                    id="client"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    placeholder="Client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sample">Sample</Label>
                  <Input
                    id="sample"
                    value={formData.sample}
                    onChange={(e) => setFormData({ ...formData, sample: e.target.value })}
                    placeholder="Sample identifier"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="Manufacturer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batch">Batch</Label>
                  <Input
                    id="batch"
                    value={formData.batch}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                    placeholder="Batch number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_submitted">Date Submitted</Label>
                  <Input
                    id="date_submitted"
                    type="date"
                    value={formData.date_submitted}
                    onChange={(e) => setFormData({ ...formData, date_submitted: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_completed">Date Completed</Label>
                  <Input
                    id="date_completed"
                    type="date"
                    value={formData.date_completed}
                    onChange={(e) => setFormData({ ...formData, date_completed: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test_results">Test Results</Label>
                  <Textarea
                    id="test_results"
                    value={formData.test_results}
                    onChange={(e) => setFormData({ ...formData, test_results: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingRecord ? "Update" : "Create"} Test Record
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No test records found. Add your first test record to get started.
                  </TableCell>
                </TableRow>
              ) : (
                testRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.products.name}</TableCell>
                    <TableCell>{record.labs.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell>
                      {record.date_submitted
                        ? new Date(record.date_submitted).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(record)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(record)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(record.id)}
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

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Record Details</DialogTitle>
          </DialogHeader>
          {viewingRecord && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Product</Label>
                <p className="font-medium">{viewingRecord.products.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Lab</Label>
                <p className="font-medium">{viewingRecord.labs.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <StatusBadge status={viewingRecord.status} />
                </div>
              </div>
              {(viewingRecord.client || viewingRecord.sample || viewingRecord.manufacturer || viewingRecord.batch) && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-md">
                  <Label className="text-sm font-semibold">Submission Details</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {viewingRecord.client && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Client</Label>
                        <p className="text-sm">{viewingRecord.client}</p>
                      </div>
                    )}
                    {viewingRecord.sample && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Sample</Label>
                        <p className="text-sm">{viewingRecord.sample}</p>
                      </div>
                    )}
                    {viewingRecord.manufacturer && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Manufacturer</Label>
                        <p className="text-sm">{viewingRecord.manufacturer}</p>
                      </div>
                    )}
                    {viewingRecord.batch && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Batch</Label>
                        <p className="text-sm">{viewingRecord.batch}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Date Submitted</Label>
                  <p>
                    {viewingRecord.date_submitted
                      ? new Date(viewingRecord.date_submitted).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date Completed</Label>
                  <p>
                    {viewingRecord.date_completed
                      ? new Date(viewingRecord.date_completed).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>
              {viewingRecord.test_results && (
                <div>
                  <Label className="text-muted-foreground">Test Results</Label>
                  <p className="mt-1 whitespace-pre-wrap">{viewingRecord.test_results}</p>
                </div>
              )}
              {viewingRecord.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1 whitespace-pre-wrap">{viewingRecord.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default TestRecords;
