import React from 'react';
import { Language, PropType } from '../types/game';
import { AGROU_EMOTES, AgrouEmoteId } from '../game/agrouMechanics';
import { UI_TEXT } from '../utils/i18n';
import { sound } from '../utils/sound';

interface AgrouEmoteWheelProps {
  lang: Language;
  isDayPhase: boolean;
  activePropTool: PropType | null;
  tagToolMode: 'none' | 'wolf_suspect' | 'trusted';
  onTriggerEmote: (emote: AgrouEmoteId) => void;
  onSelectPropTool: (prop: PropType | null) => void;
  onToggleTagMode: (mode: 'wolf_suspect' | 'trusted') => void;
}

export const AgrouEmoteWheel: React.FC<AgrouEmoteWheelProps> = ({
  lang,
  isDayPhase,
  activePropTool,
  tagToolMode,
  onTriggerEmote,
  onSelectPropTool,
  onToggleTagMode,
}) => {
  const t = UI_TEXT[lang];

  return (
    <div
      data-tour-id="prop-bar"
      data-testid="agrou-emote-props-popover"
      className="w-full agrou-wood-panel rounded-2xl p-2.5 space-y-2"
    >
      {/* Row 1: Agrou 3D Campfire Emotes */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-extrabold text-[#f2be6b] mr-1 whitespace-nowrap">
          {lang === 'vi' ? 'Biểu cảm 3D:' : '3D Emotes:'}
        </span>
        {AGROU_EMOTES.map((em) => (
          <button
            key={em.id}
            type="button"
            data-testid={`emote-btn-${em.id}`}
            onClick={() => {
              sound.playCardFlip();
              onTriggerEmote(em.id);
            }}
            className="px-2.5 py-1 rounded-xl bg-[#2c1e15] hover:bg-[#462f1f] border border-[#7c532e] hover:border-[#f59e0b] text-[#fce8c3] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{em.icon}</span>
            <span>{em.label[lang]}</span>
          </button>
        ))}
      </div>

      {/* Row 2: Fun Throwing Props & Quick Tagging (Daytime) */}
      {isDayPhase && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-[#593c23]/70">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-extrabold text-[#d4a56a] mr-1">
              {t.funPropsLabel}
            </span>
            {(['tomato', 'egg', 'rose', 'water'] as PropType[]).map((pType) => {
              const isActive = activePropTool === pType;
              return (
                <button
                  key={pType}
                  type="button"
                  onClick={() => {
                    sound.playCardFlip();
                    onSelectPropTool(isActive ? null : pType);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border cursor-pointer ${
                    isActive
                      ? 'bg-[#e86f24] text-[#1a0f08] border-[#ffd089]'
                      : 'bg-[#241911] text-[#e8d5b9] border-[#5c3d24] hover:border-[#a87238]'
                  }`}
                >
                  {t.propButtons[pType]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              data-testid="toggle-tag-wolf-btn"
              onClick={() => onToggleTagMode('wolf_suspect')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border cursor-pointer ${
                tagToolMode === 'wolf_suspect'
                  ? 'bg-[#c73535] text-white border-[#fca5a5]'
                  : 'bg-[#241911] text-[#fca5a5] border-[#6b2a2a]'
              }`}
            >
              🐺 {lang === 'vi' ? 'Nghi Sói' : 'Suspect'}
            </button>
            <button
              type="button"
              data-testid="toggle-tag-trusted-btn"
              onClick={() => onToggleTagMode('trusted')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border cursor-pointer ${
                tagToolMode === 'trusted'
                  ? 'bg-[#2a8a56] text-white border-[#86efac]'
                  : 'bg-[#241911] text-[#86efac] border-[#265c3e]'
              }`}
            >
              🛡️ {lang === 'vi' ? 'Đáng Tin' : 'Trusted'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
