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
import { STATUS_STYLES, GITHUB_STATUS_STYLES } from "@/lib/utils";

export function JobApplicationDetails() {
  const { candidateId, applicationId } = useParams();
  const { status } = useJobApplicationStatus(applicationId ?? "");
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
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span className="text-foreground text-lg">Loading candidate details...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-destructive text-lg">Error: {error?.message}</div>
      </div>
    );
  }

  if (!candidateData) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-foreground text-lg">Candidate not found</div>
      </div>
    );
  }

  const skillsArray = candidateData.skills
    ? candidateData.skills.split(",").map((s) => s.trim())
    : [];

  const statusBadgeClass = currentApplication
    ? (STATUS_STYLES[currentApplication.status] ?? STATUS_STYLES.applied)
    : "";
  const githubBadgeClass = currentApplication?.github_invite_status
    ? (GITHUB_STATUS_STYLES[currentApplication.github_invite_status] ??
      GITHUB_STATUS_STYLES.pending)
    : "";

  return (
    <div className="space-y-6 p-5 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/applications")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-display text-3xl font-bold tracking-wide text-foreground">
              {candidateData.full_name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground">{candidateData.email}</p>
              {isOnline && (
                <span className="flex items-center gap-1 text-[hsl(var(--chart-4))] text-sm">
                  <div className="h-2 w-2 rounded-full bg-[hsl(var(--chart-4))] shadow-[0_0_6px_hsl(var(--chart-4)/0.7)]" />
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
                className="border-destructive/50 text-destructive hover:bg-destructive/10 font-display font-semibold tracking-wide"
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
                className="bg-[hsl(var(--chart-4))] hover:bg-[hsl(var(--chart-4)/0.85)] text-background font-display font-semibold tracking-wide"
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
              <Button
                className="bg-[hsl(var(--chart-4))] text-background font-display font-semibold tracking-wide"
                disabled={true}
              >
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
          {currentApplication && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display tracking-wide text-foreground flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Application Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-foreground font-medium">
                      {currentApplication.position_title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-muted-foreground text-sm">
                      <span>{currentApplication.department}</span>
                      {currentApplication.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {currentApplication.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={`font-display font-semibold tracking-wide capitalize ${statusBadgeClass}`}
                  >
                    {currentApplication.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Applied</p>
                    <p className="text-foreground mt-1">
                      {new Date(currentApplication.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Last Updated</p>
                    <p className="text-foreground mt-1">
                      {new Date(currentApplication.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <p className="text-muted-foreground text-sm flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" />
                      Overall Score
                    </p>
                    <p className="text-foreground mt-1">
                      {currentApplication.overall_score != null
                        ? `${currentApplication.overall_score.toFixed(1)} (${currentApplication.overall_tier || "—"})`
                        : "Not analyzed yet"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Assignment Score</p>
                    <p className="text-foreground mt-1">
                      {currentApplication.assignment_overall_score != null
                        ? `${currentApplication.assignment_overall_score.toFixed(1)} (${currentApplication.assignment_overall_tier || "—"})`
                        : "Not scored yet"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {currentApplication.is_shortlisted && (
                    <Badge className="bg-primary/10 text-primary border border-primary/30 font-display font-semibold tracking-wide">
                      Shortlisted
                    </Badge>
                  )}
                </div>

                {/* Assignment GitHub repo */}
                {currentApplication.github_repo_url && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-muted-foreground text-sm mb-2">Assignment Repo</p>
                    <div className="flex items-center justify-between gap-2">
                      <div
                        onClick={() => {
                          if (!currentApplication.github_repo_url) {
                            window.alert(
                              "No GitHub repository URL is available for this application.",
                            );
                            return;
                          }
                          window.api.openExternal(currentApplication.github_repo_url);
                        }}
                        className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm cursor-pointer"
                      >
                        <Github className="h-4 w-4" />
                        View Repository
                      </div>
                      {currentApplication.github_invite_status && (
                        <Badge
                          className={`font-display font-semibold tracking-wide capitalize ${githubBadgeClass}`}
                        >
                          {currentApplication.github_invite_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Cover letter */}
                {currentApplication.cover_letter && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-muted-foreground text-sm mb-2">Cover Letter</p>
                    <p className="text-foreground/80 text-sm whitespace-pre-wrap">
                      {currentApplication.cover_letter}
                    </p>
                  </div>
                )}

                {/* Internal notes */}
                {currentApplication.notes && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-muted-foreground text-sm mb-2">Notes</p>
                    <p className="text-foreground/80 text-sm whitespace-pre-wrap">
                      {currentApplication.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-display tracking-wide text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Profile Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Experience</p>
                  <p className="text-foreground mt-1">
                    {candidateData.experience_years
                      ? `${candidateData.experience_years} years`
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Member Since</p>
                  <p className="text-foreground mt-1">
                    {new Date(candidateData.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <p className="text-muted-foreground text-sm mb-2">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {skillsArray.length > 0 ? (
                    skillsArray.map((skill) => (
                      <span
                        key={skill}
                        className="bg-input border border-border px-3 py-1 rounded-md text-muted-foreground text-sm"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground/60 text-sm">No skills listed</span>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div>
                <p className="text-muted-foreground text-sm mb-2">Contact Information</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-foreground/80">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{candidateData.email}</span>
                  </div>
                  {candidateData.phone_number && (
                    <div className="flex items-center gap-2 text-foreground/80">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{candidateData.phone_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Links */}
              {(candidateData.github_url || candidateData.resume_url) && (
                <div className="pt-2 border-t border-border">
                  <p className="text-muted-foreground text-sm mb-2">Links</p>
                  <div className="space-y-2">
                    {candidateData.github_url && (
                      <div
                        onClick={() => {
                          if (!candidateData.github_url) {
                            window.alert("No GitHub profile URL is available for this candidate.");
                            return;
                          }
                          window.api.openExternal(candidateData.github_url);
                        }}
                        className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm cursor-pointer"
                      >
                        <FileText className="h-4 w-4" />
                        GitHub Profile
                      </div>
                    )}
                    {candidateData.resume_url && (
                      <div
                        onClick={() => {
                          if (!candidateData.resume_url) {
                            window.alert("No resume URL is available for this candidate.");
                            return;
                          }
                          window.api.openExternal(candidateData.resume_url);
                        }}
                        className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm cursor-pointer"
                      >
                        <FileText className="h-4 w-4" />
                        View Resume
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Account Status */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Account Status</span>
                  <Badge
                    className={
                      candidateData.is_active
                        ? "bg-primary/10 text-primary border border-primary/30 font-display font-semibold tracking-wide"
                        : "bg-muted text-muted-foreground border border-border font-display font-semibold tracking-wide"
                    }
                  >
                    {candidateData.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {/* {candidateData.last_login && (
                  <p className="text-muted-foreground/60 text-xs mt-1">
                    Last login: {new Date(candidateData.last_login).toLocaleString()}
                  </p>
                )} */}
              </div>
            </CardContent>
          </Card>

          {/* Interview History */}
          {applicationId && <InterviewHistory applicationID={applicationId} />}
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-display tracking-wide text-foreground">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full font-display font-semibold tracking-wide shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.55)]"
                onClick={() => setShowScheduleDialog(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Interview
              </Button>
              <Button
                variant="outline"
                className="w-full font-display font-semibold tracking-wide"
                onClick={() => setShowEmailModal(true)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              {(currentApplication?.resume_url || candidateData.resume_url) && (
                <Button
                  variant="outline"
                  className="w-full font-display font-semibold tracking-wide"
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
