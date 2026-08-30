import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  UserPlus,
  Upload,
  Loader2,
  Github,
  FileText,
  Briefcase,
  AlertCircle,
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
import { useCandidates } from "@/hooks/use-candidates";
import { useImportCandidates } from "@/hooks/use-import-candidates";
import { AddCandidateDialog } from "@/components/candidate/add-candidate";
import { ImportCandidatesDialog } from "@/components/candidate/import-candidate";

export interface ApplicationSummary {
  application_id: string;
  position_id: string;
  position_title: string;
  status: string;
  full_name?: string;
  phone_number?: string;
  resume_url?: string;
  github_urls?: string[];
  skills?: string;
  experience_years: number;
  is_qualified: boolean;
  is_shortlisted: boolean;
  applied_at: string;
}

export interface Candidate {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  is_active: boolean;
  onboarding_complete: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  is_online: boolean;
  applications: ApplicationSummary[];
}

export function CandidatesList() {
  const {
    candidates,
    total,
    page,
    search,
    setPage,
    setSearch,
    totalPages,
    isLoading,
    isError,
    error,
    activeUserCount,
    addCandidate,
    isAdding,
  } = useCandidates();

  const {
    importCSV,
    isImporting,
    isSuccess: importSuccess,
    importResult,
    importError,
    reset: resetImport,
  } = useImportCandidates();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const handleAddCandidate = () => {
    if (formData.full_name && formData.email && formData.password) {
      addCandidate(formData, {
        onSuccess: () => {
          setFormData({ full_name: "", email: "", password: "" });
          setShowAddDialog(false);
        },
      });
    }
  };

  const filteredCandidates = (candidates as Candidate[]).filter((c) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "active") return c.is_active;
    if (filterStatus === "inactive") return !c.is_active;
    if (filterStatus === "shortlisted")
      return c.applications?.some((a) => a.is_shortlisted);
    return true;
  });

  return (
    <div className="space-y-6 p-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Candidates</h2>
          <p className="text-gray-400 mt-1">
            Total of {total} candidates tracked
            {activeUserCount > 0 && (
              <span className="text-cyan-400 ml-2">• {activeUserCount} online</span>
            )}
          </p>
        </div>
        {/* <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            className="bg-cyan-400 hover:bg-cyan-500 text-[#1a1f2e]"
            onClick={() => setShowAddDialog(true)}
            disabled={isAdding}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        </div> */}
      </div>

      {/* Error Display */}
      {isError && (
        <div className="p-4 bg-red-400/10 border border-red-400/20 rounded text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Filters */}
      <Card className="bg-[#1a1f2e] border-gray-800 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-[#0f1419] border-gray-700 text-white"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-56 bg-[#0f1419] border-gray-700 text-white">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Accounts</SelectItem>
              <SelectItem value="inactive">Inactive Accounts</SelectItem>
              <SelectItem value="shortlisted">Shortlisted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-[#1a1f2e] border border-gray-800">
          <TabsTrigger value="all">List View</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              <span className="ml-2 text-gray-400">Loading candidates...</span>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <Card className="bg-[#1a1f2e] border-gray-800 p-8 text-center">
              <p className="text-gray-400">No candidates match your criteria</p>
            </Card>
          ) : (
            filteredCandidates.map((candidate) => {
              const applications = candidate.applications ?? [];
              const latest = applications[0];
              const otherApplicationsCount = Math.max(applications.length - 1, 0);
              const displayName = latest?.full_name || candidate.full_name;
              const skills = latest?.skills
                ? latest.skills.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

              const cardContent = (
                <Card className="bg-[#1a1f2e] border-gray-800 mt-3 hover:border-cyan-400/30 transition-all p-6 cursor-pointer group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                            candidate.is_online
                              ? "bg-green-400/20 ring-2 ring-green-400/50"
                              : "bg-cyan-400/10"
                          }`}
                        >
                          <span className="text-cyan-400 font-bold text-lg">
                            {displayName
                              .split(" ")
                              .filter(Boolean)
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                              {displayName}
                            </h3>
                            {candidate.is_online && (
                              <Badge className="bg-green-400/10 text-green-400 border-green-400/20 text-[10px] h-5">
                                Live
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm">{candidate.email}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Applied position + meta */}
                        {latest && (
                          <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                            <span className="flex items-center gap-1.5 text-gray-300">
                              <Briefcase className="h-3.5 w-3.5 text-cyan-400" />
                              {latest.position_title}
                            </span>
                            {otherApplicationsCount > 0 && (
                              <Badge
                                variant="outline"
                                className="border-gray-700 text-gray-400 text-[10px]"
                              >
                                +{otherApplicationsCount} more application
                                {otherApplicationsCount > 1 ? "s" : ""}
                              </Badge>
                            )}
                            {latest.experience_years > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <span className="text-cyan-400 font-medium">
                                    {latest.experience_years}
                                  </span>
                                  yrs exp
                                </span>
                              </>
                            )}
                            {latest.phone_number && (
                              <>
                                <span>•</span>
                                <span>{latest.phone_number}</span>
                              </>
                            )}
                            <span className="flex items-center gap-2 ml-auto md:ml-0">
                              {latest.github_urls?.map((url) => (
                                <a
                                  key={url}
                                  href={url}
                                  onClick={(e) => e.stopPropagation()}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Github className="h-4 w-4 hover:text-white transition-colors" />
                                </a>
                              ))}
                              {latest.resume_url && (
                                <a
                                  href={latest.resume_url}
                                  onClick={(e) => e.stopPropagation()}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <FileText className="h-4 w-4 hover:text-white transition-colors" />
                                </a>
                              )}
                            </span>
                          </div>
                        )}

                        {/* Skills */}
                        {skills.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {skills.map((skill) => (
                              <span
                                key={skill}
                                className="text-xs bg-gray-800/40 border border-gray-700/50 px-2.5 py-1 rounded text-gray-300"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}

                        {applications.length === 0 && (
                          <p className="text-xs text-gray-500">No applications yet</p>
                        )}
                      </div>
                    </div>

                    {/* Status Section */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {latest?.is_shortlisted && (
                        <Badge className="bg-cyan-400/10 text-cyan-400 border-cyan-400/20 border">
                          Shortlisted
                        </Badge>
                      )}
                      {latest && (
                        <Badge
                          variant="outline"
                          className="border-gray-700 text-gray-300 text-[10px] capitalize"
                        >
                          {latest.status}
                        </Badge>
                      )}
                      {!candidate.is_active && (
                        <Badge
                          variant="outline"
                          className="border-red-400/20 text-red-400 text-[10px]"
                        >
                          Inactive Account
                        </Badge>
                      )}
                      <span className="text-[11px] text-gray-500 mt-2">
                        Added {new Date(candidate.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Card>
              );

              return (
                <Link key={candidate.id} to={`/candidates/${candidate.id}`}>
                  {cardContent}
                </Link>
              );
            })
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-[#1a1f2e] border border-gray-800 rounded mt-6">
              <div className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-700 text-white"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-700 text-white"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddCandidateDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddCandidate}
        isLoading={isAdding}
      />

      <ImportCandidatesDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={importCSV}
        isImporting={isImporting}
        isSuccess={importSuccess}
        result={importResult}
        error={importError}
        onReset={resetImport}
      />
    </div>
  );
}