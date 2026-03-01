import { useState, useCallback } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  SandpackFileExplorer,
} from '@codesandbox/sandpack-react';
import { atomDark } from '@codesandbox/sandpack-themes';

// ── Framework Definitions ──────────────────────────────────────────────────────
const FRAMEWORKS = {
  react: {
    label: 'React',
    icon: '⚛️',
    color: '#61DAFB',
    glow: 'rgba(97,218,251,0.15)',
    border: 'rgba(97,218,251,0.25)',
    tag: 'UI Library',
    version: '18.x',
    description:
      'Build encapsulated components that manage their own state, then compose them to make complex UIs.',
    features: ['Hooks & State', 'JSX Syntax', 'Component Model', 'Virtual DOM'],
    template: 'react',
    files: {
      '/App.js': `import { useState } from "react";
export default function App() {
  const [count, setCount] = useState(0);
  const [todos, setTodos] = useState(["Buy groceries", "Learn React"]);
  const [input, setInput] = useState("");
  const addTodo = () => {
    if (input.trim()) { setTodos([...todos, input.trim()]); setInput(""); }
  };
  return (
    <div style={{ fontFamily:"sans-serif", maxWidth:480, margin:"40px auto", padding:24 }}>
      <h2>⚛️ React Sandbox</h2>
      <div style={{ marginBottom:24 }}>
        <h3>Counter</h3>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <button onClick={() => setCount(c => c - 1)} style={btn("#61DAFB","#000")}>−</button>
          <span style={{ fontSize:24, fontWeight:700 }}>{count}</span>
          <button onClick={() => setCount(c => c + 1)} style={btn("#61DAFB","#000")}>+</button>
        </div>
      </div>
      <h3>Todo List</h3>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==="Enter"&&addTodo()} placeholder="Add a task..."
          style={inp} />
        <button onClick={addTodo} style={btn("#61DAFB","#000")}>Add</button>
      </div>
      <ul style={{ listStyle:"none", padding:0 }}>
        {todos.map((t,i) => (
          <li key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background:"#f5f5f5", borderRadius:8, marginBottom:6 }}>
            {t}
            <button onClick={() => setTodos(todos.filter((_,j)=>j!==i))}
              style={{ background:"none",border:"none",cursor:"pointer",color:"#ef4444" }}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
const btn=(bg,color)=>({ background:bg,color,border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:15 });
const inp={ flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid #ccc",fontSize:14 };`,
    },
  },
  vue: {
    label: 'Vue',
    icon: '💚',
    color: '#42B883',
    glow: 'rgba(66,184,131,0.15)',
    border: 'rgba(66,184,131,0.25)',
    tag: 'Framework',
    version: '3.x',
    description:
      'An approachable, performant and versatile framework for building web user interfaces.',
    features: [
      'Composition API',
      'Reactive Data',
      'Single File Components',
      'Directives',
    ],
    template: 'vue',
    files: {
      '/src/App.vue': `<template>
  <div style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:24px">
    <h2>💚 Vue Sandbox</h2>
    <div style="margin-bottom:24px">
      <h3>Counter</h3>
      <div style="display:flex;gap:12px;align-items:center">
        <button @click="count--" style="background:#42B883;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:700;font-size:15px">−</button>
        <span style="font-size:24px;font-weight:700">{{ count }}</span>
        <button @click="count++" style="background:#42B883;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:700;font-size:15px">+</button>
      </div>
    </div>
    <h3>Todo List</h3>
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <input v-model="input" @keydown.enter="add" placeholder="Add a task..."
        style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid #ccc;font-size:14px"/>
      <button @click="add" style="background:#42B883;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:700">Add</button>
    </div>
    <ul style="list-style:none;padding:0">
      <li v-for="(t,i) in todos" :key="i"
        style="display:flex;justify-content:space-between;padding:8px 12px;background:#f5f5f5;border-radius:8px;margin-bottom:6px">
        {{ t }}
        <button @click="todos.splice(i,1)" style="background:none;border:none;cursor:pointer;color:#ef4444">✕</button>
      </li>
    </ul>
  </div>
</template>
<script setup>
import { ref } from "vue";
const count = ref(0);
const todos = ref(["Buy groceries","Learn Vue"]);
const input = ref("");
const add = () => { if(input.value.trim()){ todos.value.push(input.value.trim()); input.value=""; } };
</script>`,
    },
  },
  vanilla: {
    label: 'Vanilla JS',
    icon: '🟨',
    color: '#F7DF1E',
    glow: 'rgba(247,223,30,0.12)',
    border: 'rgba(247,223,30,0.25)',
    tag: 'No Framework',
    version: 'ES2024',
    description:
      'Raw JavaScript power — no dependencies, no build step overhead. Just the web platform.',
    features: [
      'Zero Dependencies',
      'Native DOM API',
      'ES Modules',
      'Fastest Load',
    ],
    template: 'vanilla',
    files: {
      '/index.html': `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:sans-serif;max-width:480px;margin:40px auto;padding:24px}
  button{background:#F7DF1E;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:700;font-size:15px}
  input{flex:1;padding:8px 12px;border-radius:8px;border:1px solid #ccc;font-size:14px}
  li{display:flex;justify-content:space-between;padding:8px 12px;background:#f5f5f5;border-radius:8px;margin-bottom:6px;list-style:none}
  .rm{background:none;border:none;cursor:pointer;color:#ef4444;font-size:16px}
  #controls{display:flex;gap:12px;align-items:center}
  #count{font-size:24px;font-weight:700}
  #todo-row{display:flex;gap:8px;margin-bottom:12px}
  ul{padding:0}
</style></head>
<body>
  <h2>🟨 Vanilla JS Sandbox</h2>
  <h3>Counter</h3>
  <div id="controls">
    <button id="dec">−</button>
    <span id="count">0</span>
    <button id="inc">+</button>
  </div>
  <h3>Todo List</h3>
  <div id="todo-row">
    <input id="inp" placeholder="Add a task..."/>
    <button id="add">Add</button>
  </div>
  <ul id="list">
    <li>Buy groceries<button class="rm">✕</button></li>
  </ul>
  <script src="index.js"></script>
</body></html>`,
      '/index.js': `let n=0;const d=document.getElementById("count");
document.getElementById("inc").onclick=()=>{n++;d.textContent=n};
document.getElementById("dec").onclick=()=>{n--;d.textContent=n};
function addItem(t){
  const li=document.createElement("li");
  const b=document.createElement("button");
  b.className="rm";b.textContent="✕";b.onclick=()=>li.remove();
  li.textContent=t;li.appendChild(b);
  document.getElementById("list").appendChild(li);
}
document.getElementById("add").onclick=()=>{
  const i=document.getElementById("inp");
  if(i.value.trim()){addItem(i.value.trim());i.value="";}
};
document.getElementById("inp").addEventListener("keydown",e=>{
  if(e.key==="Enter")document.getElementById("add").click()
});
document.querySelectorAll(".rm").forEach(b=>b.onclick=()=>b.parentElement.remove());`,
    },
  },
  svelte: {
    label: 'Svelte',
    icon: '🔥',
    color: '#FF3E00',
    glow: 'rgba(255,62,0,0.15)',
    border: 'rgba(255,62,0,0.25)',
    tag: 'Compiler',
    version: '4.x',
    description:
      'Svelte shifts the work to compile time, producing vanilla JS with no runtime overhead.',
    features: [
      'No Virtual DOM',
      'Compiled Output',
      'Reactive Declarations',
      'Tiny Bundle',
    ],
    template: 'svelte',
    files: {
      '/App.svelte': `<script>
  let count = 0;
  let todos = ["Buy groceries","Learn Svelte"];
  let input = "";
  const add = () => { if(input.trim()){ todos=[...todos,input.trim()]; input=""; } };
  const rm = i => todos = todos.filter((_,j)=>j!==i);
</script>
<div style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:24px">
  <h2>🔥 Svelte Sandbox</h2>
  <h3>Counter</h3>
  <div style="display:flex;gap:12px;align-items:center;margin-bottom:24px">
    <button on:click={()=>count--} style="background:#FF3E00;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:700;font-size:15px">−</button>
    <span style="font-size:24px;font-weight:700">{count}</span>
    <button on:click={()=>count++} style="background:#FF3E00;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:700;font-size:15px">+</button>
  </div>
  <h3>Todo List</h3>
  <div style="display:flex;gap:8px;margin-bottom:12px">
    <input bind:value={input} on:keydown={e=>e.key==="Enter"&&add()} placeholder="Add a task..."
      style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid #ccc;font-size:14px"/>
    <button on:click={add} style="background:#FF3E00;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-weight:700">Add</button>
  </div>
  <ul style="list-style:none;padding:0">
    {#each todos as todo,i}
      <li style="display:flex;justify-content:space-between;padding:8px 12px;background:#f5f5f5;border-radius:8px;margin-bottom:6px">
        {todo}
        <button on:click={()=>rm(i)} style="background:none;border:none;cursor:pointer;color:#ef4444">✕</button>
      </li>
    {/each}
  </ul>
</div>`,
    },
  },
  nextjs: {
    label: 'Next.js',
    icon: '▲',
    color: '#ffffff',
    glow: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.15)',
    tag: 'Meta-Framework',
    version: '14.x',
    description:
      'The React framework for production — file-based routing, SSR, SSG, and API routes built in.',
    features: [
      'File-based Routing',
      'Server Components',
      'API Routes',
      'Edge Runtime',
    ],
    template: 'nextjs',
    files: {
      '/pages/index.js': `import { useState } from "react";
export default function Home() {
  const [count,setCount]=useState(0);
  const [todos,setTodos]=useState(["Buy groceries","Learn Next.js"]);
  const [input,setInput]=useState("");
  const add=()=>{ if(input.trim()){ setTodos([...todos,input.trim()]); setInput(""); } };
  return (
    <div style={{ fontFamily:"sans-serif",maxWidth:480,margin:"40px auto",padding:24 }}>
      <h2>▲ Next.js Sandbox</h2>
      <h3>Counter</h3>
      <div style={{ display:"flex",gap:12,alignItems:"center",marginBottom:24 }}>
        <button onClick={()=>setCount(c=>c-1)} style={b}>−</button>
        <span style={{ fontSize:24,fontWeight:700 }}>{count}</span>
        <button onClick={()=>setCount(c=>c+1)} style={b}>+</button>
      </div>
      <h3>Todo List</h3>
      <div style={{ display:"flex",gap:8,marginBottom:12 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Add a task..."
          style={{ flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid #ccc",fontSize:14 }}/>
        <button onClick={add} style={b}>Add</button>
      </div>
      <ul style={{ listStyle:"none",padding:0 }}>
        {todos.map((t,i)=>(
          <li key={i} style={{ display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"#f5f5f5",borderRadius:8,marginBottom:6 }}>
            {t}
            <button onClick={()=>setTodos(todos.filter((_,j)=>j!==i))}
              style={{ background:"none",border:"none",cursor:"pointer",color:"#ef4444" }}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
const b={ background:"#000",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontWeight:700,fontSize:15 };`,
    },
  },
};

