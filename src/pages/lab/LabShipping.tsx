import { useEffect, useState, memo, useCallback } from "react";
import LabLayout from "@/components/lab/LabLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { useImpersonation } from "@/hooks/useImpersonation";
import { format } from "date-fns";
import { Package, CheckCircle2, Clock, Truck } from "lucide-react";
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

// Memoized shipping row component
const ShippingRow = memo(({ 
  quote, 
  showMarkReceived,
  getStatusBadge,
  onMarkReceived 
}: { 
  quote: Quote; 
  showMarkReceived: boolean;
  getStatusBadge: (status: string) => React.ReactNode;
  onMarkReceived: (quoteId: string) => void;
}) => (
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
      {getStatusBadge(quote.status)}
    </TableCell>
    {showMarkReceived && (
      <TableCell className="text-right">
        {quote.status === "delivered" && (
          <Button
            size="sm"
            onClick={() => onMarkReceived(quote.id)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Mark Received
          </Button>
        )}
      </TableCell>
    )}
  </TableRow>
));
ShippingRow.displayName = "ShippingRow";

export default function LabShipping() {
  const { labUser } = useLabUser();
  const { impersonatedUser, isImpersonatingLab } = useImpersonation();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  // Use impersonated lab ID if available, otherwise use the lab user's lab ID
  const effectiveLabId = (isImpersonatingLab ? impersonatedUser?.labId : null) || labUser?.lab_id;

  useEffect(() => {
    if (!effectiveLabId) return;

    const fetchShipments = async () => {
      try {
        const { data, error } = await supabase
          .from("quotes")
          .select("id, quote_number, tracking_number, status, shipped_date")
          .eq("lab_id", effectiveLabId)
          .in("status", ["paid_awaiting_shipping", "in_transit", "delivered"])
          .order("created_at", { ascending: false });

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
  }, [effectiveLabId]);

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

  const awaitingShipment = quotes.filter(q => q.status === "paid_awaiting_shipping");
  const inTransit = quotes.filter(q => q.status === "in_transit");
  const delivered = quotes.filter(q => q.status === "delivered");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid_awaiting_shipping":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Clock className="h-3 w-3 mr-1" />Awaiting Shipment</Badge>;
      case "in_transit":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Truck className="h-3 w-3 mr-1" />In Transit</Badge>;
      case "delivered":
        return <Badge variant="default"><Package className="h-3 w-3 mr-1" />Delivered</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderQuoteTable = (quoteList: Quote[], emptyMessage: string, showMarkReceived: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Quote #</TableHead>
          <TableHead>Tracking Number</TableHead>
          <TableHead>Shipped Date</TableHead>
          <TableHead>Status</TableHead>
          {showMarkReceived && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={showMarkReceived ? 5 : 4} className="text-center">
              Loading...
            </TableCell>
          </TableRow>
        ) : quoteList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showMarkReceived ? 5 : 4} className="text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          quoteList.map((quote) => (
            <ShippingRow
              key={quote.id}
              quote={quote}
              showMarkReceived={showMarkReceived}
              getStatusBadge={getStatusBadge}
              onMarkReceived={handleMarkReceived}
            />
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <LabLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shipping & Samples</h1>
          <p className="text-muted-foreground mt-1">
            Track incoming shipments and confirm sample receipt
          </p>
        </div>

        {/* Awaiting Shipment Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Awaiting Shipment from Customer ({awaitingShipment.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderQuoteTable(awaitingShipment, "No quotes awaiting shipment", false)}
          </CardContent>
        </Card>

        {/* In Transit Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              In Transit ({inTransit.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderQuoteTable(inTransit, "No shipments in transit", false)}
          </CardContent>
        </Card>

        {/* Delivered Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Delivered - Awaiting Confirmation ({delivered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderQuoteTable(delivered, "No delivered shipments pending confirmation", true)}
          </CardContent>
        </Card>
      </div>
    </LabLayout>
  );
}