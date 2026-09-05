import { useNavigate } from "react-router";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  CheckCheck,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { BracketCorners } from "@/components/bracket-conner";



export function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    errorMessage,
    markRead,
    markAllRead,
    isMarkingAllRead,
  } = useNotifications();

  const getSeverityStyle = (severity: Notification["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.3)]";
      case "warning":
        return "bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3)/0.3)]";
      case "success":
        return "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4)/0.3)]";
      default:
        return "bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))] border-[hsl(var(--chart-1)/0.3)]";
    }
  };

  const getSeverityIcon = (severity: Notification["severity"]) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const formatType = (type?: string | null) => {
    if (!type) return "Notification";
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) {
      markRead(n.id);
    }

    // Route to the relevant entity if we know how to — adjust these paths
    // to match your actual routes for each entity_type.
    if (n.entity_type === "job_application" && n.entity_id) {
      navigate(`/applications/${n.entity_id}`);
    } else if (n.entity_type === "interview_session" && n.entity_id) {
      navigate(`/interviews/${n.entity_id}`);
    } else if (n.entity_type === "assignment_submission" && n.entity_id) {
      navigate(`/candidates/${n.entity_id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-[hsl(var(--destructive))] text-lg">Error: {errorMessage}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-[1440px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-md bg-input border border-border flex items-center justify-center flex-shrink-0">
              <BracketCorners tone="primary" />
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-[28px] font-bold tracking-wide text-foreground">
                Notifications
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "You're all caught up"}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              className="font-display font-semibold tracking-wide"
              disabled={isMarkingAllRead}
              onClick={() => markAllRead()}
            >
              {isMarkingAllRead ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-lg tracking-wide">All Notifications</CardTitle>
            <CardDescription>Recent activity and alerts across your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`relative w-full text-left p-4 rounded-lg border transition-colors ${
                    n.is_read
                      ? "border-border/60 bg-card hover:bg-muted/50"
                      : "border-primary/30 bg-[hsl(var(--primary)/0.06)] hover:bg-[hsl(var(--primary)/0.1)]"
                  }`}
                >
                  {!n.is_read && <BracketCorners tone="primary" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className={`shrink-0 rounded-full p-1.5 border ${getSeverityStyle(n.severity)}`}
                      >
                        {getSeverityIcon(n.severity)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-medium truncate ${
                              n.is_read ? "text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        {n.message && (
                          <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                            {n.message}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            className={`font-display font-semibold tracking-wide text-xs ${getSeverityStyle(n.severity)}`}
                          >
                            {formatType(n.type)}
                          </Badge>
                          <span className="text-muted-foreground/70 text-xs">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {n.entity_type && n.entity_id && (
                      <ExternalLink className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}