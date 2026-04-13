import { useState } from "react";
import { Save, Settings2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { EmailCard } from "@/components/settings/email";

export function Settings() {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [configuredSections, setConfiguredSections] = useState({
    email: false,
    calendar: false,
  });

  const [editMode, setEditMode] = useState({
    email: true,
    calendar: true,
  });

  const handleSave = async () => {
    setSaveStatus("saving");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    setConfiguredSections({
      email: editMode.email,

      calendar: editMode.calendar,
    });

    setEditMode({
      email: false,

      calendar: false,
    });

    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e14] via-[#0f1419] to-[#0a0e14] p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
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
          <Button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className={`whitespace-nowrap ${
              saveStatus === "saved"
                ? "bg-emerald-500 hover:bg-emerald-600"
                : "bg-cyan-400 hover:bg-cyan-500"
            } text-[#1a1f2e] font-semibold transition-colors`}
          >
            {saveStatus === "saving" ? (
              <>
                <div className="animate-spin mr-2">⏳</div>
                Saving...
              </>
            ) : saveStatus === "saved" ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>

        {/* Email Configuration */}
        <EmailCard
          editMode={editMode}
          setEditMode={setEditMode}
          configuredSections={configuredSections}
        />
      </div>
    </div>
  );
}
