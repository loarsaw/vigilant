import { LOGO_URL } from "@/lib/constants";

export function Header({
  title,
  subtitle,
  top = true,
}: {
  title: string;
  subtitle: string;
  top: boolean;
}) {
  return (
    <div className="text-center mb-10">
      {top && (
        <p className="text-sm font-semibold text-blue-400 tracking-widest uppercase mb-4">
          Vigilant Code
        </p>
      )}{" "}
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-5 shadow-lg">
        <img src={LOGO_URL} alt="Vigilant Logo" className="w-8 h-8 object-contain" />
      </div>
      <h2 className="text-4xl font-bold text-white mb-2">{title}</h2>
      <p className="text-base text-slate-300 font-light">{subtitle}</p>
    </div>
  );
}