const PANELS = [
  { id: 'preview', label: 'Preview', icon: '🖥' },
  { id: 'code', label: 'Code', icon: '📝' },
  { id: 'console', label: 'Console', icon: '🖨' },
  { id: 'files', label: 'Files', icon: '📁' },
];

// ── GitHub Fetcher ─────────────────────────────────────────────────────────────
async function fetchGithubFiles(repoUrl, token = '') {
  // Parse URL like https://github.com/user/repo or https://github.com/user/repo/tree/branch/path
  const match = repoUrl.match(
    /github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)(?:\/(.+))?)?/
  );
  if (!match) throw new Error('Invalid GitHub URL');
  const [, owner, repo, branch = 'main', subPath = ''] = match;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  async function fetchDir(path) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || `GitHub API error: ${res.status}`);
    }
    return res.json();
  }

  async function collectFiles(dirPath, result = {}) {
    const items = await fetchDir(dirPath);
    await Promise.all(
      items.map(async item => {
        const relPath =
          '/' + (subPath ? item.path.replace(subPath + '/', '') : item.path);
        if (item.type === 'file' && item.size < 500_000) {
          const content = await fetch(item.download_url, { headers }).then(r =>
            r.text()
          );
          result[relPath] = content;
        } else if (item.type === 'dir') {
          await collectFiles(item.path, result);
        }
      })
    );
    return result;
  }

  return collectFiles(subPath);
}

