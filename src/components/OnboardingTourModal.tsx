import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Clock,
  Compass,
  ScrollText,
  SlidersHorizontal,
  LayoutGrid,
  CheckCircle2,
  Target,
} from 'lucide-react';
import { Language } from '../types/game';
import { UI_TEXT } from '../utils/i18n';
import { sound } from '../utils/sound';

interface OnboardingTourModalProps {
  isOpen: boolean;
  lang: Language;
  onComplete: () => void;
}

const STEP_ICONS = [
  <Clock key="0" className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />,
  <ScrollText key="1" className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />,
  <Compass key="2" className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />,
  <SlidersHorizontal key="3" className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />,
  <LayoutGrid key="4" className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />,
];

export type SpotlightZone =
  | 'top-left'
  | 'action-console'
  | 'center-3d'
  | 'top-right'
  | 'bottom-dock';

export const STEP_ZONES: SpotlightZone[] = [
  'top-left',
  'action-console',
  'center-3d',
  'top-right',
  'bottom-dock',
];

export interface SpotlightLayoutResult {
  top: number;
  left: number;
  width: number;
  height: number;
  cardTop: number;
  cardMaxHeight: number;
  placement: 'bottom' | 'top';
}

/**
 * Pure, deterministic layout engine that guarantees the onboarding dialog card
 * NEVER overlaps the bright spotlight focus window on any desktop or mobile viewport,
 * while tightly hugging real DOM rects and framing the 3D campfire arena cleanly.
 */
