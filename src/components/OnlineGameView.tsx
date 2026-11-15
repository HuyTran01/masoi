import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Play,
  Moon,
  Sun,
  Shield,
  Skull,
  Eye,
  Send,
  MessageSquare,
  Clock,
  Sparkles,
  Award,
  Vote,
  HelpCircle,
  Copy,
  Check,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  Flame,
  Volume2,
} from 'lucide-react';
import { Player, RoleId, Language, ChatMessage, VoteRecord, Phase, NightActions } from '../types/game';
import { ROLES } from '../game/roles';
import { generateBalancedRoster, resolveNightActions, tallyVotes, checkWinCondition, resolveHunterShot } from '../game/rules';
import { sound } from '../utils/sound';
import { TRANSLATIONS } from '../utils/i18n';
import { VoiceChatBar } from './VoiceChatBar';
import { RoleCardModal } from './RoleCardModal';
import { addMatchHistory } from '../utils/storage';
import confetti from 'canvas-confetti';

interface OnlineGameViewProps {
  currentUser: { id: string; name: string; avatar: string; elo: number };
  lang: Language;
}

const BOT_NAMES = [
  'Đức Huy',
  'Thảo My',
  'Minh Hoàng',
  'Tuấn Kiệt',
  'Bảo Châu',
  'Quỳnh Anh',
  'Hữu Phước',
  'Kim Ngân',
  'Gia Bảo',
  'Phương Linh',
];

