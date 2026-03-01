import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Zap, Brain, Clock, Terminal, Loader2, User, Send } from 'lucide-react';
import {
  TestStatus,
  CandidateLevel,
  Framework,
} from '@/types/types';
import { useParams, useNavigate } from 'react-router-dom';
import { useCandidates } from '@/hooks/use-candidates';
import { pushToCandidate } from '@/lib/axios';

type RouteParams = {
  candidateId: string;
};

export function CandidatePage() {
  const { candidateId } = useParams<RouteParams>();
  const navigate = useNavigate();
  const { useCandidate, updateCandidate, isUpdating } = useCandidates();

  const { data  , isLoading: isTargetLoading } = useCandidate(candidateId);


  const candidate = data?.candidate;
  const isOnline = data?.is_online;  

  const [level, setLevel] = useState<CandidateLevel | ''>('');
  const [framework, setFramework] = useState<Framework | ''>('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  const canDispatch = level !== '' && framework !== '';

  const handleDispatch = async () => {
    if (!canDispatch || !candidateId) return;
    setIsDispatching(true);
    try {
      await pushToCandidate(candidateId, 'session_config', {
        framework,
        level,
      });
      setDispatched(true);
    } catch (err) {
      console.error('Failed to dispatch:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleToggleStatus = () => {
    if (candidate) {
      updateCandidate({
        id: candidate.id,
        payload: { is_active: !candidate.is_active },
      });
    }
  };

  if (isTargetLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Fetching candidate profile...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex items-center justify-center h-screen bg-background gap-4">
        <p>Candidate not found.</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="border-border text-foreground hover:bg-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {candidate.full_name || 'Unnamed Candidate'}
            </h1>
            <p className="text-muted-foreground">{candidate.email || 'No email provided'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleToggleStatus}
            disabled={isUpdating}
            variant={candidate.is_active ? 'destructive' : 'default'}
          >
            {candidate.is_active ? 'Deactivate Account' : 'Activate Account'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <User className="w-5 h-5" /> Profile Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Interview Stage</p>
                  <p className="font-medium text-foreground">
                    {candidate.interview_current_stage || 'Not Started'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent" />
                    Last Updated
                  </p>
                  <p className="font-medium text-foreground">
                    {candidate.updated_at
                      ? new Date(candidate.updated_at).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  <div className="flex gap-2">
                    <Badge variant={candidate.is_active ? 'default' : 'secondary'}>
                      {candidate.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {candidate.interview_completed && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Interview Completed
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Next Step</p>
                  <p className="font-medium text-accent">
                    {candidate.interview_next_stage || 'TBD'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Telemetry */}
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Terminal className="w-5 h-5" />
                System Diagnostics
              </CardTitle>
              <CardDescription>Real-time telemetry from candidate client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-border rounded-lg">
                <p className="text-muted-foreground italic text-sm text-center">
                  Waiting for candidate to connect to session... <br />
                  (Telemetry will appear once session is initialized)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Session Config */}
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Zap className="w-5 h-5" />
                Session Configuration
              </CardTitle>
              <CardDescription>
                Select framework and difficulty level, then dispatch to candidate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Target Framework
                  </p>
                  <Select
                    value={framework}
                    onValueChange={v => {
                      setFramework(v as Framework);
                      setDispatched(false);
                    }}
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
                    onValueChange={v => {
                      setLevel(v as CandidateLevel);
                      setDispatched(false);
                    }}
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

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleDispatch}
                  disabled={!canDispatch || isDispatching}
                  className="flex items-center gap-2"
                >
                  {isDispatching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isDispatching ? 'Dispatching...' : 'Dispatch to Candidate'}
                </Button>

                {!canDispatch && (
                  <p className="text-xs text-muted-foreground">
                    Select both framework and level to dispatch
                  </p>
                )}

                {dispatched && canDispatch && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    ✓ Dispatched — {framework} / {level}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-accent/30 bg-gradient-to-br from-card to-secondary/30 sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-accent">
                <Brain className="w-5 h-5" />
                <span>Session Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-secondary/50 border border-border/30 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Framework</span>
                  <span className="font-medium">{framework || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Level</span>
                  <span className="font-medium">{level || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">
                    {dispatched ? (
                      <span className="text-green-400">Dispatched</span>
                    ) : canDispatch ? (
                      <span className="text-accent">Ready</span>
                    ) : (
                      <span className="text-muted-foreground">Pending config</span>
                    )}
                  </span>
                </div>
              </div>

              {dispatched && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400">
                  ✓ Candidate has received the session configuration. They can now begin the assessment.
                </div>
              )}

              {!dispatched && canDispatch && (
                <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg text-xs text-accent">
                  Ready to dispatch. Click the button to send config to candidate.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}