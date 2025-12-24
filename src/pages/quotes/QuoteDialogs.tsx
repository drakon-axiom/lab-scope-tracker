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
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Mail, Check, Trash2 } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";
import { EmailHistoryDialog } from "@/components/EmailHistoryDialog";
import { QuoteApprovalDialog } from "@/components/QuoteApprovalDialog";
import { PaymentDetailsDialog, PaymentFormData } from "@/components/PaymentDetailsDialog";
import { ShippingDetailsDialog, ShippingFormData } from "@/components/ShippingDetailsDialog";
import { ShippingLabelDialog, ShippingLabelFormData } from "@/components/ShippingLabelDialog";
import { Quote, QuoteItem, SavedView } from "./types";

interface QuoteDialogsProps {
  // View Dialog
  viewDialogOpen: boolean;
  setViewDialogOpen: (open: boolean) => void;
  selectedQuote: Quote | null;
  quoteItems: QuoteItem[];
  calculateItemTotal: (item: QuoteItem) => number;
  totalQuoteValue: number;
  isQuoteLocked: (status: string) => boolean;
  onCopyQuoteNumber: (quoteNumber: string) => void;
  
  // Email
  emailTemplates: any[];
  selectedEmailTemplate: string;
  setSelectedEmailTemplate: (id: string) => void;
  onSendEmail: () => void;
  emailPreviewOpen: boolean;
  setEmailPreviewOpen: (open: boolean) => void;
  emailPreviewData: { subject: string; html: string; recipient: string };
  onConfirmSendEmail: () => void;
  isSendingEmail: boolean;
  emailHistoryOpen: boolean;
  setEmailHistoryOpen: (open: boolean) => void;
  
  // Approval Dialog
  approvalDialogOpen: boolean;
  setApprovalDialogOpen: (open: boolean) => void;
  selectedQuoteForApproval: any;
  onApprovalSuccess: () => void;
  
  // Payment Dialog
  paymentDialogOpen: boolean;
  setPaymentDialogOpen: (open: boolean) => void;
  selectedQuoteForPayment: Quote | null;
  setSelectedQuoteForPayment: (quote: Quote | null) => void;
  onPaymentSubmit: (data: PaymentFormData) => void;
  paymentSubmitting: boolean;
  
  // Shipping Dialog
  shippingDialogOpen: boolean;
  setShippingDialogOpen: (open: boolean) => void;
  selectedQuoteForShipping: Quote | null;
  setSelectedQuoteForShipping: (quote: Quote | null) => void;
  onShippingSubmit: (data: ShippingFormData) => void;
  onRefreshTracking: () => void;
  shippingSubmitting: boolean;
  
  // Shipping Label Dialog
  shippingLabelDialogOpen: boolean;
  setShippingLabelDialogOpen: (open: boolean) => void;
  selectedQuoteForLabel: Quote | null;
  onShippingLabelSubmit: (data: ShippingLabelFormData) => Promise<void>;
  
  // Save View Dialog
  saveViewDialogOpen: boolean;
  setSaveViewDialogOpen: (open: boolean) => void;
  newViewName: string;
  setNewViewName: (name: string) => void;
  onSaveCurrentView: () => void;
  
  // Delete Dialog
  deleteDialogOpen: boolean;
  setDeleteDialogOpen: (open: boolean) => void;
  selectedDraftIds: Set<string>;
  quoteToDelete: string | null;
  setQuoteToDelete: (id: string | null) => void;
  onConfirmDelete: () => void;
  isBulkDeleting: boolean;
  
  // Template Dialogs
  templateDialogOpen: boolean;
  setTemplateDialogOpen: (open: boolean) => void;
  templateName: string;
  setTemplateName: (name: string) => void;
  templateDescription: string;
  setTemplateDescription: (desc: string) => void;
  onSaveTemplate: () => void;
  loadTemplateDialogOpen: boolean;
  setLoadTemplateDialogOpen: (open: boolean) => void;
  templates: any[];
  onLoadTemplate: (template: any) => void;
  onDeleteTemplate: (id: string) => void;
}

