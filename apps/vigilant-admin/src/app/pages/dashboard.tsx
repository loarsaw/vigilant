import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Mail,
  Clock,
  Activity,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { PipelineRing } from "@/components/admin/dashboard/pipeline-ring";
import { formatDate, getStatusBadge } from "@/lib/utils";

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const pipelineStages: {
    key: keyof typeof pipeline;
    label: string;
    sub: string;
    colorVar: string;
  }[] = [
    { key: "applied", label: "Applied", sub: "New applications", colorVar: "var(--border)" },
    { key: "screening", label: "Screening", sub: "Under review", colorVar: "var(--chart-1)" },
    { key: "interviewing", label: "Interviewing", sub: "In progress", colorVar: "var(--chart-2)" },
    { key: "offered", label: "Offered", sub: "Pending acceptance", colorVar: "var(--chart-3)" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-[1440px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-[28px] font-bold tracking-wide text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Overview of your recruitment pipeline
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="font-display font-semibold tracking-wide"
              onClick={() => navigate("/applications")}
            >
              View Positions
            </Button>
            <Button
              className="font-display font-semibold tracking-wide shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.55)]"
              onClick={() => navigate("/candidates")}
            >
              View Candidates
            </Button>
          </div>
        </div>

        {/* Key Metrics — bracketed, glowing: these are the numbers that matter most */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard
            label="Total Candidates"
            value={totalCandidates}
            icon={<Users className="h-4 w-4 text-primary" />}
          />
          <StatCard
            label="Open Positions"
            value={openPositions}
            icon={<Briefcase className="h-4 w-4 text-[hsl(var(--chart-2))]" />}
          />
          <StatCard
            label="Active Interviews"
            value={activeInterviews}
            icon={<Activity className="h-4 w-4 text-[hsl(var(--chart-4))]" />}
          />
          <StatCard
            label="Upcoming Interviews"
            value={upcomingInterviews}
            icon={<Calendar className="h-4 w-4 text-[hsl(var(--chart-3))]" />}
          />
        </div>

        {/* Secondary Metrics — quieter steel brackets: operational feed, not headline numbers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            tone="muted"
            label="Applications Today"
            value={<span className="text-2xl">{applicationsToday}</span>}
            icon={<TrendingUp className="h-4 w-4 text-[hsl(var(--chart-2))]" />}
          />
          <StatCard
            tone="muted"
            label="Email Queue"
            value={
              <span className="flex items-baseline gap-3">
                <span className="text-2xl">{emailPending}</span>
                <span className="text-xs font-normal text-muted-foreground">Pending</span>
                {emailFailedToday > 0 && (
                  <span className="text-base font-semibold text-destructive">
                    {emailFailedToday} failed
                  </span>
                )}
              </span>
            }
            icon={<Mail className="h-4 w-4 text-primary" />}
          />
          <StatCard
            tone="muted"
            label="Security Alerts"
            value={
              <span className="flex items-baseline gap-3">
                <span className="text-2xl">{highRiskSessions}</span>
                <span className="text-xs font-normal text-muted-foreground">High Risk</span>
                {suspiciousProcessesToday > 0 && (
                  <span className="text-base font-semibold text-[hsl(var(--chart-3))]">
                    {suspiciousProcessesToday} suspicious
                  </span>
                )}
              </span>
            }
            icon={<AlertTriangle className="h-4 w-4 text-[hsl(var(--chart-3))]" />}
          />
        </div>

        {/* Pipeline */}
        <Card className="mb-6 border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-lg tracking-wide">
              Application Pipeline
            </CardTitle>
            <CardDescription>Current status of all applications</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.values(pipeline).every((v) => v === 0) ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No applications in pipeline yet</p>
                <Button
                  variant="outline"
                  className="mt-4 font-display font-semibold tracking-wide"
                  onClick={() => navigate("/admin/positions")}
                >
                  Create First Position
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {pipelineStages.map(({ key, label, sub, colorVar }) => (
                  <PipelineRing
                    key={key}
                    value={pipeline[key] ?? 0}
                    label={label}
                    sub={sub}
                    colorVar={colorVar}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Interviews */}
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-lg tracking-wide">
                  Upcoming Interviews
                </CardTitle>
                <CardDescription>Scheduled and in-progress interview sessions</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="font-display font-semibold tracking-wide"
                onClick={() => navigate("/applications")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingList.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2">No upcoming interviews scheduled</p>
                <p className="text-sm text-muted-foreground">
                  Schedule interviews from the candidates page
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60">
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
                        <TableRow
                          key={interview.session_id || idx}
                          className="border-border/60 hover:bg-muted/50"
                        >
                          <TableCell className="font-medium">{interview.candidate_name}</TableCell>
                          <TableCell>{interview.position}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {interview.interviewer_name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {formatDate(interview.scheduled_at)}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(interview.status)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="font-display font-semibold tracking-wide"
                              onClick={() => navigate(`/candidates/${interview.candidate_id}`)}
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
                    <Button
                      variant="ghost"
                      className="font-display font-semibold tracking-wide"
                      onClick={() => navigate("/applications")}
                    >
                      View all {upcomingList.length} interviews
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 border-border/60">
          <CardHeader>
            <CardTitle className="font-display text-lg tracking-wide">Admin Team</CardTitle>
            <CardDescription>{totalAdmins} active administrators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {totalAdmins > 0 ? `${totalAdmins} team members` : "No administrators yet"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="font-display font-semibold tracking-wide"
                onClick={() => navigate("/team")}
              >
                Manage Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
