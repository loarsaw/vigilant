import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
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
import { useJobApplications } from "@/hooks/use-job-applications";
import { ApplicationStatus, SortBy, SortOrder } from "@/hooks/types";


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
      applied: "bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))] border-[hsl(var(--chart-1)/0.3)]",
      screening: "bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2)/0.3)]",
      interviewing: "bg-primary/10 text-primary border-primary/30",
      offered: "bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3)/0.3)]",
      hired: "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4)/0.3)]",
      rejected: "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.3)]",
      withdrawn: "bg-muted text-muted-foreground border-border",
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-[1440px] space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-[28px] font-bold tracking-wide text-foreground">
              Job Applications
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isFetching && !isLoading
                ? "Refreshing…"
                : `${totalCount} application${totalCount !== 1 ? "s" : ""} total`}
            </p>
          </div>
        </div>

        {isError && (
          <div className="p-4 bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.3)] rounded text-[hsl(var(--destructive))] text-sm">
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
                    : "bg-card border-border/60 hover:border-border"
                }`}
              >
                <p className="text-xs text-muted-foreground capitalize mb-1">{s}</p>
                <p className="font-display text-lg font-bold text-foreground">
                  {statistics.status_breakdown[s] ?? 0}
                </p>
              </button>
            ))}
          </div>
        )}

        <Card className="border-border/60 bg-card p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, position…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-input border-border text-foreground"
              />
            </div>

            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full md:w-44 bg-input border-border text-foreground">
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
              <SelectTrigger className="w-full md:w-44 bg-input border-border text-foreground">
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
              <SelectTrigger className="w-full md:w-44 bg-input border-border text-foreground">
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
              className="font-display font-semibold tracking-wide shrink-0"
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
              <SelectTrigger className="w-24 bg-input border-border text-foreground">
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
          <TabsList className="bg-card border border-border/60">
            <TabsTrigger value="all" className="font-display font-semibold tracking-wide">
              All
            </TabsTrigger>
            <TabsTrigger value="active" className="font-display font-semibold tracking-wide">
              Active
            </TabsTrigger>
            <TabsTrigger value="closed" className="font-display font-semibold tracking-wide">
              Closed
            </TabsTrigger>
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
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading applications…</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <Card className="border-border/60 bg-card p-10 text-center">
                    <p className="text-muted-foreground">No applications found</p>
                  </Card>
                ) : (
                  filtered.map((app) => (
                    <Link key={app.id} to={`/applications/${app.candidate_id}/${app.id}`}>
                      <Card className="relative border-border/60 bg-card hover:border-primary/30 transition-colors p-5 cursor-pointer group mt-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-input border border-border flex items-center justify-center shrink-0">
                                <span className="text-primary font-display font-bold text-sm">
                                  {app.candidate_name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-foreground font-display font-semibold tracking-wide group-hover:text-primary transition-colors truncate">
                                  {app.candidate_name}
                                </p>
                                <p className="text-muted-foreground text-sm truncate">
                                  {app.candidate_email}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-3">
                              <BriefcaseIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="text-foreground/80 font-medium">
                                {app.position_title}
                              </span>
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
                                      className="text-xs bg-muted/50 border border-border/60 px-2.5 py-1 rounded-full text-muted-foreground"
                                    >
                                      {skill.trim()}
                                    </span>
                                  ))}
                                {app.skills.split(",").length > 5 && (
                                  <span className="text-xs text-muted-foreground/70 px-2 py-1">
                                    +{app.skills.split(",").length - 5} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Badge
                              className={`font-display font-semibold tracking-wide border capitalize ${getStatusStyle(app.status)}`}
                            >
                              {app.status}
                            </Badge>
                            {app.experience_years > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {app.experience_years} yr
                                {app.experience_years !== 1 ? "s" : ""} exp
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground/70">
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
          <div className="flex items-center justify-between p-4 bg-card border border-border/60 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} · {totalCount} total
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="font-display font-semibold tracking-wide"
                onClick={() => setPage(1)}
                disabled={currentPage === 1 || isFetching}
              >
                «
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-display font-semibold tracking-wide"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination?.has_prev || isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-foreground/80 px-2">{currentPage}</span>
              <Button
                variant="outline"
                size="sm"
                className="font-display font-semibold tracking-wide"
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination?.has_next || isFetching}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-display font-semibold tracking-wide"
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages || isFetching}
              >
                »
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}