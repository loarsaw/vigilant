import { Zap, Code2, Layers, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CandidateLevel, Framework } from "@/types/types";

export type SessionType = "dsa" | "framework" | "";
export type DSALanguage = "C" | "C++" | "Python" | "Java";

interface SessionConfigurationCardProps {
  sessionType: SessionType;
  dsaLanguage: DSALanguage | "";
  framework: Framework | "";
  level: CandidateLevel | "";
  dispatched: boolean;
  isDispatching: boolean;
  canDispatch: boolean;
  onSessionTypeChange: (type: SessionType) => void;
  onDsaLanguageChange: (language: DSALanguage) => void;
  onFrameworkChange: (framework: Framework) => void;
  onLevelChange: (level: CandidateLevel) => void;
  onDispatch: () => void;
}

export function SessionConfigurationCard({
  sessionType,
  dsaLanguage,
  framework,
  level,
  dispatched,
  isDispatching,
  canDispatch,
  onSessionTypeChange,
  onDsaLanguageChange,
  onFrameworkChange,
  onLevelChange,
  onDispatch,
}: SessionConfigurationCardProps) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg tracking-wide text-primary">
          <Zap className="w-5 h-5" />
          Session Configuration
        </CardTitle>
        <CardDescription>
          Choose a session type, configure options, then dispatch to candidate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
            Session Type
          </p>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onSessionTypeChange("dsa")}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                sessionType === "dsa"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-input/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
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
              onClick={() => onSessionTypeChange("framework")}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                sessionType === "framework"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-input/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
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

        {sessionType === "dsa" && (
          <div className="space-y-2">
            <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
              Programming Language
            </p>
            <Select
              value={dsaLanguage}
              onValueChange={(v) => onDsaLanguageChange(v as DSALanguage)}
            >
              <SelectTrigger className="bg-input border-border">
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

        {sessionType === "framework" && (
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
                Target Framework
              </p>
              <Select value={framework} onValueChange={(v) => onFrameworkChange(v as Framework)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Select framework..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="React">React</SelectItem>
                  <SelectItem value="Vue">Vue</SelectItem>
                  <SelectItem value="Vanilla">Vanilla</SelectItem>
                  <SelectItem value="Svelte">Svelte</SelectItem>

                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
                Difficulty Level
              </p>
              <Select value={level} onValueChange={(v) => onLevelChange(v as CandidateLevel)}>
                <SelectTrigger className="bg-input border-border">
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

        <div className="space-y-2">
          <Button
            onClick={onDispatch}
            disabled={!canDispatch || isDispatching}
            className="w-full font-display font-semibold tracking-wide flex items-center justify-center gap-2"
          >
            {isDispatching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isDispatching ? "Dispatching..." : "Dispatch to Candidate"}
          </Button>

          {!canDispatch && sessionType !== "" && (
            <p className="text-xs text-muted-foreground">
              {sessionType === "dsa"
                ? "Select a language to dispatch"
                : "Select both framework and level to dispatch"}
            </p>
          )}
          {!sessionType && (
            <p className="text-xs text-muted-foreground">Select a session type to begin</p>
          )}
          {dispatched && canDispatch && (
            <Badge className="font-display font-semibold tracking-wide bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4)/0.3)]">
              {sessionType === "dsa"
                ? `Dispatched — DSA / ${dsaLanguage}`
                : `Dispatched — ${framework} / ${level}`}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}