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
  Clock,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useCandidate } from "@/hooks/use-candidates";
import { Interview, useInterview } from "@/hooks/use-interview";
import { UpcomingInterview } from "@/components/upcoming-interview";
import { EmailModal } from "@/components/qa/email-modal";
import { ScheduleInterviewModal } from "@/components/qa/schedule-interview-modal";
import { pushToCandidate } from "@/lib/axios";
import { CandidateLevel, Framework } from "@/types/types";

type SessionType = "dsa" | "framework" | "";

type DSALanguage = "C" | "C++" | "Python" | "Java";

const getStatusBadge = (status: Interview["status"]) => {
  const statusConfig = {
    scheduled: {
      color: "bg-blue-400/10 text-blue-400 border-blue-400/20",
      label: "Scheduled",
    },
    "in-progress": {
      color: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
      label: "In Progress",
    },
    completed: {
      color: "bg-green-400/10 text-green-400 border-green-400/20",
      label: "Completed",
    },
    cancelled: {
      color: "bg-red-400/10 text-red-400 border-red-400/20",
      label: "Cancelled",
    },
  };
  return statusConfig[status] || statusConfig.scheduled;
};

export function CandidateDetail() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useCandidate(candidateId);

  const candidateData = data?.candidate;
  const isOnline = data?.is_online;

  const { interviews, isLoading: isLoadingInterviews } = useInterview(candidateId);

  const [dsaLanguage, setDsaLanguage] = useState<DSALanguage | "">("");
  const [sessionType, setSessionType] = useState<SessionType>("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [ratingMode, setRatingMode] = useState(false);
  const [interviewRatings, setInterviewRatings] = useState({});
  const [emailFormData, setEmailFormData] = useState({
    to: "",
    subject: "",
    body: "",
  });

  const [level, setLevel] = useState<CandidateLevel | "">("");
  const [framework, setFramework] = useState<Framework | "">("");

  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  const canDispatch =
    sessionType === "framework"
      ? level !== "" && framework !== ""
      : sessionType === "dsa"
        ? dsaLanguage !== ""
        : false;

  const handleSessionTypeChange = (value: SessionType) => {
    setSessionType(value);
    setDispatched(false);
    setLevel("");
    setFramework("");
    setDsaLanguage("");
  };

  const handleDispatch = async () => {
    if (!canDispatch || !candidateId) return;
    setIsDispatching(true);
    try {
      if (sessionType === "framework") {
        await pushToCandidate(candidateId, "session_config", {
          type: "framework",
          framework,
          level,
        });
      } else if (sessionType === "dsa") {
        await pushToCandidate(candidateId, "session_config", {
          type: "dsa",
          language: dsaLanguage,
        });
      }
      setDispatched(true);
    } catch (err) {
      console.error("Failed to dispatch:", err);
    } finally {
      setIsDispatching(false);
    }
  };

  const interviewHistory = interviews.filter((i: Interview) => i.status === "completed");

  useEffect(() => {
    if (candidateData) {
      setEmailFormData((prev) => ({
        ...prev,
        to: candidateData.email,
      }));
    }
  }, [candidateData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white text-lg">Loading candidate details...</div>
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

  const handleRatingChange = (interviewId: string, rating: number) => {
    setInterviewRatings((prev) => ({
      ...prev,
      [interviewId]: rating,
    }));
  };

  const handleSaveRating = (interviewId: string) => {
    setRatingMode(false);
  };

  const handleSendEmail = () => {
    console.log("Sending email:", emailFormData);
    setShowEmailModal(false);
    setEmailFormData({
      to: candidateData?.email || "",
      subject: "",
      body: "",
    });
  };

  const handleScheduleInterview = () => {
    console.log("Schedule interview:", {
      candidate: candidateData.full_name,
      date: selectedDate,
    });
    setShowScheduleDialog(false);
  };

  console.log(candidateData, "candidate data");

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/candidates")}
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
          <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button className="bg-green-500 hover:bg-green-600 text-white">
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <p className="text-gray-400 text-sm">Name</p>
                  <p className="text-white mt-1 font-medium">{candidateData.full_name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white mt-1">{candidateData.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Experience</p>
                  <p className="text-white mt-1">
                    {candidateData.experience_years
                      ? `${candidateData.experience_years} years`
                      : "Not specified"}
                  </p>
                </div>
              </div>

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

          <Card className="bg-[#1a1f2e] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-cyan-400" />
                Interview History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingInterviews ? (
                <div className="text-gray-400 text-center py-4">Loading interviews...</div>
              ) : interviews.length === 0 ? (
                <div className="text-gray-400 text-center py-8">No interviews scheduled yet</div>
              ) : (
                <div className="space-y-3">
                  {interviews.map((interview: Interview) => {
                    const statusInfo = getStatusBadge(interview.status);
                    return (
                      <div
                        key={interview.id}
                        className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-white font-medium">{interview.interview_type}</h4>
                              <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(interview.scheduled_date).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Clock className="h-4 w-4" />
                                <span>{interview.scheduled_time}</span>
                              </div>
                              {interview.candidate_name && (
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <User className="h-4 w-4" />
                                  <span>{interview.candidate_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
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
            </CardContent>
          </Card>

          <UpcomingInterview candidateId={candidateId} candidateName={candidateData.full_name} />
        </div>
      </div>

      <EmailModal
        candidateId={candidateId}
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        candidateName={candidateData.full_name}
        candidateEmail={candidateData.email}
      />

      <ScheduleInterviewModal
        isOpen={showScheduleDialog}
        onClose={() => setShowScheduleDialog(false)}
        candidateName={candidateData.full_name}
        candidateId={candidateId}
        onSchedule={(details) => {}}
      />
    </div>
  );
}
