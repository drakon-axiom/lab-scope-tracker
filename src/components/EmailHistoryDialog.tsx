import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EmailHistory {
  id: string;
  recipient_email: string;
  subject: string;
  body: string;
  sent_at: string;
  status: string;
  quotes: { quote_number: string | null };
  labs: { name: string };
}

interface EmailHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId?: string;
}

export function EmailHistoryDialog({ open, onOpenChange, quoteId }: EmailHistoryDialogProps) {
  const [history, setHistory] = useState<EmailHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingEmail, setViewingEmail] = useState<EmailHistory | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, quoteId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("email_history")
        .select("*, quotes(quote_number), labs(name)")
        .order("sent_at", { ascending: false });

      if (quoteId) {
        query = query.eq("quote_id", quoteId);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching email history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open && !viewingEmail} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Email History</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[600px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No emails sent yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Lab</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="text-sm">
                        {new Date(email.sent_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{email.quotes?.quote_number || "—"}</TableCell>
                      <TableCell>{email.labs?.name}</TableCell>
                      <TableCell className="text-sm">{email.recipient_email}</TableCell>
                      <TableCell className="max-w-xs truncate">{email.subject}</TableCell>
                      <TableCell>
                        <Badge variant={email.status === "sent" ? "default" : "secondary"}>
                          {email.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingEmail(email)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* View Email Dialog */}
      <Dialog open={!!viewingEmail} onOpenChange={() => setViewingEmail(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
          </DialogHeader>
          {viewingEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Sent:</span>{" "}
                  {new Date(viewingEmail.sent_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-semibold">To:</span> {viewingEmail.recipient_email}
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">Subject:</span> {viewingEmail.subject}
                </div>
              </div>
              <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                <div dangerouslySetInnerHTML={{ __html: viewingEmail.body }} />
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
