import type { LucideIcon } from "lucide-react";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  color?:
    | "violet"
    | "blue"
    | "emerald"
    | "amber"
    | "red"
    | "cyan";
}

const colors = {
  violet: "bg-violet-500/10 text-violet-400",
  blue: "bg-blue-500/10 text-blue-400",
  emerald: "bg-emerald-500/10 text-emerald-400",
  amber: "bg-amber-500/10 text-amber-400",
  red: "bg-red-500/10 text-red-400",
  cyan: "bg-cyan-500/10 text-cyan-400",
};

export default function AdminStatCard({
  title,
  value,
  description,
  icon: Icon,
  color = "violet",
}: AdminStatCardProps) {

  return (

    <div className="rounded-2xl border border-slate-800 bg-[#111522] p-5 transition hover:border-slate-700">

      <div className="flex items-center justify-between gap-3">

        <p className="text-sm font-medium text-slate-400">
          {title}
        </p>

        <div className={`rounded-xl p-3 ${colors[color]}`}>

          <Icon size={21} />

        </div>

      </div>

      <p className="mt-4 text-3xl font-bold tracking-tight text-white">

        {value}

      </p>

      {description && (

        <p className="mt-2 text-xs leading-relaxed text-slate-500">

          {description}

        </p>

      )}

    </div>
  );
}