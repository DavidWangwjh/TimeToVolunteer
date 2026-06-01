interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  eyebrow?: string;
}

export function PageHeader({ title, description, action, eyebrow }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 rounded-lg border border-white/70 bg-white/80 p-5 shadow-sm shadow-slate-950/5 backdrop-blur sm:flex-row sm:items-start sm:justify-between sm:p-6">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
