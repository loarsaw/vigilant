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
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (s.includes("reject")) return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  if (s.includes("screening") || s.includes("interview"))
    return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  return "bg-slate-500/10 text-slate-400 border-slate-500/20";
};

export const ApplicationHistory = ({ candidate_id }: CandidateApplication) => {
  const { applications, isFetching, isLoading } = useJobApplications({
    candidate_id: candidate_id,
  });

  if (isLoading) return <div className="p-4 text-gray-400">Loading history...</div>;

  return (
    <Card className="bg-[#1a1f2e] border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-cyan-400" />
          Application History
        </CardTitle>
        <CardDescription className="text-gray-400">
          Past and current job applications for this candidate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {applications?.map((app) => (
          <Link to={`/applications/${candidate_id}/${app.id}`}>
            <div
              key={app.id}
              className="p-4 my-2 rounded-lg border border-gray-800 bg-[#161b26] hover:border-gray-700 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-white font-medium text-base">{app.position_title}</h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
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

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800/50">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="h-3.5 w-3.5" />
                  Applied: {new Date(app.applied_at).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-500">Exp: {app.experience_years} Years</div>
              </div>
            </div>
          </Link>
        ))}

        {applications?.length === 0 && (
          <p className="text-center text-gray-500 py-6">No application history found.</p>
        )}
      </CardContent>
    </Card>
  );
};
