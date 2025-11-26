import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Plus, Pencil, Trash2, Eye, FileText, Check, ChevronsUpDown, Mail } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

interface Quote {
  id: string;
  lab_id: string;
  quote_number: string | null;
  status: string;
  notes: string | null;
  tracking_number: string | null;
  shipped_date: string | null;
  created_at: string;
  labs: { name: string };
}

interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string;
  client: string | null;
  sample: string | null;
  manufacturer: string | null;
  batch: string | null;
  price: number | null;
  additional_samples: number | null;
  additional_report_headers: number | null;
  additional_headers_data: Array<{
    client: string;
    sample: string;
    manufacturer: string;
    batch: string;
  }> | null;
  products: { name: string; price: number | null };
}

interface Product {
  id: string;
  name: string;
}

interface Lab {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

interface Manufacturer {
  id: string;
  name: string;
}

interface TestingType {
  id: string;
  name: string;
  price: number | null;
  vendor: string | null;
  standard: string | null;
  duration_days: number | null;
}

const Quotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [testingTypes, setTestingTypes] = useState<TestingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [manufacturerOpen, setManufacturerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    lab_id: "",
    quote_number: "",
    status: "draft",
    notes: "",
    tracking_number: "",
    shipped_date: "",
  });

  const [itemFormData, setItemFormData] = useState({
    product_id: "",
    client: "",
    sample: "",
    manufacturer: "",
    batch: "",
    price: "",
    additional_samples: 0,
    additional_report_headers: 0,
    has_additional_samples: false,
    additional_headers_data: [] as Array<{
      client: string;
      sample: string;
      manufacturer: string;
      batch: string;
    }>,
  });

  useEffect(() => {
    fetchQuotes();
    fetchProducts();
    fetchLabs();
    fetchClients();
    fetchManufacturers();
    fetchTestingTypes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("quotes")
        .select("*, labs(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("user_id", user.id);

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchLabs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("labs")
        .select("id, name")
        .eq("user_id", user.id);

      if (error) throw error;
      setLabs(data || []);
    } catch (error: any) {
      console.error("Error fetching labs:", error);
    }
  };

  const fetchTestingTypes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, vendor, standard, duration_days")
        .eq("user_id", user.id);

      if (error) throw error;
      setTestingTypes(data || []);
    } catch (error: any) {
      console.error("Error fetching testing types:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("manufacturers")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setManufacturers(data || []);
    } catch (error: any) {
      console.error("Error fetching manufacturers:", error);
    }
  };

  const fetchQuoteItems = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from("quote_items")
        .select("*, products(name, price)")
        .eq("quote_id", quoteId);

      if (error) throw error;
      
      // Transform the data to handle JSON types
      const transformedData = (data || []).map(item => {
        let headersData: Array<{client: string; sample: string; manufacturer: string; batch: string}> = [];
        
        if (Array.isArray(item.additional_headers_data)) {
          headersData = item.additional_headers_data as Array<{client: string; sample: string; manufacturer: string; batch: string}>;
        }
        
        return {
          ...item,
          additional_headers_data: headersData,
        };
      });
      
      setQuoteItems(transformedData as QuoteItem[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      lab_id: "",
      quote_number: "",
      status: "draft",
      notes: "",
      tracking_number: "",
      shipped_date: "",
    });
    setEditingId(null);
  };

  const resetItemForm = () => {
    setItemFormData({
      product_id: "",
      client: "",
      sample: "",
      manufacturer: "",
      batch: "",
      price: "",
      additional_samples: 0,
      additional_report_headers: 0,
      has_additional_samples: false,
      additional_headers_data: [],
    });
    setEditingItemId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        ...formData,
        user_id: user.id,
        quote_number: formData.quote_number || null,
        notes: formData.notes || null,
        tracking_number: formData.tracking_number || null,
        shipped_date: formData.shipped_date || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("quotes")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Quote updated successfully" });
      } else {
        const { error } = await supabase.from("quotes").insert([payload]);
        if (error) throw error;
        toast({ title: "Quote created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (quote: Quote) => {
    setFormData({
      lab_id: quote.lab_id,
      quote_number: quote.quote_number || "",
      status: quote.status,
      notes: quote.notes || "",
      tracking_number: quote.tracking_number || "",
      shipped_date: quote.shipped_date || "",
    });
    setEditingId(quote.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quote?")) return;

    try {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Quote deleted successfully" });
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleView = (quote: Quote) => {
    setSelectedQuote(quote);
    fetchQuoteItems(quote.id);
    setViewDialogOpen(true);
  };

  const handleManageItems = (quote: Quote) => {
    setSelectedQuote(quote);
    fetchQuoteItems(quote.id);
    setItemsDialogOpen(true);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create client if it doesn't exist
      let clientName = itemFormData.client;
      const existingClient = clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
      if (!existingClient && clientName) {
        const { error } = await supabase
          .from("clients")
          .insert([{ name: clientName, user_id: user.id }]);
        if (!error) {
          await fetchClients(); // Refresh clients list
        }
      }

      // Create manufacturer if it doesn't exist
      let manufacturerName = itemFormData.manufacturer;
      const existingManufacturer = manufacturers.find(m => m.name.toLowerCase() === manufacturerName.toLowerCase());
      if (!existingManufacturer && manufacturerName) {
        const { error } = await supabase
          .from("manufacturers")
          .insert([{ name: manufacturerName, user_id: user.id }]);
        if (!error) {
          await fetchManufacturers(); // Refresh manufacturers list
        }
      }

      const payload = {
        quote_id: selectedQuote.id,
        product_id: itemFormData.product_id,
        client: clientName,
        sample: itemFormData.sample,
        manufacturer: manufacturerName,
        batch: itemFormData.batch,
        price: itemFormData.price ? parseFloat(itemFormData.price) : null,
        additional_samples: itemFormData.has_additional_samples ? itemFormData.additional_samples : 0,
        additional_report_headers: itemFormData.additional_report_headers,
        additional_headers_data: itemFormData.additional_headers_data,
      };

      if (editingItemId) {
        // Update existing item
        const { error } = await supabase
          .from("quote_items")
          .update(payload)
          .eq("id", editingItemId);
        if (error) throw error;
        toast({ title: "Item updated successfully" });
      } else {
        // Add new item
        const { error } = await supabase.from("quote_items").insert([payload]);
        if (error) throw error;
        toast({ title: "Item added successfully" });
      }

      resetItemForm();
      fetchQuoteItems(selectedQuote.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditItem = (item: QuoteItem) => {
    setEditingItemId(item.id);
    setItemFormData({
      product_id: item.product_id,
      client: item.client || "",
      sample: item.sample || "",
      manufacturer: item.manufacturer || "",
      batch: item.batch || "",
      price: item.price?.toString() || "",
      additional_samples: item.additional_samples || 0,
      additional_report_headers: item.additional_report_headers || 0,
      has_additional_samples: (item.additional_samples || 0) > 0,
      additional_headers_data: item.additional_headers_data || [],
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase
        .from("quote_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
      toast({ title: "Item deleted successfully" });
      if (selectedQuote) fetchQuoteItems(selectedQuote.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGenerateTestRecords = async () => {
    if (!selectedQuote) return;
    if (!confirm("Generate test records from all quote items?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const testRecords = quoteItems.map((item) => ({
        user_id: user.id,
        product_id: item.product_id,
        lab_id: selectedQuote.lab_id,
        quote_item_id: item.id,
        client: item.client,
        sample: item.sample,
        manufacturer: item.manufacturer,
        batch: item.batch,
        status: "pending",
        date_submitted: new Date().toISOString().split("T")[0],
      }));

      const { error } = await supabase.from("test_records").insert(testRecords);
      if (error) throw error;

      // Update quote status
      await supabase
        .from("quotes")
        .update({ status: "test_records_generated" })
        .eq("id", selectedQuote.id);

      toast({ title: "Test records generated successfully" });
      setViewDialogOpen(false);
      fetchQuotes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = async () => {
    if (!selectedQuote) return;
    
    // Get lab details
    const lab = labs.find(l => l.id === selectedQuote.lab_id);
    if (!lab) {
      toast({
        title: "Error",
        description: "Lab information not found",
        variant: "destructive",
      });
      return;
    }

    // Fetch lab email
    const { data: labData, error: labError } = await supabase
      .from("labs")
      .select("contact_email")
      .eq("id", selectedQuote.lab_id)
      .single();

    if (labError || !labData?.contact_email) {
      toast({
        title: "Error",
        description: "Lab email not found. Please add a contact email for this lab.",
        variant: "destructive",
      });
      return;
    }

    try {
      const emailPayload = {
        labEmail: labData.contact_email,
        labName: lab.name,
        quoteNumber: selectedQuote.quote_number,
        items: quoteItems.map(item => ({
          productName: item.products.name,
          client: item.client,
          sample: item.sample,
          manufacturer: item.manufacturer,
          batch: item.batch,
          price: item.price,
        })),
        notes: selectedQuote.notes,
        totalValue: totalQuoteValue,
      };

      toast({
        title: "Sending email...",
        description: "Please wait while we send the quote to the vendor.",
      });

      const { error } = await supabase.functions.invoke('send-quote-email', {
        body: emailPayload,
      });

      if (error) throw error;

      // Update quote status to 'sent_to_vendor'
      await supabase
        .from("quotes")
        .update({ status: "sent_to_vendor" })
        .eq("id", selectedQuote.id);

      toast({
        title: "Email sent successfully",
        description: `Quote has been sent to ${lab.name}`,
      });

      fetchQuotes();
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProductChange = (productId: string) => {
    setItemFormData((prev) => ({ ...prev, product_id: productId }));
    const product = testingTypes.find((t) => t.id === productId);
    if (product) {
      setItemFormData((prev) => ({
        ...prev,
        price: product.price?.toString() || "",
        sample: product.name, // Auto-populate sample with product name
      }));
    }
  };

  // Helper function to calculate item total including additional samples
  const calculateItemTotal = (item: QuoteItem): number => {
    const basePrice = item.price || 0;
    const productName = item.products.name.toLowerCase();
    
    // Check if product qualifies for $60 per additional sample
    const qualifiesForAdditionalSamplePricing = 
      productName.includes('tirzepatide') || 
      productName.includes('semaglutide') || 
      productName.includes('retatrutide');
    
    if (qualifiesForAdditionalSamplePricing && (item.additional_samples || 0) > 0) {
      return basePrice + ((item.additional_samples || 0) * 60);
    }
    
    return basePrice;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  const totalQuoteValue = quoteItems.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Quotes</h1>
            <p className="text-muted-foreground">
              Manage testing quotes and generate test records
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                New Quote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Quote" : "New Quote"}
                </DialogTitle>
                <DialogDescription>
                  Create a quote for testing services
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lab_id">Lab *</Label>
                    <Select
                      value={formData.lab_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, lab_id: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select lab" />
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
                    <Label htmlFor="quote_number">Quote Number</Label>
                    <Input
                      id="quote_number"
                      value={formData.quote_number}
                      onChange={(e) =>
                        setFormData({ ...formData, quote_number: e.target.value })
                      }
                      placeholder="Enter or leave blank for auto-generation"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent_to_vendor">
                          Sent to Vendor
                        </SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="test_records_generated">
                          Test Records Generated
                        </SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shipped_date">Shipped Date</Label>
                    <Input
                      id="shipped_date"
                      type="date"
                      value={formData.shipped_date}
                      onChange={(e) =>
                        setFormData({ ...formData, shipped_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tracking_number">Tracking Number</Label>
                  <Input
                    id="tracking_number"
                    value={formData.tracking_number}
                    onChange={(e) =>
                      setFormData({ ...formData, tracking_number: e.target.value })
                    }
                    placeholder="Enter tracking number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingId ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote #</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No quotes yet. Create your first quote to get started.
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">
                      {quote.quote_number || "—"}
                    </TableCell>
                    <TableCell>{quote.labs.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={quote.status} />
                    </TableCell>
                    <TableCell>{quote.tracking_number || "—"}</TableCell>
                    <TableCell>
                      {new Date(quote.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(quote)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleManageItems(quote)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(quote)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(quote.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* View Quote Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Quote Details</DialogTitle>
              <DialogDescription>
                Review quote information and items
              </DialogDescription>
            </DialogHeader>
            {selectedQuote && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Quote Number</Label>
                    <p className="font-medium">
                      {selectedQuote.quote_number || "Not assigned"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Lab</Label>
                    <p className="font-medium">{selectedQuote.labs.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <StatusBadge status={selectedQuote.status} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tracking Number</Label>
                    <p className="font-medium">
                      {selectedQuote.tracking_number || "—"}
                    </p>
                  </div>
                </div>

                {selectedQuote.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="mt-1">{selectedQuote.notes}</p>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Quote Items</Label>
                    <p className="text-sm text-muted-foreground">
                      Total: ${totalQuoteValue.toFixed(2)}
                    </p>
                  </div>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Client/Sample</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quoteItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.products.name}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>Client: {item.client || "—"}</div>
                                <div>Sample: {item.sample || "—"}</div>
                                <div>Mfg: {item.manufacturer || "—"}</div>
                                <div>Batch: {item.batch || "—"}</div>
                                {(item.additional_samples || 0) > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    +{item.additional_samples} additional samples
                                  </div>
                                )}
                                {(item.additional_report_headers || 0) > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    +{item.additional_report_headers} report headers
                                  </div>
                                )}
                                {item.additional_headers_data && item.additional_headers_data.length > 0 && (
                                  <div className="mt-2 pl-2 border-l-2 border-muted space-y-1">
                                    {item.additional_headers_data.map((header, idx) => (
                                      <div key={idx} className="text-xs text-muted-foreground">
                                        <strong>Header #{idx + 1}:</strong> {header.client} / {header.sample} / {header.manufacturer} / {header.batch}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              ${item.price?.toFixed(2) || "0.00"}
                              {(item.additional_samples || 0) > 0 && 
                               (item.products.name.toLowerCase().includes('tirzepatide') || 
                                item.products.name.toLowerCase().includes('semaglutide') || 
                                item.products.name.toLowerCase().includes('retatrutide')) && (
                                <div className="text-xs text-muted-foreground">
                                  +${((item.additional_samples || 0) * 60).toFixed(2)} (additional samples)
                                </div>
                              )}
                              <div className="text-sm font-medium mt-1">
                                Total: ${calculateItemTotal(item).toFixed(2)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setViewDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSendEmail}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send to Vendor
                  </Button>
                  {selectedQuote.status === "approved" && (
                    <Button onClick={handleGenerateTestRecords}>
                      Generate Test Records
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Manage Items Dialog */}
        <Dialog open={itemsDialogOpen} onOpenChange={setItemsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Quote Items</DialogTitle>
              <DialogDescription>
                Add or remove items from this quote
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <form onSubmit={handleAddItem} className="space-y-4 p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">
                    {editingItemId ? "Edit Item" : "Add New Item"}
                  </h3>
                  {editingItemId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetItemForm}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select
                      value={itemFormData.product_id}
                      onValueChange={handleProductChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
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
                    <Label>Client *</Label>
                    <Popover open={clientOpen} onOpenChange={setClientOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={clientOpen}
                          className="w-full justify-between"
                        >
                          {itemFormData.client || "Select or type client..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search or type new client..." 
                            value={itemFormData.client}
                            onValueChange={(value) => setItemFormData({ ...itemFormData, client: value })}
                          />
                          <CommandList>
                            <CommandEmpty>
                              Press Enter to add "{itemFormData.client}"
                            </CommandEmpty>
                            <CommandGroup>
                              {clients.map((client) => (
                                <CommandItem
                                  key={client.id}
                                  value={client.name}
                                  onSelect={() => {
                                    setItemFormData({ ...itemFormData, client: client.name });
                                    setClientOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      itemFormData.client === client.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {client.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Sample *</Label>
                    <Input
                      value={itemFormData.sample}
                      onChange={(e) =>
                        setItemFormData({ ...itemFormData, sample: e.target.value })
                      }
                      placeholder="Sample identifier"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Manufacturer *</Label>
                    <Popover open={manufacturerOpen} onOpenChange={setManufacturerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={manufacturerOpen}
                          className="w-full justify-between"
                        >
                          {itemFormData.manufacturer || "Select or type manufacturer..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search or type new manufacturer..." 
                            value={itemFormData.manufacturer}
                            onValueChange={(value) => setItemFormData({ ...itemFormData, manufacturer: value })}
                          />
                          <CommandList>
                            <CommandEmpty>
                              Press Enter to add "{itemFormData.manufacturer}"
                            </CommandEmpty>
                            <CommandGroup>
                              {manufacturers.map((manufacturer) => (
                                <CommandItem
                                  key={manufacturer.id}
                                  value={manufacturer.name}
                                  onSelect={() => {
                                    setItemFormData({ ...itemFormData, manufacturer: manufacturer.name });
                                    setManufacturerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      itemFormData.manufacturer === manufacturer.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {manufacturer.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Batch *</Label>
                    <Input
                      value={itemFormData.batch}
                      onChange={(e) =>
                        setItemFormData({ ...itemFormData, batch: e.target.value })
                      }
                      placeholder="Batch number"
                      required
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={itemFormData.price}
                      onChange={(e) =>
                        setItemFormData({ ...itemFormData, price: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-3 col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="additional-samples"
                        checked={itemFormData.has_additional_samples}
                        onCheckedChange={(checked) => 
                          setItemFormData({ 
                            ...itemFormData, 
                            has_additional_samples: checked as boolean,
                            additional_samples: checked ? itemFormData.additional_samples : 0
                          })
                        }
                      />
                      <Label htmlFor="additional-samples" className="cursor-pointer">
                        Additional Samples
                      </Label>
                    </div>
                    {itemFormData.has_additional_samples && (
                      <Input
                        type="number"
                        min="0"
                        value={itemFormData.additional_samples}
                        onChange={(e) =>
                          setItemFormData({ 
                            ...itemFormData, 
                            additional_samples: parseInt(e.target.value) || 0 
                          })
                        }
                        placeholder="Number of additional samples"
                      />
                    )}
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Additional Report Headers</Label>
                    <Input
                      type="number"
                      min="0"
                      value={itemFormData.additional_report_headers}
                      onChange={(e) => {
                        const count = parseInt(e.target.value) || 0;
                        const currentData = itemFormData.additional_headers_data;
                        
                        // Resize the array to match the count
                        let newData = [...currentData];
                        if (count > currentData.length) {
                          // Add empty entries
                          for (let i = currentData.length; i < count; i++) {
                            newData.push({ client: "", sample: "", manufacturer: "", batch: "" });
                          }
                        } else if (count < currentData.length) {
                          // Remove excess entries
                          newData = newData.slice(0, count);
                        }
                        
                        setItemFormData({ 
                          ...itemFormData, 
                          additional_report_headers: count,
                          additional_headers_data: newData,
                        });
                      }}
                      placeholder="Number of additional report headers"
                    />
                  </div>
                  
                  {/* Dynamic fields for each additional header */}
                  {itemFormData.additional_report_headers > 0 && (
                    <div className="col-span-2 space-y-4 p-4 border rounded-lg bg-muted/50">
                      <Label className="text-sm font-semibold">Additional Report Header Details</Label>
                      {Array.from({ length: itemFormData.additional_report_headers }).map((_, index) => (
                        <div key={index} className="space-y-3 p-3 border rounded bg-background">
                          <Label className="text-xs text-muted-foreground">Header #{index + 1}</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Client</Label>
                              <Input
                                value={itemFormData.additional_headers_data[index]?.client || ""}
                                onChange={(e) => {
                                  const newData = [...itemFormData.additional_headers_data];
                                  newData[index] = { ...newData[index], client: e.target.value };
                                  setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                }}
                                placeholder="Client name"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Sample</Label>
                              <Input
                                value={itemFormData.additional_headers_data[index]?.sample || ""}
                                onChange={(e) => {
                                  const newData = [...itemFormData.additional_headers_data];
                                  newData[index] = { ...newData[index], sample: e.target.value };
                                  setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                }}
                                placeholder="Sample identifier"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Manufacturer</Label>
                              <Input
                                value={itemFormData.additional_headers_data[index]?.manufacturer || ""}
                                onChange={(e) => {
                                  const newData = [...itemFormData.additional_headers_data];
                                  newData[index] = { ...newData[index], manufacturer: e.target.value };
                                  setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                }}
                                placeholder="Manufacturer name"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Batch</Label>
                              <Input
                                value={itemFormData.additional_headers_data[index]?.batch || ""}
                                onChange={(e) => {
                                  const newData = [...itemFormData.additional_headers_data];
                                  newData[index] = { ...newData[index], batch: e.target.value };
                                  setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                }}
                                placeholder="Batch number"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  {editingItemId ? "Update Item" : "Add Item"}
                </Button>
              </form>

              <div>
                <Label>Current Items</Label>
                <div className="border rounded-lg mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Submission Info</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quoteItems.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-muted-foreground"
                          >
                            No items added yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        quoteItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.products.name}</TableCell>
                            <TableCell className="text-sm">
                              {item.client && <div>Client: {item.client}</div>}
                              {item.sample && <div>Sample: {item.sample}</div>}
                              {item.manufacturer && (
                                <div>Mfg: {item.manufacturer}</div>
                              )}
                              {item.batch && <div>Batch: {item.batch}</div>}
                              {(item.additional_samples || 0) > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  +{item.additional_samples} additional samples
                                </div>
                              )}
                              {(item.additional_report_headers || 0) > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  +{item.additional_report_headers} report headers
                                </div>
                              )}
                              {item.additional_headers_data && item.additional_headers_data.length > 0 && (
                                <div className="mt-2 pl-2 border-l-2 border-muted space-y-1">
                                  {item.additional_headers_data.map((header, idx) => (
                                    <div key={idx} className="text-xs text-muted-foreground">
                                      <strong>Header #{idx + 1}:</strong> {header.client} / {header.sample} / {header.manufacturer} / {header.batch}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              ${item.price?.toFixed(2) || "0.00"}
                              {(item.additional_samples || 0) > 0 && 
                               (item.products.name.toLowerCase().includes('tirzepatide') || 
                                item.products.name.toLowerCase().includes('semaglutide') || 
                                item.products.name.toLowerCase().includes('retatrutide')) && (
                                <div className="text-xs text-muted-foreground">
                                  +${((item.additional_samples || 0) * 60).toFixed(2)} (additional)
                                </div>
                              )}
                              <div className="text-sm font-medium mt-1">
                                Total: ${calculateItemTotal(item).toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditItem(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between items-center mt-2 px-2">
                  <span className="font-medium">Total</span>
                  <span className="font-medium">
                    ${totalQuoteValue.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setItemsDialogOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Quotes;