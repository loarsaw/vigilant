import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Link2, ArrowRight } from "lucide-react";

export default function DeepLinkTester() {
  const navigate = useNavigate();
  const [deepLinkUrl, setDeepLinkUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // Validate the URL format
      if (!deepLinkUrl.trim()) {
        setError("Please enter a deep link URL");
        return;
      }

      if (!deepLinkUrl.startsWith("vigilant-code://")) {
        setError("URL must start with vigilant-code://");
        return;
      }

      // Parse the URL
      const urlObj = new URL(deepLinkUrl);
      const params = Object.fromEntries(urlObj.searchParams);

      // Validate required params
      if (!params.domain_name || !params.username || !params.password) {
        setError("Missing required parameters: domain_name, username, or password");
        return;
      }

      // Build query string for navigation
      const queryParams = new URLSearchParams(params);
      const route = `/linkstart?${queryParams.toString()}`;

      console.log("Navigating to:", route);
      navigate(route);
    } catch (err) {
      console.error("Error parsing deep link:", err);
      setError("Invalid URL format. Please check your deep link.");
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setDeepLinkUrl(text);
      setError("");
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  const fillExample = () => {
    setDeepLinkUrl(
      "vigilant-code://login?domain_name=localhost:3333&username=amanahmed@gmail.com&password=amanahmed"
    );
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" />
      <div
        className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-72 h-72 bg-blue-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative z-10 w-full max-w-2xl px-4">
        <div className="w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8">
          <div className="flex flex-col items-center gap-6">
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Link2 className="w-8 h-8 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Deep Link Tester</h1>
              <p className="text-slate-400">
                Test your deep link authentication by pasting the URL below
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <div>
                <label htmlFor="deeplink" className="block text-sm font-medium text-slate-300 mb-2">
                  Deep Link URL
                </label>
                <div className="relative">
                  <input
                    id="deeplink"
                    type="text"
                    value={deepLinkUrl}
                    onChange={(e) => {
                      setDeepLinkUrl(e.target.value);
                      setError("");
                    }}
                    placeholder="vigilant-code://login?domain_name=...&username=...&password=..."
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-24"
                  />
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors duration-200"
                  >
                    Paste
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Example Button */}
              <button
                type="button"
                onClick={fillExample}
                className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 text-left"
              >
                Click here to fill with example URL
              </button>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                Test Deep Link
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Info Box */}
            <div className="w-full p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Expected Format:</h3>
              <code className="text-xs text-slate-400 break-all">
                vigilant-code://login?domain_name=WORKSPACE&username=EMAIL&password=PASSWORD
              </code>
            </div>

            {/* Back to Login */}
            <button
              onClick={() => navigate("/")}
              className="text-slate-400 hover:text-slate-300 text-sm transition-colors duration-200"
            >
              ← Back to normal login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}