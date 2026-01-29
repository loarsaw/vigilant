import { useEffect, useState } from "react";

// ... (Interface remains the same)

function ProcessWidget() {
    const [processes, setProcesses] = useState<Process[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProcesses() {
            try {
                const { data: result }: { data: Process[] } =
                    await window.processAPI.getAllProcesses();

                // 1. Filter out empty names
                // 2. Sort alphabetically by name
console.log(result , "result")


                setProcesses(result);
            } catch (error) {
                console.error("Failed to fetch processes:", error);
            } finally {
                setLoading(false);
            }
        }

        loadProcesses();
        const interval = setInterval(loadProcesses, 5000);
        return () => clearInterval(interval);
    }, []);
console.log(processes)
    return (
        <div className="max-w-md mx-auto bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h2 className="font-bold tracking-tight">
                    Active Processes ({processes.length})
                </h2>
                <span className="px-2 py-0.5 bg-slate-700 rounded text-[10px] text-slate-300 uppercase">
                    Live
                </span>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {processes.length > 0 ? (
                    processes.map((p) => (
                        <div
                            key={p.pid}
                            className="group p-3 border-b border-slate-800/50 hover:bg-blue-600/10 transition-all flex justify-between items-center"
                        >
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                                    {p.name}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                    User: {p.username}
                                </span>
                            </div>

                            <div className="flex flex-col items-end">
                                <span className="text-xs font-mono text-emerald-400">
                                    {p.memory.toFixed(1)}%
                                </span>
                                {p.isGuiApp && (
                                    <span className="text-[9px] bg-slate-800 px-1 rounded text-slate-400 mt-1">
                                        GUI
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-10 text-center text-slate-500 italic text-sm">
                        {loading
                            ? "Waking up system monitor..."
                            : "No named processes found."}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProcessWidget;
