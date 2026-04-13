import { Loader2, Upload, XCircle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImportCandidatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => void;
  isImporting: boolean;
  isSuccess: boolean;
  result: any;
  error: string | null;
  onReset: () => void;
}

export function ImportCandidatesDialog({
  open,
  onOpenChange,
  onImport,
  isImporting,
  isSuccess,
  result,
  error,
  onReset,
}: ImportCandidatesDialogProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
  };

  const handleClose = () => {
    onReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1f2e] border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Import Candidates</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {error && (
            <div className="p-3 bg-red-400/10 border border-red-400/20 rounded text-red-400 text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {isSuccess && result ? (
            <div className="space-y-3">
              <div className="p-3 bg-green-400/10 border border-green-400/20 rounded text-green-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                Import complete
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <StatBox value={result.inserted} label="Inserted" />
                <StatBox value={result.skipped} label="Skipped" />
                <StatBox
                  value={result.failed_count}
                  label="Failed"
                  isError={result.failed_count > 0}
                />
              </div>

              {result.failed_emails?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-medium">Failed emails:</p>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {result.failed_emails.map((f: any) => (
                      <div
                        key={f.email}
                        className="flex items-start justify-between gap-2 text-xs bg-[#0f1419] rounded px-3 py-2"
                      >
                        <span className="text-white">{f.email}</span>
                        <span className="text-red-400">{f.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full border-gray-700 text-white"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-sm">
                Upload a CSV with columns: <span className="text-cyan-400">full_name, email</span>
              </p>

              <label className="block">
                <div
                  className={`w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isImporting
                      ? "border-cyan-400/50 bg-cyan-400/5"
                      : "border-gray-700 hover:border-cyan-400/50 hover:bg-cyan-400/5"
                  }`}
                >
                  {isImporting ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                      <p className="text-sm text-gray-400">Importing...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-gray-500" />
                      <p className="text-sm text-gray-400">Click to upload CSV</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  disabled={isImporting}
                  onChange={handleFileChange}
                />
              </label>

              <Button
                variant="outline"
                className="w-full border-gray-700 text-white"
                onClick={() => onOpenChange(false)}
                disabled={isImporting}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ value, label, isError }: { value: number; label: string; isError?: boolean }) {
  return (
    <div className="bg-[#0f1419] rounded p-3">
      <p className={`text-2xl font-bold ${isError ? "text-red-400" : "text-white"}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
