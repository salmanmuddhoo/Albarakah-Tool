import { useState } from 'react';
import PasscodeGate from './components/PasscodeGate';
import LoanCalculator from './tools/LoanCalculator';
import RebateTool from './tools/RebateTool';

type ToolKey = 'loan' | 'rebate';

const TABS: { key: ToolKey; label: string }[] = [
  { key: 'loan', label: 'Loan Calculator' },
  { key: 'rebate', label: 'Rebate tool' },
];

function Shell() {
  const [tool, setTool] = useState<ToolKey>('loan');

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Brand + navigation */}
      <header className="bg-albarakah-500 text-white">
        <div className="max-w-6xl mx-auto px-4 pt-5">
          <div className="flex items-center gap-3 pb-4">
            <div className="h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center font-bold">
              A
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Albarakah MCSL</h1>
              <p className="text-xs text-white/80">Islamic Finance Staff Tools</p>
            </div>
          </div>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTool(t.key)}
                className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                  tool === t.key
                    ? 'bg-slate-100 text-albarakah-700'
                    : 'text-white/85 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {tool === 'loan' ? <LoanCalculator /> : <RebateTool />}

      <footer className="max-w-6xl mx-auto px-4 py-6 text-center text-[11px] text-slate-400">
        Albarakah MCSL — internal staff tool. No member data is stored.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <PasscodeGate>
      <Shell />
    </PasscodeGate>
  );
}
