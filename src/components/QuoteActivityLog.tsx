import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Clock, User, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLog {
  id: string;
  quote_id: string;
  user_id: string | null;
  activity_type: string;
  description: string;
  metadata: any;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface QuoteActivityLogProps {
  quoteId: string;
}

export const QuoteActivityLog = ({ quoteId }: QuoteActivityLogProps) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    // Set up realtime subscription for new activities
    const channel = supabase
      .channel(`quote-activity-${quoteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quote_activity_log',
          filter: `quote_id=eq.${quoteId}`
        },
        (payload) => {
          setActivities(prev => [payload.new as ActivityLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quoteId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('quote_activity_log')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user names separately for activities with user_id
      const activitiesWithUsers = await Promise.all(
        (data || []).map(async (activity) => {
          if (activity.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', activity.user_id)
              .single();
            
            return {
              ...activity,
              profiles: profile
            };
          }
          return {
            ...activity,
            profiles: null
          };
        })
      );
      
      setActivities(activitiesWithUsers);
    } catch (error) {
      console.error('Error fetching activity log:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <Activity className="h-4 w-4" />;
      case 'vendor_approval':
      case 'customer_approval':
        return <span className="text-lg">✓</span>;
      case 'vendor_rejection':
      case 'customer_rejection':
        return <span className="text-lg">✗</span>;
      case 'payment_recorded':
        return <span className="text-lg">💳</span>;
      case 'payment_reminder':
        return <span className="text-lg">⏰</span>;
      case 'lab_notification':
        return <span className="text-lg">📧</span>;
      case 'quote_created':
        return <span className="text-lg">+</span>;
      case 'quote_updated':
        return <span className="text-lg">✎</span>;
      case 'email_sent':
        return <span className="text-lg">✉</span>;
      case 'quote_number_generated':
        return <span className="text-lg">#</span>;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'vendor_approval':
      case 'customer_approval':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'vendor_rejection':
      case 'customer_rejection':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'payment_recorded':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'payment_reminder':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
      case 'lab_notification':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400';
      case 'status_change':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'email_sent':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      case 'quote_number_generated':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {activities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No activity recorded yet
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="relative pl-8 pb-4 border-l-2 border-border last:border-l-0"
                >
                  {/* Activity Icon */}
                  <div
                    className={`absolute left-0 top-0 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(
                      activity.activity_type
                    )}`}
                  >
                    {getActivityIcon(activity.activity_type)}
                  </div>

                  {/* Activity Content */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      
                      {activity.profiles?.full_name && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{activity.profiles.full_name}</span>
                        </div>
                      )}
                      
                      {activity.user_id === null && activity.activity_type.includes('vendor') && (
                        <Badge variant="outline" className="text-xs">
                          Vendor Action
                        </Badge>
                      )}
                    </div>

                    {/* Metadata */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                        {activity.metadata.old_status && activity.metadata.new_status && (
                          <div>
                            <span className="font-medium">Status:</span>{" "}
                            <span className="capitalize">{activity.metadata.old_status.replace(/_/g, ' ')}</span>
                            {" → "}
                            <span className="capitalize">{activity.metadata.new_status.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                        {activity.metadata.payment_amount_usd && (
                          <div>
                            <span className="font-medium">Amount:</span>{" "}
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              ${Number(activity.metadata.payment_amount_usd).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {activity.metadata.payment_date && (
                          <div>
                            <span className="font-medium">Payment Date:</span>{" "}
                            <span>{new Date(activity.metadata.payment_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {activity.metadata.transaction_id && (
                          <div>
                            <span className="font-medium">Transaction ID:</span>{" "}
                            <span className="font-mono">{activity.metadata.transaction_id}</span>
                          </div>
                        )}
                        {activity.metadata.payment_status && (
                          <div>
                            <span className="font-medium">Status:</span>{" "}
                            <Badge variant="outline" className="ml-1">
                              {activity.metadata.payment_status}
                            </Badge>
                          </div>
                        )}
                        {activity.metadata.days_since_approval && (
                          <div>
                            <span className="font-medium">Days Since Approval:</span>{" "}
                            <span className="text-amber-600 dark:text-amber-400">{activity.metadata.days_since_approval}</span>
                          </div>
                        )}
                        {activity.metadata.amount_due && (
                          <div>
                            <span className="font-medium">Amount Due:</span>{" "}
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              ${Number(activity.metadata.amount_due).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {activity.metadata.email && (
                          <div>
                            <span className="font-medium">Sent to:</span>{" "}
                            <span className="font-mono text-xs">{activity.metadata.email}</span>
                          </div>
                        )}
                        {activity.metadata.message && (
                          <div>
                            <span className="font-medium">Message:</span>{" "}
                            <span className="italic">{activity.metadata.message}</span>
                          </div>
                        )}
                        {activity.metadata.changes_made !== undefined && (
                          <div>
                            <span className="font-medium">Changes:</span>{" "}
                            <span>{activity.metadata.changes_made ? "Yes" : "No"}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
