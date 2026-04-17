import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Loader2,
  Calendar,
  Clock,
  Video,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInterview } from "@/hooks/use-interview";
import { InterviewSession } from "@/hooks/types";

const SESSION_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"] as const;

const getStatusStyle = (s: string) => {
  const map: Record<string, string> = {
    scheduled: "bg-blue-400/10   text-blue-400   border-blue-400/20",
    in_progress: "bg-cyan-400/10   text-cyan-400   border-cyan-400/20",
    completed: "bg-green-400/10  text-green-400  border-green-400/20",
    cancelled: "bg-red-400/10    text-red-400    border-red-400/20",
  };
  return map[s] ?? "bg-gray-400/10 text-gray-400 border-gray-400/20";
};

export function InterviewList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const {
    sessions,
    totalSessions,
    sessionPagination,
    sessionParams,
    setSessionPage,
    setSessionStatus,
    isLoading,
    isFetchingSessions,
    setSessionParams,
  } = useInterview();

  const { totalPages, page: currentPage } = {
    totalPages: sessionPagination.totalPages,
    page: sessionPagination.page,
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setSessionStatus(val === "all" ? "" : val);
  };

  const filtered = sessions.filter((s: InterviewSession) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.session_id.toLowerCase().includes(q) ||
      s.position.toLowerCase().includes(q) ||
      s.interview_type.toLowerCase().includes(q) ||
      s.candidate_id.toLowerCase().includes(q)
    );
  });

  console.log(filtered, "file");
  return (
    <div className="space-y-6 p-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Upcoming Interviews</h2>
          <p className="text-gray-400 mt-1">
            {isFetchingSessions && !isLoading
              ? "Refreshing…"
              : `${totalSessions} session${totalSessions !== 1 ? "s" : ""} scheduled`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-[#1a1f2e] border-gray-800 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search position, type, candidate…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-[#0f1419] border-gray-700 text-white"
            />
          </div>

          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full md:w-44 bg-[#0f1419] border-gray-700 text-white">
              <Filter className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {SESSION_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(sessionParams.limit ?? 20)}
            onValueChange={(v) =>
              setSessionParams((prev) => ({ ...prev, limit: Number(v), page: 1 }))
            }
          >
            <SelectTrigger className="w-24 bg-[#0f1419] border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          <span className="ml-2 text-gray-400">Loading sessions…</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-[#1a1f2e] border-gray-800 p-10 text-center">
          <Calendar className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No upcoming interviews found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((session: InterviewSession) => {
            console.log(session.session_id, "sess");
            return (
              <Link
                key={session.session_id}
                to={`/interviews/${session.candidate_id}/${session.session_id}`}
              >
                <Card className="bg-[#1a1f2e] border-gray-800 hover:border-cyan-400/30 transition-colors p-5 cursor-pointer group mt-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Position + type */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-400/10 flex items-center justify-center shrink-0">
                          <Video className="h-4 w-4 text-cyan-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-semibold group-hover:text-cyan-400 transition-colors truncate">
                            {session.position || "—"}
                          </p>
                          <p className="text-gray-400 text-sm truncate capitalize">
                            {session.interview_type?.replace("_", " ") || "Interview"}
                          </p>
                        </div>
                      </div>

                      {/* Scheduled time + duration */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          {new Date(session.scheduled_at).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {new Date(session.scheduled_at).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {session.scheduled_duration > 0 && (
                          <span className="text-gray-500">{session.scheduled_duration} min</span>
                        )}
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge className={`${getStatusStyle(session.status)} border capitalize`}>
                        {session.status.replace("_", " ")}
                      </Badge>

                      <span className="text-xs text-gray-600 font-mono">
                        {session.session_id.slice(0, 8)}…
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-[#1a1f2e] border border-gray-800 rounded-lg">
          <p className="text-sm text-gray-400">
            Page {currentPage} of {totalPages} · {totalSessions} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700"
              onClick={() => setSessionPage(1)}
              disabled={currentPage === 1 || isFetchingSessions}
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700"
              onClick={() => setSessionPage(currentPage - 1)}
              disabled={currentPage === 1 || isFetchingSessions}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-300 px-2">{currentPage}</span>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700"
              onClick={() => setSessionPage(currentPage + 1)}
              disabled={currentPage === totalPages || isFetchingSessions}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700"
              onClick={() => setSessionPage(totalPages)}
              disabled={currentPage === totalPages || isFetchingSessions}
            >
              »
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
