import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Mail, Phone, Calendar, Award, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCandidate } from "@/hooks/use-candidates";
import { useJobApplications } from "@/hooks/use-job-applications";
import { UpcomingInterview } from "@/components/upcoming-interview";
import { EmailModal } from "@/components/qa/email-modal";
import { ScheduleInterviewModal } from "@/components/qa/schedule-interview-modal";
import { ApplicationHistory } from "@/components/application-story";
import { useCall } from "@/hooks/use-call";

export function CandidateDetail() {
  const { candidateId } = useParams();
  const navigate = useNavigate();

  // const { makeCall, hangUp, isCalling, isReady, error: twError, setup } = useCall();
  // const HARDCODED_NUMBER = "";

  // useEffect(() => {
  //   setup();
  // }, []);

  const { data, isLoading, isError, error } = useCandidate(candidateId);
  console.log(data, "data");
  const {
    applications,
    statistics,
    isLoading: isLoadingApplications,
  } = useJobApplications({
    candidate_id: candidateId,
  });

  const candidateData = data?.candidate;
  const isOnline = data?.is_online;
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

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
  return (
    <div className="space-y-6 p-5 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column ── */}
        <div className="lg:col-span-2 space-y-6">
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
                      <a
                        href={candidateData.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        GitHub Profile
                      </a>
                    )}
                    {candidateData.resume_url && (
                      <a
                        href={candidateData.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        View Resume
                      </a>
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

          {/* Application History */}
          {candidateId && <ApplicationHistory candidate_id={candidateId} />}
        </div>

        {/* ── Right Column ── */}
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
                disabled={!data.candidate.onboarding_complete}
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
              {candidateData.resume_url && (
                <Button
                  variant="outline"
                  className="w-full font-display font-semibold tracking-wide"
                  onClick={() => window.open(candidateData.resume_url, "_blank")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Resume
                </Button>
              )}

              {/* {candidateData.phone_number && ( */}
              {/* <Button
                variant="outline"
                className={`w-full ${isCalling ? "border-destructive text-destructive" : ""}`}
                onClick={() => (isCalling ? hangUp() : makeCall(HARDCODED_NUMBER))}
                disabled={!isReady}
              >
                {isCalling ? (
                  <>
                    <Phone className="h-4 w-4 text-destructive mr-2 animate-pulse" />
                    Hang Up
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                    {isReady ? "Call" : "Connecting..."}
                  </>
                )}
              </Button> */}

              {/* {twError && <p className="text-destructive text-xs text-center">{twError}</p>} */}
              {/* )} */}
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
