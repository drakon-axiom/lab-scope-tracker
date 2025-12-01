import { useEffect, useState } from "react";
import LabLayout from "@/components/lab/LabLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { format } from "date-fns";
import { Package, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Quote {
  id: string;
  quote_number: string | null;
  tracking_number: string | null;
  status: string;
  shipped_date: string | null;
}

export default function LabShipping() {
  const { labUser } = useLabUser();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!labUser?.lab_id) return;

    const fetchShipments = async () => {
      try {
        const { data, error } = await supabase
          .from("quotes")
          .select("id, quote_number, tracking_number, status, shipped_date")
          .eq("lab_id", labUser.lab_id)
          .in("status", ["in_transit", "delivered"])
          .order("shipped_date", { ascending: false });

        if (error) throw error;
        setQuotes(data || []);
      } catch (error) {
        console.error("Error fetching shipments:", error);
        toast.error("Failed to load shipments");
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [labUser?.lab_id]);

  const handleMarkReceived = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from("quotes")
        .update({ status: "testing_in_progress" })
        .eq("id", quoteId);

      if (error) throw error;

      await supabase.from("quote_activity_log").insert({
        quote_id: quoteId,
        activity_type: "sample_received",
        description: "Lab confirmed sample received",
      });

      toast.success("Sample marked as received");
      setQuotes(quotes.filter(q => q.id !== quoteId));
    } catch (error) {
      console.error("Error marking received:", error);
      toast.error("Failed to update status");
    }
  };

  return (
    <LabLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipping & Samples</h1>
          <p className="text-muted-foreground mt-1">
            Track incoming shipments and confirm sample receipt
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Incoming Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Tracking Number</TableHead>
                  <TableHead>Shipped Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No incoming shipments
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">
                        {quote.quote_number || "N/A"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {quote.tracking_number || "-"}
                      </TableCell>
                      <TableCell>
                        {quote.shipped_date
                          ? format(new Date(quote.shipped_date), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={quote.status === "delivered" ? "default" : "outline"}>
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {quote.status === "delivered" && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkReceived(quote.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Received
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </LabLayout>
  );
}
