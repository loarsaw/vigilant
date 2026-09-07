import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useJudge } from "@/hooks/use-judge";
import { useParams } from "react-router-dom";

const MONACO_LANG_MAP: Record<string, string> = {
  c: "c",
  cpp: "cpp",
  js: "javascript",
  java: "java",
  python: "python",
};

const VIGILANT_LOGO_URL =
  "https://raw.githubusercontent.com/loarsaw/vigilant/refs/heads/master/apps/vigilant/assets/icons/png/256x256.png";

export default function CodeEditor() {
  const { languages, isLoadingLanguages, execute, result, isExecuting, executeError, reset } =
    useJudge();
  const { language } = useParams<{ language: string }>();
  const [selectedLang, setSelectedLang] = useState(languages[0] ?? null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (languages.length === 0 || selectedLang) return;

    const matched = language ? languages.find((lang) => lang.name === language) : undefined;
    const initial = matched ?? languages[0];

    setSelectedLang(initial);
    setCode(atob(initial.example));
  }, [languages, language]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = languages.find((l) => l.id === e.target.value);
    if (lang) {
      setSelectedLang(lang);
      setCode(atob(lang.example));
      reset();
    }
  };

  const handleRun = () => {
    if (!selectedLang || !code.trim()) return;
    execute(selectedLang.id, code);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-card border-b border-border/60">
        <div className="flex items-center gap-3">
          <img src={VIGILANT_LOGO_URL} alt="Vigilant" className="h-8 w-8 rounded-md" />
          <h1 className="font-display text-2xl font-bold tracking-wide text-foreground">
            Vigilant Code
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {isLoadingLanguages ? (
            <div className="px-4 py-2 text-sm text-muted-foreground">Loading languages...</div>
          ) : (
            <select
              value={selectedLang?.id ?? ""}
              onChange={handleLanguageChange}
              className="px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRun}
            disabled={isExecuting || !selectedLang}
            className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground rounded-lg font-display font-semibold tracking-wide transition-colors flex items-center gap-2 shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.55)] disabled:shadow-none"
          >
            {isExecuting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                Run Code
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col border-r border-border/60">
          <div className="px-4 py-2 bg-card border-b border-border/60">
            <h2 className="text-sm font-display font-semibold tracking-wide text-muted-foreground">
              Code Editor
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={MONACO_LANG_MAP[selectedLang?.id ?? ""] ?? "plaintext"}
              value={code}
              onChange={(value) => setCode(value ?? "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Output */}
        <div className="w-96 flex flex-col bg-card">
          <div className="px-4 py-2 bg-muted border-b border-border/60 flex items-center justify-between">
            <h2 className="text-sm font-display font-semibold tracking-wide text-muted-foreground">
              Output
            </h2>
            {result && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{result.time_ms}ms</span>
                <span>{(result.memory_kb / 1024).toFixed(1)}MB</span>
                <span
                  className={
                    result.status === "accepted"
                      ? "text-[hsl(var(--chart-4))]"
                      : result.status === "timeout"
                        ? "text-[hsl(var(--chart-3))]"
                        : "text-[hsl(var(--destructive))]"
                  }
                >
                  {result.status}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 p-4 overflow-auto">
            {isExecuting && (
              <p className="text-muted-foreground text-sm animate-pulse">Executing...</p>
            )}

            {!isExecuting && executeError && (
              <pre className="text-[hsl(var(--destructive))] font-mono text-sm whitespace-pre-wrap">
                {executeError}
              </pre>
            )}

            {!isExecuting && result && (
              <>
                {result.stdout && (
                  <pre className="text-[hsl(var(--chart-4))] font-mono text-sm whitespace-pre-wrap">
                    {result.stdout}
                  </pre>
                )}
                {result.stderr && (
                  <pre className="text-[hsl(var(--destructive))] font-mono text-sm whitespace-pre-wrap mt-2">
                    {result.stderr}
                  </pre>
                )}
                {!result.stdout && !result.stderr && (
                  <p className="text-muted-foreground/70 text-sm">(no output)</p>
                )}
              </>
            )}

            {!isExecuting && !result && !executeError && (
              <p className="text-muted-foreground/70 text-sm">Output will appear here...</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      {result && (
        <div className="px-6 py-2 bg-card border-t border-border/60 text-xs text-muted-foreground flex gap-6">
          <span>
            Submission ID: <span className="text-foreground/80">{result.id}</span>
          </span>
          <span>
            Time: <span className="text-foreground/80">{result.time_ms}ms</span>
          </span>
          <span>
            Memory:{" "}
            <span className="text-foreground/80">{(result.memory_kb / 1024).toFixed(1)} MB</span>
          </span>
          <span>
            Status:{" "}
            <span
              className={
                result.status === "accepted"
                  ? "text-[hsl(var(--chart-4))]"
                  : "text-[hsl(var(--destructive))]"
              }
            >
              {result.status}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}