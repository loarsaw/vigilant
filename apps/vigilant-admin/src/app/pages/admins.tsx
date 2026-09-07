import { useState } from "react";

import {
  Search,
  Filter,
  UserPlus,
  Loader2,
  Mail,
  Phone,
  Briefcase,
  Building2,
  AlertCircle,
  Shield,
  Users,
  MoreVertical,
  Power,
  Trash2,
  KeyRound,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdmins } from "@/hooks/use-admin";
import { AddAdminDialog } from "@/components/admin/add-admin";
import { ResetPasswordDialog } from "@/components/admin/reset-password";
import { BracketCorners } from "@/components/bracket-conner";

export function AdminList() {
  const {
    admins,
    total,
    isLoading,
    isError,
    errorMessage,
    addAdmin,
    isAdding,
    addErrorMessage,
    toggleAdminActive,
    isToggling,
    deleteAdmin,
    isDeleting,
    resetPassword,
    isResettingPassword,
  } = useAdmins();

  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this admin?")) {
      deleteAdmin(id);
    }
  };

  const getRoleBadge = (role: string) =>
    role === "hr"
      ? "bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))] border-[hsl(var(--chart-2)/0.3)]"
      : "bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))] border-[hsl(var(--chart-1)/0.3)]";

  const getRoleIcon = (role: string) =>
    role === "hr" ? <Users className="h-3 w-3" /> : <Shield className="h-3 w-3" />;

  const filteredAdmins = admins.filter((admin) => {
    if (filterRole !== "all" && admin.role !== filterRole) return false;
    if (filterStatus === "active" && !admin.is_active) return false;
    if (filterStatus === "inactive" && admin.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        admin.full_name.toLowerCase().includes(q) ||
        admin.email.toLowerCase().includes(q) ||
        admin.department?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const isMutating = isToggling || isDeleting || isResettingPassword;

  // Shared admin card renderer
  const AdminCard = ({ admin }: { admin: (typeof admins)[0] }) => (
    <Card
      className={`relative border-border/60 bg-card hover:border-primary/30 transition-all p-6 cursor-pointer group ${
        !admin.is_active ? "opacity-60" : ""
      }`}
    >
      {admin.is_active && <BracketCorners tone="primary" />}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border ${
              admin.is_active ? "bg-input border-border" : "bg-muted border-border"
            }`}
          >
            <span className="text-primary font-display font-bold text-lg">
              {admin.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-semibold tracking-wide text-foreground group-hover:text-primary transition-colors truncate">
                {admin.full_name}
              </h3>
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {admin.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {admin.designation && (
            <span className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-primary" />
              {admin.designation}
            </span>
          )}
          {admin.department && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                {admin.department}
              </span>
            </>
          )}
          {admin.phone_number && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-primary" />
                {admin.phone_number}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Badge
              className={`font-display font-semibold tracking-wide border ${getRoleBadge(admin.role)}`}
            >
              <span className="flex items-center gap-1">
                {getRoleIcon(admin.role)}
                {admin.role === "hr" ? "HR" : "Interviewer"}
              </span>
            </Badge>
            {!admin.is_active && (
              <Badge
                variant="outline"
                className="font-display font-semibold tracking-wide border-[hsl(var(--destructive)/0.3)] text-[hsl(var(--destructive))] text-[10px]"
              >
                Inactive
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground h-8 w-8"
                disabled={isMutating}
              >
                {isMutating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card border-border/60">
              <DropdownMenuItem
                onClick={() => toggleAdminActive(admin.id)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <Power className="h-4 w-4 mr-2" />
                {admin.is_active ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setResetTargetId(admin.id);
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(admin.id)}
                className="text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-muted cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-[11px] text-muted-foreground/70">
            Added {new Date(admin.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-[1440px] space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-[28px] font-bold tracking-wide text-foreground">
              Admin Users
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Total of {total} admin users</p>
          </div>
          <Button
            className="font-display font-semibold tracking-wide shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.55)]"
            onClick={() => setShowAddDialog(true)}
            disabled={isAdding}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Admin User
          </Button>
        </div>

        {(isError || addErrorMessage) && (
          <div className="p-4 bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.3)] rounded text-[hsl(var(--destructive))] text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {errorMessage ?? addErrorMessage}
          </div>
        )}

        <Card className="border-border/60 bg-card p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-input border-border text-foreground"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full md:w-44 bg-input border-border text-foreground">
                <Filter className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue placeholder="Filter Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="interviewer">Interviewer</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-44 bg-input border-border text-foreground">
                <Filter className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-card border border-border/60">
            <TabsTrigger value="all" className="font-display font-semibold tracking-wide">
              All ({filteredAdmins.length})
            </TabsTrigger>
            <TabsTrigger value="hr" className="font-display font-semibold tracking-wide">
              HR ({filteredAdmins.filter((a) => a.role === "hr").length})
            </TabsTrigger>
            <TabsTrigger value="interviewers" className="font-display font-semibold tracking-wide">
              Interviewers ({filteredAdmins.filter((a) => a.role === "interviewer").length})
            </TabsTrigger>
          </TabsList>

          {(["all", "hr", "interviewers"] as const).map((tab) => {
            const list = filteredAdmins.filter((a) => {
              if (tab === "hr") return a.role === "hr";
              if (tab === "interviewers") return a.role === "interviewer";
              return true;
            });

            return (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Loading admin users...</span>
                  </div>
                ) : list.length === 0 ? (
                  <Card className="border-border/60 bg-card p-8 text-center">
                    <p className="text-muted-foreground">No admin users match your criteria</p>
                  </Card>
                ) : (
                  list.map((admin) => <AdminCard key={admin.id} admin={admin} />)
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        <AddAdminDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAdd={addAdmin}
          isLoading={isAdding}
        />

        <ResetPasswordDialog
          adminId={resetTargetId}
          onOpenChange={(open) => !open && setResetTargetId(null)}
          onReset={resetPassword}
          isLoading={isResettingPassword}
        />
      </div>
    </div>
  );
}
