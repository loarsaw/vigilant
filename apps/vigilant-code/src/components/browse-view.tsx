import { FRAMEWORKS } from '@/data/frameworks';
import { FrameworkCard } from './frame-work-card';
import { PanelId } from '@/types/types';

interface BrowseViewProps {
  onOpen: (id: string, panel: PanelId) => void;
  onGitHub: () => void;
}

export function BrowseView({ onOpen, onGitHub }: BrowseViewProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#fff' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: '#0d0d0d',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg,#fff 0%,#aaa 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              color: '#000',
              fontSize: 14,
            }}
          >
            S
          </div>
          <span style={{ fontWeight: 700, letterSpacing: 2, fontSize: 13 }}>
            SANDPACK EXPLORER
          </span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
            Environment v2.4.0
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            {Object.keys(FRAMEWORKS).length} environments ready
          </span>
          <button
            onClick={onGitHub}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e =>
              (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')
            }
            onMouseLeave={e =>
              (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
            }
          >
            🐙 Import from GitHub
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '64px 32px 48px' }}>
        <div
          style={{
            color: 'rgba(255,255,255,0.2)',
            fontSize: 12,
            letterSpacing: 4,
            marginBottom: 16,
          }}
        >
          LIVE CODE ENVIRONMENTS
        </div>
        <h1
          style={{
            fontSize: 42,
            fontWeight: 800,
            margin: '0 0 16px',
            letterSpacing: -1,
          }}
        >
          Pick your framework.
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 16,
            maxWidth: 500,
            margin: '0 auto',
          }}
        >
          Start building instantly. Each environment spins up a fully
          interactive sandbox — edit code, see changes live.
        </p>
      </div>

      {/* Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
          padding: '0 32px 64px',
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        {Object.entries(FRAMEWORKS).map(([id, fw]) => (
          <FrameworkCard key={id} id={id} fw={fw} onOpen={onOpen} />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '20px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          color: 'rgba(255,255,255,0.2)',
          fontSize: 12,
        }}
      >
        <span>Powered by Sandpack + CodeSandbox</span>
        <span>Env: Production · Region: us-east-1</span>
      </div>
    </div>
  );
}
