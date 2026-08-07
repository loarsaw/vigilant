import { useState } from "react";
import { Settings2, Mail, Phone, Video, Calendar, CheckCircle2, Circle } from "lucide-react";
import { EmailCard } from "@/components/settings/email";
import { CallCard } from "@/components/settings/call";
import { LiveKitCard } from "@/components/settings/livekit";
import { useTwilio } from "@/hooks/use-twilio";
import { useLiveKit } from "@/hooks/use-livekit";

type SectionKey = "email" | "calendar" | "twilio" | "livekit";

const SECTIONS: { key: SectionKey; label: string; icon: React.ElementType }[] = [
  { key: "email", label: "Email", icon: Mail },
  { key: "twilio", label: "Voice (Twilio)", icon: Phone },
  { key: "livekit", label: "LiveKit", icon: Video },
];

export function Settings() {
  const [activeSection, setActiveSection] = useState<SectionKey>("email");

  const [configuredSections, setConfiguredSections] = useState({
    email: false,
    calendar: false,
  });

  const [editMode, setEditMode] = useState({
    email: true,
    calendar: true,
    twilio: true,
    livekit: true,
  });

  const { isTwilioConfigured } = useTwilio();
  const { isLiveKitConfigured } = useLiveKit();

  const statusMap: Record<SectionKey, boolean> = {
    email: configuredSections.email,
    calendar: configuredSections.calendar,
    twilio: isTwilioConfigured,
    livekit: isLiveKitConfigured,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e14] via-[#0f1419] to-[#0a0e14] p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-cyan-400/10 rounded-lg">
              <Settings2 className="h-8 w-8 text-cyan-400" />
            </div>
            Settings
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Configure your application integrations and API credentials
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Nav rail */}
          <nav className="md:w-56 shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {SECTIONS.map(({ key, label, icon: Icon }) => {
                const isActive = activeSection === key;
                const isConfigured = statusMap[key];
                return (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors text-left ${
                      isActive
                        ? "bg-cyan-400/10 text-cyan-400"
                        : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {isConfigured ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-gray-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Active panel */}
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
            {activeSection === "calendar" && (
              <div className="text-gray-500 text-sm p-6 border border-dashed border-gray-700 rounded-xl">
                Calendar integration coming soon.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
