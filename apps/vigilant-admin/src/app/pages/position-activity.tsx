import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Loader2, Users, CheckCircle2, Star, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePositionActivity } from "@/hooks/use-position-activity";
import { useJobApplications } from "@/hooks/use-job-applications";
import { RadarChart } from "@/components/radar-chart";
import { STATUS_STYLES } from "@/lib/utils";
import { BracketCorners } from "@/components/bracket-conner";
import { StatCard } from "@/components/admin/dashboard/stat-card";

export function PositionActivity() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { activity, isLoading: isLoadingActivity, isError, error } = usePositionActivity(id);

  const { applications, isLoading: isLoadingApplications } = useJobApplications({
    position_id: id,
    sort_by: "applied_at",
    sort_order: "desc",
  });

  if (isLoadingActivity) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-foreground text-lg">Loading position…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-[hsl(var(--destructive))] text-lg">Error: {error?.message}</div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground text-lg">Position not found</div>
      </div>
    );
  }

  const { overview, radar } = activity;

  const radarAxes = [
    { label: "Technical", value: radar.dimensions.technical_skills },
    { label: "Communication", value: radar.dimensions.communication },
    { label: "Problem Solving", value: radar.dimensions.problem_solving },
    { label: "Cultural Fit", value: radar.dimensions.cultural_fit },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-[1440px] space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/hiring")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-md bg-input border border-border flex items-center justify-center flex-shrink-0">
              <BracketCorners tone="primary" />
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-[28px] font-bold tracking-wide text-foreground">
                {activity.position_title}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">Position activity</p>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Applications"
            value={overview.total_applications}
            icon={<Users className="h-4 w-4 text-primary" />}
          />
          <StatCard
            label="Qualified"
            value={overview.qualified}
            icon={<CheckCircle2 className="h-4 w-4 text-[hsl(var(--chart-2))]" />}
          />
          <StatCard
            label="Shortlisted"
            value={overview.shortlisted}
            icon={<Star className="h-4 w-4 text-[hsl(var(--chart-3))]" />}
          />
          <StatCard
            label="Hired"
            value={overview.hired}
            icon={<Trophy className="h-4 w-4 text-[hsl(var(--chart-4))]" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pipeline breakdown */}
          <Card className="relative lg:col-span-1 border-border/60 bg-card">
            <BracketCorners tone="primary" />
            <CardHeader>
              <CardTitle className="font-display text-base font-semibold tracking-wide">
                Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(activity.pipeline).length === 0 && (
                <p className="text-sm text-muted-foreground">No applications yet</p>
              )}
              {Object.entries(activity.pipeline).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <Badge
                    className={`font-display font-semibold tracking-wide ${
                      STATUS_STYLES[status] ?? STATUS_STYLES.applied
                    }`}
                  >
                    {status}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Radar / spider chart */}
          <Card className="relative lg:col-span-2 border-border/60 bg-card">
            <BracketCorners tone="primary" />
            <CardHeader>
              <CardTitle className="font-display text-base font-semibold tracking-wide">
                Average Interview Scorecard
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center text-primary">
              <RadarChart axes={radarAxes} />
            </CardContent>
          </Card>
        </div>

        {/* Applications list */}
        <Card className="border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="font-display text-base font-semibold tracking-wide">
              Applications ({applications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingApplications && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading applications…
              </div>
            )}

            {!isLoadingApplications && applications.length === 0 && (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No applications for this position yet.</p>
              </div>
            )}

            {applications.map((app) => (
              <button
                key={app.id}
                onClick={() => navigate(`/applications/${app.candidate_id}/${app.id}`)}
                className="w-full text-left flex items-center justify-between p-4 rounded-lg border border-border/60 bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {app.candidate_name}
                  </p>
                  <p className="text-muted-foreground text-sm mt-0.5 truncate">
                    {app.candidate_email}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {app.overall_score !== undefined && app.overall_score !== null && (
                    <span className="text-sm text-muted-foreground">
                      Score: {Math.round(app.overall_score)}
                    </span>
                  )}
                  <Badge
                    className={`font-display font-semibold tracking-wide text-xs ${
                      STATUS_STYLES[app.status] ?? STATUS_STYLES.applied
                    }`}
                  >
                    {app.status}
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
