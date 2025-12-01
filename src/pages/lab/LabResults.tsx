import { useEffect, useState } from "react";
import LabLayout from "@/components/lab/LabLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { Upload, Link as LinkIcon, FileText } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Quote {
  id: string;
  quote_number: string | null;
  status: string;
}

interface QuoteItem {
  id: string;
  product_id: string;
  additional_report_headers: number;
  additional_headers_data: any[];
  products: {
    name: string;
  };
}

interface ItemResult {
  quote_item_id: string;
  header_index: number;
  header_label: string;
  header_data: any;
  report_url: string;
  potency: string;
  purity: string;
  identity: string;
}

export default function LabResults() {
  const { labUser } = useLabUser();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemResults, setItemResults] = useState<ItemResult[]>([]);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!labUser?.lab_id) return;

    const fetchQuotes = async () => {
      try {
        const { data, error } = await supabase
          .from("quotes")
          .select("id, quote_number, status")
          .eq("lab_id", labUser.lab_id)
          .eq("status", "testing_in_progress")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setQuotes(data || []);
      } catch (error) {
        console.error("Error fetching quotes:", error);
        toast.error("Failed to load quotes");
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [labUser?.lab_id]);

  const fetchQuoteItems = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from("quote_items")
        .select(`
          id,
          product_id,
          additional_report_headers,
          additional_headers_data,
          products (name)
        `)
        .eq("quote_id", quoteId);

      if (error) throw error;
      
      const items = data || [];
      setQuoteItems(items as QuoteItem[]);

      // Initialize item results for each quote item and additional headers
      const results: ItemResult[] = [];
      items.forEach((item: any) => {
        // Main product entry
        results.push({
          quote_item_id: item.id,
          header_index: 0,
          header_label: item.products.name,
          header_data: null,
          report_url: "",
          potency: "",
          purity: "",
          identity: "",
        });

        // Additional header entries
        const additionalHeaders = item.additional_headers_data || [];
        for (let i = 0; i < (item.additional_report_headers || 0); i++) {
          const headerData = additionalHeaders[i] || {};
          results.push({
            quote_item_id: item.id,
            header_index: i + 1,
            header_label: `${item.products.name} - Header #${i + 1}`,
            header_data: headerData,
            report_url: "",
            potency: "",
            purity: "",
            identity: "",
          });
        }
      });

      setItemResults(results);
    } catch (error) {
      console.error("Error fetching quote items:", error);
      toast.error("Failed to load quote items");
    }
  };

  const updateItemResult = (index: number, field: keyof ItemResult, value: string) => {
    setItemResults(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmitResults = async () => {
    if (!selectedQuote) return;

    // Validate that all results have at least a report URL
    const missingUrls = itemResults.filter(r => !r.report_url.trim());
    if (missingUrls.length > 0) {
      toast.error("Please provide a report URL for all entries");
      return;
    }

    setUploading(true);
    try {
      // Group results by quote_item_id
      const resultsByItem = itemResults.reduce((acc, result) => {
        if (!acc[result.quote_item_id]) {
          acc[result.quote_item_id] = [];
        }
        acc[result.quote_item_id].push(result);
        return acc;
      }, {} as Record<string, ItemResult[]>);

      // Update each quote item
      for (const [itemId, results] of Object.entries(resultsByItem)) {
        const mainResult = results.find(r => r.header_index === 0);
        const additionalResults = results.filter(r => r.header_index > 0);

        const testResults = {
          main: {
            report_url: mainResult?.report_url,
            potency: mainResult?.potency,
            purity: mainResult?.purity,
            identity: mainResult?.identity,
          },
          additional_headers: additionalResults.map(r => ({
            header_index: r.header_index,
            header_data: r.header_data,
            report_url: r.report_url,
            potency: r.potency,
            purity: r.purity,
            identity: r.identity,
          })),
        };

        await supabase
          .from("quote_items")
          .update({
            report_url: mainResult?.report_url || null,
            test_results: JSON.stringify(testResults),
            testing_notes: notes || null,
            status: "completed",
            date_completed: new Date().toISOString(),
          })
          .eq("id", itemId);
      }

      // Update quote status
      await supabase
        .from("quotes")
        .update({ status: "completed" })
        .eq("id", selectedQuote.id);

      // Log activity
      await supabase.from("quote_activity_log").insert({
        quote_id: selectedQuote.id,
        activity_type: "results_submitted",
        description: "Lab submitted test results",
        metadata: { 
          items_count: Object.keys(resultsByItem).length,
          total_results: itemResults.length,
        },
      });

      toast.success("Results submitted successfully");
      setDialogOpen(false);
      setSelectedQuote(null);
      resetForm();
      setQuotes(quotes.filter(q => q.id !== selectedQuote.id));
    } catch (error) {
      console.error("Error submitting results:", error);
      toast.error("Failed to submit results");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setItemResults([]);
    setQuoteItems([]);
    setNotes("");
  };

  return (
    <LabLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Results Submission</h1>
          <p className="text-muted-foreground mt-1">
            Upload test results and reports
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tests Ready for Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No tests awaiting results
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {quote.quote_number || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge>{quote.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedQuote(quote);
                            fetchQuoteItems(quote.id);
                            setDialogOpen(true);
                          }}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Submit Results
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Submit Results Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Submit Test Results</DialogTitle>
              <DialogDescription>
                Enter results for each product and additional report header
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {itemResults.map((result, index) => (
                  <Card key={`${result.quote_item_id}-${result.header_index}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{result.header_label}</span>
                        {result.header_index > 0 && (
                          <Badge variant="outline" className="ml-2">
                            Additional Report
                          </Badge>
                        )}
                      </CardTitle>
                      {result.header_data && (
                        <div className="text-xs text-muted-foreground space-y-1 mt-2">
                          {result.header_data.client && (
                            <div>Client: {result.header_data.client}</div>
                          )}
                          {result.header_data.sample && (
                            <div>Sample: {result.header_data.sample}</div>
                          )}
                          {result.header_data.manufacturer && (
                            <div>Manufacturer: {result.header_data.manufacturer}</div>
                          )}
                          {result.header_data.batch && (
                            <div>Batch: {result.header_data.batch}</div>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs">Report URL *</Label>
                        <div className="flex gap-2">
                          <LinkIcon className="h-4 w-4 text-muted-foreground mt-2.5" />
                          <Input
                            placeholder="https://lab.example.com/report/12345"
                            value={result.report_url}
                            onChange={(e) => updateItemResult(index, "report_url", e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Potency</Label>
                          <Input
                            placeholder="98.5%"
                            value={result.potency}
                            onChange={(e) => updateItemResult(index, "potency", e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Purity</Label>
                          <Input
                            placeholder="99.2%"
                            value={result.purity}
                            onChange={(e) => updateItemResult(index, "purity", e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Identity</Label>
                          <Input
                            placeholder="Confirmed"
                            value={result.identity}
                            onChange={(e) => updateItemResult(index, "identity", e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div>
                  <Label>Additional Notes (applies to all results)</Label>
                  <Textarea
                    placeholder="Any additional observations or notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button
                onClick={handleSubmitResults}
                disabled={uploading || itemResults.length === 0}
              >
                {uploading ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Submit All Results
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LabLayout>
  );
}
