import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  Loader2,
  BriefcaseIcon,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useJobApplications,
  type ApplicationStatus,
  type SortBy,
  type SortOrder,
} from "@/hooks/use-job-applications";

export function JobApplicationsList() {
  const [status, setStatus] = useState<ApplicationStatus | "all">("all");
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState<SortBy>("applied_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { applications, pagination, statistics, isLoading, isFetching, isError, errorMessage } =
    useJobApplications({
      status: status === "all" ? undefined : status,
      department: department || undefined,
      page,
      limit,
      sort_by: sortBy,
      sort_order: sortOrder,
      include_stats: true,
    });

  const totalPages = pagination?.total_pages ?? 1;
  const totalCount = pagination?.total_count ?? 0;
  const currentPage = pagination?.current_page ?? 1;

  const handleStatusChange = (val: string) => {
    setStatus(val as ApplicationStatus | "all");
    setPage(1);
  };
  const handleDepartmentChange = (val: string) => {
    setDepartment(val === "all" ? "" : val);
    setPage(1);
  };
  const handleSortChange = (val: string) => {
    setSortBy(val as SortBy);
    setPage(1);
  };
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setPage(1);
  };

  const getStatusStyle = (s: string) => {
    const map: Record<string, string> = {
      applied: "bg-blue-400/10    text-blue-400    border-blue-400/20",
      screening: "bg-cyan-400/10    text-cyan-400    border-cyan-400/20",
      interviewing: "bg-purple-400/10  text-purple-400  border-purple-400/20",
      offered: "bg-yellow-400/10  text-yellow-400  border-yellow-400/20",
      hired: "bg-green-400/10   text-green-400   border-green-400/20",
      rejected: "bg-red-400/10     text-red-400     border-red-400/20",
      withdrawn: "bg-gray-400/10    text-gray-400    border-gray-400/20",
    };
    return map[s] ?? map["withdrawn"];
  };

  const ALL_STATUSES: ApplicationStatus[] = [
    "applied",
    "screening",
    "interviewing",
    "offered",
    "hired",
    "rejected",
    "withdrawn",
  ];

  const SORT_OPTIONS: { value: SortBy; label: string }[] = [
    { value: "applied_at", label: "Date Applied" },
    { value: "updated_at", label: "Last Updated" },
    { value: "candidate_name", label: "Candidate" },
    { value: "position_title", label: "Position" },
    { value: "status", label: "Status" },
  ];

  const departments = [...new Set(applications.map((a) => a.department).filter(Boolean))];
  // console.log(applications , "applications")
  return (
    <div className="space-y-6 p-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Job Applications</h2>
          <p className="text-gray-400 mt-1">
            {isFetching && !isLoading
              ? "Refreshing…"
              : `${totalCount} application${totalCount !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {isError && (
        <div className="p-4 bg-red-400/10 border border-red-400/20 rounded text-red-400 text-sm">
          {errorMessage ?? "Failed to load applications."}
        </div>
      )}

      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(status === s ? "all" : s)}
              className={`p-3 rounded-lg border text-left transition-all ${
                status === s
                  ? getStatusStyle(s) + " border opacity-100"
                  : "bg-[#1a1f2e] border-gray-800 hover:border-gray-600"
              }`}
            >
              <p className="text-xs text-gray-400 capitalize mb-1">{s}</p>
              <p className="text-lg font-bold text-white">{statistics.status_breakdown[s] ?? 0}</p>
            </button>
          ))}
        </div>
      )}

      <Card className="bg-[#1a1f2e] border-gray-800 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search name, email, position…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-[#0f1419] border-gray-700 text-white"
            />
          </div>

          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full md:w-44 bg-[#0f1419] border-gray-700 text-white">
              <Filter className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={department || "all"} onValueChange={handleDepartmentChange}>
            <SelectTrigger className="w-full md:w-44 bg-[#0f1419] border-gray-700 text-white">
              <BriefcaseIcon className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full md:w-44 bg-[#0f1419] border-gray-700 text-white">
              <ArrowUpDown className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 shrink-0"
            onClick={toggleSortOrder}
            title="Toggle sort direction"
          >
            {sortOrder === "desc" ? "↓ Newest" : "↑ Oldest"}
          </Button>

          <Select
            value={String(limit)}
            onValueChange={(v) => {
              setLimit(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-24 bg-[#0f1419] border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-[#1a1f2e] border border-gray-800">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
        </TabsList>

        {(["all", "active", "closed"] as const).map((tab) => {
          const filtered = applications
            .filter((a) => {
              if (tab === "active")
                return ["applied", "screening", "interviewing", "offered"].includes(a.status);
              if (tab === "closed") return ["hired", "rejected", "withdrawn"].includes(a.status);
              return true;
            })
            .filter((a) => {
              if (!search) return true;
              const q = search.toLowerCase();
              return (
                a.candidate_name.toLowerCase().includes(q) ||
                a.candidate_email.toLowerCase().includes(q) ||
                a.position_title.toLowerCase().includes(q) ||
                a.skills?.toLowerCase().includes(q)
              );
            });

          return (
            <TabsContent key={tab} value={tab} className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center p-10">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                  <span className="ml-2 text-gray-400">Loading applications…</span>
                </div>
              ) : filtered.length === 0 ? (
                <Card className="bg-[#1a1f2e] border-gray-800 p-10 text-center">
                  <p className="text-gray-400">No applications found</p>
                </Card>
              ) : (
                filtered.map((app) => (
                  <Link key={app.id} to={`/applications/${app.candidate_id}/${app.id}`}>
                    <Card className="bg-[#1a1f2e] border-gray-800 hover:border-cyan-400/30 transition-colors p-5 cursor-pointer group mt-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-cyan-400/10 flex items-center justify-center shrink-0">
                              <span className="text-cyan-400 font-bold text-sm">
                                {app.candidate_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-semibold group-hover:text-cyan-400 transition-colors truncate">
                                {app.candidate_name}
                              </p>
                              <p className="text-gray-400 text-sm truncate">
                                {app.candidate_email}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 mb-3">
                            <BriefcaseIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-gray-200 font-medium">{app.position_title}</span>
                            <span>·</span>
                            <span>{app.department}</span>
                            <span>·</span>
                            <span>{app.location}</span>
                          </div>

                          {app.skills && (
                            <div className="flex flex-wrap gap-1.5">
                              {app.skills
                                .split(",")
                                .slice(0, 5)
                                .map((skill) => (
                                  <span
                                    key={skill.trim()}
                                    className="text-xs bg-gray-800/50 border border-gray-700/30 px-2.5 py-1 rounded-full text-gray-300"
                                  >
                                    {skill.trim()}
                                  </span>
                                ))}
                              {app.skills.split(",").length > 5 && (
                                <span className="text-xs text-gray-500 px-2 py-1">
                                  +{app.skills.split(",").length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Badge className={`${getStatusStyle(app.status)} border capitalize`}>
                            {app.status}
                          </Badge>
                          {app.experience_years > 0 && (
                            <span className="text-xs text-gray-400">
                              {app.experience_years} yr
                              {app.experience_years !== 1 ? "s" : ""} exp
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(app.applied_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-[#1a1f2e] border border-gray-800 rounded-lg">
          <p className="text-sm text-gray-400">
            Page {currentPage} of {totalPages} · {totalCount} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700"
              onClick={() => setPage(1)}
              disabled={currentPage === 1 || isFetching}
            >
              «
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination?.has_prev || isFetching}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-300 px-2">{currentPage}</span>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination?.has_next || isFetching}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700"
              onClick={() => setPage(totalPages)}
              disabled={currentPage === totalPages || isFetching}
            >
              »
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
