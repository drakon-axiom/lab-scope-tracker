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

interface Quote {
  id: string;
  quote_number: string | null;
  status: string;
}

export default function LabResults() {
  const { labUser } = useLabUser();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reportUrl, setReportUrl] = useState("");
  const [potency, setPotency] = useState("");
  const [purity, setPurity] = useState("");
  const [identity, setIdentity] = useState("");
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

  const handleSubmitResults = async () => {
    if (!selectedQuote) return;

    setUploading(true);
    try {
      // Update quote items with results
      const { data: items } = await supabase
        .from("quote_items")
        .select("id")
        .eq("quote_id", selectedQuote.id);

      if (items && items.length > 0) {
        const updates = items.map(item => ({
          id: item.id,
          report_url: reportUrl || null,
          test_results: JSON.stringify({
            potency,
            purity,
            identity,
          }),
          testing_notes: notes || null,
          status: "completed",
          date_completed: new Date().toISOString(),
        }));

        for (const update of updates) {
          await supabase
            .from("quote_items")
            .update(update)
            .eq("id", update.id);
        }
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
        metadata: { potency, purity, identity, report_url: reportUrl },
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
    setReportUrl("");
    setPotency("");
    setPurity("");
    setIdentity("");
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit Test Results</DialogTitle>
              <DialogDescription>
                Enter test results and provide report link
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Report URL</Label>
                <div className="flex gap-2">
                  <LinkIcon className="h-4 w-4 text-muted-foreground mt-3" />
                  <Input
                    placeholder="https://lab.example.com/report/12345"
                    value={reportUrl}
                    onChange={(e) => setReportUrl(e.target.value)}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Link to the full report on your system
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Potency</Label>
                  <Input
                    placeholder="98.5%"
                    value={potency}
                    onChange={(e) => setPotency(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Purity</Label>
                  <Input
                    placeholder="99.2%"
                    value={purity}
                    onChange={(e) => setPurity(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Identity</Label>
                  <Input
                    placeholder="Confirmed"
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Any additional observations or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleSubmitResults}
                disabled={uploading || !reportUrl}
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
