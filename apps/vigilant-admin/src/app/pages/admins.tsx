import { useState } from "react";

import { Link } from "react-router-dom";

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
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "hr" as "hr" | "interviewer",
    department: "",
    designation: "",
    phone_number: "",
  });

  const handleAddAdmin = () => {
    if (!formData.email || !formData.password || !formData.full_name || !formData.role) return;
    addAdmin(formData, {
      onSuccess: () => {
        setFormData({
          email: "",
          password: "",
          full_name: "",
          role: "hr",
          department: "",
          designation: "",
          phone_number: "",
        });
        setShowAddDialog(false);
      },
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this admin?")) {
      deleteAdmin(id);
    }
  };

  const handleResetPassword = () => {
    if (!resetTargetId || newPassword.length < 8) return;
    resetPassword(
      { id: resetTargetId, payload: { new_password: newPassword } },
      {
        onSuccess: () => {
          setShowResetDialog(false);
          setNewPassword("");
          setResetTargetId(null);
        },
      },
    );
  };

  const getRoleBadge = (role: string) =>
    role === "hr"
      ? "bg-purple-400/10 text-purple-400 border-purple-400/20"
      : "bg-blue-400/10 text-blue-400 border-blue-400/20";

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
      className={`bg-[#1a1f2e] border-gray-800 hover:border-cyan-400/30 transition-all p-6 cursor-pointer group ${
        !admin.is_active ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <Link to={`/admins/${admin.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                admin.is_active ? "bg-cyan-400/10" : "bg-gray-700/30"
              }`}
            >
              <span className="text-cyan-400 font-bold text-lg">
                {admin.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                  {admin.full_name}
                </h3>
              </div>
              <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {admin.email}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
            {admin.designation && (
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-cyan-400" />
                {admin.designation}
              </span>
            )}
            {admin.department && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-cyan-400" />
                  {admin.department}
                </span>
              </>
            )}
            {admin.phone_number && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-cyan-400" />
                  {admin.phone_number}
                </span>
              </>
            )}
          </div>
        </Link>

        {/* Right — badges + actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Badge className={`${getRoleBadge(admin.role)} border`}>
              <span className="flex items-center gap-1">
                {getRoleIcon(admin.role)}
                {admin.role === "hr" ? "HR" : "Interviewer"}
              </span>
            </Badge>
            {!admin.is_active && (
              <Badge variant="outline" className="border-red-400/20 text-red-400 text-[10px]">
                Inactive
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white h-8 w-8"
                disabled={isMutating}
              >
                {isMutating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a1f2e] border-gray-800">
              <DropdownMenuItem
                onClick={() => toggleAdminActive(admin.id)}
                className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
              >
                <Power className="h-4 w-4 mr-2" />
                {admin.is_active ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setResetTargetId(admin.id);
                  setShowResetDialog(true);
                }}
                className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer"
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(admin.id)}
                className="text-red-400 hover:text-red-300 hover:bg-gray-800 cursor-pointer"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-[11px] text-gray-500">
            Added {new Date(admin.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 p-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Admin Users</h2>
          <p className="text-gray-400 mt-1">Total of {total} admin users</p>
        </div>
        <Button
          className="bg-cyan-400 hover:bg-cyan-500 text-[#1a1f2e]"
          onClick={() => setShowAddDialog(true)}
          disabled={isAdding}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Admin User
        </Button>
      </div>

      {(isError || addErrorMessage) && (
        <div className="p-4 bg-red-400/10 border border-red-400/20 rounded text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {errorMessage ?? addErrorMessage}
        </div>
      )}

      <Card className="bg-[#1a1f2e] border-gray-800 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-[#0f1419] border-gray-700 text-white"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-full md:w-44 bg-[#0f1419] border-gray-700 text-white">
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
            <SelectTrigger className="w-full md:w-44 bg-[#0f1419] border-gray-700 text-white">
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
        <TabsList className="bg-[#1a1f2e] border border-gray-800">
          <TabsTrigger value="all">All ({filteredAdmins.length})</TabsTrigger>
          <TabsTrigger value="hr">
            HR ({filteredAdmins.filter((a) => a.role === "hr").length})
          </TabsTrigger>
          <TabsTrigger value="interviewers">
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
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                  <span className="ml-2 text-gray-400">Loading admin users...</span>
                </div>
              ) : list.length === 0 ? (
                <Card className="bg-[#1a1f2e] border-gray-800 p-8 text-center">
                  <p className="text-gray-400">No admin users match your criteria</p>
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
  );
}
