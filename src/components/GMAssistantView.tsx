import React, { useState, useEffect } from 'react';
import {
  Shield,
  Moon,
  Sun,
  Users,
  Shuffle,
  Volume2,
  ChevronRight,
  ChevronLeft,
  Skull,
  Heart,
  Eye,
  Plus,
  Trash2,
  Timer,
  Play,
  RotateCcw,
  Smartphone,
  Sparkles,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Player, RoleId, Language, NightActions, NightResult } from '../types/game';
import { ROLES } from '../game/roles';
import {
  generateBalancedRoster,
  resolveNightActions,
  applyDayLynch,
  checkWinCondition,
  resolveHunterShot,
} from '../game/rules';
import { sound, ROLE_CALLOUT_LINES } from '../utils/sound';
import { TRANSLATIONS } from '../utils/i18n';
import { addMatchHistory } from '../utils/storage';
import confetti from 'canvas-confetti';

interface GMAssistantViewProps {
  lang: Language;
  initialRoomId?: string;
  initialPlayerCount?: number;
  onOpenVirtualCards: (roomId: string) => void;
}

const DEFAULT_PLAYERS: string[] = [
  'Bảo An',
  'Tuấn Kiệt',
  'Minh Hoàng',
  'Thảo My',
  'Hữu Phước',
  'Kim Ngân',
  'Đức Huy',
  'Quỳnh Anh',
  'Gia Bảo',
  'Phương Linh',
  'Hải Đăng',
  'Thanh Trúc',
  'Khánh Duy',
  'Ngọc Ánh',
  'Hoàng Nam',
  'Trúc Lam',
  'Nhật Minh',
  'Thiên Kim',
  'Anh Tuấn',
  'Bích Ngọc',
];

