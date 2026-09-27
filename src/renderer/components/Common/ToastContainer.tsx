import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  X,
  Copy,
  Check
} from 'lucide-react';
import { useApp, ToastItem } from '../../store';

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(toast.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = toast.kind === 'success';
  const isError = toast.kind === 'error';
  const isWarn = toast.kind === 'warn';

  const icon = isSuccess ? (
    <CheckCircle2 size={17} className="text-emerald-400" />
  ) : isError ? (
    <AlertOctagon size={17} className="text-rose-400" />
  ) : isWarn ? (
    <AlertTriangle size={17} className="text-amber-400" />
  ) : (
    <Info size={17} className="text-cyan-400" />
  );

  const badgeBg = isSuccess
    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
    : isError
    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
    : isWarn
    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
    : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400';

  const borderStyle = isSuccess
    ? 'border-emerald-500/40 shadow-emerald-950/20'
    : isError
    ? 'border-rose-500/40 shadow-rose-950/20'
    : isWarn
    ? 'border-amber-500/40 shadow-amber-950/20'
    : 'border-cyan-500/40 shadow-cyan-950/20';

  const leftBarColor = isSuccess
    ? 'bg-emerald-400'
    : isError
    ? 'bg-rose-400'
    : isWarn
    ? 'bg-amber-400'
    : 'bg-cyan-400';

  const progressBarColor = isSuccess
    ? 'bg-emerald-400'
    : isError
    ? 'bg-rose-400'
    : isWarn
    ? 'bg-amber-400'
    : 'bg-cyan-400';

  const durationMs = toast.duration || 4000;

  return (
    <div
      className={`group relative pointer-events-auto flex flex-col rounded-xl bg-panel/95 backdrop-blur-md border ${borderStyle} shadow-2xl overflow-hidden transition-all duration-200 animate-in slide-in-from-bottom-5 fade-in select-none max-w-sm w-full`}
      style={{
        boxShadow: isSuccess
          ? '0 12px 30px -4px rgba(16, 185, 129, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.4)'
          : isError
          ? '0 12px 30px -4px rgba(244, 63, 94, 0.18), 0 4px 12px -2px rgba(0, 0, 0, 0.4)'
          : '0 12px 30px -4px rgba(56, 189, 248, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Glowing Left Indicator Bar */}
      <div className={`absolute top-0 bottom-0 left-0 w-1 ${leftBarColor}`} />

      {/* Main Content Area */}
      <div className="flex items-start gap-3 p-3.5 pl-4">
        {/* Type Icon Badge */}
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${badgeBg}`}>
          {icon}
        </div>

        {/* Text Area */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fg/80 font-mono">
              {toast.title || (isSuccess ? 'Success' : isError ? 'Error' : isWarn ? 'Notice' : 'Information')}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {isError && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded text-dim hover:text-fg hover:bg-panel3 transition-colors"
                  title="Copy error message"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              )}
              <button
                type="button"
                onClick={onDismiss}
                className="p-1 rounded text-dim hover:text-fg hover:bg-panel3 transition-colors"
                title="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          <p className="text-sm font-medium text-fg leading-snug break-words selectable select-text">
            {toast.text}
          </p>
        </div>
      </div>

      {/* Animated Countdown Progress Bar */}
      {durationMs > 0 && (
        <div className="h-0.5 w-full bg-panel3/60 overflow-hidden">
          <div
            className={`h-full ${progressBarColor}`}
            style={{
              animation: `toast-progress ${durationMs}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useApp((s) => s.toasts);
  const dismissToast = useApp((s) => s.dismissToast);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-7 right-7 z-[100] flex flex-col items-end gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
}
