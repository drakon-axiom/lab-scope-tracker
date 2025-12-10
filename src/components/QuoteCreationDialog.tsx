import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerSuccessConfetti } from "@/lib/confetti";

interface Lab {
  id: string;
  name: string;
}

interface Product {
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

interface QuoteItem {
  id?: string;
  product_id: string;
  product_name: string;
  client: string;
  sample: string;
  manufacturer: string;
  batch: string;
  price: number;
  additional_samples: number;
  additional_report_headers: number;
  has_additional_samples: boolean;
  additional_headers_data: Array<{
    client: string;
    sample: string;
    manufacturer: string;
    batch: string;
  }>;
}

interface QuoteCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labs: Lab[];
  onSuccess: () => void;
}

export function QuoteCreationDialog({
  open,
  onOpenChange,
  labs,
  onSuccess,
}: QuoteCreationDialogProps) {
  const { isSubscriber, isAdmin } = useUserRole();
  const { impersonatedUser, isImpersonatingCustomer } = useImpersonation();
  const { toast } = useToast();

  // Quote form data
  const [formData, setFormData] = useState({
    lab_id: "",
    quote_number: "",
    lab_quote_number: "",
    notes: "",
  });

  // Items state
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(false);

  // Item form state
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemFormData, setItemFormData] = useState<QuoteItem>({
    product_id: "",
    product_name: "",
    client: "",
    sample: "",
    manufacturer: "",
    batch: "",
    price: 0,
    additional_samples: 0,
    additional_report_headers: 0,
    has_additional_samples: false,
    additional_headers_data: [],
  });

  // Popover states
  const [clientOpen, setClientOpen] = useState(false);
  const [manufacturerOpen, setManufacturerOpen] = useState(false);

  // Fetch products when lab is selected
  useEffect(() => {
    if (formData.lab_id) {
      fetchProductsForLab(formData.lab_id);
    } else {
      setProducts([]);
    }
  }, [formData.lab_id]);

  // Fetch clients and manufacturers
  useEffect(() => {
    if (open) {
      fetchClients();
      fetchManufacturers();
    }
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        lab_id: "",
        quote_number: "",
        lab_quote_number: "",
        notes: "",
      });
      setItems([]);
      setShowItemForm(false);
      resetItemForm();
    }
  }, [open]);

  const fetchProductsForLab = async (labId: string) => {
    try {
      // Get products that have pricing for this lab
      const { data: pricingData, error: pricingError } = await supabase
        .from("product_vendor_pricing")
        .select("product_id, price, products(id, name)")
        .eq("lab_id", labId)
        .eq("is_active", true);

      if (pricingError) throw pricingError;

      const productsWithPricing = pricingData
        ?.filter((p) => p.products)
        .map((p) => ({
          id: p.products!.id,
          name: p.products!.name,
          price: p.price,
        })) || [];

      setProducts(productsWithPricing as any);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const targetUserId = isImpersonatingCustomer && impersonatedUser?.id
        ? impersonatedUser.id
        : user.id;

      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("user_id", targetUserId)
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const targetUserId = isImpersonatingCustomer && impersonatedUser?.id
        ? impersonatedUser.id
        : user.id;

      const { data, error } = await supabase
        .from("manufacturers")
        .select("id, name")
        .eq("user_id", targetUserId)
        .order("name");

      if (error) throw error;
      setManufacturers(data || []);
    } catch (error) {
      console.error("Error fetching manufacturers:", error);
    }
  };

  const resetItemForm = () => {
    setItemFormData({
      product_id: "",
      product_name: "",
      client: "",
      sample: "",
      manufacturer: "",
      batch: "",
      price: 0,
      additional_samples: 0,
      additional_report_headers: 0,
      has_additional_samples: false,
      additional_headers_data: [],
    });
  };

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      // Get pricing for this product
      const productWithPrice = products.find((p) => p.id === productId) as any;
      setItemFormData({
        ...itemFormData,
        product_id: productId,
        product_name: product.name,
        sample: product.name, // Auto-populate sample with product name
        price: productWithPrice?.price || 0,
      });
    }
  };

  const handleAddItem = () => {
    if (!itemFormData.product_id || !itemFormData.client || !itemFormData.manufacturer || !itemFormData.batch) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const newItem: QuoteItem = {
      ...itemFormData,
      id: `temp-${Date.now()}`,
    };

    setItems([...items, newItem]);
    resetItemForm();
    setShowItemForm(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateItemTotal = (item: QuoteItem): number => {
    const basePrice = item.price || 0;
    const productName = item.product_name.toLowerCase();

    // Check if product qualifies for $60 per additional sample
    const qualifiesForAdditionalSamplePricing =
      productName.includes("tirzepatide") ||
      productName.includes("semaglutide") ||
      productName.includes("retatrutide");

    let total = basePrice;

    // Add additional samples cost
    if (qualifiesForAdditionalSamplePricing && (item.additional_samples || 0) > 0) {
      total += (item.additional_samples || 0) * 60;
    }

    // Add additional report headers cost ($30 each)
    if ((item.additional_report_headers || 0) > 0) {
      total += (item.additional_report_headers || 0) * 30;
    }

    return total;
  };

  const getTotalQuoteValue = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const handleSubmit = async () => {
    if (!formData.lab_id) {
      toast({
        title: "Missing lab",
        description: "Please select a lab",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "No items",
        description: "Please add at least one item to the quote",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const effectiveUserId = isImpersonatingCustomer && impersonatedUser?.id
        ? impersonatedUser.id
        : user.id;

      // Create the quote
      const { data: newQuote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          lab_id: formData.lab_id,
          quote_number: formData.quote_number || null,
          lab_quote_number: formData.lab_quote_number || null,
          notes: formData.notes || null,
          status: "draft",
          user_id: effectiveUserId,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create clients and manufacturers if they don't exist
      for (const item of items) {
        // Create client if needed
        const existingClient = clients.find(
          (c) => c.name.toLowerCase() === item.client.toLowerCase()
        );
        if (!existingClient && item.client) {
          await supabase
            .from("clients")
            .insert([{ name: item.client, user_id: effectiveUserId }]);
        }

        // Create manufacturer if needed
        const existingManufacturer = manufacturers.find(
          (m) => m.name.toLowerCase() === item.manufacturer.toLowerCase()
        );
        if (!existingManufacturer && item.manufacturer) {
          await supabase
            .from("manufacturers")
            .insert([{ name: item.manufacturer, user_id: effectiveUserId }]);
        }
      }

      // Create quote items
      const quoteItems = items.map((item) => ({
        quote_id: newQuote.id,
        product_id: item.product_id,
        client: item.client,
        sample: item.sample,
        manufacturer: item.manufacturer,
        batch: item.batch,
        price: item.price,
        additional_samples: item.additional_samples || 0,
        additional_report_headers: item.additional_report_headers || 0,
        additional_headers_data: item.additional_headers_data || [],
        status: "pending",
      }));

      const { error: itemsError } = await supabase
        .from("quote_items")
        .insert(quoteItems);

      if (itemsError) throw itemsError;

      // Log quote creation
      await supabase.from("quote_activity_log").insert({
        quote_id: newQuote.id,
        user_id: user.id,
        activity_type: "quote_created",
        description: "Quote created with " + items.length + " item(s)",
        metadata: {
          lab_id: formData.lab_id,
          status: "draft",
          items_count: items.length,
        },
      });

      toast({ title: "Quote created successfully", duration: 3000 });
      triggerSuccessConfetti();
      onOpenChange(false);
      onSuccess();
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

  const handleAdditionalHeadersChange = (count: number) => {
    const newHeadersData = [...itemFormData.additional_headers_data];
    
    // Add or remove headers to match count
    while (newHeadersData.length < count) {
      newHeadersData.push({ client: "", sample: "", manufacturer: "", batch: "" });
    }
    while (newHeadersData.length > count) {
      newHeadersData.pop();
    }

    setItemFormData({
      ...itemFormData,
      additional_report_headers: count,
      additional_headers_data: newHeadersData,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Quote</DialogTitle>
          <DialogDescription>
            Add quote details and items in one step
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quote Info Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-medium">Quote Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lab_id">Lab *</Label>
                <Select
                  value={formData.lab_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, lab_id: value })
                  }
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
                <Label htmlFor="quote_number">Internal Quote Number</Label>
                <Input
                  id="quote_number"
                  value={formData.quote_number}
                  onChange={(e) =>
                    setFormData({ ...formData, quote_number: e.target.value })
                  }
                  placeholder="Your internal tracking number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lab_quote_number">Lab Quote Number</Label>
                <Input
                  id="lab_quote_number"
                  value={formData.lab_quote_number}
                  onChange={(e) =>
                    setFormData({ ...formData, lab_quote_number: e.target.value })
                  }
                  placeholder="Vendor's quote number"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes about this quote"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Quote Items</h3>
              {formData.lab_id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowItemForm(true)}
                  disabled={showItemForm}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </div>

            {!formData.lab_id && (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                Select a lab first to add items
              </p>
            )}

            {/* Item Form */}
            {showItemForm && formData.lab_id && (
              <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">New Item</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowItemForm(false);
                      resetItemForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Compound *</Label>
                    <Select
                      value={itemFormData.product_id}
                      onValueChange={handleProductChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select compound" />
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
                            onValueChange={(value) =>
                              setItemFormData({ ...itemFormData, client: value })
                            }
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
                                    setItemFormData({
                                      ...itemFormData,
                                      client: client.name,
                                    });
                                    setClientOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      itemFormData.client === client.name
                                        ? "opacity-100"
                                        : "opacity-0"
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
                            onValueChange={(value) =>
                              setItemFormData({ ...itemFormData, manufacturer: value })
                            }
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
                                    setItemFormData({
                                      ...itemFormData,
                                      manufacturer: manufacturer.name,
                                    });
                                    setManufacturerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      itemFormData.manufacturer === manufacturer.name
                                        ? "opacity-100"
                                        : "opacity-0"
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
                    />
                  </div>

                  {/* Additional Samples */}
                  <div className="sm:col-span-2 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has_additional_samples"
                        checked={itemFormData.has_additional_samples}
                        onCheckedChange={(checked) =>
                          setItemFormData({
                            ...itemFormData,
                            has_additional_samples: !!checked,
                            additional_samples: checked ? itemFormData.additional_samples : 0,
                          })
                        }
                      />
                      <Label htmlFor="has_additional_samples" className="text-sm">
                        Add additional samples for variance testing
                      </Label>
                    </div>
                    
                    {itemFormData.has_additional_samples && (
                      <div className="space-y-2 pl-6">
                        <Label className="text-sm">Number of Additional Samples</Label>
                        <Select
                          value={itemFormData.additional_samples.toString()}
                          onValueChange={(value) =>
                            setItemFormData({
                              ...itemFormData,
                              additional_samples: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          $60 per additional sample for Tirzepatide, Semaglutide, Retatrutide
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Additional Report Headers */}
                  <div className="sm:col-span-2 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Additional Report Headers ($30 each)</Label>
                      <Select
                        value={itemFormData.additional_report_headers.toString()}
                        onValueChange={(value) => handleAdditionalHeadersChange(parseInt(value))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5].map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Additional Headers Data Forms */}
                    {itemFormData.additional_report_headers > 0 && (
                      <div className="space-y-3 pl-4 border-l-2 border-muted">
                        {itemFormData.additional_headers_data.map((header, index) => (
                          <div key={index} className="p-3 border rounded-lg bg-background space-y-3">
                            <h5 className="text-sm font-medium">Header #{index + 1}</h5>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Client</Label>
                                <Input
                                  value={header.client}
                                  onChange={(e) => {
                                    const newData = [...itemFormData.additional_headers_data];
                                    newData[index] = { ...newData[index], client: e.target.value };
                                    setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                  }}
                                  placeholder="Client"
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Sample</Label>
                                <Input
                                  value={header.sample}
                                  onChange={(e) => {
                                    const newData = [...itemFormData.additional_headers_data];
                                    newData[index] = { ...newData[index], sample: e.target.value };
                                    setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                  }}
                                  placeholder="Sample"
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Manufacturer</Label>
                                <Input
                                  value={header.manufacturer}
                                  onChange={(e) => {
                                    const newData = [...itemFormData.additional_headers_data];
                                    newData[index] = { ...newData[index], manufacturer: e.target.value };
                                    setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                  }}
                                  placeholder="Manufacturer"
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Batch</Label>
                                <Input
                                  value={header.batch}
                                  onChange={(e) => {
                                    const newData = [...itemFormData.additional_headers_data];
                                    newData[index] = { ...newData[index], batch: e.target.value };
                                    setItemFormData({ ...itemFormData, additional_headers_data: newData });
                                  }}
                                  placeholder="Batch"
                                  className="h-9 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Price Display */}
                  <div className="sm:col-span-2 flex justify-between items-center pt-2 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Base Price: ${itemFormData.price.toFixed(2)}
                        {itemFormData.additional_samples > 0 && (
                          <span> + ${(itemFormData.additional_samples * 60).toFixed(2)} (samples)</span>
                        )}
                        {itemFormData.additional_report_headers > 0 && (
                          <span> + ${(itemFormData.additional_report_headers * 30).toFixed(2)} (headers)</span>
                        )}
                      </p>
                    </div>
                    <p className="font-medium">
                      Total: ${calculateItemTotal(itemFormData).toFixed(2)}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item to Quote
                </Button>
              </div>
            )}

            {/* Items Table */}
            {items.length > 0 && (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Compound</TableHead>
                      <TableHead>Client / Manufacturer</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            {item.additional_samples > 0 && (
                              <p className="text-xs text-muted-foreground">
                                +{item.additional_samples} additional samples
                              </p>
                            )}
                            {item.additional_report_headers > 0 && (
                              <p className="text-xs text-muted-foreground">
                                +{item.additional_report_headers} report headers
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{item.client}</p>
                            <p className="text-muted-foreground">{item.manufacturer}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.batch}</TableCell>
                        <TableCell className="text-right">
                          ${calculateItemTotal(item).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end p-4 border-t bg-muted/30">
                  <p className="text-lg font-semibold">
                    Total: ${getTotalQuoteValue().toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !formData.lab_id || items.length === 0}
            >
              {loading ? "Creating..." : "Create Quote"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
