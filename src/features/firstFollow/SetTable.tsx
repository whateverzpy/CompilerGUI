import { classNames } from '../../lib/classNames';

interface SetTableProps {
  title: string;
  sets: Record<string, string[]>;
  focusSymbol?: string;
  changedSymbols?: string[];
}

export const SetTable = ({ title, sets, focusSymbol, changedSymbols = [] }: SetTableProps) => (
  <section className="min-w-0 rounded-md border border-neutral-200 bg-white">
    <div className="border-b border-neutral-200 px-4 py-3">
      <h3 className="text-sm font-semibold text-ink-950">{title}</h3>
    </div>
    <div className="divide-y divide-neutral-100">
      {Object.entries(sets).map(([symbol, values]) => (
        <div
          key={symbol}
          className={classNames(
            'grid grid-cols-[84px_1fr] gap-3 px-4 py-3 text-sm',
            focusSymbol === symbol && 'bg-neutral-50',
          )}
        >
          <div className="font-mono font-semibold text-ink-950">{symbol}</div>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {values.length === 0 ? (
              <span className="font-mono text-ink-400">∅</span>
            ) : (
              values.map((value) => (
                <span
                  key={value}
                  className={classNames(
                    'rounded border px-2 py-0.5 font-mono text-xs',
                    changedSymbols.includes(value)
                      ? 'border-ink-950 bg-ink-950 text-white'
                      : 'border-neutral-200 bg-neutral-50 text-ink-800',
                  )}
                >
                  {value}
                </span>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  </section>
);
