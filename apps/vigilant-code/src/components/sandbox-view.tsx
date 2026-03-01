import { useState } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  SandpackFileExplorer,
} from '@codesandbox/sandpack-react';
import { atomDark } from '@codesandbox/sandpack-themes';

import { FrameworkConfig, PanelId, SandpackTemplateType } from '@/types/types';
import { PANELS } from '../data/frameworks';
import { useTemplateLoader } from '@/hooks/use-template-loader';

interface SandboxViewProps {
  id: string;
  fw: FrameworkConfig;
  files: Record<string, string> | null;
  template: SandpackTemplateType | null;
  defaultPanel?: PanelId;
  onBack: () => void;
}

export function SandboxView({
  id,
  fw,
  files,
  template,
  defaultPanel = 'preview',
  onBack,
}: SandboxViewProps) {
  const [activePanel, setActivePanel] = useState<PanelId>(defaultPanel);

  const loaderFrameworkId = files ? '' : id;
  console.log(loaderFrameworkId , 'id')
  const { data: loaded, loading, error } = useTemplateLoader(loaderFrameworkId);

  const resolvedFiles = files ?? loaded?.files ?? {};
  const resolvedTemplate = template ?? loaded?.template ?? fw.template;

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: 'rgba(255,255,255,0.4)',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 32 }}>{fw.icon}</span>
        <span style={{ fontSize: 14 }}>Loading {fw.label} template...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#ef4444',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 14 }}>⚠ {error}</span>
        <button
          onClick={onBack}
          style={{
            marginTop: 8,
            padding: '8px 20px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0a0a',
      }}
    >
      <SandpackProvider
        key={id + JSON.stringify(Object.keys(resolvedFiles))}
        template={resolvedTemplate}
        files={resolvedFiles}
        theme={atomDark}
        options={{ recompileMode: 'delayed', recompileDelay: 500 }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '0 20px',
            height: 52,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: '#0d0d0d',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e =>
              (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')
            }
          >
            ← Browse
          </button>

          <div
            style={{
              width: 1,
              height: 18,
              background: 'rgba(255,255,255,0.1)',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{fw.icon}</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {fw.label}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
              {fw.tag} · v{fw.version}
            </span>
          </div>

          {id === 'github' && (
            <span
              style={{
                padding: '2px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              🐙 GitHub Import
            </span>
          )}

          <div style={{ flex: 1 }} />

          {/* Panel tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {PANELS.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePanel(p.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 7,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  background:
                    activePanel === p.id ? 'rgba(255,255,255,0.1)' : 'none',
                  color:
                    activePanel === p.id ? '#fff' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.15s',
                }}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sandpack Canvas — all panels mounted, CSS show/hide to preserve iframe */}
        <SandpackLayout style={{ flex: 1, border: 'none', borderRadius: 0 }}>
          <div
            style={{
              display: activePanel === 'preview' ? 'flex' : 'none',
              flex: 1,
              height: '100%',
            }}
          >
            <SandpackPreview
              style={{ flex: 1, height: '100vh' }}
              showNavigator
              showRefreshButton
            />
          </div>
          <div
            style={{
              display: activePanel === 'code' ? 'flex' : 'none',
              flex: 1,
              height: '100%',
            }}
          >
            <SandpackCodeEditor
              style={{ flex: 1, height: '100vh' }}
              showTabs
              showLineNumbers
              showInlineErrors
              wrapContent
            />
          </div>
          <div
            style={{
              display: activePanel === 'console' ? 'flex' : 'none',
              flex: 1,
              height: '100%',
            }}
          >
            <SandpackConsole style={{ flex: 1, height: '100%' }} />
          </div>
          <div
            style={{
              display: activePanel === 'files' ? 'flex' : 'none',
              flex: 1,
              height: '100%',
            }}
          >
            <SandpackFileExplorer
              style={{
                width: 200,
                borderRight: '1px solid rgba(255,255,255,0.06)',
              }}
            />
            <SandpackCodeEditor
              style={{ flex: 1, height: '100vh' }}
              showTabs
              showLineNumbers
              showInlineErrors
              wrapContent
            />
          </div>
        </SandpackLayout>

        {/* Status bar */}
        <div
          style={{
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            background: '#0d0d0d',
            flexShrink: 0,
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
            Template: {resolvedTemplate} · {Object.keys(resolvedFiles).length}{' '}
            file(s)
          </span>
          <span
            style={{
              color: '#22c55e',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#22c55e',
                display: 'inline-block',
              }}
            />
            Synchronized
          </span>
        </div>
      </SandpackProvider>
    </div>
  );
}