// Detect template from file extensions
function detectTemplate(files) {
  const paths = Object.keys(files).join(' ');
  if (paths.includes('.vue')) return 'vue';
  if (paths.includes('.svelte')) return 'svelte';
  if (paths.includes('pages/') || paths.includes('next.config'))
    return 'nextjs';
  if (
    paths.includes('.jsx') ||
    paths.includes('.tsx') ||
    paths.includes('App.js')
  )
    return 'react';
  return 'vanilla';
}

// ── GitHub Import Modal ────────────────────────────────────────────────────────
function GitHubModal({ onImport, onClose }) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const files = await fetchGithubFiles(url.trim(), token.trim());
      if (Object.keys(files).length === 0)
        throw new Error('No files found in that repo/path.');
      const template = detectTemplate(files);
      onImport({ files, template, url });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: 32,
          width: 520,
          maxWidth: '90vw',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}>
            🐙 Import from GitHub
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <label
          style={{
            display: 'block',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            marginBottom: 6,
          }}
        >
          REPOSITORY URL
        </label>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleImport()}
          placeholder="https://github.com/user/repo or .../tree/branch/path"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: 14,
            marginBottom: 16,
            outline: 'none',
          }}
        />

        <label
          style={{
            display: 'block',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            marginBottom: 6,
          }}
        >
          GITHUB TOKEN{' '}
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>
            (optional — for private repos / higher rate limits)
          </span>
        </label>
        <input
          value={token}
          onChange={e => setToken(e.target.value)}
          type="password"
          placeholder="ghp_xxxxxxxxxxxx"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: 14,
            marginBottom: 20,
            outline: 'none',
          }}
        />

        {error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#ef4444',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            ⚠ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !url.trim()}
            style={{
              flex: 2,
              padding: '10px 0',
              borderRadius: 10,
              border: 'none',
              background: loading ? 'rgba(255,255,255,0.1)' : '#fff',
              color: '#000',
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Fetching files...' : '🐙 Import Repo'}
          </button>
        </div>

        <p
          style={{
            color: 'rgba(255,255,255,0.2)',
            fontSize: 11,
            marginTop: 16,
            marginBottom: 0,
          }}
        >
          Supports public repos freely. Private repos need a token with{' '}
          <code style={{ color: 'rgba(255,255,255,0.35)' }}>repo</code> scope.
          Rate limit: 60 req/hr unauthenticated.
        </p>
      </div>
    </div>
  );
}

// ── Card Component ─────────────────────────────────────────────────────────────
function FrameworkCard({ id, fw, onOpen }) {
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
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
            {fw.label}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
            {fw.tag} · v{fw.version}
          </div>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 13,
          lineHeight: 1.6,
          margin: 0,
        }}
      >
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
            color:
              fw.color === '#F7DF1E' || fw.color === '#ffffff'
                ? '#000'
                : '#000',
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

