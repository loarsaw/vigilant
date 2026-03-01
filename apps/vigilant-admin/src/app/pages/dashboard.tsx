import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUploadCsv } from '@/hooks/use-csv';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCandidates } from '@/hooks/use-candidates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { PaginationBar } from '@/components/pagination-bar';



// ─── Pagination Bar ────────────────────────────────────────────────────────────



// ─── Search Bar ────────────────────────────────────────────────────────────────


// ─── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard() {
  const router = useNavigate();
  const [csv, setCSV] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newCandidateEmail, setNewCandidateEmail] = useState('');
  const [newCandidatePassword, setNewCandidatePassword] = useState('');
  const [newCandidateName, setNewCandidateName] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const {
    candidates,
    total,
    totalPages,
    page,
    limit,
    search,
    setPage,
    setLimit,
    setSearch,
    isLoading,
    isError,
    updateCandidate,
    isUpdating,
    addCandidate,
    isAdding,
  } = useCandidates();

  // These filter the current page's data only — the server handles full-dataset filtering.
  const interviewCandidates = candidates.filter((c) => c.current_stage_qualified && !c.interview_completed);
  const completedCandidates = candidates.filter((c) => c.interview_completed);

  const uploadMutation = useUploadCsv();

  useEffect(() => {
    if (csv) {
      uploadMutation.mutate(csv, {
        onSuccess: (data) => {
          if (data.success) router('/candidate-list');
        },
      });
    }
  }, [csv]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setCSV(selectedFile);
  };

  const handleAddCandidate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    addCandidate(
      { full_name: newCandidateName, email: newCandidateEmail, password: newCandidatePassword },
      {
        onSuccess: () => {
          setOpenDialog(false);
          setNewCandidateName('');
          setNewCandidateEmail('');
          setNewCandidatePassword('');
        },
      }
    );
  };

  const handleQualifyStage = (id: number) =>
    updateCandidate({ id, payload: { current_stage_qualified: true } });

  const handleCompleteInterview = (id: number) =>
    updateCandidate({ id, payload: { interview_completed: true } });

  const user = { email: '', workspaceName: '' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Recruit</h1>
            <p className="text-muted-foreground">Employer Portal</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
              <DialogTrigger asChild>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Import Candidates</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Import Candidates</DialogTitle>
                  <DialogDescription className="text-muted-foreground">Choose your import source</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                  <Button onClick={() => fileInputRef.current?.click()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Import from CSV
                  </Button>
                  <Button variant="outline" className="w-full border-border text-foreground">Import from Google Sheets</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">Purge</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-destructive">Archive Candidates</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    This action will archive all candidates. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setShowPurgeDialog(false)} className="border-border text-foreground">Cancel</Button>
                  <Button variant="destructive">Archive All</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline">Logout</Button>
          </div>
        </div>

        {/* Stats — use server `total` for the accurate count across all pages */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Welcome, {user.email}</CardTitle>
            <CardDescription>Workspace: {user.workspaceName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">Total Candidates</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{total}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-900">In Interview</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{interviewCandidates.length}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-900">Completed</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">{completedCandidates.length}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm font-medium text-amber-900">Pending</p>
                <p className="text-2xl font-bold text-amber-600 mt-2">
                  {candidates.filter((c) => !c.current_stage_qualified && !c.interview_completed).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Candidates ({total})</TabsTrigger>
            <TabsTrigger value="interview">
              Interview ({interviewCandidates.length + completedCandidates.length})
            </TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedCandidates.length})</TabsTrigger>
          </TabsList>

          {/* ── ALL CANDIDATES TAB ── */}
          <TabsContent value="all" className="mt-6 space-y-4">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <h2 className="text-xl font-bold shrink-0">All Candidates</h2>
                {/* Calls server — debounce handled inside useCandidates hook */}
                <SearchBar
                  value={search}
                  onChange={(v) => { setSearch(v); setPage(1); }}
                  placeholder="Search by name or email…"
                />
                {search && !isLoading && (
                  <span className="text-sm text-muted-foreground shrink-0">
                    {total} result{total !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    Add New Candidate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Candidate</DialogTitle>
                    <DialogDescription>Create a new candidate profile for your workspace</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddCandidate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="candidate-fullname">Full Name</Label>
                      <Input
                        id="candidate-fullname"
                        type="text"
                        placeholder="John Doe"
                        value={newCandidateName}
                        onChange={(e) => setNewCandidateName(e.target.value)}
                        required
                      />
                      <Label htmlFor="candidate-email">Email</Label>
                      <Input
                        id="candidate-email"
                        type="email"
                        placeholder="candidate@example.com"
                        value={newCandidateEmail}
                        onChange={(e) => setNewCandidateEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="candidate-password">Password</Label>
                      <Input
                        id="candidate-password"
                        type="password"
                        placeholder="Enter password"
                        value={newCandidatePassword}
                        onChange={(e) => setNewCandidatePassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isAdding} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      {isAdding ? 'Creating…' : 'Create Candidate'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <Card>
                <CardContent className="pt-8 text-center">
                  <p className="text-muted-foreground">Loading candidates...</p>
                </CardContent>
              </Card>
            ) : isError ? (
              <Card>
                <CardContent className="pt-8 text-center">
                  <p className="text-destructive">Failed to load candidates.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Stage</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {candidates.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              {search ? `No candidates match "${search}"` : 'No candidates yet. Create one to get started.'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          candidates.map((candidate) => (
                            <TableRow
                              key={candidate.id}
                              className="cursor-pointer hover:bg-secondary/50 transition-colors"
                              onClick={() => router(`/candidates/${candidate.id}`)}
                            >
                              <TableCell className="font-medium">{candidate.full_name}</TableCell>
                              <TableCell>{candidate.email}</TableCell>
                              <TableCell>
                                {candidate.interview_current_stage ? (
                                  <Badge variant="outline">{candidate.interview_current_stage}</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Not started</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {candidate.interview_completed ? (
                                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                                ) : candidate.current_stage_qualified ? (
                                  <Badge className="bg-blue-100 text-blue-800">In Interview</Badge>
                                ) : (
                                  <Badge variant="outline">Pending</Badge>
                                )}
                              </TableCell>
                              <TableCell className="space-x-2" onClick={(e) => e.stopPropagation()}>
                                {!candidate.current_stage_qualified && !candidate.interview_completed && (
                                  <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => handleQualifyStage(candidate.id)}>
                                    Qualify
                                  </Button>
                                )}
                                {candidate.current_stage_qualified && !candidate.interview_completed && (
                                  <Button
                                    size="sm"
                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                    disabled={isUpdating}
                                    onClick={() => handleCompleteInterview(candidate.id)}
                                  >
                                    Mark Complete
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Fully server-driven — passes server totals and page directly */}
                  <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    pageSize={limit}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── INTERVIEW TAB ── */}
          <TabsContent value="interview" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Candidates in Interview Process</CardTitle>
                <CardDescription>
                  Showing qualified candidates from the current page. Use the All tab to search across all candidates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {interviewCandidates.length === 0 && completedCandidates.length === 0 ? (
                  <p className="text-muted-foreground">No candidates in interview on this page.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Current Stage</TableHead>
                          <TableHead>Next Stage</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...interviewCandidates, ...completedCandidates].map((candidate) => {
                          const isCompleted = candidate.interview_completed;
                          return (
                            <TableRow key={candidate.id} className={`hover:bg-secondary/50 ${isCompleted ? 'opacity-75' : ''}`}>
                              <TableCell className="font-medium">{candidate.full_name}</TableCell>
                              <TableCell>{candidate.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{candidate.interview_current_stage || 'Initial'}</Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-muted-foreground text-sm">{candidate.interview_next_stage || '—'}</span>
                              </TableCell>
                              <TableCell>
                                {isCompleted ? (
                                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                                )}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                {!isCompleted ? (
                                  <Button
                                    size="sm"
                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                    disabled={isUpdating}
                                    onClick={() => handleCompleteInterview(candidate.id)}
                                  >
                                    Mark Complete
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── COMPLETED TAB ── */}
          <TabsContent value="completed" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Completed Interviews</CardTitle>
                <CardDescription>
                  Showing completed candidates from the current page. Use the All tab to search across all candidates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {completedCandidates.length === 0 ? (
                  <p className="text-muted-foreground">No completed interviews on this page.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Final Stage</TableHead>
                          <TableHead>Completed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedCandidates.map((candidate) => (
                          <TableRow key={candidate.id} className="hover:bg-secondary/50">
                            <TableCell className="font-medium">{candidate.full_name}</TableCell>
                            <TableCell>{candidate.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{candidate.interview_current_stage || '—'}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">✓ Done</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}