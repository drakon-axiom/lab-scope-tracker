import { useEffect, useState, useCallback } from "react";
import LabLayout from "@/components/lab/LabLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { useImpersonation } from "@/hooks/useImpersonation";
import { format } from "date-fns";
import { Eye, ChevronLeft, ChevronRight, CheckCircle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface QuoteItem {
  id: string;
  product_id: string;
  price: number | null;
  client: string | null;
  sample: string | null;
  manufacturer: string | null;
  batch: string | null;
  test_results: string | null;
  report_url: string | null;
  products?: { name: string; category: string | null };
}

interface Quote {
  id: string;
  quote_number: string | null;
  lab_quote_number: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  notes: string | null;
  discount_amount: number | null;
  lab_response: string | null;
  payment_status: string | null;
  payment_amount_usd: number | null;
  payment_date: string | null;
}

const PAGE_SIZE = 15;

export default function LabCompletedRequests() {
  const { labUser } = useLabUser();
  const { impersonatedUser, isImpersonatingLab } = useImpersonation();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedQuoteItems, setSelectedQuoteItems] = useState<QuoteItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const effectiveLabId = (isImpersonatingLab ? impersonatedUser?.labId : null) || labUser?.lab_id;

  const fetchQuotes = useCallback(async (currentPage: number = 0) => {
    if (!effectiveLabId) return;
    
    setLoading(true);
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .eq("lab_id", effectiveLabId)
        .in("status", ["completed", "rejected"]);

      if (countError) throw countError;
      setTotalCount(count || 0);

      // Get paginated data
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("lab_id", effectiveLabId)
        .in("status", ["completed", "rejected"])
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast.error("Failed to load completed requests");
    } finally {
      setLoading(false);
    }
  }, [effectiveLabId]);

  const fetchQuoteItems = async (quoteId: string) => {
    setItemsLoading(true);
    try {
      const { data, error } = await supabase
        .from("quote_items")
        .select("*, products(name, category)")
        .eq("quote_id", quoteId);

      if (error) throw error;
      setSelectedQuoteItems(data || []);
    } catch (error) {
      console.error("Error fetching quote items:", error);
      setSelectedQuoteItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes(page);
  }, [page, fetchQuotes]);

  useEffect(() => {
    if (!effectiveLabId) return;

    const channel = supabase
      .channel("lab-completed-requests")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quotes",
          filter: `lab_id=eq.${effectiveLabId}`,
        },
        () => fetchQuotes(page)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveLabId, page, fetchQuotes]);

  const openQuoteDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    setDialogOpen(true);
    fetchQuoteItems(quote.id);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <LabLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Completed Requests</h1>
          <p className="text-muted-foreground mt-1">
            View historical completed and rejected requests
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : quotes.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No completed requests yet</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {quote.quote_number || quote.lab_quote_number || "N/A"}
                            </p>
                            {quote.notes && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {quote.notes}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={quote.status === "completed" ? "default" : "destructive"}
                            className="gap-1"
                          >
                            {quote.status === "completed" ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {quote.status === "completed" ? "Completed" : "Rejected"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {quote.updated_at 
                            ? format(new Date(quote.updated_at), "MMM d, yyyy")
                            : format(new Date(quote.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {quote.payment_amount_usd 
                            ? `$${quote.payment_amount_usd.toFixed(2)}` 
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openQuoteDialog(quote)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalCount > PAGE_SIZE && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p - 1)}
                        disabled={page === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Request Details
                {selectedQuote && (
                  <Badge 
                    variant={selectedQuote.status === "completed" ? "default" : "destructive"}
                    className="gap-1 ml-2"
                  >
                    {selectedQuote.status === "completed" ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {selectedQuote.status === "completed" ? "Completed" : "Rejected"}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedQuote?.quote_number || selectedQuote?.lab_quote_number || "Quote details"}
              </DialogDescription>
            </DialogHeader>

            {selectedQuote && (
              <div className="space-y-6">
                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">{format(new Date(selectedQuote.created_at), "MMM d, yyyy")}</p>
                  </div>
                  {selectedQuote.updated_at && (
                    <div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-sm font-medium">{format(new Date(selectedQuote.updated_at), "MMM d, yyyy")}</p>
                    </div>
                  )}
                  {selectedQuote.payment_status && (
                    <div>
                      <p className="text-xs text-muted-foreground">Payment</p>
                      <p className="text-sm font-medium capitalize">{selectedQuote.payment_status}</p>
                    </div>
                  )}
                  {selectedQuote.payment_amount_usd && (
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="text-sm font-medium">${selectedQuote.payment_amount_usd.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Test Items</Label>
                  {itemsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : selectedQuoteItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No items found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Compound</TableHead>
                          <TableHead>Sample</TableHead>
                          <TableHead>Results</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedQuoteItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.products?.name || "Unknown"}
                            </TableCell>
                            <TableCell>{item.sample || "-"}</TableCell>
                            <TableCell>
                              {item.test_results ? (
                                <span className="text-green-600">{item.test_results}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.price ? `$${item.price.toFixed(2)}` : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Notes */}
                {selectedQuote.notes && (
                  <div>
                    <Label className="text-sm font-medium">Customer Notes</Label>
                    <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded-md">
                      {selectedQuote.notes}
                    </p>
                  </div>
                )}

                {/* Lab Response */}
                {selectedQuote.lab_response && (
                  <div>
                    <Label className="text-sm font-medium">Lab Response</Label>
                    <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded-md">
                      {selectedQuote.lab_response}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LabLayout>
  );
}