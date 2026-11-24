import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface EdgeSwipeBackProps {
  enabled: boolean;
  onSwipeBack: () => void;
}

const EDGE_ZONE_PX = 44;
const ACTIVATE_DRAG_PX = 18;
const TRIGGER_DRAG_PX = 68;
const MAX_DRAG_PX = 96;

function isEditableOrBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
    return true;
  }
  return false;
}

export function EdgeSwipeBack({ enabled, onSwipeBack }: EdgeSwipeBackProps) {
  const [dragState, setDragState] = useState<{
    side: 'left' | 'right';
    distance: number;
    ready: boolean;
  } | null>(null);

  const touchRef = useRef<{
    active: boolean;
    side: 'left' | 'right';
    startX: number;
    startY: number;
    lockedAxis: 'none' | 'horizontal' | 'vertical';
  } | null>(null);

  const onSwipeBackRef = useRef(onSwipeBack);
  onSwipeBackRef.current = onSwipeBack;

  useEffect(() => {
    if (!enabled) {
      touchRef.current = null;
      setDragState(null);
      return;
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) {
        touchRef.current = null;
        setDragState(null);
        return;
      }

      if (isEditableOrBlockedTarget(e.target)) return;

      const touch = e.touches[0];
      const vw = window.innerWidth;
      let side: 'left' | 'right' | null = null;
      if (touch.clientX <= EDGE_ZONE_PX) side = 'left';
      else if (touch.clientX >= vw - EDGE_ZONE_PX) side = 'right';

      if (!side) return;

      touchRef.current = {
        active: true,
        side,
        startX: touch.clientX,
        startY: touch.clientY,
        lockedAxis: 'none',
      };
    }

    function handleTouchMove(e: TouchEvent) {
      const state = touchRef.current;
      if (!state || !state.active || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (state.lockedAxis === 'none') {
        if (absDy > 14 && absDy > absDx) {
          state.lockedAxis = 'vertical';
          state.active = false;
          setDragState(null);
          return;
        }
        const inward = state.side === 'left' ? dx : -dx;
        if (inward > ACTIVATE_DRAG_PX && absDx > absDy * 1.4) {
          state.lockedAxis = 'horizontal';
        } else {
          return;
        }
      }

      if (state.lockedAxis === 'horizontal') {
        const inward = Math.max(0, Math.min(MAX_DRAG_PX, state.side === 'left' ? dx : -dx));
        setDragState({
          side: state.side,
          distance: inward,
          ready: inward >= TRIGGER_DRAG_PX,
        });
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      const state = touchRef.current;
      touchRef.current = null;
      if (!state || !state.active || state.lockedAxis !== 'horizontal') {
        setDragState(null);
        return;
      }

      const touch = e.changedTouches[0];
      const dx = touch ? touch.clientX - state.startX : 0;
      const inward = state.side === 'left' ? dx : -dx;
      setDragState(null);

      if (inward >= TRIGGER_DRAG_PX) {
        onSwipeBackRef.current();
      }
    }

    function handleTouchCancel() {
      touchRef.current = null;
      setDragState(null);
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [enabled]);

  if (!dragState) return null;

  const progress = Math.min(1, dragState.distance / TRIGGER_DRAG_PX);
  const offset = Math.round(dragState.distance * 0.45);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 z-[80] flex items-center"
      style={{
        left: dragState.side === 'left' ? `${Math.max(4, offset - 12)}px` : undefined,
        right: dragState.side === 'right' ? `${Math.max(4, offset - 12)}px` : undefined,
        opacity: Math.max(0.25, progress),
      }}
    >
      <div
        className={`flex h-11 w-9 items-center justify-center rounded-full border shadow-lg transition-colors ${
          dragState.ready
            ? 'border-[#E11D48] bg-[#E11D48] text-white scale-105'
            : 'border-[#E5E3DD] bg-white/95 text-[#111111] dark:border-[#27272F] dark:bg-[#1E1E24]/95 dark:text-[#F4F4F6]'
        }`}
      >
        {dragState.side === 'left' ? (
          <ChevronLeft className="h-5 w-5" />
        ) : (
          <ChevronRight className="h-5 w-5" />
        )}
      </div>
    </div>
  );
}
