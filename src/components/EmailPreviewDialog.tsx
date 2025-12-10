import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail } from "lucide-react";
import DOMPurify from "dompurify";

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  htmlContent: string;
  recipientEmail: string;
  onConfirmSend: () => void;
  isSending?: boolean;
}

export function EmailPreviewDialog({
  open,
  onOpenChange,
  subject,
  htmlContent,
  recipientEmail,
  onConfirmSend,
  isSending = false,
}: EmailPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Preview Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">To:</span>
              <span className="text-muted-foreground">{recipientEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">Subject:</span>
              <span className="text-muted-foreground">{subject}</span>
            </div>
          </div>
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={onConfirmSend} disabled={isSending}>
            <Mail className="mr-2 h-4 w-4" />
            {isSending ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
