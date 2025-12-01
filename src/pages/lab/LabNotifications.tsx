import { useEffect, useState } from "react";
import LabLayout from "@/components/lab/LabLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLabUser } from "@/hooks/useLabUser";
import { format } from "date-fns";
import { Bell, BellOff } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Notification {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  quote_number: string | null;
}

export default function LabNotifications() {
  const { labUser } = useLabUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!labUser?.lab_id) return;

    const fetchNotifications = async () => {
      try {
        // Fetch all quotes for this lab
        const { data: quotes, error: quotesError } = await supabase
          .from("quotes")
          .select("id, quote_number")
          .eq("lab_id", labUser.lab_id);

        if (quotesError) throw quotesError;

        const quoteIds = quotes?.map(q => q.id) || [];

        if (quoteIds.length === 0) {
          setNotifications([]);
          setLoading(false);
          return;
        }

        // Fetch activity logs for these quotes
        const { data: activities, error: activitiesError } = await supabase
          .from("quote_activity_log")
          .select("id, activity_type, description, created_at, quote_id")
          .in("quote_id", quoteIds)
          .in("activity_type", [
            "quote_created",
            "status_change",
            "payment_submitted",
            "shipped",
            "notes_added",
          ])
          .order("created_at", { ascending: false })
          .limit(100);

        if (activitiesError) throw activitiesError;

        // Map activities to notifications with quote numbers
        const notificationsWithQuotes = (activities || []).map(activity => {
          const quote = quotes?.find(q => q.id === activity.quote_id);
          return {
            ...activity,
            quote_number: quote?.quote_number || "N/A",
          };
        });

        setNotifications(notificationsWithQuotes);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Set up realtime subscription
    const channel = supabase
      .channel("lab-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quote_activity_log",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [labUser?.lab_id]);

  const getNotificationBadge = (type: string) => {
    const badges: Record<string, { label: string; variant: any }> = {
      quote_created: { label: "New Request", variant: "default" },
      payment_submitted: { label: "Payment", variant: "default" },
      shipped: { label: "Shipment", variant: "default" },
      notes_added: { label: "Note", variant: "outline" },
      status_change: { label: "Status", variant: "secondary" },
    };

    return badges[type] || { label: type, variant: "outline" };
  };

  return (
    <LabLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated on quote activity and customer actions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => {
                    const badge = getNotificationBadge(notification.activity_type);
                    return (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {notification.quote_number}
                        </TableCell>
                        <TableCell>{notification.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(notification.created_at), "MMM d, h:mm a")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </LabLayout>
  );
}
