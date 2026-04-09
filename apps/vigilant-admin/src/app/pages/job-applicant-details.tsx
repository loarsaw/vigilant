import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Mail, Phone, Calendar, Award, FileText,
  CheckCircle, XCircle, Send, Loader2, Zap, Code2, Layers, Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCandidate } from '@/hooks/use-candidates';
import { Interview, useInterview } from '@/hooks/use-interview';
import { useJobApplications } from '@/hooks/use-job-applications';
import { UpcomingInterview } from '@/components/upcoming-interview';
import { EmailModal } from '@/components/qa/email-modal';
import { ScheduleInterviewModal } from '@/components/qa/schedule-interview-modal';
import { pushToCandidate } from '@/lib/axios';
import { CandidateLevel, Framework } from '@/types/types';

type SessionType = 'dsa' | 'framework' | '';
type DSALanguage = 'C' | 'C++' | 'Python' | 'Java';

export function JobApplicationDetails() {
  const { candidateId, applicationId } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useCandidate(candidateId);
  const { interviews } = useInterview(candidateId);
  const { approveApplication, rejectApplication, isApprovingOrRejecting } =
    useJobApplications();

  const candidateData = data?.candidate;
  const isOnline = data?.is_online;
  const interviewHistory = interviews.filter((i:Interview) => i.status === 'completed');
  const [dsaLanguage, setDsaLanguage]     = useState<DSALanguage | ''>('');
  const [sessionType, setSessionType]     = useState<SessionType>('');
  const [level, setLevel]                 = useState<CandidateLevel | ''>('');
  const [framework, setFramework]         = useState<Framework | ''>('');
  const [showEmailModal, setShowEmailModal]       = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatched, setDispatched]       = useState(false);
  const [emailFormData, setEmailFormData] = useState({ to: '', subject: '', body: '' });

  useEffect(() => {
    if (candidateData) {
      setEmailFormData(prev => ({ ...prev, to: candidateData.email }));
    }
  }, [candidateData]);

  const canDispatch =
    sessionType === 'framework' ? level !== '' && framework !== '' :
    sessionType === 'dsa'       ? dsaLanguage !== '' :
    false;

  const handleSessionTypeChange = (value: SessionType) => {
    setSessionType(value);
    setDispatched(false);
    setLevel('');
    setFramework('');
    setDsaLanguage('');
  };

  const handleDispatch = async () => {
    if (!canDispatch || !candidateId) return;
    setIsDispatching(true);
    try {
      if (sessionType === 'framework') {
        await pushToCandidate(candidateId, 'session_config', { type: 'framework', framework, level });
      } else if (sessionType === 'dsa') {
        await pushToCandidate(candidateId, 'session_config', { type: 'dsa', language: dsaLanguage });
      }
      setDispatched(true);
    } catch (err) {
      console.error('Failed to dispatch:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
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
    ? candidateData.skills.split(',').map(s => s.trim())
    : [];
console.log(candidateData , "ca")
  return (
    <div className="space-y-6 p-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/applications')}
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
          <Button
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            disabled={isApprovingOrRejecting}
            onClick={() => rejectApplication(applicationId!)}
          >
            {isApprovingOrRejecting
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <XCircle className="h-4 w-4 mr-2" />}
            Reject
          </Button>
          <Button
            className="bg-green-500 hover:bg-green-600 text-white"
            disabled={isApprovingOrRejecting}
            onClick={() => approveApplication(applicationId!)}
          >
            {isApprovingOrRejecting
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <CheckCircle className="h-4 w-4 mr-2" />}
            Approve
          </Button>
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
                      : 'Not specified'}
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
                    skillsArray.map(skill => (
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
                  <Badge variant={candidateData.is_active ? 'default' : 'secondary'}>
                    {candidateData.is_active ? 'Active' : 'Inactive'}
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

          {/* System Diagnostics */}
          <Card className="bg-[#1a1f2e] border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Terminal className="h-5 w-5 text-cyan-400" />
                System Diagnostics
              </CardTitle>
              <CardDescription>Real-time telemetry from candidate client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-border rounded-lg">
                <p className="text-muted-foreground italic text-sm text-center">
                  Waiting for candidate to connect to session...<br />
                  (Telemetry will appear once session is initialized)
                </p>
              </div>
            </CardContent>
          </Card>
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
                  onClick={() => window.open(candidateData.resume_url, '_blank')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Resume
                </Button>
              )}
            </CardContent>
          </Card>

          <UpcomingInterview
            candidateId={candidateId!}
            candidateName={candidateData.full_name}
          />

          {/* Session Configuration */}
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Zap className="w-5 h-5" />
                Session Configuration
              </CardTitle>
              <CardDescription>
                Choose a session type, configure options, then dispatch to candidate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Session Type Toggle */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Session Type</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSessionTypeChange('dsa')}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      sessionType === 'dsa'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-accent/50 hover:text-foreground'
                    }`}
                  >
                    <Code2 className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">DSA</p>
                      <p className="text-xs opacity-70">Data Structures & Algorithms</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSessionTypeChange('framework')}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      sessionType === 'framework'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-accent/50 hover:text-foreground'
                    }`}
                  >
                    <Layers className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Framework</p>
                      <p className="text-xs opacity-70">React / Next.js assessment</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* DSA Options */}
              {sessionType === 'dsa' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Programming Language
                  </p>
                  <Select
                    value={dsaLanguage}
                    onValueChange={v => { setDsaLanguage(v as DSALanguage); setDispatched(false); }}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue placeholder="Select language..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="C++">C++</SelectItem>
                      <SelectItem value="Python">Python</SelectItem>
                      <SelectItem value="Java">Java</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Framework Options */}
              {sessionType === 'framework' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Target Framework
                    </p>
                    <Select
                      value={framework}
                      onValueChange={v => { setFramework(v as Framework); setDispatched(false); }}
                    >
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="Select framework..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="React">React</SelectItem>
                        <SelectItem value="Nextjs">Next.js</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Difficulty Level
                    </p>
                    <Select
                      value={level}
                      onValueChange={v => { setLevel(v as CandidateLevel); setDispatched(false); }}
                    >
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue placeholder="Select level..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Intern">Intern</SelectItem>
                        <SelectItem value="Junior">Junior</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Dispatch Row */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleDispatch}
                  disabled={!canDispatch || isDispatching}
                  className="flex items-center gap-2"
                >
                  {isDispatching
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                  {isDispatching ? 'Dispatching...' : 'Dispatch to Candidate'}
                </Button>

                {!canDispatch && sessionType !== '' && (
                  <p className="text-xs text-muted-foreground">
                    {sessionType === 'dsa'
                      ? 'Select a language to dispatch'
                      : 'Select both framework and level to dispatch'}
                  </p>
                )}

                {!sessionType && (
                  <p className="text-xs text-muted-foreground">Select a session type to begin</p>
                )}

                {dispatched && canDispatch && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {sessionType === 'dsa'
                      ? `✓ Dispatched — DSA / ${dsaLanguage}`
                      : `✓ Dispatched — ${framework} / ${level}`}
                  </Badge>
                )}
              </div>

            </CardContent>
          </Card>
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