export const OnlineGameView: React.FC<OnlineGameViewProps> = ({ currentUser, lang }) => {
  const t = TRANSLATIONS[lang];

  // Lobby state
  const [roomId] = useState<string>(() => 'WOLF' + Math.floor(100 + Math.random() * 900));
  const [copiedLink, setCopiedLink] = useState(false);
  const [phase, setPhase] = useState<Phase>('lobby');
  const [round, setRound] = useState<number>(1);
  const [timerSeconds, setTimerSeconds] = useState<number>(30);

  // Players
  const [players, setPlayers] = useState<Player[]>([
    {
      id: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.avatar,
      roleId: 'villager',
      isAlive: true,
      isHost: true,
    },
    ...BOT_NAMES.slice(0, 7).map((name, i) => ({
      id: `bot_${i + 1}`,
      name,
      avatar: ['🐺', '🔮', '🛡️', '🧪', '🎯', '💘', '🎭'][i % 7],
      roleId: 'villager' as RoleId,
      isAlive: true,
      isBot: true,
    })),
  ]);

  // Modals & Card viewer
  const [selectedInspectPlayer, setSelectedInspectPlayer] = useState<Player | null>(null);
  const [showMyRoleModal, setShowMyRoleModal] = useState<boolean>(false);

  // Night Action state
  const [userNightTargetId, setUserNightTargetId] = useState<string | null>(null);
  const [userWitchPoisonId, setUserWitchPoisonId] = useState<string | null>(null);
  const [userWitchHealChosen, setUserWitchHealChosen] = useState<boolean>(false);
  const [seerInspectResult, setSeerInspectResult] = useState<string | null>(null);

  // Voting state
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [hasVoted, setHasVoted] = useState<boolean>(false);

  // Chat system with Ghost Chat separation (anti-cheat)
  const [chatTab, setChatTab] = useState<'main' | 'ghost'>('main');
  const [chatInput, setChatInput] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_0',
      senderId: 'sys',
      senderName: 'Hệ Thống',
      text: 'Chào mừng các bạn đến phòng đấu Ma Sói Huyền Thoại! Hãy sẵn sàng.',
      timestamp: Date.now(),
      isSystem: true,
    },
  ]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Real-time Push Notification Banner
  const [notificationBanner, setNotificationBanner] = useState<string>(
    'Phòng đã sẵn sàng. Chủ phòng hãy nhấn Bắt Đầu Trận Đấu.'
  );

  // Hunter Revenge
  const [hunterVictimId, setHunterVictimId] = useState<string>('');
  const [activeHunter, setActiveHunter] = useState<Player | null>(null);

  // Game Over
  const [gameResult, setGameResult] = useState<{ winner: string; reason: string } | null>(null);

  const me = players.find((p) => p.id === currentUser.id) || players[0];
  const myRole = ROLES[me.roleId];

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Phase Timer countdown
  useEffect(() => {
    if (phase === 'lobby' || phase === 'game_over') return;

    const timer = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          handlePhaseTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, timerSeconds, players, votes, userNightTargetId]);

  // Handle phase transitions
  const handlePhaseTimeout = () => {
    if (phase === 'night') {
      resolveNightPhase();
    } else if (phase === 'day_discussion') {
      // Transition to Voting
      sound.playGavel();
      setPhase('day_voting');
      setTimerSeconds(25);
      setNotificationBanner('Thời gian thảo luận kết thúc! Cả làng bước vào giai đoạn bỏ phiếu xử tử.');
      setVotes([]);
      setHasVoted(false);
      simulateBotVotes();
    } else if (phase === 'day_voting') {
      resolveDayVoting();
    }
  };

  // Add bot / Remove bot in lobby
  const handleAddBot = () => {
    if (players.length >= 12) return;
    const nextIdx = players.filter((p) => p.isBot).length;
    const botName = BOT_NAMES[nextIdx % BOT_NAMES.length] + ' ' + (nextIdx + 1);
    setPlayers((prev) => [
      ...prev,
      {
        id: `bot_${Date.now()}`,
        name: botName,
        avatar: '🧑‍🌾',
        roleId: 'villager',
        isAlive: true,
        isBot: true,
      },
    ]);
  };

  const handleRemoveBot = (id: string) => {
    if (players.length <= 5) return;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  // START GAME
  const handleStartGame = () => {
    sound.playNightBell();
    const assigned = generateBalancedRoster(players.length);
    const updated = players.map((p, idx) => ({
      ...p,
      roleId: assigned[idx],
      isAlive: true,
      elderLives: assigned[idx] === 'elder' ? 2 : undefined,
    }));

    setPlayers(updated);
    setRound(1);
    setPhase('night');
    setTimerSeconds(25);
    setNotificationBanner('Màn đêm buông xuống! Cả làng đi ngủ, các vai trò bí mật thức dậy hành động...');
    setUserNightTargetId(null);
    setSeerInspectResult(null);

    // Announce to chat
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}`,
        senderId: 'sys',
        senderName: 'Quản Trò',
        text: 'Đêm thứ 1 đã buông xuống. Hãy bảo mật vai trò và thực hiện hành động đêm!',
        timestamp: Date.now(),
        isSystem: true,
      },
    ]);

    // Show role card prompt to player
    setShowMyRoleModal(true);
  };

  // RESOLVE NIGHT
  const resolveNightPhase = () => {
    sound.playDayGong();

    // Collect night actions from player + simulated bots
    const livingWolves = players.filter(
      (p) => (p.roleId === 'werewolf' || p.roleId === 'wolf_pup') && p.isAlive
    );
    const livingGuards = players.filter((p) => p.roleId === 'bodyguard' && p.isAlive);
    const livingSeers = players.filter((p) => p.roleId === 'seer' && p.isAlive);
    const livingWitches = players.filter((p) => p.roleId === 'witch' && p.isAlive);

    const nonWolves = players.filter((p) => p.roleId !== 'werewolf' && p.roleId !== 'wolf_pup' && p.isAlive);

    // Wolf target
    let wolfTarget = userNightTargetId;
    if (me.roleId !== 'werewolf' && me.roleId !== 'wolf_pup') {
      // Pick random non-wolf target by bot wolves
      if (nonWolves.length > 0) {
        wolfTarget = nonWolves[Math.floor(Math.random() * nonWolves.length)].id;
      }
    }

    // Bodyguard target
    let guardTarget = me.roleId === 'bodyguard' ? userNightTargetId : null;
    if (!guardTarget && livingGuards.length > 0) {
      const candidates = players.filter((p) => p.isAlive);
      guardTarget = candidates[Math.floor(Math.random() * candidates.length)].id;
    }

    // Witch actions
    let witchHeal = me.roleId === 'witch' && userWitchHealChosen ? wolfTarget : null;
    let witchPoison = me.roleId === 'witch' ? userWitchPoisonId : null;
    if (me.roleId !== 'witch' && livingWitches.length > 0) {
      // 50% chance bot witch saves round 1
      if (round === 1 && Math.random() > 0.5) {
        witchHeal = wolfTarget;
      }
    }

    const nightActions: NightActions = {
      wolfTargetId: wolfTarget,
      guardTargetId: guardTarget,
      witchHealTargetId: witchHeal,
      witchPoisonTargetId: witchPoison,
      seerTargetId: me.roleId === 'seer' ? userNightTargetId : null,
    };

    const { updatedPlayers, result } = resolveNightActions(players, nightActions, { roundNumber: round });
    setPlayers(updatedPlayers);

    // Check win condition
    const winCheck = checkWinCondition(updatedPlayers);
    if (winCheck.isOver) {
      finishGame(winCheck.winner || 'villagers', winCheck.reason, updatedPlayers);
      return;
    }

    // Move to day discussion
    setPhase('day_discussion');
    setTimerSeconds(40);

    const killedNames = result.killedPlayerIds
      .map((id) => players.find((p) => p.id === id)?.name)
      .filter(Boolean);

    const bannerText =
      killedNames.length > 0
        ? `Trời đã sáng! Người bị hại đêm qua là: ${killedNames.join(', ')}.`
        : 'Trời đã sáng! Một đêm yên bình, không ai bị sát hại đêm qua.';
    setNotificationBanner(bannerText);

    // Post to chat
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}`,
        senderId: 'sys',
        senderName: 'Quản Trò',
        text: `Bình minh hé rạng ngày thứ ${round}. ${bannerText}`,
        timestamp: Date.now(),
        isSystem: true,
      },
    ]);

    // Bot chatter during discussion
    simulateBotDayChat(updatedPlayers, killedNames);
  };

  // Bot chatter simulation
  const simulateBotDayChat = (currentPlayers: Player[], killedNames: (string | undefined)[]) => {
    const aliveBots = currentPlayers.filter((p) => p.isBot && p.isAlive);
    if (aliveBots.length === 0) return;

    const sampleDialogues = [
      'Đêm qua đáng sợ quá, mọi người có nghe thấy tiếng động hướng nào không?',
      'Tôi nghi ngờ người ít nói nhất trong làng.',
      'Hôm nay chúng ta cần phân tích kỹ cách nói chuyện của từng người.',
      'Đừng vội tin ai quá dễ dàng, Sói rất hay trà trộn!',
      'Hôm nay ai có thông tin quan trọng hãy lên tiếng.',
    ];

    aliveBots.slice(0, 3).forEach((bot, idx) => {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot_msg_${Date.now()}_${idx}`,
            senderId: bot.id,
            senderName: bot.name,
            text: sampleDialogues[idx % sampleDialogues.length],
            timestamp: Date.now(),
            isGhost: false,
          },
        ]);
      }, (idx + 1) * 3500);
    });
  };

  // Simulate Bot Votes during voting phase
  const simulateBotVotes = () => {
    setTimeout(() => {
      const alivePlayers = players.filter((p) => p.isAlive);
      const aliveBots = alivePlayers.filter((p) => p.isBot);

      const generatedVotes: VoteRecord[] = aliveBots.map((bot) => {
        const others = alivePlayers.filter((p) => p.id !== bot.id);
        const target = others[Math.floor(Math.random() * others.length)];
        return {
          voterId: bot.id,
          targetId: target.id,
        };
      });

      setVotes((prev) => [...prev, ...generatedVotes]);
    }, 4000);
  };

  // Player Cast Vote
  const handleCastVote = (targetId: string) => {
    if (hasVoted || !me.isAlive) return;
    sound.playGavel();
    setVotes((prev) => [...prev, { voterId: me.id, targetId }]);
    setHasVoted(true);

    const targetPlayer = players.find((p) => p.id === targetId);
    setMessages((prev) => [
      ...prev,
      {
        id: `vote_msg_${Date.now()}`,
        senderId: 'sys',
        senderName: 'Bỏ Phiếu',
        text: `${me.name} đã bỏ phiếu xử tử ${targetPlayer?.name || 'mục tiêu'}.`,
        timestamp: Date.now(),
        isSystem: true,
      },
    ]);
  };

  // Resolve Day Voting
  const resolveDayVoting = () => {
    sound.playGavel();
    const tally = tallyVotes(votes);

    if (tally.isTie || !tally.targetId) {
      setNotificationBanner('Số phiếu hòa hoặc không đủ đa số. Hôm nay không ai bị xử tử!');
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          senderId: 'sys',
          senderName: 'Quản Trò',
          text: 'Số phiếu hòa! Không ai bị treo cổ hôm nay. Màn đêm tiếp theo bắt đầu.',
          timestamp: Date.now(),
          isSystem: true,
        },
      ]);
      advanceToNextNight(players);
      return;
    }

    const victim = players.find((p) => p.id === tally.targetId);
    if (!victim) {
      advanceToNextNight(players);
      return;
    }

    const updated = players.map((p) => (p.id === victim.id ? { ...p, isAlive: false } : p));
    setPlayers(updated);

    // Check if victim is Tanner
    if (victim.roleId === 'tanner') {
      finishGame('tanner', `Kẻ Chán Đời (${victim.name}) đã bị treo cổ thành công và thắng trận!`, updated);
      return;
    }

    // Check if victim is Hunter
    if (victim.roleId === 'hunter') {
      setActiveHunter(victim);
      setPhase('hunter_revenge');
      setNotificationBanner(`Thợ Săn ${victim.name} bị treo cổ! Đang chuẩn bị phát đạn báo thù cuối cùng.`);
      return;
    }

    const winCheck = checkWinCondition(updated, victim.id);
    if (winCheck.isOver) {
      finishGame(winCheck.winner || 'villagers', winCheck.reason, updated);
    } else {
      setNotificationBanner(`${victim.name} đã bị dân làng xử tử treo cổ! Màn đêm tiếp theo buông xuống.`);
      advanceToNextNight(updated);
    }
  };

  // Hunter shot execute
  const handleExecuteHunterShot = (targetId: string) => {
    if (!activeHunter) return;
    sound.playDeath();
    const { updatedPlayers, victimName } = resolveHunterShot(players, activeHunter.id, targetId);
    setPlayers(updatedPlayers);
    setActiveHunter(null);

    setMessages((prev) => [
      ...prev,
      {
        id: `hunter_msg_${Date.now()}`,
        senderId: 'sys',
        senderName: 'Phát Đạn Thợ Săn',
        text: `Thợ Săn nổ súng kéo theo ${victimName} vào bóng tối!`,
        timestamp: Date.now(),
        isSystem: true,
      },
    ]);

    const winCheck = checkWinCondition(updatedPlayers);
    if (winCheck.isOver) {
      finishGame(winCheck.winner || 'villagers', winCheck.reason, updatedPlayers);
    } else {
      advanceToNextNight(updatedPlayers);
    }
  };

  const advanceToNextNight = (updatedPlayers: Player[]) => {
    setRound((r) => r + 1);
    setPhase('night');
    setTimerSeconds(25);
    setUserNightTargetId(null);
    setSeerInspectResult(null);
    setVotes([]);
    setHasVoted(false);
  };

  // Finish Game
  const finishGame = (winner: string, reason: string, finalPlayers: Player[]) => {
    sound.playVictory();
    confetti({ particleCount: 120, spread: 80 });
    setPhase('game_over');
    setGameResult({ winner, reason });
    setNotificationBanner(`Trận đấu kết thúc! ${reason}`);

    addMatchHistory({
      id: 'match_' + Date.now(),
      roomId,
      date: new Date().toLocaleString(),
      winner: winner as any,
      rounds: round,
      playersCount: finalPlayers.length,
      mvp: currentUser.name,
      roster: finalPlayers.map((p) => ({
        name: p.name,
        roleId: p.roleId,
        isAlive: p.isAlive,
      })),
    });
  };

  // Seer night inspection action
  const handleInspectTarget = (target: Player) => {
    sound.playCardFlip();
    setUserNightTargetId(target.id);
    const isWolf = target.roleId === 'werewolf' || target.roleId === 'wolf_pup';
    setSeerInspectResult(`${target.name} là: ${isWolf ? 'Phe Ma Sói 🐺' : 'Phe Dân Làng 🛡️'}`);
  };

  // Send message
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const isGhostMsg = chatTab === 'ghost';
    if (!me.isAlive && chatTab === 'main') {
      // Anti-cheat restriction
      alert('Người chết không thể nhắn vào phòng chính của người sống! Hãy dùng tab Chat Ma.');
      return;
    }

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: me.id,
      senderName: me.name,
      text: chatInput.trim(),
      timestamp: Date.now(),
      isGhost: isGhostMsg,
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Voice Chat Component */}
      <VoiceChatBar players={players} userPlayerId={me.id} lang={lang} />

      {/* Real-time Notification Banner */}
      <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-rose-950/80 border border-rose-800/50 rounded-xl px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-rose-200">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span className="font-medium">{notificationBanner}</span>
        </div>

        {phase !== 'lobby' && (
          <div className="flex items-center gap-1.5 font-mono text-amber-300 font-bold shrink-0">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{timerSeconds}s</span>
          </div>
        )}
      </div>

      {/* LOBBY VIEW */}
      {phase === 'lobby' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  Phòng Chờ Trực Tuyến
                </span>
                <span className="text-sm font-mono font-bold text-amber-400">
                  Mã: {roomId}
                </span>
              </div>
              <h3 className="text-xl font-bold font-['Cinzel'] text-slate-100 mt-1">
                Sảnh Chờ Ghép Phòng Ma Sói ({players.length} người)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + `?room=${roomId}`);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Đã Sao Chép!' : 'Chia Sẻ Mã Phòng'}
              </button>

              <button
                onClick={handleAddBot}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 border border-slate-700 flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Thêm AI Bot
              </button>
            </div>
          </div>

          {/* Player Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {players.map((p) => (
              <div
                key={p.id}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-2xl select-none">{p.avatar}</span>
                  <div className="truncate">
                    <span className="font-semibold text-xs text-slate-200 block truncate">
                      {p.name} {p.id === me.id && '(Bạn)'}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {p.isHost ? '👑 Chủ Phòng' : p.isBot ? '🤖 AI Bot' : '🟢 Sẵn Sàng'}
                    </span>
                  </div>
                </div>

                {p.isBot && (
                  <button
                    onClick={() => handleRemoveBot(p.id)}
                    className="text-slate-600 hover:text-rose-400 text-xs p-1"
                    title="Xóa bot"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Lobby Footer Action */}
          <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-800 gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Hệ thống tự động cân bằng các vai trò bí mật khi bắt đầu.</span>
            </div>

            <button
              onClick={handleStartGame}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 hover:from-rose-600 hover:to-red-500 text-white font-extrabold text-sm shadow-xl shadow-rose-950/60 flex items-center gap-2 transition-transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              Bắt Đầu Ván Đấu Ngay
            </button>
          </div>
        </div>
      ) : (
        /* MAIN GAMEPLAY ARENA */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left/Center: Village Ring & Phase Action (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Phase Status Banner & Your Role Shortcut */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                    phase === 'night'
                      ? 'bg-rose-950 border-rose-500/50 text-rose-300'
                      : 'bg-amber-950 border-amber-500/50 text-amber-300'
                  }`}
                >
                  {phase === 'night' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-['Cinzel'] font-bold text-base text-slate-100">
                      {phase === 'night'
                        ? `Ban Đêm (Đêm ${round})`
                        : phase === 'day_discussion'
                        ? `Thảo Luận Ban Ngày (Ngày ${round})`
                        : phase === 'day_voting'
                        ? `Bỏ Phiếu Xử Tử (Ngày ${round})`
                        : phase === 'hunter_revenge'
                        ? 'Phát Súng Thợ Săn'
                        : 'Kết Thúc'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {phase === 'night'
                      ? 'Thực hiện hành động đêm của vai trò của bạn'
                      : phase === 'day_discussion'
                      ? 'Thảo luận cùng làng, tìm ra kẻ khả nghi'
                      : 'Nhấn vào người chơi để bỏ phiếu xử tử'}
                  </span>
                </div>
              </div>

              {/* View My Secret Role Button */}
              <button
                onClick={() => setShowMyRoleModal(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-amber-600/30 flex items-center gap-1.5 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Xem Thẻ Bài Của Bạn ({myRole.name.vi})</span>
              </button>
            </div>

            {/* Interactive Player Circle Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Người Chơi Trong Làng ({players.filter((p) => p.isAlive).length} sống / {players.length} tổng)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {players.map((p) => {
                  const isDead = !p.isAlive;
                  const isCurrentTarget = userNightTargetId === p.id;
                  const voteCount = votes.filter((v) => v.targetId === p.id).length;

                  return (
                    <div
                      key={p.id}
                      className={`relative p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-between min-h-[120px] ${
                        isDead
                          ? 'bg-slate-950/50 border-slate-900 text-slate-600 opacity-60'
                          : isCurrentTarget
                          ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-lg shadow-rose-950/50'
                          : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {/* Dead overlay skull */}
                      {isDead && (
                        <div className="absolute top-2 right-2 text-rose-500">
                          <Skull className="w-4 h-4" />
                        </div>
                      )}

                      {/* Vote Count Badge during voting phase */}
                      {phase === 'day_voting' && voteCount > 0 && (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-rose-900 text-rose-200 border border-rose-700 font-mono text-[10px] font-bold">
                          {voteCount} phiếu
                        </div>
                      )}

                      <span className="text-3xl select-none mt-1">{p.avatar}</span>
                      <div className="w-full mt-1">
                        <span className="text-xs font-bold block truncate">
                          {p.name} {p.id === me.id && '(Bạn)'}
                        </span>
                        <span
                          className={`text-[10px] font-mono block ${
                            isDead ? 'text-slate-600' : 'text-emerald-400'
                          }`}
                        >
                          {isDead ? 'Đã chết' : 'Còn sống'}
                        </span>
                      </div>

                      {/* Action buttons depending on phase */}
                      {!isDead && p.id !== me.id && me.isAlive && (
                        <div className="mt-2 w-full">
                          {/* Night action for Seer */}
                          {phase === 'night' && me.roleId === 'seer' && (
                            <button
                              onClick={() => handleInspectTarget(p)}
                              className="w-full py-1 rounded-lg bg-purple-900 hover:bg-purple-800 text-purple-200 text-[11px] font-bold flex items-center justify-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Soi Vai
                            </button>
                          )}

                          {/* Night action for Werewolf */}
                          {phase === 'night' && (me.roleId === 'werewolf' || me.roleId === 'wolf_pup') && (
                            <button
                              onClick={() => {
                                sound.playWolfHowl();
                                setUserNightTargetId(p.id);
                              }}
                              className="w-full py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-200 text-[11px] font-bold flex items-center justify-center gap-1"
                            >
                              <Skull className="w-3 h-3" />
                              Cắn Người Này
                            </button>
                          )}

                          {/* Night action for Bodyguard */}
                          {phase === 'night' && me.roleId === 'bodyguard' && (
                            <button
                              onClick={() => {
                                sound.playCardFlip();
                                setUserNightTargetId(p.id);
                              }}
                              className="w-full py-1 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-[11px] font-bold flex items-center justify-center gap-1"
                            >
                              <Shield className="w-3 h-3" />
                              Bảo Vệ
                            </button>
                          )}

                          {/* Day Voting button */}
                          {phase === 'day_voting' && (
                            <button
                              disabled={hasVoted}
                              onClick={() => handleCastVote(p.id)}
                              className="w-full py-1 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white text-[11px] font-bold flex items-center justify-center gap-1"
                            >
                              <Vote className="w-3 h-3" />
                              Bỏ Phiếu
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seer Inspection Result Alert */}
            {seerInspectResult && (
              <div className="bg-purple-950/80 border border-purple-500 rounded-xl p-3 text-xs text-purple-200 flex items-center gap-2 animate-in fade-in">
                <Eye className="w-4 h-4 text-purple-400" />
                <span>
                  <strong>Kết quả Tiên Tri:</strong> {seerInspectResult}
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Live Chat & Anti-Cheat Ghost Room (1 col) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[520px] shadow-xl">
            {/* Chat Tabs: Main Room vs Ghost Room */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setChatTab('main')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    chatTab === 'main'
                      ? 'bg-rose-900/70 text-rose-200 border border-rose-700/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Phòng Chính (Làng)
                </button>

                <button
                  onClick={() => setChatTab('ghost')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    chatTab === 'ghost'
                      ? 'bg-purple-950 text-purple-200 border border-purple-700/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Skull className="w-3.5 h-3.5 text-purple-400" />
                  Khu Vực Ma
                </button>
              </div>

              <span className="text-[10px] text-emerald-400 font-mono">
                🛡️ Anti-Cheat
              </span>
            </div>

            {/* Chat Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {messages
                .filter((m) => (chatTab === 'ghost' ? m.isGhost : !m.isGhost))
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl border ${
                      msg.isSystem
                        ? 'bg-rose-950/30 border-rose-900/40 text-rose-300'
                        : msg.isGhost
                        ? 'bg-purple-950/40 border-purple-900/40 text-purple-200'
                        : msg.senderId === me.id
                        ? 'bg-slate-800 border-slate-700 text-slate-100 ml-4'
                        : 'bg-slate-950 border-slate-800 text-slate-200 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <span className="font-bold text-amber-400">{msg.senderName}</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  !me.isAlive && chatTab === 'main'
                    ? 'Bạn đã chết, không thể chat vào phòng sống...'
                    : 'Nhập nội dung trò chuyện...'
                }
                disabled={!me.isAlive && chatTab === 'main'}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500 disabled:opacity-50"
              />
              <button
                disabled={!me.isAlive && chatTab === 'main'}
                onClick={handleSendMessage}
                className="p-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HUNTER RETRIBUTION MODAL */}
      {phase === 'hunter_revenge' && activeHunter && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-yellow-600/50 rounded-2xl p-6 text-center space-y-4">
            <span className="text-4xl">🎯</span>
            <h3 className="text-xl font-bold font-['Cinzel'] text-yellow-200">
              Phát Súng Thợ Săn!
            </h3>
            <p className="text-xs text-slate-300">
              {activeHunter.name} là Thợ Săn. Hãy chọn 1 người bị nổ súng kéo theo!
            </p>

            <div className="grid grid-cols-2 gap-2 text-left">
              {players
                .filter((p) => p.isAlive && p.id !== activeHunter.id)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setHunterVictimId(p.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold ${
                      hunterVictimId === p.id
                        ? 'bg-yellow-950 border-yellow-500 text-yellow-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
            </div>

            <button
              disabled={!hunterVictimId}
              onClick={() => handleExecuteHunterShot(hunterVictimId)}
              className="w-full py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 text-slate-950 font-bold text-xs"
            >
              Khai Hỏa Phát Đạn Báo Thù
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {phase === 'game_over' && gameResult && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-rose-500/50 rounded-2xl p-6 text-center space-y-5 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-2xl bg-rose-950 border-2 border-rose-500 mx-auto flex items-center justify-center text-5xl shadow-xl">
              {gameResult.winner === 'werewolves' ? '🐺' : '🏆'}
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                Kết Quả Trận Đấu
              </span>
              <h3 className="text-2xl font-bold font-['Cinzel'] text-slate-100 mt-1">
                {gameResult.winner === 'werewolves'
                  ? 'Phe Ma Sói Chiến Thắng!'
                  : gameResult.winner === 'tanner'
                  ? 'Kẻ Chán Đời Chiến Thắng!'
                  : 'Phe Dân Làng Chiến Thắng!'}
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed px-4">
                {gameResult.reason}
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-left">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Danh Sách Vai Trò Toàn Bộ Trận Đấu:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className={p.isAlive ? 'text-slate-200' : 'text-slate-500 line-through'}>
                      {p.name}
                    </span>
                    <span className="font-mono text-amber-400 text-[11px]">
                      {ROLES[p.roleId].name.vi}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setPhase('lobby');
                setGameResult(null);
              }}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xl"
            >
              Về Phòng Chờ / Chơi Ván Mới
            </button>
          </div>
        </div>
      )}

      {/* MY ROLE CARD POPUP */}
      {showMyRoleModal && (
        <RoleCardModal
          roleId={me.roleId}
          playerName={me.name}
          isAlive={me.isAlive}
          lang={lang}
          onClose={() => setShowMyRoleModal(false)}
        />
      )}
    </div>
  );
};
