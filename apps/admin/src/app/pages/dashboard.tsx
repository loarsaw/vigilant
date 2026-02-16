import { useState, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
import { apiClient } from '@/lib/axios';
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

export interface CandidateHistory {
  joinedAt: string;
  interviewStartedAt?: string;
  interviewEndedAt?: string;
  leftAt?: string;
}

export type CandidateLevel = 'Junior' | 'Intern' | 'Senior';
export type TestStatus = 'DSA' | 'React' | 'Nextjs' | 'pending';

export interface AppUsage {
  name: string;
  duration: number;
  usageCount: number;
  lastUsed: string;
}

export interface CandidateData {
  id: string;
  email: string;
  password: string;
  interviewConducted: boolean;
  shortlisted: boolean;
  createdBy: string;
  createdAt: string;
  confidenceScore: number;
  appsUsed: AppUsage[];
  history: CandidateHistory;
  level: CandidateLevel;
  testStatus: TestStatus;
  loggedInTime: string;
  runningProcesses: string[];
}

export function Dashboard() {
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const user = {
    email: '',
    workspaceName: '',
  };

  const [shortlistedCandidates, setShortlistedCandidates] = useState<
    CandidateData[]
  >([]);
  const [newCandidateEmail, setNewCandidateEmail] = useState('');
  const [newCandidatePassword, setNewCandidatePassword] = useState('');
  const [newCandidateName, setNewCandidateName] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importType, setImportType] = useState<'csv' | 'google' | null>(null);
  const interviewedCandidates = candidates.filter(c => c.interviewConducted);

  async function addCandidate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await apiClient.post('/candidates', {
      full_name: '',
      email: newCandidateEmail,
      password: newCandidatePassword,
    });
  }

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
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Import Candidates
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">
                    Import Candidates
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Choose your import source
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Import from CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-border text-foreground"
                  >
                    Import from Google Sheets
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive">Purge</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-destructive">
                    Archive Candidates
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    This action will archive all candidates in the list. This
                    cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <p className="text-sm text-foreground">
                  Are you sure you want to proceed? The candidates list will be
                  archived and cleared.
                </p>
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    className="border-border text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive">Archive All</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline">Logout</Button>
          </div>
        </div>

        {/* Welcome Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Welcome, {user.email}</CardTitle>
            <CardDescription>Workspace: {user.workspaceName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  Total Candidates
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {candidates.length}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-900">
                  Interviewed
                </p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {interviewedCandidates.length}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-900">
                  Shortlisted
                </p>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  {shortlistedCandidates.length}
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm font-medium text-amber-900">Pending</p>
                <p className="text-2xl font-bold text-amber-600 mt-2">
                  {candidates.length - interviewedCandidates.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Candidates</TabsTrigger>
            <TabsTrigger value="interviewed">Interviewed</TabsTrigger>
            <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">All Candidates</h2>
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Add New Candidate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Candidate</DialogTitle>
                    <DialogDescription>
                      Create a new candidate profile for your workspace
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={addCandidate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="candidate-name">Full Name</Label>
                      <Input
                        id="candidate-fullname"
                        type="text"
                        placeholder="John Doe"
                        value={newCandidateName}
                        onChange={e => setNewCandidateName(e.target.value)}
                        required
                      />
                      <Label htmlFor="candidate-email">Email</Label>
                      <Input
                        id="candidate-email"
                        type="email"
                        placeholder="candidate@example.com"
                        value={newCandidateEmail}
                        onChange={e => setNewCandidateEmail(e.target.value)}
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
                        onChange={e => setNewCandidatePassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Create Candidate
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {candidates.length === 0 ? (
              <Card>
                <CardContent className="pt-8 text-center">
                  <p className="text-muted-foreground">
                    No candidates yet. Create one to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Interview</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {candidates.map(candidate => (
                          <TableRow
                            key={candidate.id}
                            className="cursor-pointer hover:bg-secondary/50 transition-colors"
                          >
                            <TableCell className="font-medium">
                              {candidate.email}
                            </TableCell>
                            <TableCell>
                              {candidate.interviewConducted ? (
                                <Badge className="bg-green-100 text-green-800">
                                  Conducted
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {candidate.shortlisted && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  Shortlisted
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell
                              className="space-x-2"
                              onClick={e => e.stopPropagation()}
                            >
                              {!candidate.interviewConducted && (
                                <Button size="sm" variant="outline">
                                  Mark Interview
                                </Button>
                              )}
                              {candidate.interviewConducted &&
                                !candidate.shortlisted && (
                                  <Button
                                    size="sm"
                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                  >
                                    Shortlist
                                  </Button>
                                )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="interviewed" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Candidates with Interviews Conducted</CardTitle>
              </CardHeader>
              <CardContent>
                {interviewedCandidates.length === 0 ? (
                  <p className="text-muted-foreground">
                    No candidates with interviews yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {interviewedCandidates.map(candidate => (
                          <TableRow
                            key={candidate.id}
                            className="cursor-pointer hover:bg-secondary/50 transition-colors"
                          >
                            <TableCell className="font-medium">
                              {candidate.email}
                            </TableCell>
                            <TableCell>
                              {candidate.shortlisted && (
                                <Badge className="bg-purple-100 text-purple-800">
                                  Shortlisted
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                              {!candidate.shortlisted && (
                                <Button
                                  size="sm"
                                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                  Shortlist
                                </Button>
                              )}
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

          <TabsContent value="shortlisted" className="mt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Shortlisted Candidates</h2>
                {shortlistedCandidates.length > 0 && (
                  <Button variant="outline">Export to CSV</Button>
                )}
              </div>
              <Card>
                <CardContent className="pt-6">
                  {shortlistedCandidates.length === 0 ? (
                    <p className="text-muted-foreground">
                      No shortlisted candidates yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Interview Conducted</TableHead>
                            <TableHead>Created Date</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody></TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
