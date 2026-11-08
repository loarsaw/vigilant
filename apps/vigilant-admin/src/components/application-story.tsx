import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Calendar, Briefcase, MapPin } from "lucide-react";
import { useJobApplications } from "@/hooks/use-job-applications";
import { Link } from "react-router-dom";

interface CandidateApplication {
  candidate_id: string;
}

const getStatusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes("hired") || s.includes("offered"))
    return "bg-success/10 text-success border-success/20";
  if (s.includes("reject")) return "bg-destructive/10 text-destructive border-destructive/20";
  if (s.includes("screening") || s.includes("interview"))
    return "bg-primary/10 text-primary border-primary/20";
  return "bg-muted text-muted-foreground border-border";
};

export const ApplicationHistory = ({ candidate_id }: CandidateApplication) => {
  const { applications, isFetching, isLoading } = useJobApplications({
    candidate_id: candidate_id,
  });

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading history...</div>;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-primary" />
          Application History
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Past and current job applications for this candidate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {applications?.map((app) => (
          <Link to={`/applications/${candidate_id}/${app.id}`}>
            <div
              key={app.id}
              className="p-4 my-2 rounded-lg border border-border bg-muted/40 hover:border-border transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-foreground font-medium text-base">{app.position_title}</h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      {app.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {app.location}
                    </span>
                  </div>
                </div>
                <Badge className={`${getStatusColor(app.status)} capitalize border`}>
                  {app.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Applied: {new Date(app.applied_at).toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">Exp: {app.experience_years} Years</div>
              </div>
            </div>
          </Link>
        ))}

        {applications?.length === 0 && (
          <p className="text-center text-muted-foreground py-6">No application history found.</p>
        )}
      </CardContent>
    </Card>
  );
};
