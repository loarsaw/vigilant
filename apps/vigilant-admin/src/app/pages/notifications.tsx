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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNotifications, Notification } from "@/hooks/use-notifications";

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
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "warning":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "success":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
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

  const formatType = (type: string) =>
    type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mr-2" />
        <span className="text-white text-lg">Loading notifications...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-400 text-lg">Error: {errorMessage}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-cyan-400" />
          <div>
            <h2 className="text-3xl font-bold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-gray-400 text-sm mt-1">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300"
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

      <Card className="bg-[#1a1f2e] border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-cyan-400" />
            All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  n.is_read
                    ? "border-gray-800 bg-gray-900/30 hover:bg-gray-900/50"
                    : "border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10"
                }`}
              >
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
                            n.is_read ? "text-gray-300" : "text-white"
                          }`}
                        >
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                        )}
                      </div>
                      {n.message && (
                        <p className="text-gray-400 text-sm mt-1 line-clamp-2">{n.message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getSeverityStyle(n.severity)}`}
                        >
                          {formatType(n.type)}
                        </Badge>
                        <span className="text-gray-500 text-xs">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  {n.entity_type && n.entity_id && (
                    <ExternalLink className="h-4 w-4 text-gray-600 shrink-0 mt-1" />
                  )}
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}