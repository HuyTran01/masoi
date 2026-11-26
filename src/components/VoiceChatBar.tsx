import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Mic,
  MicOff,
  Radio,
  ShieldCheck,
  Volume2,
  VolumeX,
  Sparkles,
  Waves,
} from 'lucide-react';
import { Player, Language, Phase } from '../types/game';
import { sound } from '../utils/sound';

interface VoiceChatBarProps {
  players: Player[];
  userPlayerId: string;
  phase?: Phase;
  isPlayerAwakeAtNight?: boolean;
  isMicOn?: boolean;
  onToggleMic?: () => void;
  activeSpeakers?: string[];
  onTriggerUserSpeech?: (transcript: string) => void;
  lang: Language;
  compact?: boolean;
}

const VOICE_I18N: Record<
  Language,
  {
    dayChannel: string;
    wolfChannel: string;
    nightAwakeChannel: string;
    ghostChannel: string;
    micOnBtn: string;
    micOffBtn: string;
    speakNowBtn: string;
    speakingPrefix: string;
    listeningIdle: string;
    antiCheatGhostTag: string;
    antiCheatEncryptedTag: string;
    ttsOn: string;
    ttsOff: string;
    sampleQuotesDay: string[];
    sampleQuotesWolf: string[];
    sampleQuotesGhost: string[];
    userQuickLines: string[];
  }
