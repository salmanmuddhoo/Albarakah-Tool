/**
 * Secondary toolbar shown under the brand/nav bar: the active tool's title plus
 * its Reset and Download actions.
 */
export function Toolbar({
  title,
  subtitle,
  onReset,
  onDownload,
  downloadLabel,
}: {
  title: string;
  subtitle?: string;
  onReset: () => void;
  onDownload: () => void;
  downloadLabel: string;
}) {
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onReset}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Reset
          </button>
          <button
            onClick={onDownload}
            className="rounded-lg bg-albarakah-500 px-3 py-2 text-xs font-semibold text-white hover:bg-albarakah-600 transition"
          >
            {downloadLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