export function QuoteDialogs({
  viewDialogOpen,
  setViewDialogOpen,
  selectedQuote,
  quoteItems,
  calculateItemTotal,
  totalQuoteValue,
  isQuoteLocked,
  onCopyQuoteNumber,
  emailTemplates,
  selectedEmailTemplate,
  setSelectedEmailTemplate,
  onSendEmail,
  emailPreviewOpen,
  setEmailPreviewOpen,
  emailPreviewData,
  onConfirmSendEmail,
  isSendingEmail,
  emailHistoryOpen,
  setEmailHistoryOpen,
  approvalDialogOpen,
  setApprovalDialogOpen,
  selectedQuoteForApproval,
  onApprovalSuccess,
  paymentDialogOpen,
  setPaymentDialogOpen,
  selectedQuoteForPayment,
  setSelectedQuoteForPayment,
  onPaymentSubmit,
  paymentSubmitting,
  shippingDialogOpen,
  setShippingDialogOpen,
  selectedQuoteForShipping,
  setSelectedQuoteForShipping,
  onShippingSubmit,
  onRefreshTracking,
  shippingSubmitting,
  shippingLabelDialogOpen,
  setShippingLabelDialogOpen,
  selectedQuoteForLabel,
  onShippingLabelSubmit,
  saveViewDialogOpen,
  setSaveViewDialogOpen,
  newViewName,
  setNewViewName,
  onSaveCurrentView,
  deleteDialogOpen,
  setDeleteDialogOpen,
  selectedDraftIds,
  quoteToDelete,
  setQuoteToDelete,
  onConfirmDelete,
  isBulkDeleting,
  templateDialogOpen,
  setTemplateDialogOpen,
  templateName,
  setTemplateName,
  templateDescription,
  setTemplateDescription,
  onSaveTemplate,
  loadTemplateDialogOpen,
  setLoadTemplateDialogOpen,
  templates,
  onLoadTemplate,
  onDeleteTemplate,
}: QuoteDialogsProps) {
  return (
    <>
      {/* View Quote Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {selectedQuote.quote_number || `Quote ${selectedQuote.id.slice(0, 8)}`}
                    </p>
                    {selectedQuote.quote_number?.startsWith('QT-') && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                              Auto
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Auto-generated quote number</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onCopyQuoteNumber(selectedQuote.quote_number || `Quote ${selectedQuote.id.slice(0, 8)}`)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
                  <p className="font-medium">{selectedQuote.tracking_number || "—"}</p>
                </div>
              </div>

              {selectedQuote.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1">{selectedQuote.notes}</p>
                </div>
              )}

              {/* Quote Items */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">Quote Items</Label>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quoteItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.products.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Client: {item.client || "—"}</div>
                              <div>Sample: {item.sample || "—"}</div>
                              <div>Mfg: {item.manufacturer || "—"}</div>
                              <div>Batch: {item.batch || "—"}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={item.status || "pending"} />
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.price?.toFixed(2) || "0.00"}
                            <div className="text-sm font-medium mt-1">
                              Total: ${calculateItemTotal(item).toFixed(2)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between items-center mt-2 px-2">
                  <span className="font-medium">Total</span>
                  <span className="font-medium">${totalQuoteValue.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Close
                </Button>
                {selectedQuote &&
                 !isQuoteLocked(selectedQuote.status) &&
                 !['sent_to_vendor', 'approved_payment_pending', 'awaiting_customer_approval', 'rejected', 'paid', 'shipped', 'in_transit', 'delivered', 'testing_in_progress', 'completed'].includes(selectedQuote.status) && (
                  <Button variant="outline" onClick={onSendEmail}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send to Vendor
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Preview Dialog */}
      <EmailPreviewDialog
        open={emailPreviewOpen}
        onOpenChange={setEmailPreviewOpen}
        subject={emailPreviewData.subject}
        htmlContent={emailPreviewData.html}
        recipientEmail={emailPreviewData.recipient}
        onConfirmSend={onConfirmSendEmail}
        isSending={isSendingEmail}
      />

      {/* Email History Dialog */}
      <EmailHistoryDialog
        open={emailHistoryOpen}
        onOpenChange={setEmailHistoryOpen}
        quoteId={selectedQuote?.id}
      />

      {/* Quote Approval Dialog */}
      {selectedQuoteForApproval && quoteItems.length > 0 && (
        <QuoteApprovalDialog
          open={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
          quote={selectedQuoteForApproval}
          quoteItems={quoteItems}
          onApprove={onApprovalSuccess}
          onReject={onApprovalSuccess}
        />
      )}

      {/* Payment Details Dialog */}
      {selectedQuoteForPayment && (
        <PaymentDetailsDialog
          open={paymentDialogOpen}
          onOpenChange={(open) => {
            if (!paymentSubmitting) {
              setPaymentDialogOpen(open);
              if (!open) setSelectedQuoteForPayment(null);
            }
          }}
          onSubmit={onPaymentSubmit}
          isSubmitting={paymentSubmitting}
          initialData={{
            payment_status: selectedQuoteForPayment.payment_status || "pending",
            payment_amount_usd: selectedQuoteForPayment.payment_amount_usd?.toString() || "",
            payment_amount_crypto: selectedQuoteForPayment.payment_amount_crypto || "",
            payment_date: selectedQuoteForPayment.payment_date || "",
            transaction_id: selectedQuoteForPayment.transaction_id || "",
          }}
        />
      )}

      {/* Shipping Details Dialog */}
      {selectedQuoteForShipping && (
        <ShippingDetailsDialog
          open={shippingDialogOpen}
          onOpenChange={(open) => {
            if (!shippingSubmitting) {
              setShippingDialogOpen(open);
              if (!open) setSelectedQuoteForShipping(null);
            }
          }}
          onSubmit={onShippingSubmit}
          onRefreshTracking={onRefreshTracking}
          isSubmitting={shippingSubmitting}
          initialData={{
            tracking_number: selectedQuoteForShipping.tracking_number || "",
            shipped_date: selectedQuoteForShipping.shipped_date || "",
          }}
        />
      )}

      {/* Shipping Label Generation Dialog */}
      {selectedQuoteForLabel && (
        <ShippingLabelDialog
          open={shippingLabelDialogOpen}
          onOpenChange={setShippingLabelDialogOpen}
          onSubmit={onShippingLabelSubmit}
          quoteId={selectedQuoteForLabel.id}
        />
      )}

      {/* Save View Dialog */}
      <Dialog open={saveViewDialogOpen} onOpenChange={setSaveViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
            <DialogDescription>
              Give this filter combination a name to quickly access it later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="e.g., Pending Payment"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onSaveCurrentView();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveViewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={onSaveCurrentView}>
                <Check className="h-4 w-4 mr-2" />
                Save View
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) setQuoteToDelete(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedDraftIds.size > 0 && !quoteToDelete
                ? `Delete ${selectedDraftIds.size} Quote${selectedDraftIds.size > 1 ? 's' : ''}`
                : 'Delete Quote'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDraftIds.size > 0 && !quoteToDelete
                ? `Are you sure you want to delete ${selectedDraftIds.size} selected draft quote${selectedDraftIds.size > 1 ? 's' : ''}? This action cannot be undone.`
                : 'Are you sure you want to delete this quote? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setQuoteToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Save this quote configuration as a reusable template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Standard Peptide Testing"
              />
            </div>
            <div>
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe this template..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onSaveTemplate}>Save Template</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog open={loadTemplateDialogOpen} onOpenChange={setLoadTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load Template</DialogTitle>
            <DialogDescription>
              Select a template to load its configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No templates saved yet
              </p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-muted-foreground">
                        {template.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {template.items?.length || 0} items
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onLoadTemplate(template)}
                    >
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
