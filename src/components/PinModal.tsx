import { Delete, Lock, Unlock, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface PinModalProps {
  mode: 'verify' | 'setup';
  title: string;
  subtitle: string;
  expectedPin?: string;
  canRemove?: boolean;
  allowForgotReset?: boolean;
  onSuccess: (pin: string) => void;
  onRemovePin?: () => void;
  onForgotReset?: () => void;
  onCancel: () => void;
}

export function PinModal({
  mode,
  title,
  subtitle,
  expectedPin = '',
  canRemove = false,
  allowForgotReset = false,
  onSuccess,
  onRemovePin,
  onForgotReset,
  onCancel,
}: PinModalProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const appendDigit = useCallback((d: string) => {
    setError(null);
    setValue((prev) => (prev.length < 4 ? prev + d : prev));
  }, []);

  const handleBackspace = useCallback(() => {
    setError(null);
    setValue((prev) => prev.slice(0, -1));
  }, []);

  const submitValue = useCallback(
    (rawVal: string) => {
      const cleaned = rawVal.replace(/\D/g, '').slice(0, 4);

      if (mode === 'setup') {
        if (cleaned.length < 1 || cleaned.length > 4) {
          setError('Enter 1 to 4 digits for the PIN.');
          return;
        }
        onSuccess(cleaned);
        return;
      }

      if (!cleaned) {
        setError('Please enter your PIN.');
        return;
      }
      if (cleaned !== expectedPin) {
        setError('Wrong PIN. Try again.');
        setValue('');
        return;
      }
      onSuccess(cleaned);
    },
    [expectedPin, mode, onSuccess]
  );

  // Support physical desktop keyboard without ever triggering mobile soft keyboard
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        appendDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitValue(value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [appendDigit, handleBackspace, onCancel, submitValue, value]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs select-none"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-[#E5E3DD] bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#111111] text-white">
              {mode === 'verify' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#111111]">{title}</h3>
              <p className="text-xs text-[#5C5A55]">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#5C5A55] hover:bg-[#F2F0EC] hover:text-[#111111]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          {/* Non-editable PIN display (never triggers mobile soft keyboard) */}
          <div
            role="status"
            aria-label={`PIN entered: ${value.length} of up to 4 digits`}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#D8D5CE] bg-[#FAF9F7] px-4"
          >
            {value.length === 0 ? (
              <span className="text-xs text-[#73716C]">Tap 1–4 digits below</span>
            ) : (
              Array.from({ length: 4 }).map((_, idx) => {
                const filled = idx < value.length;
                return (
                  <span
                    key={idx}
                    className={`h-3 w-3 rounded-full transition-all ${
                      filled ? 'scale-110 bg-[#111111]' : 'bg-[#D8D5CE]'
                    }`}
                  />
                );
              })
            )}
          </div>

          {error && (
            <p role="alert" className="mt-2 text-center text-xs font-medium text-[#E11D48]">
              {error}
            </p>
          )}

          {/* Touch-Friendly On-Screen Keypad */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => appendDigit(digit)}
                className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-[#E5E3DD] bg-[#FAF9F7] font-mono text-base font-semibold text-[#111111] transition-colors hover:border-[#111111] hover:bg-white active:scale-95"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleBackspace}
              aria-label="Backspace"
              className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-[#E5E3DD] bg-[#FAF9F7] text-[#5C5A55] transition-colors hover:border-[#111111] hover:text-[#111111] active:scale-95"
            >
              <Delete className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => appendDigit('0')}
              className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-[#E5E3DD] bg-[#FAF9F7] font-mono text-base font-semibold text-[#111111] transition-colors hover:border-[#111111] hover:bg-white active:scale-95"
            >
              0
            </button>

            <button
              type="button"
              onClick={() => submitValue(value)}
              className="flex h-11 cursor-pointer items-center justify-center rounded-xl bg-[#E11D48] text-xs font-semibold text-white transition-colors hover:bg-[#BE123C] active:scale-95"
            >
              {mode === 'setup' ? 'Save' : 'Unlock'}
            </button>
          </div>

          {mode === 'setup' && canRemove && onRemovePin && (
            <button
              type="button"
              onClick={onRemovePin}
              className="mt-3 h-9 w-full cursor-pointer rounded-lg border border-[#E5E3DD] text-xs font-medium text-[#5C5A55] transition-colors hover:border-[#E11D48] hover:text-[#E11D48]"
            >
              Remove Lock PIN
            </button>
          )}

          {mode === 'verify' && allowForgotReset && onForgotReset && (
            <button
              type="button"
              onClick={onForgotReset}
              className="mt-3 h-9 w-full cursor-pointer rounded-lg border border-[#E5E3DD] text-xs font-medium text-[#5C5A55] transition-colors hover:border-[#111111] hover:text-[#111111]"
            >
              Forgot Password? Set New PIN
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

