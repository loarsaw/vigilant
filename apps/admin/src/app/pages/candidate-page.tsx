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
import { ArrowLeft, Zap, Brain, Clock, Terminal, Play, Loader2, User } from 'lucide-react';
import {
  TestStatus,
  CandidateLevel,
  Framework,
} from '@/types/types';
import { useParams, useNavigate } from 'react-router-dom';
import { useCandidates } from '@/hooks/use-candidates';

type RouteParams = {
  candidateId: string;
};

export function CandidatePage() {
  const { candidateId } = useParams<RouteParams>();
  const navigate = useNavigate();
  const { useCandidate, updateCandidate, isUpdating } = useCandidates();

  // Fetch API Data
  const { data: candidate, isLoading: isTargetLoading } = useCandidate(candidateId);

  // Local UI States
  const [testStatus, setTestStatus] = useState<TestStatus>('pending');
  const [level, setLevel] = useState<CandidateLevel>('Junior');
  const [framework, setFramework] = useState<Framework>('React');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [dispatchedQuestions, setDispatchedQuestions] = useState<string[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Sync Level from API when data loads
  useEffect(() => {
    if (candidate) {
      // If your API provides level in the future, set it here
      generateAISuggestions(level, testStatus);
    }
  }, [candidate, level, testStatus]);

  const generateAISuggestions = (selectedLevel: CandidateLevel, selectedTest: TestStatus) => {
    const suggestions: Record<CandidateLevel, Record<string, string[]>> = {
      Junior: {
        DSA: ['Explain stack vs queue', 'Time complexity of binary search?'],
        React: ['What are hooks?', 'State vs Props?'],
        pending: ['Tell me about your projects.', 'Why this role?'],
      },
      Intern: {
        DSA: ['Reverse an array.', 'Explain O(n).'],
        React: ['Functional components?', 'Prop drilling?'],
        pending: ['What have you learned?', 'Show a project.'],
      },
      Senior: {
        DSA: ['Detect cycles in a graph.', 'Advanced DP concepts.'],
        React: ['Performance optimization?', 'State management patterns.'],
        pending: ['Architectural decisions.', 'Mentoring experience.'],
      },
    };

    const selected = suggestions[selectedLevel][selectedTest] || suggestions[selectedLevel]['pending'];
    setAiSuggestions(selected);
  };

  const handleLevelChange = (value: CandidateLevel) => {
    setLevel(value);
  };

  const handleDispatchQuestion = (question: string) => {
    setDispatchedQuestions([...dispatchedQuestions, question]);
    setAiSuggestions(aiSuggestions.filter(q => q !== question));
  };

  const handleToggleStatus = () => {
    if (candidate) {
      updateCandidate({
        id: candidate.id,
        payload: { is_active: !candidate.is_active }
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
      <div className="flex items-center justify-center h-screen bg-background">
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
              variant={candidate.is_active ? "destructive" : "default"}
            >
              {candidate.is_active ? "Deactivate Account" : "Activate Account"}
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
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
                    {candidate.updated_at ? new Date(candidate.updated_at).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  <div className="flex gap-2">
                    <Badge variant={candidate.is_active ? "default" : "secondary"}>
                      {candidate.is_active ? "Active" : "Inactive"}
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

          {/* Running Processes - Mocked as API doesn't provide these yet */}
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
                  Waiting for candidate to connect to session... <br/>
                  (Telemetry will appear once session is initialized)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Target Framework</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={framework} onValueChange={v => setFramework(v as Framework)}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="React">React</SelectItem>
                    <SelectItem value="Nextjs">Next.js</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Difficulty Level</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={level} onValueChange={handleLevelChange}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Intern">Intern</SelectItem>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-accent/30 bg-gradient-to-br from-card to-secondary/30 sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-accent">
                <Brain className="w-5 h-5" />
                <span>AI Interview Coach</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiSuggestions.map((suggestion, idx) => (
                <div key={idx} className="p-3 bg-secondary/50 border border-accent/20 rounded-lg text-sm space-y-2">
                  <p className="text-xs md:text-sm">{suggestion}</p>
                  <Button
                    onClick={() => handleDispatchQuestion(suggestion)}
                    size="sm"
                    className="w-full bg-accent text-accent-foreground"
                  >
                    <Zap className="w-3 h-3 mr-1" /> Dispatch
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {dispatchedQuestions.length > 0 && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-green-400">Sent to Candidate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dispatchedQuestions.map((q, idx) => (
                  <div key={idx} className="p-2 bg-green-500/10 border border-green-500/20 rounded text-xs">
                    {q}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}