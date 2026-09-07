import { useState, useCallback, useEffect } from "react";
import { SandboxView } from "@/components/sandbox-view";
import { FRAMEWORKS } from "@/data/frameworks";
import { ActiveFramework, AppView, PanelId } from "@/types/types";
import { useNavigate, useParams } from "react-router-dom";

export default function App() {
  const [view, setView] = useState<AppView>("sandbox");
  const [activeFramework, setActiveFramework] = useState<ActiveFramework | null>(null);
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      setActiveFramework({
        id,
        defaultPanel: "preview",
        files: null,
        template: null,
      });
    }
  }, [id]);


  if (view === "sandbox" && activeFramework) {
    const fw = activeFramework.fw ?? FRAMEWORKS[activeFramework.id];

    return (
      <SandboxView
        id={activeFramework.id}
        fw={fw}
        files={activeFramework.files}
        template={activeFramework.template}
        defaultPanel={activeFramework.defaultPanel}
      />
    );
  }
}
