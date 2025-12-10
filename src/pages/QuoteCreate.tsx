import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useToast } from "@/hooks/use-toast";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Check, ChevronsUpDown, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerSuccessConfetti } from "@/lib/confetti";

interface Lab {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price?: number;
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

const QuoteCreate = () => {
  const navigate = useNavigate();
  const { isSubscriber, isAdmin } = useUserRole();
  const { impersonatedUser, isImpersonatingCustomer } = useImpersonation();
  const { toast } = useToast();

  // Labs
  const [labs, setLabs] = useState<Lab[]>([]);

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

  // Fetch labs on mount
  useEffect(() => {
    fetchLabs();
    fetchClients();
    fetchManufacturers();
  }, []);

  // Fetch products when lab is selected
  useEffect(() => {
    if (formData.lab_id) {
      fetchProductsForLab(formData.lab_id);
    } else {
      setProducts([]);
    }
  }, [formData.lab_id]);

  const fetchLabs = async () => {
    try {
      const { data, error } = await supabase
        .from("labs")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setLabs(data || []);
    } catch (error) {
      console.error("Error fetching labs:", error);
    }
  };

  const fetchProductsForLab = async (labId: string) => {
    try {
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

      setProducts(productsWithPricing as Product[]);
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
      setItemFormData({
        ...itemFormData,
        product_id: productId,
        product_name: product.name,
        sample: product.name,
        price: product.price || 0,
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

    const qualifiesForAdditionalSamplePricing =
      productName.includes("tirzepatide") ||
      productName.includes("semaglutide") ||
      productName.includes("retatrutide");

    let total = basePrice;

    if (qualifiesForAdditionalSamplePricing && (item.additional_samples || 0) > 0) {
      total += (item.additional_samples || 0) * 60;
    }

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
        const existingClient = clients.find(
          (c) => c.name.toLowerCase() === item.client.toLowerCase()
        );
        if (!existingClient && item.client) {
          await supabase
            .from("clients")
            .insert([{ name: item.client, user_id: effectiveUserId }]);
        }

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
      navigate("/quotes");
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
    <Layout>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/quotes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Quote</h1>
            <p className="text-sm text-muted-foreground">
              Add quote details and items
            </p>
          </div>
        </div>

        {/* Quote Info Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quote Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quote_number">Internal Quote #</Label>
                <Input
                  id="quote_number"
                  value={formData.quote_number}
                  onChange={(e) =>
                    setFormData({ ...formData, quote_number: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lab_quote_number">Lab Quote #</Label>
                <Input
                  id="lab_quote_number"
                  value={formData.lab_quote_number}
                  onChange={(e) =>
                    setFormData({ ...formData, lab_quote_number: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Quote Items</CardTitle>
              {!showItemForm && formData.lab_id && (
                <Button
                  size="sm"
                  onClick={() => setShowItemForm(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!formData.lab_id && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Select a lab first to add items
              </p>
            )}

            {/* Item Form */}
            {showItemForm && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
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
                          {product.name} - ${product.price?.toFixed(2)}
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
                        {itemFormData.client || "Select or enter client..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search or enter client..."
                          onValueChange={(value) => {
                            setItemFormData({ ...itemFormData, client: value });
                          }}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <Button
                              variant="ghost"
                              className="w-full"
                              onClick={() => {
                                setClientOpen(false);
                              }}
                            >
                              Use "{itemFormData.client}"
                            </Button>
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
                        {itemFormData.manufacturer || "Select or enter manufacturer..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search or enter manufacturer..."
                          onValueChange={(value) => {
                            setItemFormData({ ...itemFormData, manufacturer: value });
                          }}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <Button
                              variant="ghost"
                              className="w-full"
                              onClick={() => {
                                setManufacturerOpen(false);
                              }}
                            >
                              Use "{itemFormData.manufacturer}"
                            </Button>
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
                    placeholder="Enter batch number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Additional Samples</Label>
                    <Input
                      type="number"
                      min={0}
                      value={itemFormData.additional_samples}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          additional_samples: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Headers</Label>
                    <Input
                      type="number"
                      min={0}
                      value={itemFormData.additional_report_headers}
                      onChange={(e) =>
                        handleAdditionalHeadersChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>

                {/* Additional Headers Data */}
                {itemFormData.additional_headers_data.length > 0 && (
                  <div className="space-y-3 pt-2 border-t">
                    <Label className="text-sm font-medium">Additional Header Details</Label>
                    {itemFormData.additional_headers_data.map((header, idx) => (
                      <div key={idx} className="grid grid-cols-2 gap-2 p-2 bg-background rounded border">
                        <Input
                          placeholder="Client"
                          value={header.client}
                          onChange={(e) => {
                            const newData = [...itemFormData.additional_headers_data];
                            newData[idx].client = e.target.value;
                            setItemFormData({ ...itemFormData, additional_headers_data: newData });
                          }}
                        />
                        <Input
                          placeholder="Sample"
                          value={header.sample}
                          onChange={(e) => {
                            const newData = [...itemFormData.additional_headers_data];
                            newData[idx].sample = e.target.value;
                            setItemFormData({ ...itemFormData, additional_headers_data: newData });
                          }}
                        />
                        <Input
                          placeholder="Manufacturer"
                          value={header.manufacturer}
                          onChange={(e) => {
                            const newData = [...itemFormData.additional_headers_data];
                            newData[idx].manufacturer = e.target.value;
                            setItemFormData({ ...itemFormData, additional_headers_data: newData });
                          }}
                        />
                        <Input
                          placeholder="Batch"
                          value={header.batch}
                          onChange={(e) => {
                            const newData = [...itemFormData.additional_headers_data];
                            newData[idx].batch = e.target.value;
                            setItemFormData({ ...itemFormData, additional_headers_data: newData });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowItemForm(false);
                      resetItemForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleAddItem}>
                    Add Item
                  </Button>
                </div>
              </div>
            )}

            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-background"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.client} • {item.manufacturer} • {item.batch}
                      </p>
                      <p className="text-sm font-medium text-primary">
                        ${calculateItemTotal(item).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                {/* Total */}
                <div className="flex justify-between items-center pt-3 border-t font-medium">
                  <span>Total</span>
                  <span className="text-lg">${getTotalQuoteValue().toFixed(2)}</span>
                </div>
              </div>
            )}

            {items.length === 0 && formData.lab_id && !showItemForm && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No items added yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submit Button - Fixed at bottom */}
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t md:relative md:bottom-auto md:border-0 md:p-0 md:bg-transparent">
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={loading || items.length === 0 || !formData.lab_id}
          >
            {loading ? "Creating..." : "Create Quote"}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default QuoteCreate;
