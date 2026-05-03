import { Header } from "@/components/logo-header";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* /<div className="relative z-10 flex flex-col items-center gap-4 text-center"> */}
      {/* <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20"> */}
      <Header title="Vigilant Code" subtitle="" top={false} />
      {/* </div> */}
      {/* </div> */}
    </div>
  );
}
