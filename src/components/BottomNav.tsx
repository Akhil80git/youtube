import {
  Baby,
  Check,
  ChevronUp,
  Compass,
  Film,
  Heart,
  KeyRound,
  Moon,
  Music,
  Plus,
  Settings2,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AppTab, ThemeMode, ViewMode } from '../types';

interface BottomNavProps {
  tabs: AppTab[];
  activeTab: AppTab;
  activeView: ViewMode;
  appMode: 'videos' | 'music';
  likedCount: number;
  theme: ThemeMode;
  onChangeMode: (mode: 'videos' | 'music') => void;
  onChangeTheme: (theme: ThemeMode) => void;
  onOpenFeed: () => void;
  onOpenLiked: () => void;
  onSelectTab: (tab: AppTab) => void;
  onCreateTabInline: (name: string) => void;
  onEditTab: (tab: AppTab) => void;
  onOpenKidsPassword: () => void;
}

export function BottomNav({
  tabs,
  activeTab,
  activeView,
  appMode,
  likedCount,
  theme,
  onChangeMode,
  onChangeTheme,
  onOpenFeed,
  onOpenLiked,
  onSelectTab,
  onCreateTabInline,
  onEditTab,
  onOpenKidsPassword,
}: BottomNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [addingTab, setAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);
  const newTabInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      setAddingTab(false);
      setNewTabName('');
      return;
    }

    function handleOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = newTabName.trim();
    if (!clean) return;
    onCreateTabInline(clean);
    setNewTabName('');
    setAddingTab(false);
    setMenuOpen(false);
  }

  const isKidsActive = activeTab.kind === 'kids';

  return (
    <div ref={popupRef} className="lg:hidden">
      {/* Upward Tab Switcher, Kids PIN & Theme Popup */}
      {menuOpen && (
        <div
          role="dialog"
          aria-label="Tabs and theme menu"
          className="fixed bottom-12 right-2 z-50 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-[#E5E3DD] bg-white shadow-xl dark:border-[#27272F] dark:bg-[#141418]"
        >
          {/* Theme Toggle Header */}
          <div className="flex items-center justify-between border-b border-[#F2F0EC] px-3.5 py-2.5 dark:border-[#27272F]">
            <span className="text-xs font-semibold text-[#5C5A55] dark:text-[#A1A1AA]">
              Appearance
            </span>
            <div
              role="group"
              aria-label="Site theme"
              className="inline-flex rounded-lg border border-[#E5E3DD] bg-[#FAF9F7] p-0.5 dark:border-[#27272F] dark:bg-[#1E1E24]"
            >
              <button
                type="button"
                onClick={() => onChangeTheme('light')}
                aria-pressed={theme === 'light'}
                className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2.5 text-[11px] font-semibold transition-colors ${
                  theme === 'light'
                    ? 'bg-white text-[#E11D48] shadow-xs'
                    : 'text-[#5C5A55] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white'
                }`}
              >
                <Sun className="h-3 w-3" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeTheme('dark')}
                aria-pressed={theme === 'dark'}
                className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2.5 text-[11px] font-semibold transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#27272F] text-white shadow-xs'
                    : 'text-[#5C5A55] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white'
                }`}
              >
                <Moon className="h-3 w-3" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Tab List */}
          <div className="max-h-64 overflow-y-auto p-2">
            <div className="mb-1.5 flex items-center justify-between px-2">
              <span className="text-[11px] font-semibold text-[#73716C] dark:text-[#A1A1AA]">
                Tabs
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close tab menu"
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[#73716C] hover:bg-[#FAF9F7] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:bg-[#1E1E24] dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <ul className="space-y-1">
              {tabs.map((tab) => {
                const selected = tab.id === activeTab.id;
                const isKids = tab.kind === 'kids';
                return (
                  <li key={tab.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab(tab);
                        setMenuOpen(false);
                      }}
                      className={`flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 text-left text-xs font-semibold transition-colors ${
                        selected
                          ? 'bg-[#FFF1F3] text-[#BE123C] dark:bg-[#E11D48]/20 dark:text-[#FB7185]'
                          : 'text-[#3D3C38] hover:bg-[#FAF9F7] hover:text-[#111111] dark:text-[#D4D4D8] dark:hover:bg-[#1E1E24] dark:hover:text-white'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {isKids && <Baby className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{tab.name}</span>
                      </span>
                      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>

                    {/* Password Option ONLY on Kids Tab */}
                    {isKids && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onOpenKidsPassword();
                        }}
                        title={tab.pin ? 'Change Kids screen lock password' : 'Set Kids screen lock password'}
                        aria-label="Kids password settings"
                        className={`flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-xl border px-2.5 text-[11px] font-semibold transition-colors ${
                          tab.pin
                            ? 'border-[#E11D48]/40 bg-[#FFF1F3] text-[#BE123C] dark:border-[#E11D48]/50 dark:bg-[#E11D48]/20 dark:text-[#FB7185]'
                            : 'border-[#E5E3DD] bg-[#FAF9F7] text-[#5C5A55] hover:border-[#E11D48] hover:text-[#E11D48] dark:border-[#27272F] dark:bg-[#1E1E24] dark:text-[#A1A1AA]'
                        }`}
                      >
                        {tab.pin ? (
                          <ShieldCheck className="h-3.5 w-3.5" />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5" />
                        )}
                        <span>{tab.pin ? 'PIN' : 'Lock'}</span>
                      </button>
                    )}

                    {/* Rename / Delete ONLY on Custom Tabs (No Password) */}
                    {tab.kind === 'custom' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onEditTab(tab);
                        }}
                        aria-label={`Edit ${tab.name}`}
                        title={`Edit ${tab.name}`}
                        className="flex h-10 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#E5E3DD] bg-[#FAF9F7] text-[#5C5A55] hover:border-[#E11D48] hover:text-[#E11D48] dark:border-[#27272F] dark:bg-[#1E1E24] dark:text-[#A1A1AA]"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Add New Tab Footer */}
          <div className="border-t border-[#F2F0EC] p-2.5 dark:border-[#27272F]">
            {addingTab ? (
              <form onSubmit={handleAddSubmit} className="flex items-center gap-1.5">
                <input
                  ref={newTabInputRef}
                  type="text"
                  maxLength={20}
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  placeholder="Tab name (e.g. Study)..."
                  autoFocus
                  className="h-9 min-w-0 flex-1 rounded-lg border border-[#D8D5CE] bg-[#FAF9F7] px-2.5 text-xs text-[#111111] placeholder:text-[#73716C] focus:border-[#E11D48] focus:bg-white focus:outline-none dark:border-[#27272F] dark:bg-[#1E1E24] dark:text-white dark:placeholder:text-[#71717A]"
                />
                <button
                  type="submit"
                  disabled={!newTabName.trim()}
                  className="h-9 shrink-0 cursor-pointer rounded-lg bg-[#E11D48] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#BE123C] disabled:opacity-45"
                >
                  Add
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAddingTab(true);
                  requestAnimationFrame(() => newTabInputRef.current?.focus());
                }}
                className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#D8D5CE] bg-[#FAF9F7] text-xs font-semibold text-[#111111] transition-colors hover:border-[#E11D48] hover:text-[#E11D48] dark:border-[#27272F] dark:bg-[#1E1E24] dark:text-[#F4F4F6]"
              >
                <Plus className="h-3.5 w-3.5 text-[#E11D48]" />
                <span>Add New Tab</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fixed Bottom Bar: Feed + Video/Music Switch + Like + Selected Tab (Bottom Right) */}
      <nav
        aria-label="Bottom navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E3DD] bg-white/95 backdrop-blur-md dark:border-[#27272F] dark:bg-[#141418]/95"
      >
        <div className="mx-auto flex h-11 max-w-[1440px] items-center justify-between gap-1 px-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
            {/* Feed Button */}
            <button
              type="button"
              onClick={onOpenFeed}
              className={`flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition-colors whitespace-nowrap sm:px-2.5 ${
                activeView === 'feed'
                  ? 'bg-[#E11D48] text-white'
                  : 'bg-[#FAF9F7] text-[#111111] hover:bg-[#F2F0EC] dark:bg-[#1E1E24] dark:text-[#F4F4F6] dark:hover:bg-[#27272F]'
              }`}
            >
              <Compass className="h-3.5 w-3.5 shrink-0" />
              <span>Feed</span>
            </button>

            {/* Video / Music Switcher */}
            <div
              role="tablist"
              aria-label="Video or Music mode"
              className="inline-flex h-8 shrink-0 items-center rounded-lg border border-[#E5E3DD] bg-[#FAF9F7] p-0.5 dark:border-[#27272F] dark:bg-[#1E1E24]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={appMode === 'videos'}
                onClick={() => onChangeMode('videos')}
                className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  appMode === 'videos'
                    ? 'bg-[#FFF1F3] text-[#BE123C] shadow-xs dark:bg-[#27272F] dark:text-white'
                    : 'text-[#5C5A55] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white'
                }`}
              >
                <Film className="h-3 w-3 shrink-0" />
                <span>Video</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={appMode === 'music'}
                onClick={() => onChangeMode('music')}
                className={`inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  appMode === 'music'
                    ? 'bg-[#E11D48] text-white shadow-xs'
                    : 'text-[#5C5A55] hover:text-[#111111] dark:text-[#A1A1AA] dark:hover:text-white'
                }`}
              >
                <Music className="h-3 w-3 shrink-0" />
                <span>Music</span>
              </button>
            </div>

            {/* Like Icon Button */}
            <button
              type="button"
              onClick={onOpenLiked}
              title={`Liked (${likedCount})`}
              aria-label={`Open Liked Playlist (${likedCount} items)`}
              className={`relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors sm:w-9 ${
                activeView === 'liked'
                  ? 'bg-[#E11D48] text-white'
                  : 'bg-[#FAF9F7] text-[#111111] hover:bg-[#F2F0EC] dark:bg-[#1E1E24] dark:text-[#F4F4F6] dark:hover:bg-[#27272F]'
              }`}
            >
              <Heart
                className={`h-3.5 w-3.5 ${
                  activeView === 'liked' || likedCount > 0 ? 'fill-current' : ''
                } ${activeView !== 'liked' && likedCount > 0 ? 'text-[#E11D48]' : ''}`}
              />
              {likedCount > 0 && (
                <span
                  className={`absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 font-mono text-[9px] font-semibold leading-none tabular-nums ${
                    activeView === 'liked'
                      ? 'bg-white text-[#E11D48]'
                      : 'bg-[#E11D48] text-white'
                  }`}
                >
                  {likedCount > 99 ? '99+' : likedCount}
                </span>
              )}
            </button>
          </div>

          {/* Bottom-Right Selected Tab Button (opens Upward Popup) */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={`Current tab: ${activeTab.name}. Tap to switch tab or theme`}
            className={`flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-colors whitespace-nowrap sm:gap-1.5 sm:px-2.5 ${
              menuOpen
                ? 'border-[#E11D48] bg-[#E11D48] text-white'
                : 'border-[#E5E3DD] bg-[#FFF1F3] text-[#BE123C] hover:border-[#E11D48] dark:border-[#27272F] dark:bg-[#1E1E24] dark:text-[#F4F4F6] dark:hover:border-[#E11D48]'
            }`}
          >
            {isKidsActive && <Baby className="h-3.5 w-3.5 shrink-0" />}
            {isKidsActive && activeTab.pin && (
              <ShieldCheck
                className={`h-3 w-3 shrink-0 ${menuOpen ? 'text-white' : 'text-[#E11D48]'}`}
              />
            )}
            <span className="max-w-[74px] truncate sm:max-w-[96px]">{activeTab.name}</span>
            <ChevronUp
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                menuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </nav>
    </div>
  );
}
