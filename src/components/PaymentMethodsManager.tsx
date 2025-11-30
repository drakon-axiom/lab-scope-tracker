import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Star, CreditCard, Wallet, Building2, DollarSign } from "lucide-react";

interface PaymentMethod {
  id: string;
  method_type: string;
  method_name: string;
  details: any;
  is_default: boolean;
  created_at: string;
}

const methodTypeIcons = {
  crypto_wallet: Wallet,
  bank_transfer: Building2,
  wire_transfer: Building2,
  credit_card: CreditCard,
  other: DollarSign,
};

export function PaymentMethodsManager() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    method_type: "crypto_wallet",
    method_name: "",
    details: {} as Record<string, string>,
    is_default: false,
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMethods(data || []);
    } catch (error: any) {
      toast.error("Failed to load payment methods");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        method_type: method.method_type,
        method_name: method.method_name,
        details: method.details,
        is_default: method.is_default,
      });
    } else {
      setEditingMethod(null);
      setFormData({
        method_type: "crypto_wallet",
        method_name: "",
        details: {},
        is_default: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.method_name.trim()) {
      toast.error("Please enter a payment method name");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // If setting as default, unset other defaults first
      if (formData.is_default) {
        await supabase
          .from("payment_methods")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      if (editingMethod) {
        // Update existing method
        const { error } = await supabase
          .from("payment_methods")
          .update({
            method_type: formData.method_type,
            method_name: formData.method_name,
            details: formData.details,
            is_default: formData.is_default,
          })
          .eq("id", editingMethod.id);

        if (error) throw error;
        toast.success("Payment method updated");
      } else {
        // Create new method
        const { error } = await supabase
          .from("payment_methods")
          .insert({
            user_id: user.id,
            method_type: formData.method_type,
            method_name: formData.method_name,
            details: formData.details,
            is_default: formData.is_default,
          });

        if (error) throw error;
        toast.success("Payment method added");
      }

      setDialogOpen(false);
      fetchPaymentMethods();
    } catch (error: any) {
      toast.error(error.message || "Failed to save payment method");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) return;

    try {
      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Payment method deleted");
      fetchPaymentMethods();
    } catch (error: any) {
      toast.error("Failed to delete payment method");
      console.error(error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Unset all defaults first
      await supabase
        .from("payment_methods")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Set the selected one as default
      const { error } = await supabase
        .from("payment_methods")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;
      toast.success("Default payment method updated");
      fetchPaymentMethods();
    } catch (error: any) {
      toast.error("Failed to update default payment method");
      console.error(error);
    }
  };

  const getDetailsFields = (methodType: string) => {
    switch (methodType) {
      case "crypto_wallet":
        return [
          { key: "currency", label: "Cryptocurrency", placeholder: "BTC, ETH, USDT, etc." },
          { key: "wallet_address", label: "Wallet Address", placeholder: "Your wallet address" },
        ];
      case "bank_transfer":
        return [
          { key: "account_name", label: "Account Name", placeholder: "Account holder name" },
          { key: "account_number", label: "Account Number", placeholder: "Your account number" },
          { key: "routing_number", label: "Routing Number", placeholder: "Bank routing number" },
          { key: "bank_name", label: "Bank Name", placeholder: "Name of your bank" },
        ];
      case "wire_transfer":
        return [
          { key: "account_name", label: "Account Name", placeholder: "Account holder name" },
          { key: "account_number", label: "Account Number", placeholder: "Your account number" },
          { key: "swift_code", label: "SWIFT/BIC Code", placeholder: "Bank SWIFT code" },
          { key: "bank_name", label: "Bank Name", placeholder: "Name of your bank" },
        ];
      case "credit_card":
        return [
          { key: "card_type", label: "Card Type", placeholder: "Visa, Mastercard, etc." },
          { key: "last_four", label: "Last 4 Digits", placeholder: "Last 4 digits of card" },
        ];
      default:
        return [
          { key: "notes", label: "Notes", placeholder: "Payment method details" },
        ];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Payment Methods</h3>
          <p className="text-sm text-muted-foreground">
            Manage your saved payment options for faster checkout
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {methods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No payment methods saved yet</p>
            <Button onClick={() => handleOpenDialog()}>Add Your First Payment Method</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {methods.map((method) => {
            const Icon = methodTypeIcons[method.method_type as keyof typeof methodTypeIcons] || DollarSign;
            return (
              <Card key={method.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{method.method_name}</CardTitle>
                        <CardDescription className="capitalize">
                          {method.method_type.replace(/_/g, " ")}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.is_default && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Default
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(method)}
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                      {!method.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetDefault(method.id)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(method.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm space-y-1">
                    {Object.entries(method.details as Record<string, any>).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-muted-foreground">
                        <span className="capitalize">{key.replace(/_/g, " ")}:</span>
                        <span className="font-medium text-foreground">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMethod ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
            <DialogDescription>
              Save your payment information for faster transactions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="method_name">Payment Method Name</Label>
              <Input
                id="method_name"
                placeholder="e.g., My Bitcoin Wallet"
                value={formData.method_name}
                onChange={(e) => setFormData({ ...formData, method_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method_type">Payment Type</Label>
              <Select
                value={formData.method_type}
                onValueChange={(value) => setFormData({ ...formData, method_type: value, details: {} })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto_wallet">Cryptocurrency Wallet</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {getDetailsFields(formData.method_type).map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                {field.key === "notes" ? (
                  <Textarea
                    id={field.key}
                    placeholder={field.placeholder}
                    value={formData.details[field.key] || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        details: { ...formData.details, [field.key]: e.target.value },
                      })
                    }
                  />
                ) : (
                  <Input
                    id={field.key}
                    placeholder={field.placeholder}
                    value={formData.details[field.key] || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        details: { ...formData.details, [field.key]: e.target.value },
                      })
                    }
                  />
                )}
              </div>
            ))}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded border-input"
              />
              <Label htmlFor="is_default" className="cursor-pointer">
                Set as default payment method
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingMethod ? "Update" : "Add"} Payment Method
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
