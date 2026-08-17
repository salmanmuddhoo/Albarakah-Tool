import { useState, type ReactNode } from 'react';

const STORAGE_KEY = 'albarakah_rebate_unlocked';

/**
 * The shared staff passcode. Set VITE_STAFF_PASSCODE at build time (see README).
 * Falls back to a default so the tool still runs in a fresh checkout.
 */
const STAFF_PASSCODE = import.meta.env.VITE_STAFF_PASSCODE ?? 'albarakah';

interface PasscodeGateProps {
  children: ReactNode;
}

export default function PasscodeGate({ children }: PasscodeGateProps) {
  const [unlocked, setUnlocked] = useState<boolean>(
    () => sessionStorage.getItem(STORAGE_KEY) === '1',
  );
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entry === STAFF_PASSCODE) {
      sessionStorage.setItem(STORAGE_KEY, '1');
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 border border-slate-200"
      >
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-albarakah-500 flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Albarakah MCSL</h1>
          <p className="text-sm text-slate-500">Islamic Finance Staff Tools</p>
        </div>

        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="passcode">
          Staff passcode
        </label>
        <input
          id="passcode"
          type="password"
          autoFocus
          value={entry}
          onChange={(e) => {
            setEntry(e.target.value);
            setError(false);
          }}
          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-albarakah-500 ${
            error ? 'border-red-400' : 'border-slate-300'
          }`}
          placeholder="Enter passcode"
        />
        {error && (
          <p className="mt-2 text-sm text-red-600">Incorrect passcode. Please try again.</p>
        )}

        <button
          type="submit"
          className="mt-5 w-full rounded-lg bg-albarakah-500 py-2 text-sm font-semibold text-white hover:bg-albarakah-600 transition"
        >
          Unlock
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">
          For internal Albarakah MCSL staff use only.
        </p>
      </form>
    </div>
  );
}
