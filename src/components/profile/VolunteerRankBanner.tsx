import { Award, Gem, Medal, Shield, Sparkles } from "lucide-react";
import { getVolunteerRank } from "@/lib/volunteer-ranks";

const designs = {
  Bronze: { gradient: "from-stone-950 via-amber-950 to-orange-800", accent: "text-orange-200", icon: Medal, pattern: "rounded-full" },
  Silver: { gradient: "from-slate-800 via-slate-600 to-slate-400", accent: "text-slate-100", icon: Award, pattern: "rounded-full" },
  Gold: { gradient: "from-yellow-950 via-yellow-800 to-amber-500", accent: "text-amber-100", icon: Sparkles, pattern: "rotate-45 rounded-3xl" },
  Platinum: { gradient: "from-slate-900 via-teal-800 to-cyan-500", accent: "text-cyan-100", icon: Shield, pattern: "rotate-12 rounded-3xl" },
  Diamond: { gradient: "from-indigo-950 via-blue-900 to-cyan-600", accent: "text-cyan-100", icon: Gem, pattern: "rotate-45" },
};

export function VolunteerRankBanner({ hours, completedOpportunities }: { hours: number; completedOpportunities: number }) {
  const rank = getVolunteerRank(hours);
  const design = designs[rank];
  const Icon = design.icon;
  return (
    <div className={`relative h-48 overflow-hidden bg-gradient-to-br sm:h-44 ${design.gradient}`}>
      <div aria-hidden="true" className={`absolute -right-16 -top-44 size-96 border-[32px] border-white/10 ${design.pattern}`} />
      <div aria-hidden="true" className={`absolute right-52 top-12 size-64 border-[2px] border-white/10 ${design.pattern}`} />
      <div className={`absolute left-5 right-5 top-5 flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:gap-6 sm:left-auto sm:right-8 sm:top-7 ${design.accent}`}>
        <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 sm:size-14"><Icon className="size-7" strokeWidth={1.5} /></div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">Volunteer rank</p>
          <p className="text-xl font-semibold tracking-wide sm:text-2xl">{rank}</p>

        </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:border-l sm:border-white/25 sm:pl-5">
          <div>
            <dt className="text-[10px] sm:text-xs">Opportunities completed</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{completedOpportunities.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt className="text-[10px] sm:text-xs">Hours completed</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(Math.floor(hours * 10) / 10)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
