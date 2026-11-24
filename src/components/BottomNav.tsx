import { Baby, Compass, Lock, Plus, Settings2, ShieldCheck } from 'lucide-react';
import type { AppTab } from '../types';

interface BottomNavProps {
  tabs: AppTab[];
  activeTabId: string;
  activeView: 'explore' | 'feed' | 'search' | 'channel' | 'following' | 'liked';
  onOpenFeed: () => void;
  onSelectTab: (tab: AppTab) => void;
  onEditTab: (tab: AppTab) => void;
  onCreateTab: () => void;
}

export function BottomNav({
  tabs,
  activeTabId,
  activeView,
  onOpenFeed,
  onSelectTab,
  onEditTab,
  onCreateTab,
}: BottomNavProps) {
  return (
    <nav
      aria-label="Bottom tabs and feed navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E3DD] bg-white/95 backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex h-11 max-w-[1440px] items-center gap-1.5 px-2">
        {/* Feed Shortcut in Bottom Nav */}
        <button
          type="button"
          onClick={onOpenFeed}
          className={`flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
            activeView === 'feed'
              ? 'bg-[#E11D48] text-white'
              : 'bg-[#FAF9F7] text-[#111111] hover:bg-[#F2F0EC]'
          }`}
        >
          <Compass className="h-3.5 w-3.5 shrink-0" />
          <span>Feed</span>
        </button>

        <div className="h-5 w-px shrink-0 bg-[#E5E3DD]" aria-hidden="true" />

        {/* Scrollable Profile Tabs */}
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const active = tab.id === activeTabId;
            const isKids = tab.kind === 'kids';
            return (
              <div
                key={tab.id}
                className={`flex h-8 shrink-0 items-center rounded-lg border transition-colors ${
                  active
                    ? 'border-[#111111] bg-[#111111] text-white'
                    : 'border-[#E5E3DD] bg-white text-[#3D3C38] hover:border-[#111111]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectTab(tab)}
                  className="flex h-full cursor-pointer items-center gap-1 pl-2.5 pr-1.5 text-[11px] font-medium whitespace-nowrap"
                >
                  {isKids && <Baby className="h-3 w-3 shrink-0" />}
                  {!isKids && tab.pin && (
                    <Lock
                      className={`h-2.5 w-2.5 shrink-0 ${
                        active ? 'text-white/80' : 'text-[#73716C]'
                      }`}
                    />
                  )}
                  {isKids && tab.pin && (
                    <ShieldCheck className="h-3 w-3 shrink-0 text-[#E11D48]" />
                  )}
                  <span className="max-w-[84px] truncate">{tab.name}</span>
                </button>

                {active && (
                  <button
                    type="button"
                    onClick={() => onEditTab(tab)}
                    aria-label={`${tab.name} settings`}
                    title={`${tab.name} lock & settings`}
                    className="mr-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded text-white/75 hover:bg-white/15 hover:text-white"
                  >
                    <Settings2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Create New Tab */}
        <button
          type="button"
          onClick={onCreateTab}
          aria-label="Create new tab"
          title="Create new tab"
          className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-dashed border-[#D8D5CE] bg-[#FAF9F7] px-2 text-[11px] font-semibold text-[#111111] transition-colors hover:border-[#111111] hover:bg-white whitespace-nowrap"
        >
          <Plus className="h-3.5 w-3.5 shrink-0 text-[#E11D48]" />
          <span>New</span>
        </button>
      </div>
    </nav>
  );
}
