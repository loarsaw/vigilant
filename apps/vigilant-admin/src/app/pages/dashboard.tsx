import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Mail,
  Clock,
  Activity,
} from 'lucide-react';
import { useDashboard } from '@/hooks/use-dashboard';

const formatDate = (dateString: string) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffHours > 0) return `in ${diffHours}h`;
  if (diffHours > -24) return 'Today';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; className: string }> = {
    scheduled:   { label: 'Scheduled',   className: 'bg-blue-100 text-blue-800' },
    in_progress: { label: 'In Progress', className: 'bg-green-100 text-green-800' },
    completed:   { label: 'Completed',   className: 'bg-purple-100 text-purple-800' },
  };
  const config = statusConfig[status] ?? statusConfig.scheduled;
  return <Badge className={config.className}>{config.label}</Badge>;
};

export const Dashboard = () => {
  const navigate = useNavigate();

  const {
    upcomingList,
    pipeline,
    totalCandidates,
    openPositions,
    activeInterviews,
    upcomingInterviews,
    applicationsToday,
    highRiskSessions,
    totalAdmins,
    emailPending,
    emailFailedToday,
    suspiciousProcessesToday,
    isLoading,
  } = useDashboard();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary">
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Overview of your recruitment pipeline</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('')}>
              Manage Positions
            </Button>
            <Button variant="outline" onClick={() => navigate('')}>
              View Candidates
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Candidates</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{totalCandidates}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Open Positions</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{openPositions}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Interviews</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{activeInterviews}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming Interviews</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{upcomingInterviews}</p>
                </div>
                <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Applications Today</p>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{applicationsToday}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Email Queue</p>
                <Mail className="h-4 w-4 text-purple-500" />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-2xl font-bold">{emailPending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                {emailFailedToday > 0 && (
                  <div>
                    <p className="text-lg font-semibold text-destructive">{emailFailedToday}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Security Alerts</p>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-2xl font-bold">{highRiskSessions}</p>
                  <p className="text-xs text-muted-foreground">High Risk</p>
                </div>
                {suspiciousProcessesToday > 0 && (
                  <div>
                    <p className="text-lg font-semibold text-amber-600">{suspiciousProcessesToday}</p>
                    <p className="text-xs text-muted-foreground">Suspicious</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Application Pipeline</CardTitle>
            <CardDescription>Current status of all applications</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.values(pipeline).every((v) => v === 0) ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No applications in pipeline yet</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/positions')}>
                  Create First Position
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { key: 'applied',      label: 'Applied',      sub: 'New applications', color: 'blue'   },
                  { key: 'screening',    label: 'Screening',    sub: 'Under review',     color: 'amber'  },
                  { key: 'interviewing', label: 'Interviewing', sub: 'In progress',      color: 'purple' },
                  { key: 'offered',      label: 'Offered',      sub: 'Pending acceptance', color: 'green' },
                ].map(({ key, label, sub, color }) => (
                  <div key={key} className="text-center">
                    <div className={`h-32 w-32 rounded-full border-8 border-${color}-500 flex items-center justify-center mx-auto mb-3 bg-${color}-50`}>
                      <p className={`text-3xl font-bold text-${color}-600`}>
                        {pipeline[key as keyof typeof pipeline] ?? 0}
                      </p>
                    </div>
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">{sub}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Interviews</CardTitle>
                <CardDescription>Scheduled and in-progress interview sessions</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/interviews')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingList.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2">No upcoming interviews scheduled</p>
                <p className="text-sm text-muted-foreground">Schedule interviews from the candidates page</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Interviewer</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingList.slice(0, 5).map((interview, idx) => (
                        <TableRow key={interview.session_id || idx} className="hover:bg-secondary/50">
                          <TableCell className="font-medium">{interview.candidate_name}</TableCell>
                          <TableCell>{interview.position}</TableCell>
                          <TableCell className="text-muted-foreground">{interview.interviewer_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {formatDate(interview.scheduled_at)}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(interview.status)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/admin/interviews/${interview.session_id}`)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {upcomingList.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button variant="ghost" onClick={() => navigate('/admin/interviews')}>
                      View all {upcomingList.length} interviews
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Admin Team</CardTitle>
            <CardDescription>{totalAdmins} active administrators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {totalAdmins > 0 ? `${totalAdmins} team members` : 'No administrators yet'}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/team')}>
                Manage Team
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};