import { useState } from "react";
import { Settings2 } from "lucide-react";
import { EmailCard } from "@/components/settings/email";
import { CallCard } from "@/components/settings/call";

export function Settings() {
  const [configuredSections, setConfiguredSections] = useState({
    email: false,
    calendar: false,
  });

  const [editMode, setEditMode] = useState({
    email: true,
    calendar: true,
    twilio: true,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e14] via-[#0f1419] to-[#0a0e14] p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
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
        </div>

        <EmailCard
          editMode={editMode}
          setEditMode={setEditMode}
          configuredSections={configuredSections}
        />

        <CallCard editMode={editMode} setEditMode={setEditMode} />
      </div>
    </div>
  );
}