export const GMAssistantView: React.FC<GMAssistantViewProps> = ({
  lang,
  initialRoomId,
  initialPlayerCount = 8,
  onOpenVirtualCards,
}) => {
  const t = TRANSLATIONS[lang];

  const [roomId, setRoomId] = useState<string>(
    () => initialRoomId || 'GM-' + Math.floor(1000 + Math.random() * 9000)
  );
  const [playerNames, setPlayerNames] = useState<string[]>(() =>
    DEFAULT_PLAYERS.slice(0, Math.max(4, Math.min(20, initialPlayerCount)))
  );
  const [customCountInput, setCustomCountInput] = useState<string>(() =>
    String(Math.max(4, Math.min(20, initialPlayerCount)))
  );
  const [newNameInput, setNewNameInput] = useState<string>('');
  const [assignedRoles, setAssignedRoles] = useState<RoleId[]>(() =>
    generateBalancedRoster(Math.max(4, Math.min(20, initialPlayerCount)))
  );

  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [currentPhase, setCurrentPhase] = useState<'night' | 'day'>('night');
  const [nightStep, setNightStep] = useState<number>(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [wolfPupFrenzy, setWolfPupFrenzy] = useState<boolean>(false);
  const [activeCalloutBanner, setActiveCalloutBanner] = useState<string>(
    'Bấm các nút Âm Hiệu bên dưới để phát tiếng Sói Hú, Phù Thủy Ma Mị hoặc Thợ Săn "Tao có súng đó nha!"'
  );

  useEffect(() => {
    if (initialRoomId) setRoomId(initialRoomId);
  }, [initialRoomId]);

  // Auto-sync room roster to localStorage so VirtualCardPlayerView always loads the exact GM roster
  useEffect(() => {
    const activeRoster: Player[] = isGameStarted
      ? players
      : playerNames.map((name, i) => ({
          id: `p_${i + 1}`,
          name,
          avatar: ['🐺', '🔮', '🛡️', '🧪', '🎯', '💘', '🎭', '👑', '🔥', '🧑‍🌾'][i % 10],
          roleId: assignedRoles[i] || 'villager',
          isAlive: true,
          elderLives: assignedRoles[i] === 'elder' ? 2 : undefined,
        }));
    try {
      localStorage.setItem(
        `werewolf_room_${roomId.trim().toUpperCase()}`,
        JSON.stringify({
          roomId: roomId.trim().toUpperCase(),
          players: activeRoster,
          status: isGameStarted ? currentPhase : 'setup',
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [roomId, playerNames, assignedRoles, players, isGameStarted, currentPhase]);

  const [nightActions, setNightActions] = useState<NightActions>({
    wolfTargetId: null,
    secondWolfTargetId: null,
    guardTargetId: null,
    seerTargetId: null,
    witchHealTargetId: null,
    witchPoisonTargetId: null,
    cupidLovers: null,
    doppelgangerTargetId: null,
  });

  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [selectedLynchTargetId, setSelectedLynchTargetId] = useState<string>('');
  const [hunterVictimId, setHunterVictimId] = useState<string>('');
  const [showHunterModal, setShowHunterModal] = useState<boolean>(false);
  const [activeHunterId, setActiveHunterId] = useState<string>('');

  const [lastNightSummary, setLastNightSummary] = useState<string[]>([]);
  const [lastNightResult, setLastNightResult] = useState<NightResult | null>(null);
  const [gameResult, setGameResult] = useState<{
    isOver: boolean;
    winner: string | null;
    reason: string;
  } | null>(null);

  const triggerRoleVoice = (roleId: RoleId) => {
    const info = sound.playRoleCallout(roleId, lang);
    setActiveCalloutBanner(`${info.sfxLabel}: "${info.quote}"`);
  };

  const handleSetCustomPlayerCount = (rawCount: number) => {
    const clamped = Math.max(4, Math.min(20, Math.round(rawCount) || 8));
    sound.playCardFlip();
    setCustomCountInput(String(clamped));
    setPlayerNames((prev) => {
      if (prev.length === clamped) return prev;
      if (prev.length > clamped) return prev.slice(0, clamped);
      const next = [...prev];
      while (next.length < clamped) {
        const candidate =
          DEFAULT_PLAYERS[next.length] || `Người Chơi #${next.length + 1}`;
        next.push(candidate);
      }
      return next;
    });
    setAssignedRoles(generateBalancedRoster(clamped));
  };

  const handleRegenerateRoles = () => {
    sound.playCardFlip();
    const newRoles = generateBalancedRoster(playerNames.length);
    setAssignedRoles(newRoles);
  };

  const handleAddPlayer = () => {
    if (!newNameInput.trim() || playerNames.length >= 20) return;
    const updated = [...playerNames, newNameInput.trim()];
    setPlayerNames(updated);
    setCustomCountInput(String(updated.length));
    setAssignedRoles(generateBalancedRoster(updated.length));
    setNewNameInput('');
  };

  const handleRemovePlayer = (index: number) => {
    if (playerNames.length <= 4) return;
    const updated = playerNames.filter((_, i) => i !== index);
    setPlayerNames(updated);
    setCustomCountInput(String(updated.length));
    setAssignedRoles(generateBalancedRoster(updated.length));
  };

  const handleUpdateRole = (index: number, newRole: RoleId) => {
    const updated = [...assignedRoles];
    updated[index] = newRole;
    setAssignedRoles(updated);
  };

  const handleStartGame = () => {
    sound.playNightBell();
    const initialPlayers: Player[] = playerNames.map((name, i) => ({
      id: `p_${i + 1}`,
      name,
      avatar: ['🐺', '🔮', '🛡️', '🧪', '🎯', '💘', '🎭', '👑', '🔥', '🧑‍🌾'][i % 10],
      roleId: assignedRoles[i] || 'villager',
      isAlive: true,
      elderLives: assignedRoles[i] === 'elder' ? 2 : undefined,
    }));

    localStorage.setItem(
      `werewolf_room_${roomId}`,
      JSON.stringify({
        roomId,
        players: initialPlayers,
        status: 'playing',
      })
    );

    setPlayers(initialPlayers);
    setIsGameStarted(true);
    setRoundNumber(1);
    setCurrentPhase('night');
    setNightStep(0);
    setWolfPupFrenzy(false);
    setNightActions({
      wolfTargetId: null,
      secondWolfTargetId: null,
      guardTargetId: null,
      seerTargetId: null,
      witchHealTargetId: null,
      witchPoisonTargetId: null,
      cupidLovers: null,
      doppelgangerTargetId: null,
    });
    setLastNightSummary([]);
    setLastNightResult(null);
    setGameResult(null);
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      sound.playGavel();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const hasCupid = roundNumber === 1 && players.some((p) => p.roleId === 'cupid');
  const hasDoppel = roundNumber === 1 && players.some((p) => p.roleId === 'doppelganger');

  interface NightStepDef {
    id: string;
    roleId: RoleId;
    title: string;
    description: string;
    prompt: string;
  }

  const nightSteps: NightStepDef[] = [];

  if (hasCupid) {
    nightSteps.push({
      id: 'cupid',
      roleId: 'cupid',
      title: 'Cupid (Thần Tình Yêu) Thức Dậy',
      description: 'Quản trò gọi: "Cupid thức dậy, chọn 2 người làm tình nhân."',
      prompt: 'Sau đó quản trò cho Cupid đi ngủ và chạm vai 2 tình nhân để họ biết nhau.',
    });
  }

  if (hasDoppel) {
    nightSteps.push({
      id: 'doppelganger',
      roleId: 'doppelganger',
      title: 'Nhân Bản Thức Dậy',
      description: 'Quản trò gọi: "Nhân Bản thức dậy, chọn 1 người làm hình mẫu."',
      prompt: 'Quản trò ghi nhớ người được chọn.',
    });
  }

  nightSteps.push({
    id: 'werewolves',
    roleId: 'werewolf',
    title: wolfPupFrenzy
      ? 'Đàn Ma Sói Cuồng Nộ (Cắn 2 Nạn Nhân)'
      : 'Đàn Ma Sói & Sói Con Thức Dậy',
    description: 'Quản trò gọi: "Ma sói thức dậy, cùng thống nhất chọn nạn nhân (có thể tự cắn Sói để hack não)."',
    prompt: wolfPupFrenzy
      ? 'Sói Con đã chết vòng trước! Chọn tới 2 nạn nhân bị cắn đêm nay:'
      : 'Chọn người bị bầy sói thống nhất cắn đêm nay:',
  });

  if (players.some((p) => p.roleId === 'witch' && p.isAlive)) {
    nightSteps.push({
      id: 'witch',
      roleId: 'witch',
      title: 'Phù Thủy Thức Dậy',
      description:
        'Quản trò gọi: "Phù Thủy thức dậy, người này bị sói cắn. Có cứu không? Có đầu độc ai không?"',
      prompt: 'Ghi nhận quyết định dùng bình Cứu / bình Độc (mỗi bình 1 lần):',
    });
  }

  if (players.some((p) => p.roleId === 'seer' && p.isAlive)) {
    nightSteps.push({
      id: 'seer',
      roleId: 'seer',
      title: 'Tiên Tri Thức Dậy',
      description: 'Quản trò gọi: "Tiên Tri thức dậy, chọn 1 người muốn soi."',
      prompt: 'Quản trò ra dấu: Ngón cái lên = Dân Làng, Chỉ xuống = Ma Sói:',
    });
  }

  if (players.some((p) => p.roleId === 'bodyguard' && p.isAlive)) {
    nightSteps.push({
      id: 'bodyguard',
      roleId: 'bodyguard',
      title: 'Bảo Vệ Thức Dậy',
      description: 'Quản trò gọi: "Bảo Vệ thức dậy, chọn 1 người để che chở đêm nay."',
      prompt: 'Lưu ý: Không được bảo vệ cùng 1 người 2 đêm liên tiếp!',
    });
  }

  const handleResolveNight = () => {
    sound.playDayGong();
    const { updatedPlayers, result } = resolveNightActions(players, nightActions, {
      wolfPupTriggered: wolfPupFrenzy,
      roundNumber,
    });

    setPlayers(updatedPlayers);
    setLastNightSummary(result.summary);
    setLastNightResult(result);
    setWolfPupFrenzy(Boolean(result.wolfPupTriggeredNextNight));
    setCurrentPhase('day');
    setTimerSeconds(90);
    setIsTimerRunning(false);

    localStorage.setItem(
      `werewolf_room_${roomId}`,
      JSON.stringify({
        roomId,
        players: updatedPlayers,
        status: 'day',
      })
    );

    if (result.triggeredHunterId) {
      triggerRoleVoice('hunter');
      setActiveHunterId(result.triggeredHunterId);
      setShowHunterModal(true);
      return;
    }

    const winCheck = checkWinCondition(updatedPlayers);
    if (winCheck.isOver) {
      setGameResult(winCheck);
      sound.playVictory();
      confetti({ particleCount: 90, spread: 70 });
      addMatchHistory({
        id: 'match_' + Date.now(),
        roomId,
        date: new Date().toLocaleString(),
        winner: winCheck.winner || 'villagers',
        rounds: roundNumber,
        playersCount: updatedPlayers.length,
        mvp: 'Quản Trò Vận Hành',
        roster: updatedPlayers.map((p) => ({
          name: p.name,
          roleId: p.roleId,
          isAlive: p.isAlive,
        })),
      });
    }
  };

  const handleExecuteLynch = () => {
    if (!selectedLynchTargetId) return;

    sound.playGavel();
    const target = players.find((p) => p.id === selectedLynchTargetId);
    if (!target) return;

    const { updatedPlayers, wolfPupTriggeredNextNight, triggeredHunterId, cascadeMessages } =
      applyDayLynch(players, selectedLynchTargetId);

    if (wolfPupTriggeredNextNight) {
      setWolfPupFrenzy(true);
    }
    if (cascadeMessages.length > 0) {
      setLastNightSummary((prev) => [...prev, ...cascadeMessages]);
    }

    setPlayers(updatedPlayers);
    const lynchedId = selectedLynchTargetId;
    setSelectedLynchTargetId('');

    if (triggeredHunterId) {
      triggerRoleVoice('hunter');
      setActiveHunterId(triggeredHunterId);
      setShowHunterModal(true);
      return;
    }

    const winCheck = checkWinCondition(updatedPlayers, lynchedId);
    if (winCheck.isOver) {
      setGameResult(winCheck);
      sound.playVictory();
      confetti({ particleCount: 100, spread: 80 });
      addMatchHistory({
        id: 'match_' + Date.now(),
        roomId,
        date: new Date().toLocaleString(),
        winner: winCheck.winner || 'villagers',
        rounds: roundNumber,
        playersCount: updatedPlayers.length,
        mvp: `${target.name}`,
        roster: updatedPlayers.map((p) => ({
          name: p.name,
          roleId: p.roleId,
          isAlive: p.isAlive,
        })),
      });
    } else {
      handleNextNight();
    }
  };

  const handleConfirmHunterShot = () => {
    if (!hunterVictimId) return;
    sound.playDeath();
    const { updatedPlayers, wolfPupTriggeredNextNight, cascadeMessages } = resolveHunterShot(
      players,
      activeHunterId,
      hunterVictimId
    );
    if (wolfPupTriggeredNextNight) {
      setWolfPupFrenzy(true);
    }
    if (cascadeMessages.length > 0) {
      setLastNightSummary((prev) => [...prev, ...cascadeMessages]);
    }
    setShowHunterModal(false);
    setHunterVictimId('');
    setPlayers(updatedPlayers);

    const winCheck = checkWinCondition(updatedPlayers);
    if (winCheck.isOver) {
      setGameResult(winCheck);
      sound.playVictory();
      confetti({ particleCount: 90, spread: 70 });
    }
  };

  const handleNextNight = () => {
    sound.playNightBell();
    setRoundNumber((r) => r + 1);
    setCurrentPhase('night');
    setNightStep(0);
    setNightActions({
      wolfTargetId: null,
      secondWolfTargetId: null,
      guardTargetId: null,
      seerTargetId: null,
      witchHealTargetId: null,
      witchPoisonTargetId: null,
      cupidLovers: null,
      doppelgangerTargetId: null,
    });
    setLastNightSummary([]);
    setLastNightResult(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 text-slate-100">
      {/* Header Banner */}
      <div className="bg-[#0f172a] border border-amber-700/50 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Shield className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-amber-200">
              {t.gmAssistant}
            </h2>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Công cụ tối ưu cho Quản Trò ngoài đời thực: gọi vai kèm âm thanh & câu thoại ma mị, tự động ghi nhớ Bảo Vệ trùng đêm, Sói Con cuồng nộ, Tình Nhân quyên sinh và phát bài qua ĐT.
          </p>
        </div>

        <div className="bg-[#090d18] border border-amber-600/40 rounded-xl px-4 py-2 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Mã Phòng Điện Thoại
          </span>
          <span className="text-base font-mono font-extrabold text-amber-300 tracking-widest">
            {roomId}
          </span>
          <button
            onClick={() => onOpenVirtualCards(roomId)}
            className="mt-0.5 text-[11px] text-amber-400 hover:text-amber-300 underline flex items-center justify-center gap-1 font-semibold cursor-pointer"
          >
            <Smartphone className="w-3 h-3" />
            Mở Thẻ Bài Người Chơi
          </button>
        </div>
      </div>

      {/* Soundboard & Role Voice Callouts Bar for Real-Life GM */}
      <div className="bg-[#090d18] border border-amber-600/40 rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-rose-400" />
            Bàn Phím Âm Hiệu & Giọng Gọi Vai Kịch Tính (Chạm Để Phát Loa)
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { role: 'werewolf', label: '🐺 Gọi Sói Hú' },
              { role: 'witch', label: '🧪 Gọi Phù Thủy Ma Mị' },
              { role: 'hunter', label: '🎯 Thợ Săn: "Tao có súng!"' },
              { role: 'seer', label: '🔮 Gọi Tiên Tri' },
              { role: 'bodyguard', label: '🛡️ Gọi Bảo Vệ' },
              { role: 'cupid', label: '💘 Gọi Cupid' },
            ] as { role: RoleId; label: string }[]
          ).map((item) => (
            <button
              key={item.role}
              type="button"
              onClick={() => triggerRoleVoice(item.role)}
              className="px-3 py-1.5 rounded-xl bg-[#131c31] hover:bg-amber-500/20 border border-slate-700 hover:border-amber-400 text-xs font-bold text-amber-100 transition-all cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="px-3 py-2 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-amber-200 font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{activeCalloutBanner}</span>
        </div>
      </div>

      {!isGameStarted ? (
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Danh Sách Người Chơi ({playerNames.length} người)
              </h3>
            </div>

            {/* Quick Presets + Custom Player Count Selector (4..20 players) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-[#090d18] border border-slate-800 rounded-xl p-1">
                {[6, 8, 10, 12].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => handleSetCustomPlayerCount(cnt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer transition-all ${
                      playerNames.length === cnt
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-amber-300'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>

              {/* Custom Number Stepper & Input */}
              <div className="flex items-center gap-1 bg-[#090d18] border border-amber-500/40 rounded-xl px-2 py-1">
                <span className="text-[10px] font-bold uppercase text-amber-400 mr-1">
                  Tuỳ chỉnh:
                </span>
                <button
                  type="button"
                  data-testid="gm-custom-count-dec"
                  onClick={() => handleSetCustomPlayerCount(playerNames.length - 1)}
                  disabled={playerNames.length <= 4}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                  aria-label="Giảm số người chơi"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min={4}
                  max={20}
                  data-testid="gm-custom-count-input"
                  value={customCountInput}
                  onChange={(e) => {
                    setCustomCountInput(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!Number.isNaN(val) && val >= 4 && val <= 20) {
                      handleSetCustomPlayerCount(val);
                    }
                  }}
                  className="w-11 text-center bg-slate-950 border border-slate-700 rounded-lg py-0.5 text-xs font-mono font-extrabold text-amber-300 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  data-testid="gm-custom-count-inc"
                  onClick={() => handleSetCustomPlayerCount(playerNames.length + 1)}
                  disabled={playerNames.length >= 20}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                  aria-label="Tăng số người chơi"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleRegenerateRoles}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Phân Lại Vai Ngẫu Nhiên
              </button>
            </div>
          </div>

          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newNameInput}
              onChange={(e) => setNewNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              placeholder="Nhập tên người chơi mới..."
              className="flex-1 bg-[#090d18] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddPlayer}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {playerNames.map((name, idx) => {
              const currentRole = assignedRoles[idx] || 'villager';
              const roleDef = ROLES[currentRole];

              return (
                <div
                  key={idx}
                  className="bg-[#090d18] border border-slate-800 rounded-xl p-3 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-amber-400">#{idx + 1}</span>
                    <button
                      onClick={() => handleRemovePlayer(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded cursor-pointer"
                      title="Xóa người này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="my-1.5">
                    <div className="font-semibold text-sm text-slate-200 truncate">{name}</div>
                    <select
                      value={currentRole}
                      onChange={(e) => handleUpdateRole(idx, e.target.value as RoleId)}
                      className="mt-1 w-full bg-slate-900 border border-slate-700 text-xs font-bold text-amber-300 rounded-lg px-2 py-1 focus:outline-none"
                    >
                      {Object.values(ROLES).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name.vi}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">{roleDef.badge}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800 gap-3">
            <div className="text-xs text-slate-400">
              Mã phòng phát bài điện thoại: <strong className="text-amber-300 font-mono">{roomId}</strong>
            </div>

            <button
              onClick={handleStartGame}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              Bắt Đầu Ván Đấu Thực Tế (Vòng 1)
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  currentPhase === 'night'
                    ? 'bg-rose-950 border-rose-500/50 text-rose-300'
                    : 'bg-amber-950 border-amber-500/50 text-amber-300'
                }`}
              >
                {currentPhase === 'night' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-slate-100">
                    {currentPhase === 'night' ? `Đêm Thứ ${roundNumber}` : `Ngày Thứ ${roundNumber}`}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {currentPhase === 'night'
                    ? 'Quản trò gọi các vai theo thứ tự bên dưới.'
                    : 'Công bố kết quả đêm và biểu quyết treo cổ.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsGameStarted(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Thiết Lập Lại Ván
            </button>
          </div>

          {currentPhase === 'night' && (
            <div className="bg-[#0f172a] border border-rose-950/80 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {nightSteps.map((step, idx) => (
                  <button
                    key={step.id}
                    onClick={() => {
                      setNightStep(idx);
                      triggerRoleVoice(step.roleId);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                      nightStep === idx
                        ? 'bg-rose-700 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>#{idx + 1}</span>
                    <span>{step.title.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              {nightSteps[nightStep] && (
                <div className="bg-[#090d18] border border-slate-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">
                        Bước {nightStep + 1} / {nightSteps.length}
                      </span>
                      <h4 className="text-base font-bold text-slate-100">
                        {nightSteps[nightStep].title}
                      </h4>
                    </div>
                    <button
                      onClick={() => triggerRoleVoice(nightSteps[nightStep].roleId)}
                      className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 border border-rose-500/40 text-xs font-bold text-rose-100 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-rose-300" />
                      Phát Tiếng Gọi Vai
                    </button>
                  </div>

                  <div className="bg-rose-950/40 border border-rose-900/50 rounded-xl p-3 text-xs text-rose-200 space-y-1">
                    <p className="font-semibold">{nightSteps[nightStep].description}</p>
                    <p className="text-amber-300 italic">
                      🎙️ Thoại mẫu: "{ROLE_CALLOUT_LINES[nightSteps[nightStep].roleId]?.quote}"
                    </p>
                    <p className="text-slate-300 mt-1">{nightSteps[nightStep].prompt}</p>
                  </div>

                  {nightSteps[nightStep].roleId === 'cupid' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {players.map((p) => {
                        const isSelected = nightActions.cupidLovers?.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              const current = nightActions.cupidLovers;
                              if (isSelected) {
                                setNightActions({ ...nightActions, cupidLovers: null });
                              } else if (!current || !current[0]) {
                                setNightActions({
                                  ...nightActions,
                                  cupidLovers: [p.id, ''] as unknown as [string, string],
                                });
                              } else if (current[0] && !current[1]) {
                                setNightActions({
                                  ...nightActions,
                                  cupidLovers: [current[0], p.id],
                                });
                              } else {
                                setNightActions({
                                  ...nightActions,
                                  cupidLovers: [p.id, ''] as unknown as [string, string],
                                });
                              }
                            }}
                            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-rose-900/70 border-rose-500 text-rose-100'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <Heart className="w-3.5 h-3.5 text-rose-400" />
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {nightSteps[nightStep].roleId === 'doppelganger' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {players.map((p) => {
                        const isSelected = nightActions.doppelgangerTargetId === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() =>
                              setNightActions({
                                ...nightActions,
                                doppelgangerTargetId: isSelected ? null : p.id,
                              })
                            }
                            className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                              isSelected
                                ? 'bg-purple-950 border-purple-500 text-purple-200'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {nightSteps[nightStep].roleId === 'werewolf' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {players
                        .filter((p) => p.isAlive)
                        .map((p) => {
                          const isPrimary = nightActions.wolfTargetId === p.id;
                          const isSecondary = nightActions.secondWolfTargetId === p.id;
                          const isWolfAlly = p.roleId === 'werewolf' || p.roleId === 'wolf_pup';
                          return (
                            <button
                              key={p.id}
                              onClick={() => {
                                if (isPrimary) {
                                  setNightActions({ ...nightActions, wolfTargetId: null });
                                } else if (isSecondary) {
                                  setNightActions({ ...nightActions, secondWolfTargetId: null });
                                } else if (!nightActions.wolfTargetId) {
                                  setNightActions({ ...nightActions, wolfTargetId: p.id });
                                } else if (wolfPupFrenzy && !nightActions.secondWolfTargetId) {
                                  setNightActions({ ...nightActions, secondWolfTargetId: p.id });
                                } else {
                                  setNightActions({ ...nightActions, wolfTargetId: p.id });
                                }
                              }}
                              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer ${
                                isPrimary || isSecondary
                                  ? 'bg-red-950 border-red-500 text-red-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <Skull className="w-3.5 h-3.5 text-red-400" />
                                <span>{p.name}</span>
                              </span>
                              {isWolfAlly && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/50">
                                  Sói
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  )}

                  {nightSteps[nightStep].roleId === 'witch' && (() => {
                    const witchObj = players.find((p) => p.roleId === 'witch' && p.isAlive);
                    const healUsed = Boolean(witchObj?.hasUsedHeal || witchObj?.hasUsedPower);
                    const poisonUsed = Boolean(witchObj?.hasUsedPoison || witchObj?.hasUsedPower);
                    const primaryVictim = players.find((p) => p.id === nightActions.wolfTargetId);
                    const secondaryVictim = players.find((p) => p.id === nightActions.secondWolfTargetId);
                    return (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            disabled={healUsed || !nightActions.wolfTargetId}
                            onClick={() =>
                              setNightActions({
                                ...nightActions,
                                witchHealTargetId:
                                  nightActions.witchHealTargetId === nightActions.wolfTargetId
                                    ? null
                                    : nightActions.wolfTargetId,
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer disabled:opacity-40 ${
                              nightActions.witchHealTargetId === nightActions.wolfTargetId &&
                              nightActions.wolfTargetId
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            {healUsed
                              ? 'Đã Dùng Hết Bình Cứu'
                              : nightActions.witchHealTargetId === nightActions.wolfTargetId &&
                                nightActions.wolfTargetId
                              ? `Đã Cứu: ${primaryVictim?.name || 'Nạn nhân 1'}`
                              : `Dùng Bình Cứu (${primaryVictim?.name || 'Chưa có nạn nhân'})`}
                          </button>

                          {wolfPupFrenzy && secondaryVictim && !healUsed && (
                            <button
                              onClick={() =>
                                setNightActions({
                                  ...nightActions,
                                  witchHealTargetId:
                                    nightActions.witchHealTargetId === secondaryVictim.id
                                      ? null
                                      : secondaryVictim.id,
                                })
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                                nightActions.witchHealTargetId === secondaryVictim.id
                                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              {nightActions.witchHealTargetId === secondaryVictim.id
                                ? `Đã Cứu: ${secondaryVictim.name}`
                                : `Cứu Nạn Nhân 2 (${secondaryVictim.name})`}
                            </button>
                          )}

                          <select
                            disabled={poisonUsed}
                            value={nightActions.witchPoisonTargetId || ''}
                            onChange={(e) =>
                              setNightActions({
                                ...nightActions,
                                witchPoisonTargetId: e.target.value || null,
                              })
                            }
                            className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-slate-200 disabled:opacity-40"
                          >
                            <option value="">
                              {poisonUsed ? 'Đã Dùng Hết Bình Độc' : 'Không dùng bình độc'}
                            </option>
                            {players
                              .filter((p) => p.isAlive)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  Đầu độc: {p.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    );
                  })()}

                  {nightSteps[nightStep].roleId === 'seer' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {players
                        .filter((p) => p.isAlive)
                        .map((p) => {
                          const isSelected = nightActions.seerTargetId === p.id;
                          const isWolf = p.roleId === 'werewolf' || p.roleId === 'wolf_pup';
                          return (
                            <button
                              key={p.id}
                              onClick={() =>
                                setNightActions({
                                  ...nightActions,
                                  seerTargetId: isSelected ? null : p.id,
                                })
                              }
                              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-950 border-purple-500 text-purple-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-purple-400" />
                                {p.name}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] font-bold">
                                  {isWolf ? '👎 SÓI' : '👍 DÂN'}
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  )}

                  {nightSteps[nightStep].roleId === 'bodyguard' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {players
                        .filter((p) => p.isAlive)
                        .map((p) => {
                          const isSelected = nightActions.guardTargetId === p.id;
                          const wasGuarded = Boolean(p.protectedLastNight);
                          return (
                            <button
                              key={p.id}
                              disabled={wasGuarded}
                              onClick={() =>
                                setNightActions({
                                  ...nightActions,
                                  guardTargetId: isSelected ? null : p.id,
                                })
                              }
                              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between disabled:opacity-40 cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span>{p.name}</span>
                              {wasGuarded && <span className="text-[10px] text-amber-400">Đêm trước</span>}
                            </button>
                          );
                        })}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <button
                      disabled={nightStep === 0}
                      onClick={() => {
                        const prev = nightStep - 1;
                        setNightStep(prev);
                        if (nightSteps[prev]) triggerRoleVoice(nightSteps[prev].roleId);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Bước Trước
                    </button>

                    {nightStep < nightSteps.length - 1 ? (
                      <button
                        onClick={() => {
                          const next = nightStep + 1;
                          setNightStep(next);
                          if (nightSteps[next]) triggerRoleVoice(nightSteps[next].roleId);
                        }}
                        className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                      >
                        Bước Tiếp Theo
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={handleResolveNight}
                        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sun className="w-4 h-4" />
                        Kết Thúc Đêm & Tính Toán
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentPhase === 'day' && (
            <div className="bg-[#0f172a] border border-amber-950/60 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
              {/* TWO-TIER MORNING RESOLUTION CARD FOR GAME MASTER */}
              <div
                data-testid="gm-morning-resolution-card"
                className="bg-[#090d18] border-2 border-amber-500/40 rounded-2xl p-4 space-y-4"
              >
                {/* TIER 1: CLEAR PUBLIC ANNOUNCEMENT OF WHO DIED LAST NIGHT */}
                <div
                  data-testid="gm-public-deaths-announcement"
                  className={`p-3.5 sm:p-4 rounded-xl border-2 ${
                    (lastNightResult?.killedDetails?.length || 0) > 0
                      ? 'bg-rose-950/45 border-rose-500/60'
                      : 'bg-emerald-950/40 border-emerald-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                      📢 Phần 1: Lời Quản Trò Đọc To Cho Cả Làng Khi Thức Dậy
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      Sáng Ngày Thứ {roundNumber}
                    </span>
                  </div>

                  {lastNightResult &&
                  lastNightResult.killedDetails &&
                  lastNightResult.killedDetails.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-sm sm:text-base font-black text-rose-200 leading-snug">
                        🌅 "Trời đã sáng, cả làng thức dậy! Đêm qua có{' '}
                        <span className="text-amber-300 underline">
                          {lastNightResult.killedDetails.length} người
                        </span>{' '}
                        đã thiệt mạng là:{' '}
                        <span className="text-white">
                          {lastNightResult.killedDetails.map((d) => d.name).join(', ')}
                        </span>
                        !"
                      </h4>

                      {/* Victim Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {lastNightResult.killedDetails.map((victim) => {
                          const roleDef = ROLES[victim.roleId];
                          return (
                            <div
                              key={victim.playerId}
                              className="p-3 rounded-xl bg-[#070a14] border border-rose-500/50 flex flex-col justify-between gap-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-black text-rose-200 flex items-center gap-1.5">
                                  <Skull className="w-4 h-4 text-rose-400 shrink-0" />
                                  <span>{victim.name} (ĐÃ CHẾT)</span>
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold text-amber-300">
                                  Vai: {roleDef.name[lang] || roleDef.name.vi} ({roleDef.badge})
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {victim.causes.map((c, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md bg-rose-950/90 border border-rose-700/60 text-[10px] font-extrabold text-rose-200"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-emerald-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <h4 className="text-sm sm:text-base font-black">
                        🌅 "Trời đã sáng, cả làng thức dậy! Đêm qua là một đêm bình yên — KHÔNG AI CHẾT!"
                      </h4>
                    </div>
                  )}
                </div>

                {/* TIER 2: DETAILED CAUSAL LOGIC EXPLANATION FOR THE GAME MASTER */}
                <div
                  data-testid="gm-night-logic-explanation"
                  className="p-3.5 sm:p-4 rounded-xl bg-[#070a14] border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-amber-400" />
                      <span>
                        🧠 Phần 2: Giải Thích Logic Đêm Qua Cho Quản Trò Hiểu (Chỉ Quản Trò Xem)
                      </span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Tự động đối chiếu Bảo Vệ · Phù Thủy · Già Làng · Bán Sói · Tình Nhân
                    </span>
                  </div>

                  {/* Step-by-step causal logic cards */}
                  {lastNightResult?.logicExplanations &&
                  lastNightResult.logicExplanations.length > 0 ? (
                    <div className="space-y-2">
                      {lastNightResult.logicExplanations.map((step, idx) => {
                        const styleMap = {
                          death:
                            'bg-rose-950/35 border-rose-500/40 text-rose-100 badge-bg:bg-rose-900',
                          saved:
                            'bg-emerald-950/35 border-emerald-500/40 text-emerald-100',
                          special:
                            'bg-amber-950/35 border-amber-500/40 text-amber-100',
                          info: 'bg-slate-900/90 border-slate-700 text-slate-200',
                        }[step.category];

                        return (
                          <div
                            key={idx}
                            className={`p-2.5 sm:p-3 rounded-xl border text-xs space-y-1 ${styleMap}`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-black/50 border border-white/15 text-[10px] font-mono font-extrabold text-amber-300">
                                Bước logic #{idx + 1} · {step.badge}
                              </span>
                              <span className="font-extrabold text-white">{step.title}</span>
                            </div>
                            <p className="text-slate-300 leading-relaxed pl-1">{step.detail}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : lastNightSummary.length > 0 ? (
                    <ul className="space-y-1 text-xs text-slate-200">
                      {lastNightSummary.map((msg, i) => (
                        <li key={i}>• {msg}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Không có hành động đặc biệt nào được ghi nhận trong đêm qua.
                    </p>
                  )}

                  {/* Extra Cascade Messages from Day / Hunter Shot if any */}
                  {lastNightSummary.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Tóm tắt nhật ký hệ thống:
                      </span>
                      <ul className="space-y-0.5 text-[11px] text-slate-300">
                        {lastNightSummary.map((msg, i) => (
                          <li key={i}>• {msg}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#090d18] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Timer className="w-5 h-5 text-amber-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">Đồng Hồ Thảo Luận</span>
                    <span className="text-xl font-mono font-extrabold text-amber-300">
                      {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                  >
                    {isTimerRunning ? 'Tạm Dừng' : 'Chạy Giờ'}
                  </button>
                  <button
                    onClick={() => {
                      setTimerSeconds(60);
                      setIsTimerRunning(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                  >
                    60s
                  </button>
                </div>
              </div>

              <div className="bg-[#090d18] border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-200">
                  Chọn Người Bị Làng Biểu Quyết Treo Cổ Hôm Nay:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {players
                    .filter((p) => p.isAlive)
                    .map((p) => {
                      const isSelected = selectedLynchTargetId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedLynchTargetId(isSelected ? '' : p.id)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
                            isSelected
                              ? 'bg-rose-950 border-rose-500 text-rose-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{p.name}</span>
                            <span className="text-[10px] text-amber-400 font-mono">
                              {ROLES[p.roleId].name.vi}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={handleNextNight}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                  >
                    Không Treo Cổ Ai (Sang Đêm Tiếp)
                  </button>
                  <button
                    disabled={!selectedLynchTargetId}
                    onClick={handleExecuteLynch}
                    className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
                  >
                    Xác Nhận Treo Cổ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showHunterModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(5, 8, 17, 0.9)' }}
        >
          <div className="w-full max-w-md bg-[#0f172a] border border-yellow-500/50 rounded-2xl p-6 space-y-4 text-center">
            <h3 className="text-lg font-bold text-yellow-200">🎯 Phát Súng Thợ Săn: "Tao có súng đó nha!"</h3>
            <p className="text-xs text-slate-300">
              Chọn 1 người chơi bị Thợ Săn bắn hạ theo cùng:
            </p>
            <div className="grid grid-cols-2 gap-2 text-left">
              {players
                .filter((p) => p.isAlive && p.id !== activeHunterId)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setHunterVictimId(p.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                      hunterVictimId === p.id
                        ? 'bg-yellow-950 border-yellow-500 text-yellow-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
            <button
              disabled={!hunterVictimId}
              onClick={handleConfirmHunterShot}
              className="w-full py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs cursor-pointer"
            >
              Xác Nhận Phát Bắn
            </button>
          </div>
        </div>
      )}

      {gameResult && gameResult.isOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(5, 8, 17, 0.92)' }}
        >
          <div className="w-full max-w-md bg-[#0f172a] border-2 border-amber-500/60 rounded-2xl p-6 text-center space-y-4">
            <h3 className="text-xl font-extrabold text-amber-200">
              {gameResult.winner === 'werewolves'
                ? '🐺 Phe Ma Sói Chiến Thắng!'
                : gameResult.winner === 'lovers'
                ? '💘 Phe Tình Nhân Chiến Thắng!'
                : gameResult.winner === 'tanner'
                ? '🎭 Kẻ Chán Đời Chiến Thắng!'
                : '🏆 Phe Dân Làng Chiến Thắng!'}
            </h3>
            <p className="text-xs text-slate-300">{gameResult.reason}</p>
            <button
              onClick={() => {
                setIsGameStarted(false);
                setGameResult(null);
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
            >
              Chơi Ván Mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
