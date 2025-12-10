import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle2, XCircle, Mail, MailOpen, MousePointerClick } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useImpersonation } from "@/hooks/useImpersonation";
import { useUserRole } from "@/hooks/useUserRole";
import DOMPurify from "dompurify";

interface EmailHistory {
  id: string;
  recipient_email: string;
  subject: string;
  body: string;
  sent_at: string;
  status: string;
  delivery_status: string;
  delivered_at: string | null;
  opened_at: string | null;
  bounced_at: string | null;
  bounce_reason: string | null;
  clicked_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
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
  const { isImpersonatingCustomer, impersonatedUser } = useImpersonation();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, quoteId, isImpersonatingCustomer, impersonatedUser?.id]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("email_history")
        .select("*, quotes(quote_number), labs(name)")
        .order("sent_at", { ascending: false });

      // Filter by impersonated user when impersonating
      if (isImpersonatingCustomer && impersonatedUser?.id) {
        query = query.eq("user_id", impersonatedUser.id);
      } else if (!isAdmin) {
        // Non-admins only see their own emails
        query = query.eq("user_id", user.id);
      }

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
        duration: 4000,
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
                    <TableHead>Delivery Status</TableHead>
                    <TableHead>Tracking</TableHead>
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
                        <Badge 
                          variant={
                            email.delivery_status === "delivered" ? "default" :
                            email.delivery_status === "opened" ? "default" :
                            email.delivery_status === "bounced" ? "destructive" :
                            email.delivery_status === "failed" ? "destructive" :
                            "secondary"
                          }
                        >
                          {email.delivery_status || "sent"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex gap-1">
                            {email.delivered_at && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Delivered: {new Date(email.delivered_at).toLocaleString()}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {email.opened_at && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center">
                                    <MailOpen className="h-4 w-4 text-blue-600" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Opened: {new Date(email.opened_at).toLocaleString()}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {email.clicked_at && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center">
                                    <MousePointerClick className="h-4 w-4 text-purple-600" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Clicked: {new Date(email.clicked_at).toLocaleString()}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {email.bounced_at && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Bounced: {new Date(email.bounced_at).toLocaleString()}
                                  {email.bounce_reason && <div className="text-xs mt-1">{email.bounce_reason}</div>}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {email.failed_at && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Failed: {new Date(email.failed_at).toLocaleString()}
                                  {email.failure_reason && <div className="text-xs mt-1">{email.failure_reason}</div>}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {!email.delivered_at && !email.opened_at && !email.clicked_at && !email.bounced_at && !email.failed_at && (
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </TooltipProvider>
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
                <div className="col-span-2">
                  <span className="font-semibold">Delivery Status:</span>{" "}
                  <Badge 
                    variant={
                      viewingEmail.delivery_status === "delivered" ? "default" :
                      viewingEmail.delivery_status === "opened" ? "default" :
                      viewingEmail.delivery_status === "bounced" ? "destructive" :
                      viewingEmail.delivery_status === "failed" ? "destructive" :
                      "secondary"
                    }
                  >
                    {viewingEmail.delivery_status || "sent"}
                  </Badge>
                </div>
                {viewingEmail.delivered_at && (
                  <div>
                    <span className="font-semibold">Delivered:</span>{" "}
                    {new Date(viewingEmail.delivered_at).toLocaleString()}
                  </div>
                )}
                {viewingEmail.opened_at && (
                  <div>
                    <span className="font-semibold">Opened:</span>{" "}
                    {new Date(viewingEmail.opened_at).toLocaleString()}
                  </div>
                )}
                {viewingEmail.clicked_at && (
                  <div>
                    <span className="font-semibold">Clicked:</span>{" "}
                    {new Date(viewingEmail.clicked_at).toLocaleString()}
                  </div>
                )}
                {viewingEmail.bounced_at && (
                  <div className="col-span-2">
                    <span className="font-semibold">Bounced:</span>{" "}
                    {new Date(viewingEmail.bounced_at).toLocaleString()}
                    {viewingEmail.bounce_reason && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Reason: {viewingEmail.bounce_reason}
                      </div>
                    )}
                  </div>
                )}
                {viewingEmail.failed_at && (
                  <div className="col-span-2">
                    <span className="font-semibold">Failed:</span>{" "}
                    {new Date(viewingEmail.failed_at).toLocaleString()}
                    {viewingEmail.failure_reason && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Reason: {viewingEmail.failure_reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingEmail.body) }} />
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
