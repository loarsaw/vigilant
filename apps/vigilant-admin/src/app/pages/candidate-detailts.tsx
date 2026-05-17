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

  const { makeCall, hangUp, isCalling, isReady, error: twError, setup } = useCall();
  const HARDCODED_NUMBER = "+919651125318";

  useEffect(() => {
    setup();
  }, []);

  const { data, isLoading, isError, error } = useCandidate(candidateId);
  console.log(data, "data");
  const { applications, statistics } = useJobApplications({
    candidate_id: candidateId,
  });
  console.log(applications, "applications", statistics);

  const candidateData = data?.candidate;
  const isOnline = data?.is_online;
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

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
  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column ── */}
        <div className="lg:col-span-2 space-y-6">
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
                      <a
                        href={candidateData.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
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
                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        View Resume
                      </a>
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
                {/* {candidateData.last_login && (
                  <p className="text-gray-500 text-xs mt-1">
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
          <Card className="bg-[#1a1f2e] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                disabled={!data.candidate.onboarding_complete}
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
              {candidateData.resume_url && (
                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300"
                  onClick={() => window.open(candidateData.resume_url, "_blank")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Resume
                </Button>
              )}

              {/* {candidateData.phone_number && ( */}
              <Button
                variant="outline"
                className={`w-full border-gray-700 text-gray-300 ${isCalling ? "border-red-600 text-red-400" : ""}`}
                onClick={() => (isCalling ? hangUp() : makeCall(HARDCODED_NUMBER))}
                disabled={!isReady}
              >
                {isCalling ? (
                  <>
                    <Phone className="h-4 w-4 text-red-400 mr-2 animate-pulse" />
                    Hang Up
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    {isReady ? "Call" : "Connecting..."}
                  </>
                )}
              </Button>

              {twError && <p className="text-red-400 text-xs text-center">{twError}</p>}
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
          onSchedule={() => {}}
        />
      </div>
    </div>
  );
}
