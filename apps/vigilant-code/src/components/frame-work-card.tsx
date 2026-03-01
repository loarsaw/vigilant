import { useState } from 'react';
import { FrameworkConfig, PanelId } from '@/types/types';

interface FrameworkCardProps {
  id: string;
  fw: FrameworkConfig;
  onOpen: (id: string, panel: PanelId) => void;
}

export function FrameworkCard({ id, fw, onOpen }: FrameworkCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? 'linear-gradient(135deg, #111 0%, #161616 100%)'
          : '#0d0d0d',
        border: `1px solid ${hovered ? fw.border : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 16,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: hovered ? `0 0 40px ${fw.glow}` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow orb */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          background: fw.glow,
          borderRadius: '50%',
          filter: 'blur(40px)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28 }}>{fw.icon}</span>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{fw.label}</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
            {fw.tag} · v{fw.version}
          </div>
        </div>
      </div>

      {/* Description */}
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
        {fw.description}
      </p>

      {/* Feature Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {fw.features.map(f => (
          <span
            key={f}
            style={{
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {f}
          </span>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onOpen(id, 'preview')}
          style={{
            flex: 1,
            padding: '10px 0',
            borderRadius: 10,
            border: 'none',
            background: fw.color === '#ffffff' ? '#fff' : fw.color,
            color: fw.color === '#F7DF1E' || fw.color === '#ffffff' ? '#000' : '#000',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          ↗ Open Sandbox
        </button>
        <button
          onClick={() => onOpen(id, 'code')}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
          }}
        >
          {'</>'}
        </button>
      </div>
    </div>
  );
}
