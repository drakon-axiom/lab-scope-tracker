import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Building2, FileText, Send, AlertTriangle } from "lucide-react";

interface QuoteItem {
  product_name: string;
  client: string;
  sample: string;
  manufacturer: string;
  batch: string;
  price: number;
  additional_samples: number;
  additional_report_headers: number;
  additional_headers_data: Array<{
    client: string;
    sample: string;
    manufacturer: string;
    batch: string;
  }>;
}

interface QuoteEmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  labName: string;
  labEmail: string;
  quoteNumber: string;
  items: QuoteItem[];
  notes: string;
  isSubmitting: boolean;
}

export const QuoteEmailPreviewDialog = ({
  open,
  onOpenChange,
  onConfirm,
  labName,
  labEmail,
  quoteNumber,
  items,
  notes,
  isSubmitting,
}: QuoteEmailPreviewDialogProps) => {
  const calculateItemTotal = (item: QuoteItem) => {
    let total = item.price;
    const productName = item.product_name.toLowerCase();
    if (item.additional_samples > 0) {
      if (productName.includes('tirzepatide') || productName.includes('semaglutide') || productName.includes('retatrutide')) {
        total += item.additional_samples * 60;
      }
    }
    if (item.additional_report_headers > 0) {
      total += item.additional_report_headers * 30;
    }
    return total;
  };

  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const discountPercent = subtotal < 1200 ? 5 : 10;
  const discount = (subtotal * discountPercent) / 100;
  const total = subtotal - discount;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Preview & Confirmation
          </AlertDialogTitle>
          <AlertDialogDescription>
            Review the email that will be sent to the lab before submitting.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {/* Recipient Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">To:</span>
                <span>{labName}</span>
                <Badge variant="secondary" className="ml-auto">
                  {labEmail}
                </Badge>
              </div>
              {quoteNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Quote #:</span>
                  <span>{quoteNumber}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Email Subject */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Subject</p>
              <p className="font-medium">
                Quote Request{quoteNumber ? ` - ${quoteNumber}` : ""} - {items.length} Item{items.length !== 1 ? 's' : ''}
              </p>
            </div>

            <Separator />

            {/* Email Body Preview */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Email Content</p>
              
              <div className="bg-background border rounded-lg p-4 space-y-4">
                <p className="text-sm">Dear {labName} Team,</p>
                
                <p className="text-sm">
                  Please find below our quote request{quoteNumber ? ` (Reference: ${quoteNumber})` : ''} for the following items:
                </p>

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">Item</th>
                        <th className="text-left p-2 font-medium">Details</th>
                        <th className="text-right p-2 font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const productName = item.product_name.toLowerCase();
                        const isPeptide = productName.includes('tirzepatide') || productName.includes('semaglutide') || productName.includes('retatrutide');
                        const additionalSamplesCost = item.additional_samples > 0 && isPeptide ? item.additional_samples * 60 : 0;
                        const additionalHeadersCost = item.additional_report_headers > 0 ? item.additional_report_headers * 30 : 0;
                        
                        return (
                          <tr key={idx} className="border-t">
                            <td className="p-2 align-top">
                              <p className="font-medium">{item.product_name}</p>
                              {item.additional_samples > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  +{item.additional_samples} additional sample{item.additional_samples !== 1 ? 's' : ''}
                                </p>
                              )}
                              {item.additional_report_headers > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  +{item.additional_report_headers} additional header{item.additional_report_headers !== 1 ? 's' : ''}
                                </p>
                              )}
                            </td>
                            <td className="p-2 align-top text-muted-foreground">
                              <p>Client: {item.client}</p>
                              <p>Sample: {item.sample}</p>
                              <p>Mfr: {item.manufacturer}</p>
                              <p>Batch: {item.batch}</p>
                            </td>
                            <td className="p-2 align-top text-right">
                              <div className="space-y-0.5">
                                <p className="font-medium">${item.price.toFixed(2)}</p>
                                {additionalSamplesCost > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    +${additionalSamplesCost.toFixed(2)} <span className="text-xs">({item.additional_samples} × $60)</span>
                                  </p>
                                )}
                                {additionalHeadersCost > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    +${additionalHeadersCost.toFixed(2)} <span className="text-xs">({item.additional_report_headers} × $30)</span>
                                  </p>
                                )}
                                {(additionalSamplesCost > 0 || additionalHeadersCost > 0) && (
                                  <p className="text-xs font-semibold text-primary border-t pt-0.5 mt-0.5">
                                    ${calculateItemTotal(item).toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-muted/50">
                      <tr className="border-t">
                        <td colSpan={2} className="p-2 text-right font-medium">Subtotal:</td>
                        <td className="p-2 text-right">${subtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="p-2 text-right font-medium text-green-600">
                          Discount ({discountPercent}%):
                        </td>
                        <td className="p-2 text-right text-green-600">-${discount.toFixed(2)}</td>
                      </tr>
                      <tr className="border-t">
                        <td colSpan={2} className="p-2 text-right font-bold">Total:</td>
                        <td className="p-2 text-right font-bold text-primary">${total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {notes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Notes:</p>
                    <p className="text-sm text-muted-foreground">{notes}</p>
                  </div>
                )}

                <p className="text-sm">
                  Please review and confirm. A confirmation link will be included in the email for you to approve or modify this quote.
                </p>

                <p className="text-sm">Best regards,<br />SafeBatch Team</p>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Once submitted, the quote will be sent to <strong>{labEmail}</strong> and cannot be edited until the lab responds.
              </p>
            </div>
          </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isSubmitting}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "Sending..." : "Send to Lab"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
