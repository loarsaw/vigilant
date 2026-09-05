import { useState } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  Trash2,
  Power,
  Edit2,
  Users,
  Briefcase,
  Loader2,
  MapPin,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHiringPositions } from "@/hooks/use-hiring";
import { CreatePositionPayload, HiringPosition } from "@/hooks/types";
import { BracketCorners } from "@/components/bracket-conner";

const EMPTY_FORM: CreatePositionPayload = {
  position_title: "",
  department: "",
  location: "",
  employment_type: "full-time",
  experience_required: "",
  salary_range_min: 0,
  salary_range_max: 0,
  salary_range_text: "",
  number_of_openings: 1,
  job_description: "",
  requirements: "",
};

function StatCard({
  label,
  value,
  icon,
  tone = "primary",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "primary" | "muted";
}) {
  return (
    <Card className="relative border-border/60 bg-card p-6">
      <BracketCorners tone={tone} />
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-input border border-border flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}

export function HiringPositions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<"all" | "true" | "false">("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const {
    positions,
    pagination,
    isLoadingPositions,
    isFetchError,
    fetchErrorMessage,
    createPosition,
    isCreating,
    updatePosition,
    isUpdating,
    togglePositionActive,
    isToggling,
    deletePosition,
    isDeleting,
  } = useHiringPositions({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
    department: department || undefined,
    location: location || undefined,
    is_active: isActiveFilter === "all" ? undefined : isActiveFilter === "true",
    page,
    limit,
  });

  const [showDialog, setShowDialog] = useState(false);
  const [editingPosition, setEditingPosition] = useState<HiringPosition | null>(null);
  const [formData, setFormData] = useState<CreatePositionPayload>(EMPTY_FORM);

  const openAdd = () => {
    setEditingPosition(null);
    setFormData(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (pos: HiringPosition) => {
    setEditingPosition(pos);
    setFormData({
      position_title: pos.position_title,
      department: pos.department,
      location: pos.location,
      employment_type: pos.employment_type,
      experience_required: pos.experience_required,
      salary_range_min: pos.salary_range_min,
      salary_range_max: pos.salary_range_max,
      salary_range_text: pos.salary_range_text,
      number_of_openings: pos.number_of_openings,
      job_description: pos.job_description,
      requirements: pos.requirements,
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingPosition(null);
  };

  const handleSubmit = () => {
    if (!formData.position_title || !formData.department || !formData.location) return;

    if (editingPosition) {
      updatePosition({ id: editingPosition.id, payload: formData }, { onSuccess: closeDialog });
    } else {
      createPosition(formData, { onSuccess: closeDialog });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this position?")) {
      deletePosition(id);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setDepartment("");
    setLocation("");
    setIsActiveFilter("all");
    setPage(1);
  };

  const hasActiveFilters =
    search || statusFilter !== "all" || department || location || isActiveFilter !== "all";

  // ── Badge helpers ────────────────────────────────────────────────────────
  const getTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      "full-time":
        "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4)/0.3)]",
      "part-time":
        "bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))] border-[hsl(var(--chart-1)/0.3)]",
      contract:
        "bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2)/0.3)]",
      internship:
        "bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3)/0.3)]",
    };
    return map[type] ?? map["full-time"];
  };

  const isMutating = isCreating || isUpdating || isToggling || isDeleting;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-[1440px] space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-[28px] font-bold tracking-wide text-foreground">
              Hiring Positions
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage open positions and job listings
            </p>
          </div>
          <Button
            className="font-display font-semibold tracking-wide shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.55)]"
            onClick={openAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Position
          </Button>
        </div>

        {isFetchError && (
          <div className="p-4 bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.3)] rounded text-[hsl(var(--destructive))] text-sm">
            {fetchErrorMessage ?? "Failed to load positions."}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Positions"
            value={pagination.total}
            icon={<Briefcase className="h-4 w-4 text-primary" />}
          />
          <StatCard
            label="Active Openings"
            value={positions.reduce((s, p) => s + (p.is_active ? p.number_of_openings : 0), 0)}
            icon={<Plus className="h-4 w-4 text-[hsl(var(--chart-4))]" />}
          />
          <StatCard
            label="Total Pages"
            value={pagination.totalPages}
            icon={<Users className="h-4 w-4 text-[hsl(var(--chart-2))]" />}
          />
        </div>

        <Card className="border-border/60 bg-card p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or description…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 bg-input border-border text-foreground"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatus(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-40 bg-input border-border text-foreground">
                <Filter className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={isActiveFilter}
              onValueChange={(v) => {
                setIsActiveFilter(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-40 bg-input border-border text-foreground">
                <Power className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue placeholder="Is Active" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Enabled</SelectItem>
                <SelectItem value="false">Disabled</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Department…"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setPage(1);
                }}
                className="pl-10 w-full md:w-40 bg-input border-border text-foreground"
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Location…"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setPage(1);
                }}
                className="pl-10 w-full md:w-40 bg-input border-border text-foreground"
              />
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                className="font-display font-semibold tracking-wide text-muted-foreground hover:text-foreground shrink-0"
                onClick={resetFilters}
              >
                Clear
              </Button>
            )}
          </div>
        </Card>

        {/* ── List ── */}
        <div className="space-y-4">
          {isLoadingPositions ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading positions…</span>
            </div>
          ) : positions.length === 0 ? (
            <Card className="border-border/60 bg-card p-10 text-center">
              <p className="text-muted-foreground">No positions found</p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-primary text-sm mt-2 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </Card>
          ) : (
            positions.map((position) => (
              <Card
                key={position.id}
                className={`relative border-border/60 bg-card p-6 transition-all ${
                  !position.is_active ? "opacity-60" : "hover:border-primary/30"
                }`}
              >
                {position.is_active && <BracketCorners tone="primary" />}
                <div className="flex items-start justify-between gap-4">
                  {/* Left */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-input border border-border flex items-center justify-center shrink-0">
                        <Briefcase className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-semibold tracking-wide text-foreground">
                          {position.position_title}
                        </h3>
                        <p className="text-muted-foreground text-sm">{position.department}</p>
                      </div>
                    </div>

                    <div className="space-y-3 ml-15">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {position.location}
                        </span>
                        <span>·</span>
                        <span>{position.experience_required}</span>
                        <span>·</span>
                        <span className="text-primary">
                          {position.number_of_openings}{" "}
                          {position.number_of_openings === 1 ? "opening" : "openings"}
                        </span>
                      </div>

                      <p className="text-foreground/80 text-sm line-clamp-2">
                        {position.job_description}
                      </p>

                      {position.requirements && (
                        <div className="flex flex-wrap gap-2">
                          {position.requirements
                            .split(",")
                            .slice(0, 6)
                            .map((r) => (
                              <span
                                key={r.trim()}
                                className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground border border-border"
                              >
                                {r.trim()}
                              </span>
                            ))}
                          {position.requirements.split(",").length > 6 && (
                            <span className="text-xs text-muted-foreground/70 px-2 py-1">
                              +{position.requirements.split(",").length - 6} more
                            </span>
                          )}
                        </div>
                      )}

                      {position.salary_range_text && (
                        <p className="text-sm text-[hsl(var(--chart-4))] font-medium">
                          {position.salary_range_text}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground/70">
                        Created {new Date(position.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`font-display font-semibold tracking-wide ${getTypeBadge(position.employment_type)}`}
                      >
                        {position.employment_type}
                      </Badge>
                      <Badge
                        className={`font-display font-semibold tracking-wide ${
                          position.is_active
                            ? "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4)/0.3)]"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        {position.status}
                      </Badge>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground"
                          disabled={isMutating}
                        >
                          {isMutating ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <MoreVertical className="h-5 w-5" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-card border-border/60">
                        <DropdownMenuItem
                          onClick={() => openEdit(position)}
                          className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        >
                          <Edit2 className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => togglePositionActive(position.id)}
                          className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                        >
                          <Power className="h-4 w-4 mr-2" />
                          {position.is_active ? "Disable" : "Enable"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(position.id)}
                          className="text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-muted cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* ── Pagination ── */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-card border border-border/60 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Page {pagination.currentPage} of {pagination.totalPages} · {pagination.total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="font-display font-semibold tracking-wide"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoadingPositions}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-display font-semibold tracking-wide"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pagination.totalPages || isLoadingPositions}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <Dialog open={showDialog} onOpenChange={closeDialog}>
          <DialogContent className="bg-card border-border/60 text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display tracking-wide">
                {editingPosition ? "Edit Position" : "Add New Position"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>Position Title *</Label>
                <Input
                  placeholder="Backend Engineer"
                  value={formData.position_title}
                  onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                  className="bg-input border-border mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Department *</Label>
                  <Input
                    placeholder="Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="bg-input border-border mt-1"
                  />
                </div>
                <div>
                  <Label>Location *</Label>
                  <Input
                    placeholder="Remote"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="bg-input border-border mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employment Type *</Label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employment_type: e.target.value,
                      })
                    }
                    className="w-full mt-1 px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div>
                  <Label>Experience Required *</Label>
                  <Input
                    placeholder="3-5 years"
                    value={formData.experience_required}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        experience_required: e.target.value,
                      })
                    }
                    className="bg-input border-border mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Min Salary ($)</Label>
                  <Input
                    type="number"
                    placeholder="120000"
                    value={formData.salary_range_min || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salary_range_min: Number(e.target.value),
                      })
                    }
                    className="bg-input border-border mt-1"
                  />
                </div>
                <div>
                  <Label>Max Salary ($)</Label>
                  <Input
                    type="number"
                    placeholder="160000"
                    value={formData.salary_range_max || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salary_range_max: Number(e.target.value),
                      })
                    }
                    className="bg-input border-border mt-1"
                  />
                </div>
                <div>
                  <Label>Salary Display Text</Label>
                  <Input
                    placeholder="$120k – $160k"
                    value={formData.salary_range_text}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salary_range_text: e.target.value,
                      })
                    }
                    className="bg-input border-border mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Number of Openings *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.number_of_openings}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      number_of_openings: parseInt(e.target.value) || 1,
                    })
                  }
                  className="bg-input border-border mt-1"
                />
              </div>

              <div>
                <Label>Job Description *</Label>
                <Textarea
                  placeholder="Describe the role and responsibilities…"
                  value={formData.job_description}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  className="bg-input border-border mt-1 min-h-24"
                />
              </div>

              <div>
                <Label>Requirements (comma-separated) *</Label>
                <Textarea
                  placeholder="React, TypeScript, Node.js, AWS"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="bg-input border-border mt-1"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1 font-display font-semibold tracking-wide"
                  onClick={handleSubmit}
                  disabled={
                    isCreating ||
                    isUpdating ||
                    !formData.position_title ||
                    !formData.department ||
                    !formData.location
                  }
                >
                  {isCreating || isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
                    </>
                  ) : editingPosition ? (
                    "Update Position"
                  ) : (
                    "Add Position"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 font-display font-semibold tracking-wide"
                  onClick={closeDialog}
                  disabled={isCreating || isUpdating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
