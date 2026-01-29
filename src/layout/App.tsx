import { useEffect, useState } from "react";

interface Process {
    pid: number;
    name: string;
    username: string;
    memory: number;
    isUserApp: boolean;
    isGuiApp: boolean;
}

function ProcessWidget() {
    const [processes, setProcesses] = useState<Process[]>([]);

    useEffect(() => {
        async function loadProcesses() {
            const result = await window.processAPI.getAllProcesses();
            console.log(result);
        }

        loadProcesses();
        const interval = setInterval(loadProcesses, 2000)

        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <h2>Running Apps ({processes.length})</h2>
            {processes.slice(0, 5).map((p) => (
                <div key={p.pid}>
                    {p.name} - {p.memory.toFixed(1)}%
                </div>
            ))}
        </div>
    );
}

export default ProcessWidget;
