import { useState } from "react";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentFormData) => void;
  initialData?: PaymentFormData;
}

export interface PaymentFormData {
  payment_status: string;
  payment_amount_usd: string;
  payment_amount_crypto: string;
  payment_date: string;
  transaction_id: string;
}

export function PaymentDetailsDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: PaymentDetailsDialogProps) {
  const [formData, setFormData] = useState<PaymentFormData>(
    initialData || {
      payment_status: "pending",
      payment_amount_usd: "",
      payment_amount_crypto: "",
      payment_date: "",
      transaction_id: "",
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record Payment Details"
      description="Enter payment information for this quote"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="payment_status">Payment Status *</Label>
          <Select
            value={formData.payment_status}
            onValueChange={(value) =>
              setFormData({ ...formData, payment_status: value })
            }
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid_usd">Paid (USD)</SelectItem>
              <SelectItem value="paid_crypto">Paid (Crypto)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_date">Payment Date</Label>
          <Input
            id="payment_date"
            type="date"
            value={formData.payment_date}
            onChange={(e) =>
              setFormData({ ...formData, payment_date: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_amount_usd">Amount (USD)</Label>
          <Input
            id="payment_amount_usd"
            type="number"
            step="0.01"
            value={formData.payment_amount_usd}
            onChange={(e) =>
              setFormData({ ...formData, payment_amount_usd: e.target.value })
            }
            placeholder="0.00"
          />
        </div>

        {formData.payment_status === "paid_crypto" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="payment_amount_crypto">Amount (Crypto)</Label>
              <Input
                id="payment_amount_crypto"
                value={formData.payment_amount_crypto}
                onChange={(e) =>
                  setFormData({ ...formData, payment_amount_crypto: e.target.value })
                }
                placeholder="e.g., 0.05 BTC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_id">Transaction ID</Label>
              <Input
                id="transaction_id"
                value={formData.transaction_id}
                onChange={(e) =>
                  setFormData({ ...formData, transaction_id: e.target.value })
                }
                placeholder="Blockchain transaction ID"
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit">Save Payment</Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