// ── Sandbox View ───────────────────────────────────────────────────────────────
function SandboxView({ id, fw, files, template, onBack }) {
  const [activePanel, setActivePanel] = useState('preview');
  const resolvedFiles = files || fw.files;
  const resolvedTemplate = template || fw.template;

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
          {/* Back */}
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

          {/* Badge */}
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

// ── Browse View ────────────────────────────────────────────────────────────────
function BrowseView({ onOpen, onGitHub }) {
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

// ── Root ───────────────────────────────────────────────────────────────────────
export default function FrameworkExplorer() {
  const [view, setView] = useState('browse'); // "browse" | "sandbox"
  const [activeFramework, setActiveFramework] = useState(null);
  const [showGitHub, setShowGitHub] = useState(false);

  const handleOpen = useCallback((id, panel = 'preview') => {
    setActiveFramework({
      id,
      defaultPanel: panel,
      files: null,
      template: null,
    });
    setView('sandbox');
  }, []);

  const handleBack = useCallback(() => {
    setView('browse');
    setActiveFramework(null);
  }, []);

  const handleGitHubImport = useCallback(({ files, template, url }) => {
    setShowGitHub(false);
    setActiveFramework({
      id: 'github',
      defaultPanel: 'preview',
      files,
      template,
      fw: {
        label: url.replace('https://github.com/', ''),
        icon: '🐙',
        color: '#fff',
        glow: 'rgba(255,255,255,0.08)',
        border: 'rgba(255,255,255,0.15)',
        tag: 'GitHub',
        version: template,
        description: url,
        features: Object.keys(files)
          .slice(0, 4)
          .map(f => f.replace('/', '')),
        template,
      },
    });
    setView('sandbox');
  }, []);

  if (view === 'sandbox' && activeFramework) {
    const fw = activeFramework.fw || FRAMEWORKS[activeFramework.id];
    return (
      <SandboxView
        id={activeFramework.id}
        fw={fw}
        files={activeFramework.files}
        template={activeFramework.template}
        onBack={handleBack}
      />
    );
  }

  return (
    <>
      <BrowseView onOpen={handleOpen} onGitHub={() => setShowGitHub(true)} />
      {showGitHub && (
        <GitHubModal
          onImport={handleGitHubImport}
          onClose={() => setShowGitHub(false)}
        />
      )}
    </>
  );
}
