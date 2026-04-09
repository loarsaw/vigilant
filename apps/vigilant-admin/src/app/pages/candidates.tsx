import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  UserPlus,
  Upload,
  Loader2,
  Github,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useCandidates } from '@/hooks/use-candidates';
import { useImportCandidates } from '@/hooks/use-import-candidates';

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

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });

  const handleAddCandidate = () => {
    if (formData.full_name && formData.email && formData.password) {
      addCandidate(formData, {
        onSuccess: () => {
          setFormData({ full_name: '', email: '', password: '' });
          setShowAddDialog(false);
        },
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importCSV(file);
  };

  const getStatusBadge = (onboardingComplete: boolean) => {
    if (onboardingComplete) {
      return 'bg-green-400/10 text-green-400 border-green-400/20';
    }
    return 'bg-orange-400/10 text-orange-400 border-orange-400/20';
  };

  const filteredCandidates = candidates.filter(c => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'onboarded') return c.onboarding_complete;
    if (filterStatus === 'pending') return !c.onboarding_complete;
    if (filterStatus === 'active') return c.is_active;
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
              <span className="text-cyan-400 ml-2">
                • {activeUserCount} online
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
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
        </div>
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
              placeholder="Search by name, email, or skills..."
              value={search}
              onChange={e => setSearch(e.target.value)}
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
              <SelectItem value="onboarded">Onboarding Complete</SelectItem>
              <SelectItem value="pending">Pending Onboarding</SelectItem>
              <SelectItem value="active">Active Accounts</SelectItem>
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
            filteredCandidates.map(candidate => {
              const isPending = !candidate.onboarding_complete;
              const cardContent = (
                <Card className="bg-[#1a1f2e] border-gray-800 hover:border-cyan-400/30 transition-all p-6 cursor-pointer group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        {/* Avatar / Presence */}
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                            candidate.is_online
                              ? 'bg-green-400/20 ring-2 ring-green-400/50'
                              : 'bg-cyan-400/10'
                          }`}
                        >
                          <span className="text-cyan-400 font-bold text-lg">
                            {candidate.full_name
                              .split(' ')
                              .map(n => n[0])
                              .join('')}
                          </span>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                              {candidate.full_name}
                            </h3>
                            {candidate.is_online && (
                              <Badge className="bg-green-400/10 text-green-400 border-green-400/20 text-[10px] h-5">
                                Live
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm">
                            {candidate.email}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <span className="text-cyan-400 font-medium">
                              {candidate.experience_years}
                            </span>{' '}
                            yrs exp
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-2">
                            {candidate.github_url && (
                              <a
                                href={candidate.github_url}
                                onClick={e => e.stopPropagation()}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Github className="h-4 w-4 hover:text-white transition-colors" />
                              </a>
                            )}
                            {candidate.resume_url && (
                              <a
                                href={candidate.resume_url}
                                onClick={e => e.stopPropagation()}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <FileText className="h-4 w-4 hover:text-white transition-colors" />
                              </a>
                            )}
                          </span>
                        </div>

                        {/* Skills */}
                        {candidate.skills && (
                          <div className="flex flex-wrap gap-2">
                            {candidate.skills.split(',').map(skill => (
                              <span
                                key={skill.trim()}
                                className="text-xs bg-gray-800/40 border border-gray-700/50 px-2.5 py-1 rounded text-gray-300"
                              >
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Section */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge
                        className={`${getStatusBadge(candidate.onboarding_complete)} border`}
                      >
                        {candidate.onboarding_complete ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Onboarded
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </Badge>

                      {!candidate.is_active && (
                        <Badge
                          variant="outline"
                          className="border-red-400/20 text-red-400 text-[10px]"
                        >
                          Inactive Account
                        </Badge>
                      )}

                      <span className="text-[11px] text-gray-500 mt-2">
                        Added{' '}
                        {new Date(candidate.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {isPending && (
                    <span className="text-[10px] text-orange-400/70 text-right max-w-[120px] leading-tight">
                      Awaiting candidate onboarding
                    </span>
                  )}
                </Card>
              );

              if (isPending) {
                return <div key={candidate.id}>{cardContent}</div>;
              }

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

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Full Name</Label>
              <Input
                placeholder="John Doe"
                value={formData.full_name}
                onChange={e =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={e =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={e =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="bg-[#0f1419] border-gray-700 mt-1"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1 bg-cyan-400 hover:bg-cyan-500 text-[#1a1f2e]"
                onClick={handleAddCandidate}
                disabled={isAdding || !formData.full_name || !formData.email}
              >
                {isAdding ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  'Create Candidate'
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-gray-700 text-white"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showImportDialog}
        onOpenChange={open => {
          setShowImportDialog(open);
          if (!open) resetImport();
        }}
      >
        <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Import Candidates</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Error state */}
            {importError && (
              <div className="p-3 bg-red-400/10 border border-red-400/20 rounded text-red-400 text-sm flex items-center gap-2">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                {importError}
              </div>
            )}

            {/* Success state */}
            {importSuccess && importResult && (
              <div className="space-y-3">
                <div className="p-3 bg-green-400/10 border border-green-400/20 rounded text-green-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  Import complete
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#0f1419] rounded p-3">
                    <p className="text-2xl font-bold text-white">
                      {importResult.inserted}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Inserted</p>
                  </div>
                  <div className="bg-[#0f1419] rounded p-3">
                    <p className="text-2xl font-bold text-white">
                      {importResult.skipped}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Skipped</p>
                  </div>
                  <div className="bg-[#0f1419] rounded p-3">
                    <p
                      className={`text-2xl font-bold ${importResult.failed_count > 0 ? 'text-red-400' : 'text-white'}`}
                    >
                      {importResult.failed_count}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Failed</p>
                  </div>
                </div>

                {/* Failed emails detail */}
                {importResult.failed_emails?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-medium">
                      Failed emails:
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {importResult.failed_emails.map(f => (
                        <div
                          key={f.email}
                          className="flex items-start justify-between gap-2 text-xs bg-[#0f1419] rounded px-3 py-2"
                        >
                          <span className="text-white">{f.email}</span>
                          <span className="text-red-400 text-right">
                            {f.error}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-white"
                  onClick={() => {
                    resetImport();
                    setShowImportDialog(false);
                  }}
                >
                  Done
                </Button>
              </div>
            )}

            {!importSuccess && (
              <>
                <p className="text-gray-400 text-sm">
                  Upload a CSV with columns:{' '}
                  <span className="text-cyan-400">
                    full_name, email 
                  </span>
                </p>

                <label className="block">
                  <div
                    className={`w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isImporting
                        ? 'border-cyan-400/50 bg-cyan-400/5'
                        : 'border-gray-700 hover:border-cyan-400/50 hover:bg-cyan-400/5'
                    }`}
                  >
                    {isImporting ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                        <p className="text-sm text-gray-400">Importing...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-gray-500" />
                        <p className="text-sm text-gray-400">
                          Click to upload CSV
                        </p>
                        <p className="text-xs text-gray-600">
                          or drag and drop
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    disabled={isImporting}
                    onChange={handleFileChange}
                  />
                </label>

                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-white"
                  onClick={() => setShowImportDialog(false)}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
