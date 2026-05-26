'use client';

type SignOutConfirmModalProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export default function SignOutConfirmModal({
  open,
  onCancel,
  onConfirm,
  busy = false,
}: SignOutConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl shadow-black/40">
          <h2 className="text-2xl font-semibold text-white">Sign Out 👋</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Are you sure you want to sign out? Any unsaved changes may be lost.
          </p>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Signing Out...' : 'Yes, Sign Out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
