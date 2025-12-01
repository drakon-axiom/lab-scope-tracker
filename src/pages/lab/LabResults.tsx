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
  isSubmitted?: boolean; // Track if this result was previously submitted
}

interface SubmissionHistory {
  id: string;
  created_at: string;
  description: string;
  metadata: any;
  user_id: string | null;
}

export default function LabResults() {
  const { labUser } = useLabUser();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemResults, setItemResults] = useState<ItemResult[]>([]);
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionHistory[]>([]);
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

  const fetchSubmissionHistory = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from("quote_activity_log")
        .select("id, created_at, description, metadata, user_id")
        .eq("quote_id", quoteId)
        .eq("activity_type", "results_submitted")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissionHistory(data || []);
    } catch (error) {
      console.error("Error fetching submission history:", error);
    }
  };

  const fetchQuoteItems = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from("quote_items")
        .select(`
          id,
          product_id,
          additional_report_headers,
          additional_headers_data,
          test_results,
          products (name)
        `)
        .eq("quote_id", quoteId);

      if (error) throw error;
      
      const items = data || [];
      setQuoteItems(items as QuoteItem[]);

      // Initialize item results for each quote item and additional headers
      const results: ItemResult[] = [];
      items.forEach((item: any) => {
        // Parse existing test results if available
        const existingResults = item.test_results ? JSON.parse(item.test_results) : null;
        const existingMain = existingResults?.main || {};
        const existingAdditional = existingResults?.additional_headers || [];

        // Main product entry
        const hasMainResult = !!(existingMain.report_url);
        results.push({
          quote_item_id: item.id,
          header_index: 0,
          header_label: item.products.name,
          header_data: null,
          report_url: existingMain.report_url || "",
          potency: existingMain.potency || "",
          purity: existingMain.purity || "",
          identity: existingMain.identity || "",
          isSubmitted: hasMainResult,
        });

        // Additional header entries
        const additionalHeaders = item.additional_headers_data || [];
        for (let i = 0; i < (item.additional_report_headers || 0); i++) {
          const headerData = additionalHeaders[i] || {};
          const existingHeader = existingAdditional.find((h: any) => h.header_index === i + 1) || {};
          const hasHeaderResult = !!(existingHeader.report_url);
          
          results.push({
            quote_item_id: item.id,
            header_index: i + 1,
            header_label: `${item.products.name} - Header #${i + 1}`,
            header_data: headerData,
            report_url: existingHeader.report_url || "",
            potency: existingHeader.potency || "",
            purity: existingHeader.purity || "",
            identity: existingHeader.identity || "",
            isSubmitted: hasHeaderResult,
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

    // Filter results that have been filled out (have report URL)
    const filledResults = itemResults.filter(r => r.report_url.trim());
    
    if (filledResults.length === 0) {
      toast.error("Please provide at least one result to submit");
      return;
    }

    setUploading(true);
    try {
      // Group filled results by quote_item_id
      const resultsByItem = filledResults.reduce((acc, result) => {
        if (!acc[result.quote_item_id]) {
          acc[result.quote_item_id] = [];
        }
        acc[result.quote_item_id].push(result);
        return acc;
      }, {} as Record<string, ItemResult[]>);

      // Get existing test results for each item
      const { data: existingItems } = await supabase
        .from("quote_items")
        .select("id, test_results, additional_report_headers")
        .in("id", Object.keys(resultsByItem));

      const existingTestResults = new Map(
        existingItems?.map(item => [
          item.id, 
          item.test_results ? JSON.parse(item.test_results) : null
        ]) || []
      );

      // Update each quote item with new results merged with existing
      for (const [itemId, results] of Object.entries(resultsByItem)) {
        const mainResult = results.find(r => r.header_index === 0);
        const additionalResults = results.filter(r => r.header_index > 0);
        
        // Get existing results to preserve previously submitted data
        const existing = existingTestResults.get(itemId) || { additional_headers: [] };

        // Merge new results with existing
        const testResults = {
          main: mainResult ? {
            report_url: mainResult.report_url,
            potency: mainResult.potency,
            purity: mainResult.purity,
            identity: mainResult.identity,
          } : existing.main,
          additional_headers: [
            ...(existing.additional_headers || []),
            ...additionalResults.map(r => ({
              header_index: r.header_index,
              header_data: r.header_data,
              report_url: r.report_url,
              potency: r.potency,
              purity: r.purity,
              identity: r.identity,
            }))
          ].reduce((acc, curr) => {
            // Remove duplicates by header_index, keeping latest
            const existingIndex = acc.findIndex(a => a.header_index === curr.header_index);
            if (existingIndex >= 0) {
              acc[existingIndex] = curr;
            } else {
              acc.push(curr);
            }
            return acc;
          }, [] as any[]),
        };

        // Find the item to check total expected headers
        const item = existingItems?.find(i => i.id === itemId);
        const totalExpectedResults = 1 + (item?.additional_report_headers || 0);
        const submittedCount = (testResults.main ? 1 : 0) + testResults.additional_headers.length;
        const isComplete = submittedCount >= totalExpectedResults;

        await supabase
          .from("quote_items")
          .update({
            report_url: testResults.main?.report_url || null,
            test_results: JSON.stringify(testResults),
            testing_notes: notes || null,
            status: isComplete ? "completed" : "pending",
            date_completed: isComplete ? new Date().toISOString() : null,
          })
          .eq("id", itemId);
      }

      // Check if all quote items are completed
      const { data: allItems } = await supabase
        .from("quote_items")
        .select("status")
        .eq("quote_id", selectedQuote.id);

      const allCompleted = allItems?.every(item => item.status === "completed");

      // Update quote status only if all items are completed
      if (allCompleted) {
        await supabase
          .from("quotes")
          .update({ status: "completed" })
          .eq("id", selectedQuote.id);
      }

      // Log activity
      await supabase.from("quote_activity_log").insert({
        quote_id: selectedQuote.id,
        activity_type: "results_submitted",
        description: allCompleted 
          ? "Lab submitted final test results - all items completed" 
          : "Lab submitted partial test results",
        metadata: { 
          items_updated: Object.keys(resultsByItem).length,
          results_submitted: filledResults.length,
          all_completed: allCompleted,
        },
      });

      toast.success(
        allCompleted 
          ? "All results submitted - quote completed!" 
          : `Submitted ${filledResults.length} result${filledResults.length > 1 ? 's' : ''}`
      );
      
      setDialogOpen(false);
      setSelectedQuote(null);
      resetForm();
      
      // Only remove from list if all items are completed
      if (allCompleted) {
        setQuotes(quotes.filter(q => q.id !== selectedQuote.id));
      }
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
                            fetchSubmissionHistory(quote.id);
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
                {/* Submission History */}
                {submissionHistory.length > 0 && (
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Submission History
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {submissionHistory.map((history) => (
                        <div key={history.id} className="flex items-start gap-3 text-xs border-l-2 border-primary pl-3 py-1">
                          <div className="flex-1">
                            <div className="font-medium">{history.description}</div>
                            <div className="text-muted-foreground mt-1">
                              {new Date(history.created_at).toLocaleString()}
                            </div>
                            {history.metadata && (
                              <div className="text-muted-foreground mt-1">
                                {history.metadata.results_submitted && (
                                  <span>{history.metadata.results_submitted} result(s) submitted</span>
                                )}
                                {history.metadata.all_completed && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    All Completed
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Status Summary */}
                <div className="flex gap-4 p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-500">
                      Submitted: {itemResults.filter(r => r.isSubmitted).length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      Pending: {itemResults.filter(r => !r.isSubmitted).length}
                    </Badge>
                  </div>
                </div>

                {/* Result Entries */}
                {itemResults.map((result, index) => (
                  <Card key={`${result.quote_item_id}-${result.header_index}`} className={result.isSubmitted ? "border-green-500/30 bg-green-500/5" : ""}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{result.header_label}</span>
                        <div className="flex items-center gap-2">
                          {result.isSubmitted ? (
                            <Badge variant="default" className="bg-green-500">
                              Submitted
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              Pending
                            </Badge>
                          )}
                          {result.header_index > 0 && (
                            <Badge variant="outline" className="ml-2">
                              Additional Report
                            </Badge>
                          )}
                        </div>
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

            <DialogFooter className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {itemResults.filter(r => r.report_url.trim()).length} of {itemResults.length} results filled
              </div>
              <Button
                onClick={handleSubmitResults}
                disabled={uploading || itemResults.filter(r => r.report_url.trim()).length === 0}
              >
                {uploading ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Submit Results
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
