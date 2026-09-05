// src/pages/Settings.tsx (or wherever this lives)
import { useState } from "react";
import { Settings2, Mail, Phone, Video, Github, Bot, CheckCircle2, Circle } from "lucide-react";
import { EmailCard } from "@/components/settings/email";
import { CallCard } from "@/components/settings/call";
import { LiveKitCard } from "@/components/settings/livekit";
import { GithubCard } from "@/components/settings/github";
// import { useTwilio } from "@/hooks/use-twilio";
import { useLiveKit } from "@/hooks/use-livekit";
import { useGithub } from "@/hooks/use-github";
import { AIProvidersCard } from "@/components/ai-providers";

type SectionKey = "email" | "twilio" | "livekit" | "github" | "ai";

const SECTIONS: { key: SectionKey; label: string; icon: React.ElementType }[] = [
  { key: "email", label: "Email", icon: Mail },
  { key: "twilio", label: "Voice (Twilio)", icon: Phone },
  { key: "livekit", label: "LiveKit", icon: Video },
  { key: "github", label: "GitHub", icon: Github },
  { key: "ai", label: "AI Provider", icon: Bot },
];

export function Settings() {
  const [activeSection, setActiveSection] = useState<SectionKey>("email");

  const [configuredSections, setConfiguredSections] = useState({
    email: false,
  });

  const [editMode, setEditMode] = useState({
    email: true,
    twilio: true,
    livekit: true,
    github: true,
  });

  // const { isTwilioConfigured } = useTwilio();
  const { isLiveKitConfigured } = useLiveKit();
  const { isGithubConfigured } = useGithub();

  const statusMap: Record<SectionKey, boolean> = {
    email: configuredSections.email,
    twilio: false,
    livekit: isLiveKitConfigured,
    github: isGithubConfigured,
    ai: false,
  };

  return (
    <div className="space-y-6 p-10 bg-background min-h-screen">
      <div className="mb-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide text-foreground flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
              <Settings2 className="h-8 w-8 text-primary" />
            </div>
            Settings
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Configure your application integrations and API credentials
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <nav className="md:w-56 shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {SECTIONS.map(({ key, label, icon: Icon }) => {
                const isActive = activeSection === key;
                const isConfigured = statusMap[key];
                return (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors text-left border-l-2 ${
                      isActive
                        ? "bg-primary/10 text-foreground border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                    <span className="flex-1">{label}</span>
                    {key !== "ai" &&
                      (isConfigured ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      ))}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex-1 min-w-0">
            {activeSection === "email" && (
              <EmailCard
                editMode={editMode}
                setEditMode={setEditMode}
                configuredSections={configuredSections}
              />
            )}
            {activeSection === "twilio" && (
              <CallCard editMode={editMode} setEditMode={setEditMode} />
            )}
            {activeSection === "livekit" && (
              <LiveKitCard editMode={editMode} setEditMode={setEditMode} />
            )}
            {activeSection === "github" && (
              <GithubCard editMode={editMode} setEditMode={setEditMode} />
            )}
            {activeSection === "ai" && <AIProvidersCard />}
          </div>
        </div>
      </div>
    </div>
  );
}