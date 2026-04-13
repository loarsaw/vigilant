import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useJudge } from '@/hooks/use-judge';
import { useParams } from 'react-router-dom';

const MONACO_LANG_MAP: Record<string, string> = {
  c: 'c',
  cpp: 'cpp',
  js: 'javascript',
  java: 'java',
  python: 'python',
};

export default function CodeEditor() {
  const {
    languages,
    isLoadingLanguages,
    execute,
    result,
    isExecuting,
    executeError,
    reset,
  } = useJudge();
  const { language } = useParams<{ language: string }>();
  const [selectedLang, setSelectedLang] = useState(languages[0] ?? null);
  const [code, setCode] = useState('');

  useEffect(() => {
    if (languages.length > 0 && !selectedLang) {
      setSelectedLang(languages[0]);
      setCode(atob(languages[0].example));
    }
    if (language && languages.length > 0 && !selectedLang) {
      setSelectedLang(languages.find(lang => lang.name == language));
      setCode(atob(languages.find(lang => lang.name == language).example));
    }
  }, [languages, language]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = languages.find(l => l.id === e.target.value);
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
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <h1 className="text-2xl font-bold">Code Editor</h1>
        <div className="flex items-center gap-4">
          {isLoadingLanguages ? (
            <div className="px-4 py-2 text-sm text-gray-400">
              Loading languages...
            </div>
          ) : (
            <select
              value={selectedLang?.id ?? ''}
              onChange={handleLanguageChange}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {languages.map(lang => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleRun}
            disabled={isExecuting || !selectedLang}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isExecuting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Running...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
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
        <div className="flex-1 flex flex-col border-r border-gray-700">
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-gray-300">Code Editor</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={MONACO_LANG_MAP[selectedLang?.id ?? ''] ?? 'plaintext'}
              value={code}
              onChange={value => setCode(value ?? '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Output */}
        <div className="w-96 flex flex-col bg-gray-800">
          <div className="px-4 py-2 bg-gray-700 border-b border-gray-600 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Output</h2>
            {result && (
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{result.time_ms}ms</span>
                <span>{(result.memory_kb / 1024).toFixed(1)}MB</span>
                <span
                  className={
                    result.status === 'accepted'
                      ? 'text-green-400'
                      : result.status === 'timeout'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }
                >
                  {result.status}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 p-4 overflow-auto">
            {isExecuting && (
              <p className="text-gray-400 text-sm animate-pulse">
                Executing...
              </p>
            )}

            {!isExecuting && executeError && (
              <pre className="text-red-400 font-mono text-sm whitespace-pre-wrap">
                {executeError}
              </pre>
            )}

            {!isExecuting && result && (
              <>
                {result.stdout && (
                  <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                    {result.stdout}
                  </pre>
                )}
                {result.stderr && (
                  <pre className="text-red-400 font-mono text-sm whitespace-pre-wrap mt-2">
                    {result.stderr}
                  </pre>
                )}
                {!result.stdout && !result.stderr && (
                  <p className="text-gray-500 text-sm">(no output)</p>
                )}
              </>
            )}

            {!isExecuting && !result && !executeError && (
              <p className="text-gray-500 text-sm">
                Output will appear here...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      {result && (
        <div className="px-6 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400 flex gap-6">
          <span>
            Submission ID: <span className="text-gray-300">{result.id}</span>
          </span>
          <span>
            Time: <span className="text-gray-300">{result.time_ms}ms</span>
          </span>
          <span>
            Memory:{' '}
            <span className="text-gray-300">
              {(result.memory_kb / 1024).toFixed(1)} MB
            </span>
          </span>
          <span>
            Status:{' '}
            <span
              className={
                result.status === 'accepted' ? 'text-green-400' : 'text-red-400'
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