export function computeNonOverlappingTourLayout(
  vw: number,
  vh: number,
  zone: SpotlightZone,
  targetRect: { top: number; left: number; width: number; height: number } | null,
  measuredCardHeight: number = 220
): SpotlightLayoutResult {
  const isMobile = vw < 640;
  const pad = isMobile ? 3 : 4;
  const safeMargin = isMobile ? 10 : 16;
  const gapBetweenSpotAndCard = isMobile ? 22 : 28;

  let sTop = 10;
  let sLeft = 10;
  let sWidth = 260;
  let sHeight = 56;

  if (zone === 'center-3d') {
    // Frame the full 3D campfire village circle (all seated villagers + glowing firepit)
    // below the top HUD/action console while keeping guaranteed non-overlapping space for the card.
    const topClearance = targetRect
      ? Math.max(targetRect.top + targetRect.height + (isMobile ? 26 : 32), isMobile ? 104 : 176)
      : isMobile
      ? 110
      : 180;
    const minCardBudget = Math.min(measuredCardHeight + safeMargin + gapBetweenSpotAndCard, vh * 0.42);
    const maxCenterBottom = Math.max(topClearance + 96, vh - minCardBudget);
    const availableH = Math.max(96, maxCenterBottom - topClearance);
    sHeight = Math.round(Math.min(availableH, isMobile ? Math.min(220, vh * 0.34) : Math.min(400, vh * 0.46)));
    // Bias slightly lower inside the available band so the central campfire stays fully inside the bright cutout
    sTop = Math.round(topClearance + Math.max(0, (availableH - sHeight) * 0.72));
    sWidth = Math.round(Math.min(vw - (isMobile ? 24 : 160), isMobile ? vw - 24 : 980));
    sLeft = Math.round((vw - sWidth) / 2);
  } else if (targetRect && targetRect.width > 0 && targetRect.height > 0) {
    const left = Math.max(4, Math.round(targetRect.left - pad));
    const top = Math.max(4, Math.round(targetRect.top - pad));
    const right = Math.min(vw - 4, Math.round(targetRect.left + targetRect.width + pad));
    const bottom = Math.min(vh - 4, Math.round(targetRect.top + targetRect.height + pad));
    sTop = top;
    sLeft = left;
    sWidth = Math.max(54, right - left);
    sHeight = Math.max(32, bottom - top);
  } else {
    // Fallback geometry when DOM target isn't mounted yet
    if (zone === 'top-left') {
      sTop = 8;
      sLeft = 8;
      sWidth = isMobile ? 185 : 310;
      sHeight = isMobile ? 52 : 64;
    } else if (zone === 'top-right') {
      sWidth = isMobile ? 150 : 280;
      sTop = 8;
      sLeft = Math.max(8, vw - sWidth - 8);
      sHeight = isMobile ? 46 : 54;
    } else if (zone === 'action-console') {
      sWidth = Math.min(vw - 20, 512);
      sTop = isMobile ? 64 : 74;
      sLeft = Math.round((vw - sWidth) / 2);
      sHeight = isMobile ? 76 : 86;
    } else {
      // bottom-dock
      sWidth = Math.min(vw - 16, 1040);
      sHeight = isMobile ? 96 : 112;
      sTop = Math.max(180, vh - sHeight - 10);
      sLeft = Math.round((vw - sWidth) / 2);
    }
  }

  const sBottom = sTop + sHeight;
  const spaceAbove = sTop - safeMargin - gapBetweenSpotAndCard;
  const spaceBelow = vh - sBottom - safeMargin - gapBetweenSpotAndCard;

  // Decide whether the dialog card belongs below or above the spotlight cutout
  const preferTop = zone === 'bottom-dock' || (spaceBelow < 185 && spaceAbove > spaceBelow);

  if (preferTop) {
    const cardMaxHeight = Math.max(130, Math.min(340, spaceAbove));
    const effectiveH = Math.min(Math.max(measuredCardHeight, 210), cardMaxHeight);
    const idealTop = sTop - effectiveH - gapBetweenSpotAndCard;
    return {
      top: sTop,
      left: sLeft,
      width: sWidth,
      height: sHeight,
      cardTop: Math.max(safeMargin, Math.round(idealTop)),
      cardMaxHeight: Math.round(cardMaxHeight),
      placement: 'top',
    };
  } else {
    const cardMaxHeight = Math.max(130, Math.min(340, spaceBelow));
    const effectiveH = Math.min(Math.max(measuredCardHeight, 210), cardMaxHeight);
    const idealTop =
      zone === 'center-3d'
        ? sBottom + gapBetweenSpotAndCard
        : Math.min(vh - effectiveH - safeMargin, Math.max(sBottom + gapBetweenSpotAndCard, Math.round(vh * 0.56)));
    const minAllowedTop = sBottom + gapBetweenSpotAndCard;
    const cardTop = Math.max(minAllowedTop, Math.min(idealTop, vh - effectiveH - safeMargin));
    return {
      top: sTop,
      left: sLeft,
      width: sWidth,
      height: sHeight,
      cardTop: Math.round(cardTop),
      cardMaxHeight: Math.round(cardMaxHeight),
      placement: 'bottom',
    };
  }
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  isOpen,
  lang,
  onComplete,
}) => {
  const [stepIdx, setStepIdx] = useState<number>(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<SpotlightLayoutResult>(() =>
    computeNonOverlappingTourLayout(
      typeof window !== 'undefined' ? window.innerWidth : 1366,
      typeof window !== 'undefined' ? window.innerHeight : 860,
      'top-left',
      null,
      230
    )
  );

  const activeStepIdx = isOpen ? stepIdx : 0;
  const zone = STEP_ZONES[activeStepIdx] || 'center-3d';

  const measureTargetZone = useCallback(() => {
    if (typeof window === 'undefined') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardH = cardRef.current
      ? Math.max(185, Math.ceil(cardRef.current.getBoundingClientRect().height))
      : 230;

    if (zone === 'center-3d') {
      const topConsoleEl = document.querySelector('[data-tour-id="action-console"]');
      const topLeftEl = document.querySelector('[data-tour-id="top-left"]');
      const consoleRect = topConsoleEl ? topConsoleEl.getBoundingClientRect() : null;
      const tlRect = topLeftEl ? topLeftEl.getBoundingClientRect() : null;
      const referenceRect =
        consoleRect && consoleRect.height > 0
          ? consoleRect
          : tlRect && tlRect.height > 0
          ? tlRect
          : null;
      setLayout(
        computeNonOverlappingTourLayout(
          vw,
          vh,
          'center-3d',
          referenceRect
            ? {
                top: referenceRect.top,
                left: referenceRect.left,
                width: referenceRect.width,
                height: referenceRect.height,
              }
            : null,
          cardH
        )
      );
      return;
    }

    const targetEl = document.querySelector(
      `[data-tour-id="${zone}"]`
    ) as HTMLElement | null;
    const r = targetEl ? targetEl.getBoundingClientRect() : null;

    setLayout(
      computeNonOverlappingTourLayout(
        vw,
        vh,
        zone,
        r && r.width > 0 && r.height > 0
          ? { top: r.top, left: r.left, width: r.width, height: r.height }
          : null,
        cardH
      )
    );
  }, [zone]);

  useEffect(() => {
    if (!isOpen) {
      setStepIdx(0);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    measureTargetZone();
    const raf1 = requestAnimationFrame(measureTargetZone);
    const timer1 = window.setTimeout(measureTargetZone, 60);
    const timer2 = window.setTimeout(measureTargetZone, 180);
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen, activeStepIdx, measureTargetZone]);

  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => measureTargetZone();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measureTargetZone());
      if (cardRef.current) ro.observe(cardRef.current);
      const targetEl = document.querySelector(`[data-tour-id="${zone}"]`);
      if (targetEl) ro.observe(targetEl);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      if (ro) ro.disconnect();
    };
  }, [isOpen, zone, measureTargetZone]);

  if (!isOpen) return null;

  const t = UI_TEXT[lang];
  const steps = t.tourSteps;
  const step = steps[activeStepIdx] || steps[0];
  const isLast = activeStepIdx === steps.length - 1;

  // Smart badge placement: never clip off-screen top or bottom edges
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 860;
  const hasRoomAbove = layout.top >= 28;
  const hasRoomBelow = layout.top + layout.height + 28 <= viewportH;
  const placeBadgeBelow =
    zone === 'bottom-dock'
      ? false
      : !hasRoomAbove && hasRoomBelow
      ? true
      : layout.placement === 'top' && hasRoomBelow;
  const isRightAligned = zone === 'top-right';

  const cardPositionStyle: React.CSSProperties =
    layout.placement === 'top'
      ? {
          bottom: `${Math.max(12, viewportH - layout.top + 26)}px`,
          maxHeight: `${layout.cardMaxHeight}px`,
        }
      : {
          top: `${layout.cardTop}px`,
          maxHeight: `${layout.cardMaxHeight}px`,
        };

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto select-none overflow-hidden"
      data-testid="onboarding-tour-modal"
      data-active-zone={zone}
    >
      {/* Dynamic Pixel-Measured Spotlight Cutout Window: Inside is 100% BRIGHT & UN-DIMMED */}
      <div
        data-testid="onboarding-spotlight-box"
        data-spotlight-zone={zone}
        style={{
          top: `${layout.top}px`,
          left: `${layout.left}px`,
          width: `${layout.width}px`,
          height: `${layout.height}px`,
          backgroundColor: 'transparent',
          boxShadow:
            '0 0 0 9999px rgba(4, 7, 15, 0.80), 0 0 28px 3px rgba(251, 191, 36, 0.72), inset 0 0 12px rgba(251, 191, 36, 0.24)',
        }}
        className="fixed box-border pointer-events-none rounded-2xl border-2 border-amber-400 transition-[top,left,width,height] duration-200 ease-out z-0"
      >
        <div className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 border-t-[3px] border-l-[3px] border-amber-200 rounded-tl-xl" />
        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 border-t-[3px] border-r-[3px] border-amber-200 rounded-tr-xl" />
        <div className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 border-b-[3px] border-l-[3px] border-amber-200 rounded-bl-xl" />
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-b-[3px] border-r-[3px] border-amber-200 rounded-br-xl" />

        <div
          className={`absolute ${
            placeBadgeBelow ? '-bottom-6' : '-top-6'
          } ${
            isRightAligned ? 'right-1' : 'left-1'
          } px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-extrabold text-[9px] uppercase tracking-wider shadow-lg flex items-center gap-1 whitespace-nowrap`}
        >
          <Target className="w-2.5 h-2.5 shrink-0" />
          <span>{t.spotlightActiveLabel}</span>
        </div>
      </div>

      {/* Main Guide Dialog Card — Strictly Non-Overlapping via Measured Coordinates */}
      <div
        ref={cardRef}
        data-testid="onboarding-dialog-card"
        style={cardPositionStyle}
        className="fixed left-1/2 -translate-x-1/2 z-10 w-[calc(100vw-20px)] max-w-lg bg-[#0b1120]/98 border-2 border-amber-500/85 rounded-2xl p-3 sm:p-4 shadow-2xl space-y-2 overflow-y-auto"
      >
        {/* Progress Dots & Step Badge */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-1.5">
          <div className="flex items-start gap-2 min-w-0">
            <div className="p-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 shrink-0 mt-0.5">
              {STEP_ICONS[stepIdx]}
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-amber-400 block leading-snug">
                {step.badge}
              </span>
              <h3 className="text-xs sm:text-sm font-black text-slate-100 leading-snug">
                {step.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  sound.playCardFlip();
                  setStepIdx(idx);
                }}
                aria-label={`Step ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === stepIdx
                    ? 'w-5 bg-amber-400'
                    : idx < stepIdx
                    ? 'w-1.5 bg-emerald-400'
                    : 'w-1.5 bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Main Explanation */}
        <p className="text-[11px] sm:text-xs text-slate-200 leading-snug">
          {step.description}
        </p>

        {/* Highlight Tips */}
        <div className="bg-[#070a14] border border-slate-800 rounded-xl p-2 space-y-1">
          {step.tips.slice(0, 2).map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-[10px] sm:text-[11px] text-amber-200/95 leading-tight"
            >
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              <span>{tip}</span>
            </div>
          ))}
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            disabled={stepIdx === 0}
            onClick={() => {
              sound.playCardFlip();
              setStepIdx((s) => Math.max(0, s - 1));
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-[11px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{t.prevBtn}</span>
          </button>

          <div className="flex items-center gap-1.5">
            {!isLast && (
              <button
                type="button"
                data-testid="tour-skip-btn"
                onClick={() => {
                  sound.playCardFlip();
                  onComplete();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-300 cursor-pointer"
              >
                {t.understandAllBtn}
              </button>
            )}

            {!isLast ? (
              <button
                type="button"
                data-testid="tour-next-btn"
                onClick={() => {
                  sound.playCardFlip();
                  setStepIdx((s) => s + 1);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1 shadow-lg cursor-pointer"
              >
                <span>{t.nextStepBtn(stepIdx + 1, steps.length)}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                data-testid="tour-finish-btn"
                onClick={() => {
                  sound.playDayGong();
                  onComplete();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1 shadow-lg cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t.finishTourBtn}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
