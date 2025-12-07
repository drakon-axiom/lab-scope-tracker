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
import { Upload, Link as LinkIcon, FileText, ArrowUpDown, TrendingUp, Sparkles, Loader2 } from "lucide-react";
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
  totalResults?: number;
  completedResults?: number;
}

interface QuoteItem {
  id: string;
  product_id: string;
  additional_report_headers: number;
  additional_samples: number;
  additional_headers_data: any[];
  products: {
    name: string;
  };
}

interface ItemResult {
  quote_item_id: string;
  header_index: number; // 0 = main report, 1+ = additional header reports
  header_label: string;
  header_data: any;
  sample_count: number; // Total samples on this report (1 + additional_samples)
  report_url: string;
  purity_values: string[]; // One purity per sample
  identity: string;
  isSubmitted?: boolean;
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
  const [sortBy, setSortBy] = useState<"progress" | "quote" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [extractingIndex, setExtractingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!labUser?.lab_id) return;

    const fetchQuotes = async () => {
      try {
        const { data, error } = await supabase
          .from("quotes")
          .select(`
            id, 
            quote_number, 
            status,
            quote_items (
              id,
              test_results,
              additional_report_headers
            )
          `)
          .eq("lab_id", labUser.lab_id)
          .eq("status", "testing_in_progress")
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        // Calculate progress for each quote
        const quotesWithProgress = (data || []).map((quote: any) => {
          let totalResults = 0;
          let completedResults = 0;

          quote.quote_items?.forEach((item: any) => {
            // Count main result + additional headers
            const additionalCount = item.additional_report_headers || 0;
            totalResults += 1 + additionalCount;

            // Count completed results
            if (item.test_results) {
              const results = JSON.parse(item.test_results);
              if (results.main?.report_url) completedResults++;
              if (results.additional_headers) {
                completedResults += results.additional_headers.filter((h: any) => h.report_url).length;
              }
            }
          });

          return {
            id: quote.id,
            quote_number: quote.quote_number,
            status: quote.status,
            totalResults,
            completedResults,
          };
        });

        setQuotes(quotesWithProgress);
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
          additional_samples,
          additional_headers_data,
          test_results,
          products (name)
        `)
        .eq("quote_id", quoteId);

      if (error) throw error;
      
      const items = data || [];
      setQuoteItems(items as QuoteItem[]);

      // Initialize item results - one entry per report (main + additional headers)
      // Each report covers all samples (main + variance samples together)
      const results: ItemResult[] = [];
      items.forEach((item: any) => {
        // Parse existing test results if available
        const existingResults = item.test_results ? JSON.parse(item.test_results) : null;
        const existingMain = existingResults?.main || {};
        const existingAdditional = existingResults?.additional_headers || [];

        const additionalSamplesCount = item.additional_samples || 0;
        const totalSamples = 1 + additionalSamplesCount;

        // Main product report (covers all samples for this product)
        const hasMainResult = !!(existingMain.report_url);
        const existingPurityValues = existingMain.purity_values || (existingMain.purity ? [existingMain.purity] : []);
        results.push({
          quote_item_id: item.id,
          header_index: 0,
          header_label: item.products.name,
          header_data: null,
          sample_count: totalSamples,
          report_url: existingMain.report_url || "",
          purity_values: existingPurityValues.length === totalSamples 
            ? existingPurityValues 
            : Array(totalSamples).fill("").map((_, i) => existingPurityValues[i] || ""),
          identity: existingMain.identity || "",
          isSubmitted: hasMainResult,
        });

        // Additional header reports (each covers all samples for that header)
        const additionalHeaders = item.additional_headers_data || [];
        for (let i = 0; i < (item.additional_report_headers || 0); i++) {
          const headerData = additionalHeaders[i] || {};
          const existingHeader = existingAdditional.find((h: any) => h.header_index === i + 1) || {};
          const hasHeaderResult = !!(existingHeader.report_url);
          const existingHeaderPurity = existingHeader.purity_values || (existingHeader.purity ? [existingHeader.purity] : []);
          
          results.push({
            quote_item_id: item.id,
            header_index: i + 1,
            header_label: `${item.products.name} - Header #${i + 1}`,
            header_data: headerData,
            sample_count: totalSamples,
            report_url: existingHeader.report_url || "",
            purity_values: existingHeaderPurity.length === totalSamples 
              ? existingHeaderPurity 
              : Array(totalSamples).fill("").map((_, idx) => existingHeaderPurity[idx] || ""),
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

  const updateItemResult = (index: number, field: keyof ItemResult, value: string | string[]) => {
    setItemResults(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updatePurityValue = (resultIndex: number, sampleIndex: number, value: string) => {
    setItemResults(prev => {
      const updated = [...prev];
      const newPurityValues = [...updated[resultIndex].purity_values];
      newPurityValues[sampleIndex] = value;
      updated[resultIndex] = { ...updated[resultIndex], purity_values: newPurityValues };
      return updated;
    });
  };

  const handleExtractFromUrl = async (index: number) => {
    const result = itemResults[index];
    if (!result.report_url.trim()) {
      toast.error("Please enter a report URL first");
      return;
    }

    setExtractingIndex(index);
    try {
      const { data, error } = await supabase.functions.invoke("extract-lab-results", {
        body: {
          report_url: result.report_url,
          sample_count: result.sample_count,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.success) {
        // Update purity values
        if (data.purity_values && data.purity_values.length > 0) {
          const hasValues = data.purity_values.some((v: string) => v && v.trim());
          if (hasValues) {
            setItemResults(prev => {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                purity_values: data.purity_values,
                identity: data.identity || updated[index].identity,
              };
              return updated;
            });
            toast.success("Results extracted successfully!");
          } else {
            toast.info("Could not find purity values in the document");
          }
        } else {
          toast.info("No results found in the document");
        }
      }
    } catch (error) {
      console.error("Error extracting results:", error);
      toast.error("Failed to extract results from URL");
    } finally {
      setExtractingIndex(null);
    }
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
            purity_values: mainResult.purity_values,
            identity: mainResult.identity,
            sample_count: mainResult.sample_count,
          } : existing.main,
          additional_headers: [
            ...(existing.additional_headers || []),
            ...additionalResults.map(r => ({
              header_index: r.header_index,
              header_data: r.header_data,
              report_url: r.report_url,
              purity_values: r.purity_values,
              identity: r.identity,
              sample_count: r.sample_count,
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

  const getProgressColor = (completedResults: number, totalResults: number) => {
    if (totalResults === 0) return "bg-muted";
    const percentage = (completedResults / totalResults) * 100;
    if (percentage === 0) return "bg-red-500";
    if (percentage === 100) return "bg-green-500";
    return "bg-yellow-500";
  };

  const handleSort = (column: "progress" | "quote") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const sortedQuotes = [...quotes].sort((a, b) => {
    if (!sortBy) return 0;

    if (sortBy === "progress") {
      const aProgress = a.totalResults ? (a.completedResults! / a.totalResults) : 0;
      const bProgress = b.totalResults ? (b.completedResults! / b.totalResults) : 0;
      return sortOrder === "asc" ? aProgress - bProgress : bProgress - aProgress;
    }

    if (sortBy === "quote") {
      const aQuote = a.quote_number || "";
      const bQuote = b.quote_number || "";
      return sortOrder === "asc" 
        ? aQuote.localeCompare(bQuote) 
        : bQuote.localeCompare(aQuote);
    }

    return 0;
  });

  // Calculate aggregate statistics
  const totalQuotes = quotes.length;
  const totalResultsNeeded = quotes.reduce((sum, q) => sum + (q.totalResults || 0), 0);
  const totalResultsCompleted = quotes.reduce((sum, q) => sum + (q.completedResults || 0), 0);
  const overallProgress = totalResultsNeeded ? (totalResultsCompleted / totalResultsNeeded) * 100 : 0;
  const quotesFullyCompleted = quotes.filter(q => 
    q.totalResults && q.completedResults === q.totalResults
  ).length;

  return (
    <LabLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Results Submission</h1>
          <p className="text-muted-foreground mt-1">
            Upload test results and reports
          </p>
        </div>

        {/* Aggregate Progress Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQuotes}</div>
              <p className="text-xs text-muted-foreground">
                {quotesFullyCompleted} fully completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Results</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalResultsCompleted} / {totalResultsNeeded}</div>
              <p className="text-xs text-muted-foreground">
                Results submitted
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
              <div className="text-sm font-bold">{overallProgress.toFixed(1)}%</div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${getProgressColor(totalResultsCompleted, totalResultsNeeded)}`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Across all active testing quotes
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tests Ready for Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("quote")}
                    >
                      Quote #
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={() => handleSort("progress")}
                    >
                      Progress
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : sortedQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No tests awaiting results
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {quote.quote_number || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge>{quote.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {quote.completedResults} / {quote.totalResults}
                          </span>
                          <div className="flex-1 max-w-[100px]">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${getProgressColor(quote.completedResults || 0, quote.totalResults || 0)}`}
                                style={{ 
                                  width: `${quote.totalResults ? (quote.completedResults! / quote.totalResults * 100) : 0}%` 
                                }}
                              />
                            </div>
                          </div>
                        </div>
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
                            className="text-sm flex-1"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={!result.report_url.trim() || extractingIndex === index}
                            onClick={() => handleExtractFromUrl(index)}
                            className="whitespace-nowrap"
                          >
                            {extractingIndex === index ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Extracting...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-1" />
                                Extract Results
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter the report URL and click "Extract Results" to auto-fill purity and identity
                        </p>
                      </div>

                      {/* Purity fields - one per sample */}
                      <div className="space-y-2">
                        <Label className="text-xs">Purity {result.sample_count > 1 && `(${result.sample_count} samples)`}</Label>
                        <div className={`grid gap-2 ${result.sample_count > 2 ? 'grid-cols-3' : result.sample_count > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {result.purity_values.map((purity, sampleIdx) => (
                            <div key={sampleIdx}>
                              {result.sample_count > 1 && (
                                <span className="text-xs text-muted-foreground block mb-1">
                                  {sampleIdx === 0 ? 'Main' : `Sample ${sampleIdx + 1}`}
                                </span>
                              )}
                              <Input
                                placeholder="99.2%"
                                value={purity}
                                onChange={(e) => updatePurityValue(index, sampleIdx, e.target.value)}
                                className="text-sm"
                              />
                            </div>
                          ))}
                        </div>
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
