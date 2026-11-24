import { Lock, ShieldCheck, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { AppTab } from '../types';

interface TabModalProps {
  mode: 'create' | 'edit';
  tab?: AppTab;
  onSaveCreate: (name: string, pin?: string) => void;
  onSaveEdit: (tabId: string, name: string, pin?: string) => void;
  onDeleteTab?: (tabId: string) => void;
  onClose: () => void;
}

export function TabModal({
  mode,
  tab,
  onSaveCreate,
  onSaveEdit,
  onDeleteTab,
  onClose,
}: TabModalProps) {
  const isKids = mode === 'edit' && tab?.kind === 'kids';
  const isDefault = mode === 'edit' && tab?.kind === 'default';

  const [name, setName] = useState(tab?.name || '');
  const [pin, setPin] = useState(tab?.pin || '');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanPin = pin.replace(/\D/g, '').slice(0, 4);

    if (!cleanName) {
      setError('Please enter a tab name.');
      return;
    }

    if (cleanPin.length > 4) {
      setError('PIN can be at most 4 digits.');
      return;
    }

    if (mode === 'edit' && tab) {
      onSaveEdit(tab.id, isKids || isDefault ? tab.name : cleanName, cleanPin || undefined);
      return;
    }

    onSaveCreate(cleanName, cleanPin || undefined);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'Create New Tab' : `Manage ${tab?.name} Tab`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#E5E3DD] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#111111]">
              {mode === 'create' ? 'New Tab' : `${tab?.name} Settings`}
            </h2>
            <p className="mt-0.5 text-xs text-[#5C5A55]">
              {isKids
                ? 'Kids tab stays open for children. PIN only locks video rotation & screen touch.'
                : 'Each tab keeps its own feed, liked songs, channels & search history.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#5C5A55] hover:bg-[#F2F0EC] hover:text-[#111111]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {!isKids && !isDefault && (
            <div>
              <label
                htmlFor="tab-name-input"
                className="block text-xs font-semibold text-[#111111]"
              >
                Tab Name
              </label>
              <input
                id="tab-name-input"
                type="text"
                maxLength={20}
                value={name}
                onChange={(e) => {
                  setError(null);
                  setName(e.target.value);
                }}
                placeholder="e.g. Songs, Cartoon, Study..."
                className="mt-1.5 h-11 w-full rounded-xl border border-[#D8D5CE] bg-[#FAF9F7] px-3.5 text-sm text-[#111111] placeholder:text-[#73716C] focus:border-[#111111] focus:bg-white focus:outline-none"
                autoFocus
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#111111]">
                {isKids ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-[#E11D48]" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-[#5C5A55]" />
                )}
                <span>
                  {isKids
                    ? 'Screen & Rotation Lock PIN (1–4 digits)'
                    : 'Tab Lock Password (1–4 digits, optional)'}
                </span>
              </span>
              {pin && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setPin('');
                  }}
                  className="cursor-pointer text-[11px] font-medium text-[#E11D48] hover:underline"
                >
                  Clear PIN
                </button>
              )}
            </div>

            <div
              role="status"
              aria-label={`Tab PIN: ${pin.length} digits`}
              className="mt-1.5 flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-[#D8D5CE] bg-[#FAF9F7] px-3.5"
            >
              {pin.length === 0 ? (
                <span className="text-xs text-[#73716C]">No PIN (tap digits below to set)</span>
              ) : (
                Array.from({ length: 4 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      idx < pin.length ? 'scale-110 bg-[#111111]' : 'bg-[#D8D5CE]'
                    }`}
                  />
                ))
              )}
            </div>

            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    setError(null);
                    setPin((prev) => (prev.length < 4 ? prev + digit : prev));
                  }}
                  className="flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[#E5E3DD] bg-white font-mono text-sm font-semibold text-[#111111] transition-colors hover:border-[#111111] active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPin((prev) => prev.slice(0, -1));
                }}
                className="col-span-2 flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[#E5E3DD] bg-[#FAF9F7] text-xs font-medium text-[#5C5A55] transition-colors hover:border-[#111111] hover:text-[#111111] active:scale-95"
              >
                Del
              </button>
            </div>

            <p className="mt-1.5 text-[11px] text-[#73716C]">
              {isKids
                ? 'When set, rotating a video locks screen touches until this PIN is entered.'
                : 'Min 1 digit, max 4 digits. Leave empty for no lock.'}
            </p>
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-[#E11D48]">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            {mode === 'edit' && tab?.kind === 'custom' && onDeleteTab && (
              confirmDelete ? (
                <button
                  type="button"
                  onClick={() => onDeleteTab(tab.id)}
                  className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#E11D48] px-3 text-xs font-semibold text-white hover:bg-[#BE123C]"
                >
                  Confirm Delete
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Delete tab"
                  className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#E5E3DD] text-[#5C5A55] hover:border-[#E11D48] hover:text-[#E11D48]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )
            )}

            <button
              type="submit"
              className="h-10 flex-1 cursor-pointer rounded-xl bg-[#111111] text-sm font-medium text-white transition-colors hover:bg-[#E11D48]"
            >
              {mode === 'create' ? 'Create Tab' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
