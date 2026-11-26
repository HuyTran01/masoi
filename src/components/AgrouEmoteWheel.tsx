import React from 'react';
import { X } from 'lucide-react';
import { Language, PropType } from '../types/game';
import { AGROU_EMOTES, AgrouEmoteId } from '../game/agrouMechanics';
import { UI_TEXT } from '../utils/i18n';
import { sound } from '../utils/sound';

interface AgrouEmoteWheelProps {
  lang: Language;
  isDayPhase: boolean;
  isAlive?: boolean;
  activePropTool: PropType | null;
  onTriggerEmote: (emote: AgrouEmoteId) => void;
  onSelectPropTool: (prop: PropType | null) => void;
  onClose?: () => void;
}

export const AgrouEmoteWheel: React.FC<AgrouEmoteWheelProps> = ({
  lang,
  isDayPhase,
  isAlive = true,
  activePropTool,
  onTriggerEmote,
  onSelectPropTool,
  onClose,
}) => {
  const t = UI_TEXT[lang];

  return (
    <div
      data-testid="agrou-emote-props-popover"
      className="w-full agrou-wood-panel rounded-2xl p-2.5 space-y-2"
    >
      {/* Header with explicit Close button */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#593c23]/70">
        <span className="text-[11px] font-extrabold text-[#f5c879] flex items-center gap-1">
          <span>🎭</span>
          <span>{t.emotesAndProps}</span>
        </span>
        {onClose && (
          <button
            type="button"
            data-testid="close-emote-props-popover-btn"
            onClick={onClose}
            aria-label={t.closeEsc}
            className="min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 p-1.5 sm:p-1 rounded-lg bg-[#2c1e15] hover:bg-[#462f1f] border border-[#7c532e] text-[#fce8c3] flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {!isAlive ? (
        <div
          data-testid="emote-props-ghost-disabled"
          className="text-[11px] font-bold text-rose-300 bg-[#2a1518] border border-rose-500/40 rounded-xl px-2.5 py-2"
        >
          {{
            vi: '👻 Hồn Ma không thể dùng biểu cảm hoặc ném đạo cụ 3D.',
            en: '👻 Ghosts cannot use emotes or throw 3D props.',
            fr: '👻 Les fantômes ne peuvent ni utiliser d’émotes ni lancer d’objets 3D.',
            es: '👻 Los fantasmas no pueden usar gestos ni lanzar objetos 3D.',
            ja: '👻 幽霊はエモートや3Dアイテムを使用できません。',
          }[lang]}
        </div>
      ) : (
        <>
          {/* Row 1: Agrou 3D Campfire Emotes */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-extrabold text-[#f2be6b] mr-1 whitespace-nowrap">
              {t.emotes3dLabel}
            </span>
            {AGROU_EMOTES.map((em) => (
              <button
                key={em.id}
                type="button"
                data-testid={`emote-btn-${em.id}`}
                aria-label={em.label[lang]}
                onClick={() => {
                  sound.playCardFlip();
                  onTriggerEmote(em.id);
                  onClose?.();
                }}
                className="min-h-[36px] sm:min-h-0 px-2.5 py-1.5 sm:py-1 rounded-xl bg-[#2c1e15] hover:bg-[#462f1f] border border-[#7c532e] hover:border-[#f59e0b] text-[#fce8c3] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{em.icon}</span>
                <span>{em.label[lang]}</span>
              </button>
            ))}
          </div>

          {/* Row 2: Fun Throwing Props (Daytime) */}
          {isDayPhase && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#593c23]/70">
              <span className="text-[10px] font-extrabold text-[#d4a56a] mr-1">
                {t.funPropsLabel}
              </span>
              {(['tomato', 'egg', 'rose', 'water'] as PropType[]).map((pType) => {
                const isActive = activePropTool === pType;
                return (
                  <button
                    key={pType}
                    type="button"
                    data-testid={`prop-btn-${pType}`}
                    aria-label={t.propButtons[pType]}
                    aria-pressed={isActive}
                    onClick={() => {
                      sound.playCardFlip();
                      onSelectPropTool(isActive ? null : pType);
                      onClose?.();
                    }}
                    className={`min-h-[36px] sm:min-h-0 px-2.5 py-1.5 sm:px-2 sm:py-0.5 rounded-lg text-[10px] font-extrabold border cursor-pointer ${
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
          )}
        </>
      )}
    </div>
  );
};
