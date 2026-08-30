import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Award,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Github,
  Briefcase,
  MapPin,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCandidate } from "@/hooks/use-candidates";
import { useInterview } from "@/hooks/use-interview";
import { useJobApplications } from "@/hooks/use-job-applications";
import { UpcomingInterview } from "@/components/upcoming-interview";
import { EmailModal } from "@/components/qa/email-modal";
import { ScheduleInterviewModal } from "@/components/qa/schedule-interview-modal";
import { useJobApplicationStatus } from "@/hooks/use-job-application-status";
// import { useApplicationInterviewFeedback } from "@/hooks/use-application-interview-session";
import { InterviewHistory } from "@/components/interview-history";

// Badge color per application status, matching the app's status vocabulary.
const STATUS_STYLES: Record<string, string> = {
  applied: "bg-gray-700 text-gray-200",
  screening: "bg-blue-500/20 text-blue-300",
  interviewing: "bg-cyan-500/20 text-cyan-300",
  offered: "bg-purple-500/20 text-purple-300",
  hired: "bg-green-500/20 text-green-300",
  rejected: "bg-red-500/20 text-red-300",
  withdrawn: "bg-gray-600/20 text-gray-400",
};

// Badge color per github invite status (invited / accepted / failed / pending).
const GITHUB_STATUS_STYLES: Record<string, string> = {
  invited: "bg-blue-500/20 text-blue-300",
  accepted: "bg-green-500/20 text-green-300",
  failed: "bg-red-500/20 text-red-300",
  pending: "bg-gray-700 text-gray-300",
};