> = {
  vi: {
    dayChannel: '☀️ Kênh Voice Dân Làng (Thức Dậy)',
    wolfChannel: '🐺 Kênh Voice Đàn Sói (Mật)',
    nightAwakeChannel: '🔮 Mic Thức Đêm (Thì Thầm)',
    ghostChannel: '👻 Kênh Voice Hồn Ma (Đã Chết)',
    micOnBtn: 'Đang Bật Mic',
    micOffBtn: 'Bật Mic Nói',
    speakNowBtn: '🗣️ Phát Giọng Nói',
    speakingPrefix: 'Đang nói:',
    listeningIdle: 'Kênh thoại đang mở — Nhấn Bật Mic để thảo luận...',
    antiCheatGhostTag: 'Cách ly Hồn Ma',
    antiCheatEncryptedTag: 'Chống Gian Lận',
    ttsOn: 'Giọng đọc AI: BẬT',
    ttsOff: 'Giọng đọc AI: TẮT',
    sampleQuotesDay: [
      'Đêm qua tôi nghe tiếng động lạ gần nhà số #2!',
      'Tôi là Dân Làng thật, đừng treo cổ nhầm tôi!',
      'Tiên Tri ơi hãy lên tiếng dẫn đường cho dân làng đi!',
      'Ai vừa ném cà chua vào tôi thế, khai thật đi!',
      'Quan sát kỹ biểu cảm của người ngồi cạnh lửa trại kìa!',
    ],
    sampleQuotesWolf: [
      'Đêm nay đàn Sói thống nhất cắn mục tiêu tiên tri nhé!',
      'Suỵt! Nhẹ chân thôi kẻo Phù Thủy phát hiện.',
    ],
    sampleQuotesGhost: [
      'Hồn ma tụi mình bay vòng quanh xem ai là Sói thật kìa!',
      'Tiếc quá đêm qua Bảo Vệ đỡ trượt mất rồi...',
    ],
    userQuickLines: [
      'Mọi người bình tĩnh nghe tôi phân tích logic vòng này!',
      'Tôi cam đoan 100% mình thuộc phe Dân Làng!',
      'Hãy bỏ phiếu minh bạch, đừng để Sói dắt mũi!',
    ],
  },
  en: {
    dayChannel: '☀️ Village Voice Channel (Awake)',
    wolfChannel: '🐺 Wolf Pack Secret Voice',
    nightAwakeChannel: '🔮 Night Awake Mic (Whisper)',
    ghostChannel: '👻 Ghost Voice Channel (Dead)',
    micOnBtn: 'Mic LIVE',
    micOffBtn: 'Turn Mic ON',
    speakNowBtn: '🗣️ Push to Speak',
    speakingPrefix: 'Speaking:',
    listeningIdle: 'Voice channel active — Turn on Mic to discuss...',
    antiCheatGhostTag: 'Ghost Isolated',
    antiCheatEncryptedTag: 'Anti-Cheat ON',
    ttsOn: 'Voice Audio: ON',
    ttsOff: 'Voice Audio: OFF',
    sampleQuotesDay: [
      'I heard footsteps near seat #2 last night!',
      'I am a confirmed Villager, do not lynch me!',
      'Seer, please give us a hint before voting starts!',
      'Who just threw a tomato at me?!',
      'Watch the quiet players around the campfire!',
    ],
    sampleQuotesWolf: [
      'Wolves, let us coordinate our bite on the Seer tonight!',
      'Keep quiet so the Witch does not use her potion.',
    ],
    sampleQuotesGhost: [
      'Floating around as a ghost is hilarious, I see the Wolves!',
      'So close! Bodyguard almost saved me last night.',
    ],
    userQuickLines: [
      'Everyone listen carefully to my deduction for this round!',
      'I am 100% on the Villagers team, trust me!',
      'Let us vote carefully and catch the Werewolf today!',
    ],
  },
  fr: {
    dayChannel: '☀️ Canal Vocal du Village (Éveillé)',
    wolfChannel: '🐺 Canal Vocal Meute de Loups',
    nightAwakeChannel: '🔮 Micro Nuit (Chuchotement)',
    ghostChannel: '👻 Canal Vocal Fantômes',
    micOnBtn: 'Micro ACTIF',
    micOffBtn: 'Activer Micro',
    speakNowBtn: '🗣️ Parler',
    speakingPrefix: 'Parle :',
    listeningIdle: 'Canal vocal ouvert — Activez le micro pour parler...',
    antiCheatGhostTag: 'Fantômes Isolés',
    antiCheatEncryptedTag: 'Anti-Triche',
    ttsOn: 'Voix IA: ON',
    ttsOff: 'Voix IA: OFF',
    sampleQuotesDay: [
      'J’ai entendu des bruits près du joueur #2 cette nuit !',
      'Je suis un vrai Villageois, ne votez pas contre moi !',
      'Voyante, donne-nous un indice !',
    ],
    sampleQuotesWolf: [
      'Les Loups, ciblons la Voyante cette nuit !',
    ],
    sampleQuotesGhost: [
      'Depuis le monde spectral, je vois tous les Loups !',
    ],
    userQuickLines: [
      'Écoutez mon analyse logique pour ce tour !',
      'Je suis du côté du Village à 100% !',
    ],
  },
  es: {
    dayChannel: '☀️ Voz de la Aldea (Despiertos)',
    wolfChannel: '🐺 Voz Secreta de Lobos',
    nightAwakeChannel: '🔮 Micrófono Nocturno',
    ghostChannel: '👻 Canal de Voz Fantasma',
    micOnBtn: 'Micro ACTIVO',
    micOffBtn: 'Activar Micro',
    speakNowBtn: '🗣️ Hablar Ahora',
    speakingPrefix: 'Hablando:',
    listeningIdle: 'Canal de voz abierto — Activa el micro para debatir...',
    antiCheatGhostTag: 'Fantasmas Aislados',
    antiCheatEncryptedTag: 'Anti-Trampas',
    ttsOn: 'Voz IA: ON',
    ttsOff: 'Voz IA: OFF',
    sampleQuotesDay: [
      '¡Anoche escuché pasos cerca del asiento #2!',
      '¡Soy Aldeano real, no me cuelguen!',
      '¡Vidente, danos una pista antes de votar!',
    ],
    sampleQuotesWolf: [
      '¡Lobos, ataquemos juntos esta noche!',
    ],
    sampleQuotesGhost: [
      '¡Desde el canal fantasma veo quiénes son los Lobos!',
    ],
    userQuickLines: [
      '¡Escuchen mi análisis lógico de esta ronda!',
      '¡Estoy 100% con los Aldeanos!',
    ],
  },
  ja: {
    dayChannel: '☀️ 村人ボイスチャット (起床中)',
    wolfChannel: '🐺 人狼秘密ボイスチャンネル',
    nightAwakeChannel: '🔮 夜間行動マイク (ささやき)',
    ghostChannel: '👻 霊界ボイスチャンネル (幽霊)',
    micOnBtn: 'マイク ON',
    micOffBtn: 'マイクをONにする',
    speakNowBtn: '🗣️ 発言する',
    speakingPrefix: '発言中:',
    listeningIdle: 'ボイスチャット稼働中 — マイクONで議論に参加...',
    antiCheatGhostTag: '霊界隔離ON',
    antiCheatEncryptedTag: '不正防止ON',
    ttsOn: 'AI音声: ON',
    ttsOff: 'AI音声: OFF',
    sampleQuotesDay: [
      '昨夜、#2の近くで足音が聞こえたよ！',
      '私は本物の村人です、吊らないで！',
      '占い師さん、ヒントをください！',
    ],
    sampleQuotesWolf: [
      '今夜は占い師を狙って襲撃しよう！',
    ],
    sampleQuotesGhost: [
      '幽霊モードで空から見物中、人狼が誰か分かったぞ！',
    ],
    userQuickLines: [
      'みなさん、このラウンドの推理を聞いてください！',
      '私は100%村人陣営です！',
    ],
  },
};

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({
  players,
  userPlayerId,
  phase = 'day_discussion',
  isMicOn: controlledMicOn,
  onToggleMic,
  activeSpeakers = [],
  onTriggerUserSpeech,
  lang,
  compact = false,
}) => {
  const [internalMicOn, setInternalMicOn] = useState<boolean>(false);
  const vt = VOICE_I18N[lang] || VOICE_I18N.vi;
  const userPlayer = players.find((p) => p.id === userPlayerId) || players[0];
  const isUserAlive = userPlayer?.isAlive ?? true;
  const isMicOn = isUserAlive && (controlledMicOn !== undefined ? controlledMicOn : internalMicOn);
  const handleToggleMic = () => {
    if (!isUserAlive) return;
    if (onToggleMic) onToggleMic();
    else setInternalMicOn((m) => !m);
  };
  const isWerewolf =
    userPlayer?.roleId === 'werewolf' || userPlayer?.roleId === 'wolf_pup';
  const otherLivingWolfTeammates = players.filter(
    (p) =>
      p.isAlive &&
      p.id !== userPlayerId &&
      (p.roleId === 'werewolf' || p.roleId === 'wolf_pup')
  );
  const isSoloWolfAtNight =
    isUserAlive && phase === 'night' && isWerewolf && otherLivingWolfTeammates.length === 0;

  const [micLevel, setMicLevel] = useState<number>(0);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(false);
  const [quickLineIdx, setQuickLineIdx] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  // Determine current voice channel label & theme
  const channelInfo = !isUserAlive
    ? {
        label:
          lang === 'vi'
            ? '👻 Hồn Ma — Mic & Chat Đã Khóa'
            : '👻 Ghost — Mic & Chat Locked',
        borderClass: 'border-rose-500/50 bg-[#140a10]/95',
        badgeClass: 'bg-rose-950 text-rose-300 border-rose-500/50',
      }
    : phase === 'night' && isWerewolf
    ? {
        label: vt.wolfChannel,
        borderClass: 'border-rose-500/60 bg-[#190912]/95',
        badgeClass: 'bg-rose-950 text-rose-300 border-rose-500/50',
      }
    : phase === 'night'
    ? {
        label: vt.nightAwakeChannel,
        borderClass: 'border-indigo-500/50 bg-[#0b1024]/95',
        badgeClass: 'bg-indigo-950 text-indigo-300 border-indigo-500/40',
      }
    : {
        label: vt.dayChannel,
        borderClass: 'border-amber-500/50 bg-[#090d18]/95',
        badgeClass: 'bg-amber-950 text-amber-300 border-amber-500/40',
      };

  // Real Web Audio API Microphone Level Analyzer with graceful simulated fallback
  useEffect(() => {
    if (!isMicOn) {
      setMicLevel(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      return;
    }

    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let isCancelled = false;

    const startRealOrSimulatedMic = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (isCancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          mediaStreamRef.current = stream;
          const AudioCtx =
            window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateMeter = () => {
            if (isCancelled) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            const normalized = Math.min(100, Math.max(18, Math.round((avg / 128) * 100)));
            setMicLevel(normalized);
            rafRef.current = requestAnimationFrame(updateMeter);
          };
          updateMeter();
          return;
        }
      } catch {
        // Fallback to realistic simulated voice modulation when in sandboxed iframe or no hardware mic
      }

      fallbackInterval = setInterval(() => {
        setMicLevel(Math.floor(35 + Math.random() * 60));
      }, 180);
    };

    startRealOrSimulatedMic();

    return () => {
      isCancelled = true;
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [isMicOn]);

  // BUG-13: Filter activeSpeakers strictly on Night Wolf Channel so Villagers NEVER speak in Wolf channel
  const filteredActiveSpeakers =
    phase === 'night' && isWerewolf
      ? activeSpeakers.filter((key) => {
          const p = players.find((pl) => pl.id === key || pl.name === key);
          return Boolean(
            p &&
              p.isAlive &&
              p.id !== userPlayerId &&
              (p.roleId === 'werewolf' || p.roleId === 'wolf_pup')
          );
        })
      : activeSpeakers;

  // Update live voice transcript snippet when filteredActiveSpeakers change
  useEffect(() => {
    if (isSoloWolfAtNight) {
      setLiveTranscript(
        lang === 'vi'
          ? 'Bạn là Sói duy nhất đêm nay — hãy tự chọn mục tiêu.'
          : 'You are the lone Wolf tonight — choose your target.'
      );
      return;
    }
    if (filteredActiveSpeakers.length === 0) {
      setLiveTranscript('');
      return;
    }
    const speakerKey = filteredActiveSpeakers[0];
    const speaker = players.find((p) => p.id === speakerKey || p.name === speakerKey);
    if (!speaker) return;

    const pool = !isUserAlive
      ? vt.sampleQuotesGhost
      : phase === 'night' && isWerewolf
      ? vt.sampleQuotesWolf
      : vt.sampleQuotesDay;
    const quote = pool[Math.floor(Math.random() * pool.length)] || pool[0];
    const line = `${speaker.name}: "${quote}"`;
    setLiveTranscript(line);

    if (ttsEnabled && !sound.getMuted()) {
      sound.speakLocalized(quote, lang, { rate: 1.06, volume: 0.72 });
    }
  }, [filteredActiveSpeakers.join(','), isSoloWolfAtNight, players, isUserAlive, phase, isWerewolf, vt, ttsEnabled, lang]);

  const handlePushToSpeak = () => {
    if (!isUserAlive) return;
    sound.playCardFlip();
    if (!isMicOn) {
      handleToggleMic();
    }
    const line = vt.userQuickLines[quickLineIdx % vt.userQuickLines.length];
    setQuickLineIdx((i) => i + 1);
    setLiveTranscript(`${userPlayer.name}: "${line}"`);
    setMicLevel(92);
    if (onTriggerUserSpeech) {
      onTriggerUserSpeech(line);
    }
  };

  const speakerNames = filteredActiveSpeakers
    .map((key) => players.find((p) => p.id === key || p.name === key)?.name || key)
    .filter(Boolean) as string[];

  if (compact) {
    return (
      <div
        data-testid="live-voice-chat-bar"
        className={`pointer-events-auto flex items-center justify-between gap-1 sm:gap-2 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border shadow-lg max-w-[94vw] transition-all ${channelInfo.borderClass}`}
      >
        {/* Left: Channel Badge + Equalizer + Active Speaker / Live Quote */}
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <span
            className={`px-1.5 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-extrabold whitespace-nowrap flex items-center gap-1 ${channelInfo.badgeClass}`}
          >
            <Radio
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 ${
                isMicOn || speakerNames.length > 0 ? 'animate-pulse text-emerald-400' : ''
              }`}
            />
            <span className="max-w-[115px] sm:max-w-none truncate">{channelInfo.label}</span>
          </span>

          {/* Animated Voice Waveform Bars */}
          <div className="flex items-end gap-0.5 h-3 shrink-0 px-0.5" aria-hidden="true">
            {[0.6, 1, 0.75, 0.9].map((mult, idx) => {
              const active = isMicOn || speakerNames.length > 0;
              const h = isMicOn
                ? Math.max(3, Math.round((micLevel / 100) * 12 * mult))
                : active
                ? Math.round(9 * mult)
                : 3;
              return (
                <span
                  key={idx}
                  style={{ height: `${h}px` }}
                  className={`w-0.5 sm:w-1 rounded-full transition-all duration-150 ${
                    isMicOn
                      ? 'bg-emerald-400'
                      : active
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-600'
                  }`}
                />
              );
            })}
          </div>

          <span
            className={`text-[9px] sm:text-[10px] text-slate-200 font-semibold truncate max-w-[110px] sm:max-w-[240px] ${
              !liveTranscript && speakerNames.length === 0 ? 'hidden md:inline' : ''
            }`}
          >
            {liveTranscript
              ? `🎙️ ${liveTranscript}`
              : speakerNames.length > 0
              ? `${vt.speakingPrefix} ${speakerNames.join(', ')}`
              : vt.listeningIdle}
          </span>
        </div>

        {/* Right: Mic Toggle + Quick Push-to-Speak Button (Strictly Locked When Dead) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid="voice-mic-toggle-btn"
            disabled={!isUserAlive}
            onClick={() => {
              if (!isUserAlive) return;
              sound.playCardFlip();
              handleToggleMic();
            }}
            className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold flex items-center gap-1 transition-all ${
              !isUserAlive
                ? 'bg-slate-800 border border-rose-500/40 text-rose-300 opacity-80 cursor-not-allowed'
                : isMicOn
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm cursor-pointer'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm cursor-pointer'
            }`}
          >
            {!isUserAlive ? (
              <>
                <Lock className="w-3 h-3" />
                <span>{lang === 'vi' ? 'Mic Đã Khóa' : 'Mic Locked'}</span>
              </>
            ) : isMicOn ? (
              <>
                <Mic className="w-3 h-3" />
                <span>{vt.micOnBtn}</span>
              </>
            ) : (
              <>
                <MicOff className="w-3 h-3" />
                <span>{vt.micOffBtn}</span>
              </>
            )}
          </button>

          {isUserAlive && (
            <button
              type="button"
              data-testid="voice-ptt-btn"
              onClick={handlePushToSpeak}
              className="hidden sm:flex px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[10px] font-extrabold items-center gap-1 cursor-pointer"
            >
              <Waves className="w-3 h-3 text-amber-400" />
              <span>{vt.speakNowBtn}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full Panel Mode (inside Chat & Voice Drawer)
  return (
    <div
      data-testid="drawer-voice-chat-panel"
      className={`border rounded-2xl p-3 mb-2.5 shadow-lg ${channelInfo.borderClass}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
              isMicOn
                ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <Radio className={`w-4 h-4 ${isMicOn ? 'animate-pulse text-emerald-400' : ''}`} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-extrabold text-amber-200">{channelInfo.label}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-emerald-300 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                {!isUserAlive ? vt.antiCheatGhostTag : vt.antiCheatEncryptedTag}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate mt-0.5">
              {liveTranscript
                ? `🎙️ ${liveTranscript}`
                : speakerNames.length > 0
                ? `${vt.speakingPrefix} ${speakerNames.join(', ')}`
                : vt.listeningIdle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border flex items-center gap-1 cursor-pointer ${
              ttsEnabled
                ? 'bg-sky-900/80 border-sky-400 text-sky-100'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{ttsEnabled ? vt.ttsOn : vt.ttsOff}</span>
          </button>

          {isUserAlive && (
            <button
              type="button"
              onClick={handlePushToSpeak}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{vt.speakNowBtn}</span>
            </button>
          )}

          <button
            type="button"
            data-testid="drawer-voice-mic-btn"
            disabled={!isUserAlive}
            onClick={() => {
              if (!isUserAlive) return;
              sound.playCardFlip();
              handleToggleMic();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 ${
              !isUserAlive
                ? 'bg-slate-800 border border-rose-500/50 text-rose-300 opacity-85 cursor-not-allowed'
                : isMicOn
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md cursor-pointer'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md cursor-pointer'
            }`}
          >
            {!isUserAlive ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Đã khóa Mic (Hồn Ma)' : 'Mic Locked (Ghost)'}</span>
              </>
            ) : isMicOn ? (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>{vt.micOnBtn}</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>{vt.micOffBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