export function JobApplicationDetails() {
  const { candidateId, applicationId } = useParams();
  const { status } = useJobApplicationStatus(applicationId);
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useCandidate(candidateId);
  const { sessions } = useInterview(candidateId);
  const {
    applications,
    isLoading: isLoadingApplications,
    approveApplication,
    rejectApplication,
    isApprovingOrRejecting,
  } = useJobApplications({ candidate_id: candidateId });
  const candidateData = data?.candidate;
  const isOnline = data?.is_online;
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // The specific application being viewed on this page — applications is
  // scoped to this candidate but can include more than one job posting.
  const currentApplication = applications?.find((app) => app.id === applicationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mr-2" />
        <span className="text-white text-lg">Loading candidate details...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-400 text-lg">Error: {error?.message}</div>
      </div>
    );
  }

  if (!candidateData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-lg">Candidate not found</div>
      </div>
    );
  }

  const skillsArray = candidateData.skills
    ? candidateData.skills.split(",").map((s) => s.trim())
    : [];

  const statusBadgeClass = currentApplication
    ? (STATUS_STYLES[currentApplication.status] ?? "bg-gray-700 text-gray-200")
    : "";
  const githubBadgeClass = currentApplication?.github_invite_status
    ? (GITHUB_STATUS_STYLES[currentApplication.github_invite_status] ?? "bg-gray-700 text-gray-300")
    : "";

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/applications")}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-white">{candidateData.full_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-400">{candidateData.email}</p>
              {isOnline && (
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  Online
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {status == "applied" || status == "interviewing" || status == "screening" ? (
            <>
              <Button
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                disabled={isApprovingOrRejecting}
                onClick={() => rejectApplication(applicationId!)}
              >
                {isApprovingOrRejecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject
              </Button>
              <Button
                className="bg-green-500 hover:bg-green-600 text-white"
                disabled={isApprovingOrRejecting}
                onClick={() => approveApplication(applicationId!)}
              >
                {isApprovingOrRejecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve
              </Button>
            </>
          ) : (
            <>
              <Button className="bg-green-500 hover:bg-green-600 text-white" disabled={true}>
                {isApprovingOrRejecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Hired
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Application Overview — data specific to THIS application, not
              the candidate's general profile (position, status, scores,
              github repo state, cover letter). */}
          {currentApplication && (
            <Card className="bg-[#1a1f2e] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-cyan-400" />
                  Application Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-medium">{currentApplication.position_title}</p>
                    <div className="flex items-center gap-3 mt-1 text-gray-400 text-sm">
                      <span>{currentApplication.department}</span>
                      {currentApplication.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {currentApplication.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={statusBadgeClass}>{currentApplication.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Applied</p>
                    <p className="text-white mt-1">
                      {new Date(currentApplication.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Last Updated</p>
                    <p className="text-white mt-1">
                      {new Date(currentApplication.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-800">
                  <div>
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" />
                      Overall Score
                    </p>
                    <p className="text-white mt-1">
                      {currentApplication.overall_score != null
                        ? `${currentApplication.overall_score.toFixed(1)} (${currentApplication.overall_tier || "—"})`
                        : "Not analyzed yet"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Assignment Score</p>
                    <p className="text-white mt-1">
                      {currentApplication.assignment_overall_score != null
                        ? `${currentApplication.assignment_overall_score.toFixed(1)} (${currentApplication.assignment_overall_tier || "—"})`
                        : "Not scored yet"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentApplication.is_shortlisted && (
                    <Badge className="bg-cyan-500/20 text-cyan-300">Shortlisted</Badge>
                  )}
                </div>

                {/* Assignment GitHub repo */}
                {currentApplication.github_repo_url && (
                  <div className="pt-2 border-t border-gray-800">
                    <p className="text-gray-400 text-sm mb-2">Assignment Repo</p>
                    <div className="flex items-center justify-between gap-2">
                      <div
                        onClick={() => window.api.openExternal(currentApplication.github_repo_url)}
                        // target="_blank"
                        // rel="noopener noreferrer"
                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
                      >
                        <Github className="h-4 w-4" />
                        View Repository
                      </div>
                      {currentApplication.github_invite_status && (
                        <Badge className={githubBadgeClass}>
                          {currentApplication.github_invite_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Cover letter */}
                {currentApplication.cover_letter && (
                  <div className="pt-2 border-t border-gray-800">
                    <p className="text-gray-400 text-sm mb-2">Cover Letter</p>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">
                      {currentApplication.cover_letter}
                    </p>
                  </div>
                )}

                {/* Internal notes */}
                {currentApplication.notes && (
                  <div className="pt-2 border-t border-gray-800">
                    <p className="text-gray-400 text-sm mb-2">Notes</p>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">
                      {currentApplication.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="bg-[#1a1f2e] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="h-5 w-5 text-cyan-400" />
                Profile Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Experience</p>
                  <p className="text-white mt-1">
                    {candidateData.experience_years
                      ? `${candidateData.experience_years} years`
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Member Since</p>
                  <p className="text-white mt-1">
                    {new Date(candidateData.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {skillsArray.length > 0 ? (
                    skillsArray.map((skill) => (
                      <span
                        key={skill}
                        className="bg-gray-800 px-3 py-1 rounded-full text-gray-300 text-sm"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">No skills listed</span>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div>
                <p className="text-gray-400 text-sm mb-2">Contact Information</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{candidateData.email}</span>
                  </div>
                  {candidateData.phone_number && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{candidateData.phone_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Links */}
              {(candidateData.github_url || candidateData.resume_url) && (
                <div className="pt-2 border-t border-gray-800">
                  <p className="text-gray-400 text-sm mb-2">Links</p>
                  <div className="space-y-2">
                    {candidateData.github_url && (
                      <div
                        onClick={() => window.api.openExternal(candidateData.github_url)}
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        GitHub Profile
                      </div>
                    )}
                    {candidateData.resume_url && (
                      <div
                        onClick={() => window.api.openExternal(candidateData.resume_url)}
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        View Resume
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Account Status */}
              <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Account Status</span>
                  <Badge variant={candidateData.is_active ? "default" : "secondary"}>
                    {candidateData.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {candidateData.last_login && (
                  <p className="text-gray-500 text-xs mt-1">
                    Last login: {new Date(candidateData.last_login).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Interview History */}
          {applicationId && <InterviewHistory applicationID={applicationId} />}
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="bg-[#1a1f2e] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full bg-cyan-400 hover:bg-cyan-500 text-[#1a1f2e]"
                onClick={() => setShowScheduleDialog(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Interview
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-700 text-gray-300"
                onClick={() => setShowEmailModal(true)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              {(currentApplication?.resume_url || candidateData.resume_url) && (
                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300"
                  onClick={() =>
                    window.open(
                      currentApplication?.resume_url || candidateData.resume_url,
                      "_blank",
                    )
                  }
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Resume
                </Button>
              )}
            </CardContent>
          </Card>

          <UpcomingInterview candidateId={candidateId!} candidateName={candidateData.full_name} />
        </div>

        <EmailModal
          candidateId={candidateId!}
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          candidateName={candidateData.full_name}
          candidateEmail={candidateData.email}
        />

        <ScheduleInterviewModal
          isOpen={showScheduleDialog}
          onClose={() => setShowScheduleDialog(false)}
          candidateName={candidateData.full_name}
          candidateId={candidateId!}
          applications={applications ?? []}
          isLoadingApplications={isLoadingApplications}
          onSchedule={() => {}}
        />
      </div>
    </div>
  );
}
