import {
  HunterShotRecord,
  Language,
  NightActions,
  NightDeathCinematicState,
  NightResult,
  NightSkillCutsceneEvent,
  Phase,
  Player,
  RoleId,
  VoteRecord,
} from '../types/game';
import { ROLES } from './roles';
import { UI_TEXT } from '../utils/i18n';
import {
  buildVoteTallyEntries,
  getDyingWolfVictimsForWitch,
  VoteTallyVoter,
} from './rules';
import {
  AIMatchBrain,
  computeSmartBotNightAction,
  computeSmartBotVotes,
  pickSmartBotHunterTargetWithBrain,
} from './smartAI';

const tr = <T,>(lang: Language, m: Record<Language, T>): T => m[lang] ?? m.en;

export type NightStepKey =
  | 'doppelganger'
  | 'cupid'
  | 'bodyguard'
  | 'hunter'
  | 'werewolf'
  | 'witch'
  | 'seer';

export interface CustomTimerConfig {
  nightActionSec: number; // Human turn duration at night (default 20s, range 5..120s)
  botStepSec: number; // Bot-only step duration at night (default 4s, range 2..20s)
  dayDiscussSec: number; // Day discussion duration (default 35s, range 10..300s)
  dayVoteSec: number; // Day voting duration (default 25s, range 10..180s)
}

export const DEFAULT_TIMER_CONFIG: CustomTimerConfig = {
  nightActionSec: 20,
  botStepSec: 4,
  dayDiscussSec: 35,
  dayVoteSec: 25,
};

export interface AutoGMNightStep {
  key: NightStepKey;
  roleId: RoleId;
  stepIndex: number;
  totalSteps: number;
  title: Record<Language, string>;
  gmNarration: Record<Language, string>;
  playerInstruction: Record<Language, string>;
  humanDurationSec: number;
  botDurationSec: number;
  hasLivingActor: boolean;
  isHumanTurn: boolean;
}

const STEP_TRANSLATIONS: Record<
  NightStepKey,
  {
    roleId: RoleId;
    title: Record<Language, string>;
    gmNarration: Record<Language, string>;
    playerInstruction: Record<Language, string>;
  }
> = {
  doppelganger: {
    roleId: 'doppelganger',
    title: {
      vi: 'Nhân Bản Thức Dậy',
      en: 'Doppelgänger Wakes',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Nhân Bản thức dậy! Hãy chọn 1 người chơi làm hình mẫu kế thừa."',
      en: '🤖 Auto-GM: "Doppelgänger, wake up! Choose 1 player as your role model."',
    },
    playerInstruction: {
      vi: 'Chạm vào 1 người chơi khác (trong cảnh 3D hoặc thanh bên dưới) để chọn làm hình mẫu kế thừa khi họ chết.',
      en: 'Tap 1 other player to copy. When they die, you inherit their role.',
    },
  },
  cupid: {
    roleId: 'cupid',
    title: {
      vi: 'Thần Tình Yêu Cupid',
      en: 'Cupid Wakes',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Cupid thức dậy! Hãy bắn mũi tên ghép đôi 2 người thành Tình Nhân sinh tử."',
      en: '🤖 Auto-GM: "Cupid, wake up! Bind 2 players together as star-crossed Lovers."',
    },
    playerInstruction: {
      vi: 'Chọn lần lượt 2 người chơi (có thể chọn chính bạn) để ghép đôi Tình Nhân.',
      en: 'Select 2 players (can include yourself) to link as Lovers.',
    },
  },
  bodyguard: {
    roleId: 'bodyguard',
    title: {
      vi: 'Bảo Vệ Đặt Khiên',
      en: 'Bodyguard Shield',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Bảo Vệ thức dậy! Hãy chọn 1 người để đặt khiên che chở đêm nay (không trùng đêm trước)."',
      en: '🤖 Auto-GM: "Bodyguard, wake up! Choose 1 player to shield tonight (no consecutive repeats)."',
    },
    playerInstruction: {
      vi: 'Chạm vào 1 người chơi (kể cả chính bạn) để đặt khiên chống Sói cắn. Không được chọn người vừa bảo vệ đêm qua!',
      en: 'Tap 1 living player to shield from Werewolf bites. Cannot pick the player shielded last night!',
    },
  },
  hunter: {
    roleId: 'hunter',
    title: {
      vi: 'Thợ Săn Ghim Đạn',
      en: 'Hunter Night Aim',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Thợ Săn thức dậy! Hãy chọn ghim đạn vào 1 người chơi (hoặc chọn Không ghim)."',
      en: '🤖 Auto-GM: "Hunter, wake up! Mark 1 player with your bullet (or choose No Mark)."',
    },
    playerInstruction: {
      vi: 'Chọn 1 người chơi khác để ghim đạn (chỉ tự động bắn kéo theo nếu bạn chết trong đêm nay), hoặc bấm Không ghim.',
      en: 'Mark 1 player (auto-fires only if you die tonight), or choose No Mark.',
    },
  },
  werewolf: {
    roleId: 'werewolf',
    title: {
      vi: 'Đàn Ma Sói Săn Mồi',
      en: 'Werewolves Hunt',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Đàn Ma Sói thức dậy! Nhận diện đồng đội và thống nhất chọn con mồi đêm nay."',
      en: '🤖 Auto-GM: "Werewolves, wake up! Recognize your pack and choose tonight’s victim."',
    },
    playerInstruction: {
      vi: 'Chọn nạn nhân để cắn đêm nay (nếu Sói Con chết đêm trước, đàn Sói được chọn 2 nạn nhân!).',
      en: 'Select a victim to bite tonight (2 victims if Wolf Pup frenzy is active!).',
    },
  },
  witch: {
    roleId: 'witch',
    title: {
      vi: 'Phù Thủy Pha Thuốc',
      en: 'Witch’s Potions',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Ma Sói đi ngủ. Phù Thủy thức dậy! Bạn có dùng Bình Cứu hay Bình Độc đêm nay không?"',
      en: '🤖 Auto-GM: "Werewolves sleep. Witch, wake up! Will you use your Heal or Poison potion tonight?"',
    },
    playerInstruction: {
      vi: 'Xem nạn nhân bị Sói cắn để bấm nút dùng Bình Cứu (1 lần/ván), hoặc chạm vào 1 người để quăng Bình Độc (1 lần/ván).',
      en: 'Decide whether to Heal tonight’s wolf victim (1/game) or tap a player to Poison (1/game).',
    },
  },
  seer: {
    roleId: 'seer',
    title: {
      vi: 'Tiên Tri Soi Danh Tính',
      en: 'Seer Divination',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Phù Thủy đi ngủ. Tiên Tri thức dậy! Hãy chỉ định 1 người chơi để soi phe phái."',
      en: '🤖 Auto-GM: "Witch sleeps. Seer, wake up! Point to 1 player to reveal their alignment."',
    },
    playerInstruction: {
      vi: 'Chọn 1 người chơi còn sống rồi bấm Xác Nhận Soi để xem phe phái (👍 Dân Làng hoặc 👎 Ma Sói).',
      en: 'Select 1 living player and click Confirm Inspect to reveal their alignment (👍 Villager or 👎 Werewolf).',
    },
  },
};

/**
 * Strips accidental raw Markdown emphasis asterisks from GM logs/narrations (BUG-20).
 */
export function stripMarkdownAsterisks(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^\s*\*+\s*|\s*\*+\s*$/g, '')
    .trim();
}

/**
 * Checks whether a specific player is called to open their eyes during the current Auto-GM night step.
 */
export function isPlayerAwakeForNightStep(
  player: Player | undefined,
  stepKey: NightStepKey | null,
  round: number
): boolean {
  if (!player || !player.isAlive || !stepKey) return false;
  switch (stepKey) {
    case 'doppelganger':
      return round === 1 && player.roleId === 'doppelganger';
    case 'cupid':
      return round === 1 && player.roleId === 'cupid';
    case 'bodyguard':
      return player.roleId === 'bodyguard' && !player.hasUsedPower;
    case 'hunter':
      return player.roleId === 'hunter' && !player.hasUsedPower;
    case 'werewolf':
      return player.roleId === 'werewolf' || player.roleId === 'wolf_pup';
    case 'witch':
      return player.roleId === 'witch' && !player.hasUsedPower;
    case 'seer':
      return player.roleId === 'seer' && !player.hasUsedPower;
    default:
      return false;
  }
}

/**
 * Builds the sequential Night Call Schedule for the Automated Game Master ("Quản Trò Máy")
 * strictly following canonical Werewolf rules & wakeOrder (BUG-12):
 * Night 1: #5 Doppelgänger -> #10 Cupid -> #15 Bodyguard -> #18 Hunter -> #20/#22 Werewolves -> #30 Witch -> #40 Seer
 * Night 2+: #15 Bodyguard -> #18 Hunter -> #20/#22 Werewolves -> #30 Witch -> #40 Seer
 * Also attaches custom timer durations and whether the human player wakes up on each step.
 */
export function buildAutoGMNightSchedule(
  players: Player[],
  round: number,
  timerConfig: CustomTimerConfig = DEFAULT_TIMER_CONFIG,
  humanPlayerId?: string
): AutoGMNightStep[] {
  const keys: NightStepKey[] = [];
  const hasRoleInMatch = (roleId: RoleId) =>
    players.some((p) => p.roleId === roleId || p.targetRoleId === roleId);

  if (round === 1) {
    if (hasRoleInMatch('doppelganger')) keys.push('doppelganger');
    if (hasRoleInMatch('cupid')) keys.push('cupid');
  }

  // Canonical wake priority: #15 Bodyguard -> #18 Hunter -> #20/#22 Werewolves -> #30 Witch -> #40 Seer
  if (hasRoleInMatch('bodyguard')) keys.push('bodyguard');
  if (hasRoleInMatch('hunter')) keys.push('hunter');
  keys.push('werewolf');
  if (hasRoleInMatch('witch')) keys.push('witch');
  if (hasRoleInMatch('seer')) keys.push('seer');

  const humanPlayer = humanPlayerId
    ? players.find((p) => p.id === humanPlayerId)
    : players.find((p) => !p.isBot) || players[0];

  const uniformNightStepSec = Math.max(5, timerConfig.nightActionSec || 20);

  return keys.map((key, idx) => {
    const meta = STEP_TRANSLATIONS[key];
    const hasLivingActor = players.some((p) => isPlayerAwakeForNightStep(p, key, round));
    const isHumanTurn = isPlayerAwakeForNightStep(humanPlayer, key, round);
    return {
      key,
      roleId: meta.roleId,
      stepIndex: idx,
      totalSteps: keys.length,
      title: meta.title,
      gmNarration: meta.gmNarration,
      playerInstruction: meta.playerInstruction,
      humanDurationSec: uniformNightStepSec,
      botDurationSec: uniformNightStepSec,
      hasLivingActor,
      isHumanTurn,
    };
  });
}

/**
 * Finds the exact night step index where the human player is called to wake up and act,
 * or -1 if the human player is a passive night role (Villager, Hunter, Tanner, Elder, Cursed, Traitor) or dead.
 */
export function findHumanNightStepIndex(
  schedule: AutoGMNightStep[],
  humanPlayer: Player | undefined,
  round: number
): number {
  if (!humanPlayer || !humanPlayer.isAlive) return -1;
  return schedule.findIndex((step) => isPlayerAwakeForNightStep(humanPlayer, step.key, round));
}

/**
 * Explains clearly to the player WHY they wake up or don't wake up at night based on their role.
 */
export function getHumanRoleWakeGuidance(
  player: Player | undefined,
  round: number,
  lang: Language
): {
  wakesTonight: boolean;
  headline: string;
  subtext: string;
} {
  if (!player) {
    return { wakesTonight: false, headline: '', subtext: '' };
  }
  const roleName = ROLES[player.roleId].name[lang] || ROLES[player.roleId].name.vi;

  if (!player.isAlive) {
    return {
      wakesTonight: false,
      headline: tr(lang, {
        vi: `👻 Bạn đã tử trận (${roleName})`,
        en: `👻 You are a Ghost Soul (${roleName})`,
      }),
      subtext: tr(lang, {
        vi: 'Hồn ma có thể tự do bay lượn quan sát làng nhưng không còn quyền năng ban đêm.',
        en: 'You can fly around the village and watch, but cannot use night powers.',
      }),
    };
  }

  if (player.hasUsedPower && (player.roleId === 'seer' || player.roleId === 'bodyguard' || player.roleId === 'witch')) {
    return {
      wakesTonight: false,
      headline: tr(lang, {
        vi: `⚠️ Quyền năng ${roleName} đã bị phong ấn!`,
        en: `⚠️ ${roleName} power is sealed!`,
      }),
      subtext: tr(lang, {
        vi: 'Do dân làng đã treo cổ nhầm Già Làng, toàn bộ chức năng đặc biệt bị vô hiệu hóa.',
        en: 'Because the village executed the Elder, special powers are sealed.',
      }),
    };
  }

  switch (player.roleId) {
    case 'doppelganger':
      return round === 1
        ? {
            wakesTonight: true,
            headline: tr(lang, {
              vi: `🪞 Vai của bạn (${roleName}) thức dậy ở Bước 1 Đêm Đầu!`,
              en: `🪞 Your role (${roleName}) wakes on Step 1 of Night 1!`,
            }),
            subtext: tr(lang, {
              vi: 'Hãy chọn 1 người chơi làm hình mẫu. Khi người đó chết, bạn sẽ kế thừa vai của họ.',
              en: 'Choose 1 role model. When they die, you inherit their role.',
            }),
          }
        : {
            wakesTonight: false,
            headline: tr(lang, {
              vi: `🪞 ${roleName} chỉ thức dậy vào Đêm 1 (Đang chờ hình mẫu tử trận)`,
              en: `🪞 ${roleName} only wakes on Night 1 (Waiting to inherit role)`,
            }),
            subtext: tr(lang, {
              vi: 'Khi người bạn chọn làm hình mẫu chết, bạn sẽ lập tức biến thành vai trò của họ.',
              en: 'Once your chosen model dies, you will transform into their role.',
            }),
          };
    case 'cupid':
      return round === 1
        ? {
            wakesTonight: true,
            headline: tr(lang, {
              vi: `💘 Vai của bạn (${roleName}) thức dậy ở Đêm Đầu Tiên!`,
              en: `💘 Your role (${roleName}) wakes on Night 1!`,
            }),
            subtext: tr(lang, {
              vi: 'Chọn 2 người chơi bất kỳ để ghép thành cặp Tình Nhân sinh tử.',
              en: 'Pick 2 players to bind together as star-crossed Lovers.',
            }),
          }
        : {
            wakesTonight: false,
            headline: tr(lang, {
              vi: `💘 ${roleName} đã ghép đôi xong ở Đêm 1 (Từ Đêm 2 ngủ như Dân Làng)`,
              en: `💘 ${roleName} already linked Lovers on Night 1 (Sleeps from Night 2+)`,
            }),
            subtext: tr(lang, {
              vi: 'Từ đêm thứ 2 trở đi, Cupid không thức dậy nữa mà suy luận ban ngày cùng Dân Làng.',
              en: 'From Night 2 onward, Cupid sleeps at night and helps the village by day.',
            }),
          };
    case 'werewolf':
    case 'wolf_pup':
      return {
        wakesTonight: true,
        headline: tr(lang, {
          vi: `🐺 Vai của bạn (${roleName}) thức dậy mỗi đêm ở lượt Ma Sói!`,
          en: `🐺 Your role (${roleName}) wakes every night on the Werewolf turn!`,
        }),
        subtext: tr(lang, {
          vi: 'Khi Quản Trò Máy gọi Ma Sói, bảng hành động sẽ mở để bạn chọn con mồi.',
          en: 'When Auto-GM calls Werewolves, your action console opens to choose a victim.',
        }),
      };
    case 'witch':
      return {
        wakesTonight: true,
        headline: tr(lang, {
          vi: `🧪 Vai của bạn (${roleName}) thức dậy ngay sau lượt Ma Sói!`,
          en: `🧪 Your role (${roleName}) wakes right after the Werewolves!`,
        }),
        subtext: tr(lang, {
          vi: 'Quản Trò Máy sẽ báo ai vừa bị Sói cắn để bạn chọn Cứu hoặc Đầu Độc.',
          en: 'Auto-GM will reveal who was bitten so you can Heal or Poison.',
        }),
      };
    case 'seer':
      return {
        wakesTonight: true,
        headline: tr(lang, {
          vi: `🔮 Vai của bạn (${roleName}) thức dậy mỗi đêm ở lượt Tiên Tri!`,
          en: `🔮 Your role (${roleName}) wakes every night on the Seer turn!`,
        }),
        subtext: tr(lang, {
          vi: 'Khi đến lượt Tiên Tri, hãy chọn 1 người chơi để biết chính xác họ là Sói hay Dân.',
          en: 'On the Seer turn, pick 1 player to reveal their true alignment.',
        }),
      };
    case 'bodyguard':
      return {
        wakesTonight: true,
        headline: tr(lang, {
          vi: `🛡️ Vai của bạn (${roleName}) thức dậy mỗi đêm ở lượt Bảo Vệ!`,
          en: `🛡️ Your role (${roleName}) wakes every night on the Bodyguard turn!`,
        }),
        subtext: tr(lang, {
          vi: 'Chọn 1 người để đặt khiên chống Sói cắn (không trùng người đêm trước).',
          en: 'Choose 1 player to shield from wolf bites (no consecutive repeats).',
        }),
      };
    case 'hunter':
      return player.hasUsedPower
        ? {
            wakesTonight: false,
            headline: tr(lang, {
              vi: `🎯 ${roleName} đã bị phong ấn quyền năng`,
              en: `🎯 ${roleName} power sealed`,
            }),
            subtext: tr(lang, {
              vi: 'Kỹ năng Thợ Săn đã bị phong ấn sau khi Già Làng bị treo cổ.',
              en: 'Your Hunter power is sealed due to the Elder lynch penalty.',
            }),
          }
        : {
            wakesTonight: true,
            headline: tr(lang, {
              vi: `🎯 Vai của bạn (${roleName}) thức dậy mỗi đêm ở lượt Thợ Săn!`,
              en: `🎯 Your role (${roleName}) wakes every night on the Hunter turn!`,
            }),
            subtext: tr(lang, {
              vi: 'Chọn ghim đạn vào 1 người (hoặc Không ghim). Nếu bạn chết trong đêm nay, phát đạn ghim sẽ tự động nổ súng (không kích hoạt nếu bị treo cổ ban ngày)!',
              en: 'Mark 1 player (or choose No Mark). If you die tonight, your gun auto-fires at them (does not fire if lynched by day)!',
            }),
          };
    case 'elder':
      return {
        wakesTonight: false,
        headline: tr(lang, {
          vi: `👑 Vai của bạn là ${roleName} (Nội tại 2 Mạng chống Sói — Ngủ ban đêm)`,
          en: `👑 Your role is ${roleName} (2 Lives vs Wolves Passive — Sleeps at night)`,
        }),
        subtext: tr(lang, {
          vi: `Bạn có ${player.elderLives ?? 2} mạng trước hàm răng Ma Sói và tự động chịu đòn mà không cần thức dậy.`,
          en: `You have ${player.elderLives ?? 2} lives against Werewolf bites automatically without waking.`,
        }),
      };
    case 'cursed':
      return {
        wakesTonight: false,
        headline: tr(lang, {
          vi: `🌓 Vai của bạn là ${roleName} (Nội tại Hóa Sói khi bị cắn — Ngủ ban đêm)`,
          en: `🌓 Your role is ${roleName} (Turns into Werewolf if bitten — Sleeps at night)`,
        }),
        subtext: tr(lang, {
          vi: 'Hiện tại bạn thuộc phe Dân Làng. Nếu đêm nay bị Sói cắn, bạn không chết mà biến thành Ma Sói từ đêm sau!',
          en: 'Currently a Villager. If bitten by wolves, you survive and wake as a Werewolf next night!',
        }),
      };
    case 'tanner':
      return {
        wakesTonight: false,
        headline: tr(lang, {
          vi: `🎭 Vai của bạn là ${roleName} (Thắng khi bị treo cổ ban ngày — Ngủ ban đêm)`,
          en: `🎭 Your role is ${roleName} (Wins if executed by Day Vote — Sleeps at night)`,
        }),
        subtext: tr(lang, {
          vi: 'Ban đêm bạn ngủ. Khi trời sáng, hãy giả vờ khả nghi để lừa cả làng bỏ phiếu treo cổ mình!',
          en: 'Sleep through the night. By day, act suspicious so the village votes to execute you!',
        }),
      };
    case 'traitor':
      return {
        wakesTonight: false,
        headline: tr(lang, {
          vi: `🗡️ Vai của bạn là ${roleName} (Gián điệp Phe Sói — Không thức ban đêm)`,
          en: `🗡️ Your role is ${roleName} (Werewolf Minion — Sleeps at night)`,
        }),
        subtext: tr(lang, {
          vi: 'Bạn thắng cùng phe Ma Sói và Tiên Tri soi bạn ra Dân Làng. Hãy bảo vệ Sói vào ban ngày!',
          en: 'You win with Werewolves and appear Good to the Seer. Defend the wolves during daytime!',
        }),
      };
    default:
      return {
        wakesTonight: false,
        headline: tr(lang, {
          vi: `🧑‍🌾 Vai của bạn là ${roleName} (Không có kỹ năng đêm — Suy luận ban ngày)`,
          en: `🧑‍🌾 Your role is ${roleName} (No night action — Day Deduction & Voting)`,
        }),
        subtext: tr(lang, {
          vi: 'Dân Làng ngủ suốt đêm. Bạn có thể bấm "Tua Tới Sáng" ngay để bước vào Thảo Luận & Bỏ Phiếu!',
          en: 'Villagers sleep at night. Click "Skip to Dawn" anytime to start Day Discussion & Voting!',
        }),
      };
  }
}

/**
 * Computes rule-compliant AI Bot night decisions for a given night step.
 */
export function computeAutoGMBotNightStepAction(
  stepKey: NightStepKey,
  players: Player[],
  currentActions: NightActions,
  options: {
    round: number;
    wolfPupFrenzy: boolean;
    humanPlayerId: string;
    knownWolfIdsByBotSeer?: string[];
    checkedIdsByBotSeer?: string[];
    suspectedIds?: string[];
    brain?: AIMatchBrain | null;
  }
): Partial<NightActions> {
  if (options.brain) {
    return computeSmartBotNightAction(options.brain, stepKey, players, currentActions, {
      round: options.round,
      wolfPupFrenzy: options.wolfPupFrenzy,
      humanPlayerId: options.humanPlayerId,
    });
  }

  const alivePlayers = players.filter((p) => p.isAlive);
  const human = players.find((p) => p.id === options.humanPlayerId);

  if (stepKey === 'doppelganger' && options.round === 1) {
    const botDoppel = alivePlayers.find(
      (p) => p.roleId === 'doppelganger' && p.id !== options.humanPlayerId
    );
    if (botDoppel && !currentActions.doppelgangerTargetId) {
      const candidates = alivePlayers.filter((p) => p.id !== botDoppel.id);
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        return { doppelgangerTargetId: pick.id };
      }
    }
  }

  if (stepKey === 'cupid' && options.round === 1) {
    const botCupid = alivePlayers.find(
      (p) => p.roleId === 'cupid' && p.id !== options.humanPlayerId
    );
    if (
      botCupid &&
      (!currentActions.cupidLovers ||
        !currentActions.cupidLovers[0] ||
        !currentActions.cupidLovers[1])
    ) {
      const shuffled = [...alivePlayers].sort(() => Math.random() - 0.5);
      if (shuffled.length >= 2) {
        return { cupidLovers: [shuffled[0].id, shuffled[1].id] };
      }
    }
  }

  if (stepKey === 'werewolf') {
    const isHumanLivingWolf =
      human &&
      human.isAlive &&
      (human.roleId === 'werewolf' || human.roleId === 'wolf_pup');

    // When the human player is a living Werewolf, let the human player choose tonight's target directly
    if (isHumanLivingWolf) {
      return {};
    }

    const livingWolves = alivePlayers.filter(
      (p) => p.roleId === 'werewolf' || p.roleId === 'wolf_pup'
    );
    // Avoid biting non-wolves who are Lovers with a living wolf
    const wolfLoverIds = new Set(
      livingWolves.map((w) => w.loverId).filter(Boolean) as string[]
    );
    const nonWolves = alivePlayers.filter(
      (p) => p.roleId !== 'werewolf' && p.roleId !== 'wolf_pup'
    );
    const preferredPrey = nonWolves.filter((p) => !wolfLoverIds.has(p.id));
    const preyPool = preferredPrey.length > 0 ? preferredPrey : nonWolves;

    const updates: Partial<NightActions> = {};
    if (!currentActions.wolfTargetId) {
      if (preyPool.length > 0) {
        const primary = preyPool[Math.floor(Math.random() * preyPool.length)];
        updates.wolfTargetId = primary.id;
      }
    }

    const chosenPrimary = updates.wolfTargetId || currentActions.wolfTargetId;
    if (options.wolfPupFrenzy && !currentActions.secondWolfTargetId) {
      const secondPool = preyPool.filter((p) => p.id !== chosenPrimary);
      if (secondPool.length > 0) {
        const secondary = secondPool[Math.floor(Math.random() * secondPool.length)];
        updates.secondWolfTargetId = secondary.id;
      }
    }
    return updates;
  }

  if (stepKey === 'witch') {
    const botWitch = alivePlayers.find(
      (p) => p.roleId === 'witch' && p.id !== options.humanPlayerId
    );
    if (botWitch && !botWitch.hasUsedPower) {
      const updates: Partial<NightActions> = {};
      const dyingVictims = getDyingWolfVictimsForWitch(
        players,
        currentActions,
        options.wolfPupFrenzy
      );

      // Inspect ALL dying wolf victims (including Wolf Pup frenzy Victim #2); prioritize self & Lover
      if (!botWitch.hasUsedHeal && dyingVictims.length > 0) {
        if (dyingVictims.includes(botWitch.id)) {
          updates.witchHealTargetId = botWitch.id;
        } else if (botWitch.loverId && dyingVictims.includes(botWitch.loverId)) {
          updates.witchHealTargetId = botWitch.loverId;
        } else if (Math.random() < (options.round <= 2 ? 0.6 : 0.55)) {
          updates.witchHealTargetId =
            dyingVictims[Math.floor(Math.random() * dyingVictims.length)];
        }
      }

      // Fair Bot Witch Poison: use public suspectedIds if available, else uniform random — NEVER peek at roleId
      if (!botWitch.hasUsedPoison && options.round >= 2 && Math.random() < 0.45) {
        const dyingSet = new Set(dyingVictims);
        const poisonCandidates = alivePlayers.filter(
          (p) =>
            p.id !== botWitch.id &&
            p.id !== botWitch.loverId &&
            !dyingSet.has(p.id)
        );
        if (poisonCandidates.length > 0) {
          const suspectedSet = new Set(options.suspectedIds || []);
          const suspectedPool = poisonCandidates.filter((p) => suspectedSet.has(p.id));
          const pickPool = suspectedPool.length > 0 ? suspectedPool : poisonCandidates;
          const pick = pickPool[Math.floor(Math.random() * pickPool.length)];
          updates.witchPoisonTargetId = pick.id;
        }
      }
      return updates;
    }
  }

  if (stepKey === 'seer') {
    const botSeer = alivePlayers.find(
      (p) => p.roleId === 'seer' && p.id !== options.humanPlayerId
    );
    if (botSeer && !botSeer.hasUsedPower && !currentActions.seerTargetId) {
      const alreadyChecked = new Set([
        ...(options.knownWolfIdsByBotSeer || []),
        ...(options.checkedIdsByBotSeer || []),
      ]);
      const candidates = alivePlayers.filter(
        (p) => p.id !== botSeer.id && !alreadyChecked.has(p.id)
      );
      const pool =
        candidates.length > 0
          ? candidates
          : alivePlayers.filter((p) => p.id !== botSeer.id);
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        return { seerTargetId: pick.id };
      }
    }
  }

  if (stepKey === 'bodyguard') {
    const botGuard = alivePlayers.find(
      (p) => p.roleId === 'bodyguard' && p.id !== options.humanPlayerId
    );
    if (botGuard && !botGuard.hasUsedPower && !currentActions.guardTargetId) {
      // Strictly obey rule: cannot guard a player with protectedLastNight === true
      const validTargets = alivePlayers.filter((p) => !p.protectedLastNight);
      if (validTargets.length > 0) {
        const pick = validTargets[Math.floor(Math.random() * validTargets.length)];
        return { guardTargetId: pick.id };
      }
    }
  }

  if (stepKey === 'hunter') {
    const botHunter = alivePlayers.find(
      (p) => p.roleId === 'hunter' && !p.hasUsedPower && p.id !== options.humanPlayerId
    );
    if (botHunter && currentActions.hunterTargetId === undefined) {
      if (Math.random() < 0.15) {
        return { hunterTargetId: null };
      }
      const pick = pickSmartBotHunterTarget(
        players,
        botHunter,
        options.knownWolfIdsByBotSeer,
        null
      );
      return { hunterTargetId: pick ? pick.id : null };
    }
  }

  return {};
}

export interface BotChatVoteSignals {
  suspectsByVoter: Record<string, string[]>;
  alliesByVoter: Record<string, string[]>;
  suspectsSilentVoters: string[];
  silentPlayerIds: string[];
}

/**
 * Extracts per-bot suspicion & alliance signals from daytime chat logs (BUG-14)
 * so bots vote consistently with whom they accused/defended and avoid voting for allies who defended them.
 */
export function extractChatVoteSignals(
  messages: Array<{ id?: string; senderId: string; text: string; isSystem?: boolean; isGhost?: boolean }>,
  players: Player[]
): BotChatVoteSignals {
  const suspectsByVoter: Record<string, Set<string>> = {};
  const alliesByVoter: Record<string, Set<string>> = {};
  const suspectsSilent = new Set<string>();
  const speakers = new Set<string>();

  // Scope strictly to messages AFTER the latest Dawn system announcement
  const dawnPattern = /bình minh|trời đã sáng|sáng ngày|dawn|morning/i;
  let latestDawnIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.isSystem && (m.id?.startsWith('sys_dawn_') || dawnPattern.test(m.text || ''))) {
      latestDawnIdx = i;
      break;
    }
  }
  const scopedMessages = latestDawnIdx >= 0 ? messages.slice(latestDawnIdx + 1) : messages;

  const alivePlayers = players.filter((p) => p.isAlive);
  const accusePattern =
    /(nghi|sói|treo cổ|chất vấn|đáng ngờ|suspect|wolf|vote|lynch|loup|sospech|怪し)/i;
  const explicitAccusePattern =
    /(treo cổ|vote|lynch|chắc chắn là sói|chắc chắn.*sói|là ma sói|is a werewolf|is a wolf|definitely.*wolf)/i;
  const defendPattern =
    /(tin tưởng|bênh|đáng tin|không phải sói|người tốt|phe dân|trust|innocent|defend|vouch|clean|味方)/i;
  const silentAccusePattern = /(im lặng|ít nói|không nói|silent|quiet|n'a rien dit|callado|黙って)/i;

  for (const msg of scopedMessages) {
    if (!msg || msg.isSystem || msg.isGhost || !msg.senderId || msg.senderId === 'sys') continue;
    speakers.add(msg.senderId);
    const text = (msg.text || '').trim();
    const isSilentAccuse = silentAccusePattern.test(text);
    const questionOnly = /[?？]$/.test(text) && !explicitAccusePattern.test(text);
    const isAccuse = accusePattern.test(text) && !questionOnly;
    const isDefend = defendPattern.test(text) && !questionOnly;
    if (isSilentAccuse) {
      suspectsSilent.add(msg.senderId);
    }

    for (const target of alivePlayers) {
      if (target.id === msg.senderId) continue;
      if (!target.name || !text.toLowerCase().includes(target.name.toLowerCase())) continue;

      if (isDefend && !isAccuse && !isSilentAccuse) {
        if (!alliesByVoter[msg.senderId]) alliesByVoter[msg.senderId] = new Set();
        alliesByVoter[msg.senderId].add(target.id);
        // Reciprocal alliance: the defended player also treats their defender as an ally!
        if (!alliesByVoter[target.id]) alliesByVoter[target.id] = new Set();
        alliesByVoter[target.id].add(msg.senderId);
      } else if (isAccuse || isSilentAccuse) {
        if (!suspectsByVoter[msg.senderId]) suspectsByVoter[msg.senderId] = new Set();
        suspectsByVoter[msg.senderId].add(target.id);
      }
    }
  }

  const silentPlayerIds = alivePlayers
    .filter((p) => !speakers.has(p.id))
    .map((p) => p.id);

  const toRecordArray = (rec: Record<string, Set<string>>) => {
    const out: Record<string, string[]> = {};
    for (const [k, set] of Object.entries(rec)) {
      out[k] = Array.from(set);
    }
    return out;
  };

  return {
    suspectsByVoter: toRecordArray(suspectsByVoter),
    alliesByVoter: toRecordArray(alliesByVoter),
    suspectsSilentVoters: Array.from(suspectsSilent),
    silentPlayerIds,
  };
}

/**
 * Generates intelligent, rule-aware AI Bot votes during Day Voting.
 * - Werewolves never vote against fellow Werewolves unless no other option exists.
 * - Players never vote against their Cupid Lover (`loverId`).
 * - Seer & Villagers prioritize known/suspected wolves.
 * - Honors chat-extracted suspicions and alliances so bots never contradict their own debate lines (BUG-14).
 */
export function computeSmartBotDayVotes(
  players: Player[],
  knownWolfIds: string[] = [],
  humanTargetId?: string | null,
  chatSignals?: BotChatVoteSignals | null,
  brain?: AIMatchBrain | null,
  voteContext?: { currentVotes?: VoteRecord[]; mayorId?: string | null; round?: number }
): VoteRecord[] {
  if (brain) {
    return computeSmartBotVotes(brain, players, {
      humanTargetId,
      chatSignals,
      currentVotes: voteContext?.currentVotes,
      mayorId: voteContext?.mayorId,
      round: voteContext?.round,
    });
  }

  const alive = players.filter((p) => p.isAlive);
  const aliveBots = alive.filter((p) => p.isBot);
  const knownSet = new Set(knownWolfIds);
  const silentSet = new Set(chatSignals?.silentPlayerIds || []);
  const silentVotersSet = new Set(chatSignals?.suspectsSilentVoters || []);

  return aliveBots.map((bot) => {
    const validOthers = alive.filter(
      (p) => p.id !== bot.id && p.id !== bot.loverId
    );
    const fallbackOthers = alive.filter((p) => p.id !== bot.id);
    const basePool = validOthers.length > 0 ? validOthers : fallbackOthers;

    if (basePool.length === 0) {
      return { voterId: bot.id, targetId: bot.id };
    }

    const isBotWolfTeam =
      bot.roleId === 'werewolf' ||
      bot.roleId === 'wolf_pup';
    const isBotTraitor = bot.roleId === 'traitor';

    const mySuspects = new Set(chatSignals?.suspectsByVoter[bot.id] || []);
    const myAllies = new Set(chatSignals?.alliesByVoter[bot.id] || []);

    // Filter out allies who defended this bot (or whom this bot defended) unless no other choices exist
    const nonAllyPool = basePool.filter((p) => !myAllies.has(p.id));
    const preferredPool = nonAllyPool.length > 0 ? nonAllyPool : basePool;

    if (isBotWolfTeam) {
      const nonWolfTargets = preferredPool.filter(
        (p) => p.roleId !== 'werewolf' && p.roleId !== 'wolf_pup'
      );
      const wolfCandidatePool =
        nonWolfTargets.length > 0
          ? nonWolfTargets
          : basePool.filter((p) => p.roleId !== 'werewolf' && p.roleId !== 'wolf_pup');

      if (wolfCandidatePool.length > 0) {
        // Stay consistent with whom this wolf publicly accused in chat
        const chatSuspectedTargets = wolfCandidatePool.filter((p) => mySuspects.has(p.id));
        if (chatSuspectedTargets.length > 0) {
          return { voterId: bot.id, targetId: chatSuspectedTargets[0].id };
        }
        const pick =
          wolfCandidatePool[Math.floor(Math.random() * wolfCandidatePool.length)];
        return { voterId: bot.id, targetId: pick.id };
      }
    } else if (isBotTraitor) {
      // Traitor is Werewolf-aligned without night omniscience:
      // NEVER self-sabotage publicly suspected/known wolves; counter-vote outside knownSet!
      const nonKnownPool = preferredPool.filter((p) => !knownSet.has(p.id));
      const traitorPool = nonKnownPool.length > 0 ? nonKnownPool : preferredPool;
      const accusedOutside = traitorPool.filter((p) => mySuspects.has(p.id));
      if (accusedOutside.length > 0) {
        return { voterId: bot.id, targetId: accusedOutside[0].id };
      }
      const pick = traitorPool[Math.floor(Math.random() * traitorPool.length)];
      return { voterId: bot.id, targetId: pick.id };
    } else {
      // 1. Confirmed known wolf takes top priority for Seer & villagers
      const knownWolvesAlive = preferredPool.filter((p) => knownSet.has(p.id));
      if (knownWolvesAlive.length > 0 && (bot.roleId === 'seer' || Math.random() < 0.72)) {
        return { voterId: bot.id, targetId: knownWolvesAlive[0].id };
      }

      // 2. Consistent with the player this bot explicitly accused in Day Discussion
      const accusedAlive = preferredPool.filter((p) => mySuspects.has(p.id));
      if (accusedAlive.length > 0) {
        return { voterId: bot.id, targetId: accusedAlive[0].id };
      }

      // 3. If this bot specifically suspected silent players in chat, target a silent player
      if (silentVotersSet.has(bot.id)) {
        const silentTargets = preferredPool.filter((p) => silentSet.has(p.id));
        if (silentTargets.length > 0) {
          return { voterId: bot.id, targetId: silentTargets[0].id };
        }
      }

      // 4. Slight coordination with human player's vote if target is not an ally
      if (humanTargetId && !myAllies.has(humanTargetId) && Math.random() < 0.35) {
        const humanTarget = preferredPool.find((p) => p.id === humanTargetId);
        if (humanTarget) {
          return { voterId: bot.id, targetId: humanTarget.id };
        }
      }
    }

    const pick = preferredPool[Math.floor(Math.random() * preferredPool.length)];
    return { voterId: bot.id, targetId: pick.id };
  });
}

/**
 * Selects a fair, rule-aware revenge shot target for an AI Bot Hunter.
 * Never shoots dead players, self, or Cupid Lover (unless no other choice);
 * prioritizes confirmed wolves, then Hunter's own chat suspects, else random non-ally.
 */
export function pickSmartBotHunterTarget(
  players: Player[],
  hunter: Player,
  knownWolfIds?: string[],
  chatSignals?: BotChatVoteSignals | null,
  brain?: AIMatchBrain | null,
  options?: { lynchVoters?: string[] }
): Player | null {
  if (brain) {
    return pickSmartBotHunterTargetWithBrain(brain, players, hunter, {
      chatSignals,
      lynchVoters: options?.lynchVoters,
    });
  }

  const aliveOthers = players.filter((p) => p.isAlive && p.id !== hunter.id);
  if (aliveOthers.length === 0) return null;

  const nonLovers = aliveOthers.filter((p) => p.id !== hunter.loverId);
  const basePool = nonLovers.length > 0 ? nonLovers : aliveOthers;

  const knownSet = new Set(knownWolfIds || []);
  const knownTargets = basePool.filter((p) => knownSet.has(p.id));
  if (knownTargets.length > 0) {
    return knownTargets[Math.floor(Math.random() * knownTargets.length)];
  }

  const myAllies = new Set(chatSignals?.alliesByVoter[hunter.id] || []);
  const nonAllyPool = basePool.filter((p) => !myAllies.has(p.id));
  const preferredPool = nonAllyPool.length > 0 ? nonAllyPool : basePool;

  const mySuspects = new Set(chatSignals?.suspectsByVoter[hunter.id] || []);
  const suspectTargets = preferredPool.filter((p) => mySuspects.has(p.id));
  if (suspectTargets.length > 0) {
    return suspectTargets[Math.floor(Math.random() * suspectTargets.length)];
  }

  return preferredPool[Math.floor(Math.random() * preferredPool.length)];
}

/**
 * Generates contextual Day Discussion lines spoken by living AI bots moderated by Auto-GM.
 */
export function buildBotDayDiscussionLines(
  players: Player[],
  killedNames: string[],
  lang: Language,
  seerInspection?: { playerId: string; roleId: RoleId; isWerewolf: boolean } | null,
  round = 1
): { senderId: string; senderName: string; text: string }[] {
  const aliveBots = players.filter((p) => p.isBot && p.isAlive);
  if (aliveBots.length === 0) return [];

  const pickOne = <T,>(items: readonly T[]): T =>
    items[Math.floor(Math.random() * items.length)];

  const lines: { senderId: string; senderName: string; text: string }[] = [];
  const shuffled = [...aliveBots];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  // Living bot Seer shares clue without dead-giveaway emoji: strong callout on Wolf or Round 2+, subtle vouching on Day 1 safe
  const botSeer = aliveBots.find((p) => p.roleId === 'seer' && !p.hasUsedPower);
  if (botSeer && seerInspection) {
    const target = players.find((p) => p.id === seerInspection.playerId);
    if (target && target.isAlive) {
      const n = target.name;
      const seerLine = seerInspection.isWerewolf
        ? tr(lang, {
            vi: `Tôi có manh mối rất rõ — mọi người hãy cân nhắc treo cổ ${n}, tôi nghi chắc chắn họ là Ma Sói!`,
            en: `I have a strong lead — everyone should consider voting ${n}, I strongly suspect they are a Werewolf!`,
          })
        : round >= 2
        ? tr(lang, {
            vi: `Tôi có cơ sở chắc chắn để bênh ${n} — người này đáng tin thuộc phe Dân Làng.`,
            en: `I can confidently vouch for ${n} — they are clean and trustworthy on the Villager side.`,
          })
        : tr(lang, {
            vi: `Mình có cảm giác ${n} là người tốt, khá đáng tin ở vòng này.`,
            en: `I get a good feeling about ${n} — seems trustworthy so far.`,
          });
      lines.push({
        senderId: botSeer.id,
        senderName: botSeer.name,
        text: seerLine,
      });
    }
  }

  const otherBots = shuffled.filter((b) => b.id !== botSeer?.id).slice(0, 2);
  otherBots.forEach((bot, idx) => {
    const isBitingWolf = bot.roleId === 'werewolf' || bot.roleId === 'wolf_pup';
    const rawOthers = players.filter((p) => p.isAlive && p.id !== bot.id);
    const safeSuspectPool = rawOthers.filter(
      (p) =>
        p.id !== bot.loverId &&
        (!isBitingWolf || (p.roleId !== 'werewolf' && p.roleId !== 'wolf_pup'))
    );
    const suspectPool = safeSuspectPool.length > 0 ? safeSuspectPool : rawOthers;
    const randomSuspect =
      suspectPool.length > 0 ? pickOne(suspectPool).name : '...';

    let text = '';
    const S = randomSuspect;
    const killedList = killedNames.join(', ');
    if (bot.roleId === 'tanner') {
      text = pickOne(
        tr(lang, {
          vi: [
            'Khoan đã, sao mọi người cứ nhìn chằm chằm vào tôi vậy? Đêm qua tôi ngủ kỹ lắm, đừng đổ oan vô cớ!',
            'Bàn này đoán lung tung quá... tôi chỉ là dân thường thôi, ai nghi thì cứ thử bỏ phiếu đi!',
            'Đừng phí thời gian hỏi tôi nữa, tôi không biết gì đâu — muốn treo cổ ai thì quyết nhanh lên!',
          ],
          en: [
            'Hey, why is everyone staring at me? I slept through the night, stop pointing fingers for nothing!',
            'This village is guessing blindly... I have nothing to prove, suspect me if you want!',
            'Stop wasting time questioning me — pick someone and get it over with already!',
          ],
        })
      );
    } else if (idx === 0) {
      text =
        killedNames.length > 0
          ? pickOne(
              tr(lang, {
                vi: [
                  `Đêm qua ${killedList} đã ngã xuống rồi... Chúng ta hãy chia sẻ manh mối trước khi bỏ phiếu!`,
                  `Mất ${killedList} sớm thế này thật căng thẳng. Có ai để ý dấu hiệu nào bất thường không?`,
                  `${killedList} vừa rời cuộc chơi trong đêm. Mọi người đừng vội dồn phiếu, hãy nghe từng người phân tích đã!`,
                ],
                en: [
                  `We lost ${killedList} last night... Let’s share clues carefully before voting!`,
                  `Losing ${killedList} puts real pressure on the village. Did anyone spot anything unusual?`,
                  `${killedList} fell overnight. Let’s not rush — hear everyone out before locking votes!`,
                ],
              })
            )
          : pickOne(
              tr(lang, {
                vi: [
                  'Đêm qua bình yên, không ai tử trận! Chắc chắn Bảo Vệ đã che chở đúng người hoặc Phù Thủy đã dùng Bình Cứu.',
                  'Trời sáng mà đủ mặt cả làng — tin tốt đấy, nhưng đừng chủ quan vì bầy Sói vẫn đang ẩn nấp!',
                  'Không có ai chết đêm qua! Có thể có phép cứu người, hoặc bầy Sói vừa va phải Già Làng hay Bán Sói rồi.',
                ],
                en: [
                  'A peaceful night — nobody died! Either the Bodyguard blocked the bite or the Witch used her Heal potion.',
                  'Everyone woke up alive — great news, though the Werewolves are still hiding among us!',
                  'Zero casualties overnight! Someone was saved, or the wolves ran into the Elder or Cursed.',
                ],
              })
            );
    } else if (round <= 1) {
      text = pickOne(
        tr(lang, {
          vi: [
            `Mới sáng ngày đầu tiên, mọi người thấy ai có phản ứng lạ không? ${S}, bạn nghi ngờ ai nhất?`,
            `Ngày 1 chưa có nhiều dữ kiện, mình muốn nghe góc nhìn của ${S} trước khi quyết định.`,
            `Vòng đầu cứ bình tĩnh thăm dò đã — ${S}, theo bạn hôm nay cả làng nên quan sát ai trước?`,
            `Mọi người quanh lửa trại lên tiếng cho sôi nổi nào! ${S}, trực giác của bạn hướng về ai?`,
          ],
          en: [
            `It’s Day 1 — does anyone have an early read? ${S}, who are you watching first?`,
            `Day 1 information is still thin, so I want to hear ${S}’s thoughts before deciding.`,
            `Let’s stay sharp on Round 1 — ${S}, who seems the most composed around the fire?`,
            `Let’s get everyone talking around the campfire! ${S}, who gives you the strangest vibe?`,
          ],
        })
      );
    } else {
      text = pickOne(
        tr(lang, {
          vi: [
            `Qua mấy lượt vừa rồi, tôi thấy ${S} hơi im lặng và ít đưa lập luận — mọi người nghĩ sao?`,
            `Nhìn lại nhịp bỏ phiếu vòng trước, biểu hiện của ${S} khá đáng ngờ, tôi đang nghi người này.`,
            `Càng về sau càng ít người, không thể sai lầm nữa — tôi muốn chất vấn ${S} giải thích rõ góc nhìn của mình.`,
            `Tôi theo dõi sát ${S} từ hôm qua, cách họ né tránh tranh luận khiến tôi nghi là Sói.`,
          ],
          en: [
            `After the last round, ${S} has stayed pretty quiet. What does the village think?`,
            `Looking back at yesterday’s pattern, I suspect ${S} is hiding something.`,
            `The circle is shrinking and we can’t afford a mistake — I suspect ${S} may be a wolf.`,
            `I’ve been watching ${S} since yesterday; dodging debate makes me suspect a wolf.`,
          ],
        })
      );
    }
    lines.push({
      senderId: bot.id,
      senderName: bot.name,
      text,
    });
  });

  return lines;
}

/**
 * Computes the exact initial countdown duration for a given Auto-GM night step.
 * Uses a strictly uniform duration across every step (living/dead, human/bot, ghost/alive)
 * so countdown length never leaks hidden role or liveness information.
 */
export function getStepInitialTimerSeconds(
  step: AutoGMNightStep | null,
  _myNightStepIdx = -1,
  currentStepIdxOrConfig: number | CustomTimerConfig = 0,
  _isGhostSpectator = false
): number {
  if (!step) {
    if (typeof currentStepIdxOrConfig === 'object' && currentStepIdxOrConfig) {
      return Math.max(5, currentStepIdxOrConfig.nightActionSec || 20);
    }
    return 20;
  }
  return step.humanDurationSec;
}

export interface PreparedNightStart {
  schedule: AutoGMNightStep[];
  initialStepIndex: number;
  initialTimerSec: number;
  preSimulatedActions: Partial<NightActions>;
  completedBotRoleIds: RoleId[];
}

/**
 * Prepares the start of a Night so that if the human player has an active waking turn tonight,
 * any preceding Bot-only steps in canonical wakeOrder (e.g. Cupid or Werewolves before Witch/Seer)
 * are simulated automatically and the Night opens directly at the human player's interactive turn!
 */
export function prepareNightStartForHuman(
  players: Player[],
  round: number,
  timerConfig: CustomTimerConfig = DEFAULT_TIMER_CONFIG,
  humanPlayerId?: string,
  options: {
    wolfPupFrenzy?: boolean;
    knownWolfIdsByBotSeer?: string[];
    checkedIdsByBotSeer?: string[];
    suspectedIds?: string[];
    brain?: AIMatchBrain | null;
  } = {}
): PreparedNightStart {
  const schedule = buildAutoGMNightSchedule(players, round, timerConfig, humanPlayerId);
  const humanPlayer = humanPlayerId
    ? players.find((p) => p.id === humanPlayerId)
    : players.find((p) => !p.isBot) || players[0];
  const myStepIdx = findHumanNightStepIndex(schedule, humanPlayer, round);
  const isGhostSpectator = Boolean(humanPlayer && !humanPlayer.isAlive);

  if (myStepIdx <= 0) {
    const firstStep = schedule[0] || null;
    return {
      schedule,
      initialStepIndex: 0,
      initialTimerSec: firstStep
        ? getStepInitialTimerSeconds(firstStep, myStepIdx, 0, isGhostSpectator)
        : timerConfig.nightActionSec,
      preSimulatedActions: {},
      completedBotRoleIds: [],
    };
  }

  const preSimulatedActions: Partial<NightActions> = {};
  const completedBotRoleIds: RoleId[] = [];
  const humanId = humanPlayer?.id || 'usr_me';

  for (let i = 0; i < myStepIdx; i++) {
    const step = schedule[i];
    if (!step) continue;
    completedBotRoleIds.push(step.roleId);
    const botAct = computeAutoGMBotNightStepAction(
      step.key,
      players,
      {
        wolfTargetId: preSimulatedActions.wolfTargetId || null,
        secondWolfTargetId: preSimulatedActions.secondWolfTargetId || null,
        guardTargetId: preSimulatedActions.guardTargetId || null,
        hunterTargetId:
          preSimulatedActions.hunterTargetId !== undefined
            ? preSimulatedActions.hunterTargetId
            : undefined,
        witchHealTargetId: preSimulatedActions.witchHealTargetId || null,
        witchPoisonTargetId: preSimulatedActions.witchPoisonTargetId || null,
        seerTargetId: preSimulatedActions.seerTargetId || null,
        cupidLovers: preSimulatedActions.cupidLovers || null,
        doppelgangerTargetId: preSimulatedActions.doppelgangerTargetId || null,
      },
      {
        round,
        wolfPupFrenzy: Boolean(options.wolfPupFrenzy),
        humanPlayerId: humanId,
        knownWolfIdsByBotSeer: options.knownWolfIdsByBotSeer || [],
        checkedIdsByBotSeer: options.checkedIdsByBotSeer || [],
        suspectedIds: options.suspectedIds || [],
        brain: options.brain,
      }
    );
    Object.assign(preSimulatedActions, botAct);
  }

  const humanStep = schedule[myStepIdx];
  return {
    schedule,
    initialStepIndex: myStepIdx,
    initialTimerSec: humanStep ? humanStep.humanDurationSec : timerConfig.nightActionSec,
    preSimulatedActions,
    completedBotRoleIds,
  };
}

/**
 * Maps a night step's confirmed actions into 3D NightSkillCutsceneEvent items
 * (including BOTH witch_heal and witch_poison when Witch uses both in one night).
 * Seer alignment (`seerIsWolf`) is strictly null unless `includeSeerAlignment === true`
 * (authorized ONLY for the Seer themselves after confirming, or dead Ghost spectators).
 */
export function buildNightSkillCutsceneForStep(params: {
  stepKey: NightStepKey;
  players: Player[];
  actions: NightActions;
  round: number;
  wolfPupFrenzy?: boolean;
  includeSeerAlignment?: boolean;
  lang?: Language;
}): NightSkillCutsceneEvent[] {
  const {
    stepKey,
    players,
    actions,
    round,
    wolfPupFrenzy = false,
    includeSeerAlignment = false,
    lang = 'vi',
  } = params;

  const wakingActors = players.filter((p) =>
    isPlayerAwakeForNightStep(p, stepKey, round)
  );
  if (wakingActors.length === 0) return [];
  const actorIds = wakingActors.map((p) => p.id);

  if (stepKey === 'doppelganger' && actions.doppelgangerTargetId) {
    return [
      {
        id: `cutscene_r${round}_doppelganger`,
        kind: 'doppelganger',
        actorIds,
        primaryTargetId: actions.doppelgangerTargetId,
        durationMs: 2200,
        label: tr(lang, {
          vi: '🪞 Nhân Bản Sao Chép',
          en: '🪞 Doppelgänger Copy',
        }),
      },
    ];
  }

  if (
    stepKey === 'cupid' &&
    actions.cupidLovers &&
    actions.cupidLovers[0] &&
    actions.cupidLovers[1] &&
    actions.cupidLovers[0] !== actions.cupidLovers[1]
  ) {
    return [
      {
        id: `cutscene_r${round}_cupid`,
        kind: 'cupid',
        actorIds,
        primaryTargetId: actions.cupidLovers[0],
        secondaryTargetId: actions.cupidLovers[1],
        durationMs: 2400,
        label: tr(lang, {
          vi: '💘 Mũi Tên Cupid',
          en: '💘 Cupid’s Arrow',
        }),
      },
    ];
  }

  if (stepKey === 'bodyguard' && actions.guardTargetId) {
    return [
      {
        id: `cutscene_r${round}_bodyguard`,
        kind: 'bodyguard',
        actorIds,
        primaryTargetId: actions.guardTargetId,
        durationMs: 2200,
        label: tr(lang, {
          vi: '🛡️ Khiên Bảo Vệ',
          en: '🛡️ Bodyguard Shield',
        }),
      },
    ];
  }

  if (stepKey === 'hunter' && actions.hunterTargetId) {
    return [
      {
        id: `cutscene_r${round}_hunter`,
        kind: 'hunter_shot',
        actorIds,
        primaryTargetId: actions.hunterTargetId,
        durationMs: 2200,
        label: lang === 'vi' ? '🎯 Thợ Săn Ghim Đạn' : '🎯 Hunter Night Aim',
      },
    ];
  }

  if (stepKey === 'werewolf' && actions.wolfTargetId) {
    const secondary =
      wolfPupFrenzy &&
      actions.secondWolfTargetId &&
      actions.secondWolfTargetId !== actions.wolfTargetId
        ? actions.secondWolfTargetId
        : null;
    return [
      {
        id: `cutscene_r${round}_werewolf`,
        kind: 'werewolf',
        actorIds,
        primaryTargetId: actions.wolfTargetId,
        secondaryTargetId: secondary,
        durationMs: 2300,
        label: tr(lang, {
          vi: '🐺 Đàn Sói Săn Mồi',
          en: '🐺 Werewolf Hunt',
        }),
      },
    ];
  }

  if (stepKey === 'witch') {
    const events: NightSkillCutsceneEvent[] = [];
    if (actions.witchHealTargetId) {
      events.push({
        id: `cutscene_r${round}_witch_heal`,
        kind: 'witch_heal',
        actorIds,
        primaryTargetId: actions.witchHealTargetId,
        durationMs: 2200,
        label: tr(lang, {
          vi: '💚 Bình Cứu Sống',
          en: '💚 Witch Heal Elixir',
        }),
      });
    }
    if (actions.witchPoisonTargetId) {
      events.push({
        id: `cutscene_r${round}_witch_poison`,
        kind: 'witch_poison',
        actorIds,
        primaryTargetId: actions.witchPoisonTargetId,
        durationMs: 2200,
        label: tr(lang, {
          vi: '🧪 Bình Độc Nửa Đêm',
          en: '🧪 Witch Poison',
        }),
      });
    }
    return events;
  }

  if (stepKey === 'seer' && actions.seerTargetId) {
    const target = players.find((p) => p.id === actions.seerTargetId);
    const seerIsWolf =
      includeSeerAlignment && target
        ? target.roleId === 'werewolf' || target.roleId === 'wolf_pup'
        : null;
    return [
      {
        id: `cutscene_r${round}_seer`,
        kind: 'seer',
        actorIds,
        primaryTargetId: actions.seerTargetId,
        seerIsWolf,
        durationMs: 2200,
        label: tr(lang, {
          vi: '🔮 Tiên Tri Soi Bài',
          en: '🔮 Seer Divination',
        }),
      },
    ];
  }

  return [];
}

export interface GMAnnouncementVictim {
  id: string;
  name: string;
  avatar: string;
  seatNumber: number;
  tag?: string;
}

export interface GMVoteTallyEntry {
  playerId: string;
  name: string;
  avatar: string;
  seatNumber: number;
  votes: number;
  voters?: VoteTallyVoter[];
}

export interface GMAnnouncementData {
  id: string;
  kind: 'dawn' | 'dusk';
  round: number;
  badge: string;
  headline: string;
  gmQuote: string;
  spokenNarration: string;
  chatMessageText: string;
  dayBarSummary: string;
  victims: GMAnnouncementVictim[];
  publicEvents: string[];
  privateNotice: string | null;
  voteBreakdown?: GMVoteTallyEntry[];
  /** Mayor who held the x2 vote while ballots were cast (may be dead by the time Dusk is shown). */
  votingMayorId?: string | null;
  aliveCount: number;
  totalCount: number;
  ctaLabel: string;
  isHumanDead: boolean;
}

function getSeatNumber(players: Player[], playerId: string): number {
  const idx = players.findIndex((p) => p.id === playerId);
  return idx >= 0 ? idx + 1 : 0;
}

function formatNameList(names: string[], lang: Language): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (lang === 'vi') {
    return `${names.slice(0, -1).join(', ')} và ${names[names.length - 1]}`;
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Builds confidential, single-player GM whispers that ONLY the human player sees at Dawn
 * (mimicking a real-life Game Master silently tapping a player on the shoulder during the night).
 */
export function buildPrivateHumanNightNotice(params: {
  beforePlayers: Player[];
  afterPlayers: Player[];
  humanPlayerId: string;
  round: number;
  lang: Language;
}): string | null {
  const { beforePlayers, afterPlayers, humanPlayerId, round, lang } = params;
  const beforeMe = beforePlayers.find((p) => p.id === humanPlayerId);
  const afterMe = afterPlayers.find((p) => p.id === humanPlayerId);
  if (!beforeMe || !afterMe) return null;

  const notices: string[] = [];

  if (beforeMe.isAlive && !afterMe.isAlive) {
    notices.push(
      lang === 'vi'
        ? '👻 Bạn đã tử trận trong đêm qua! Từ giờ bạn trở thành Hồn Ma — hãy giữ im lặng ở kênh chung và quan sát ván đấu.'
        : '👻 You perished last night! You are now a Ghost Soul — stay silent in public chat and watch the village.'
    );
  }

  if (beforeMe.roleId === 'cursed' && afterMe.roleId === 'werewolf') {
    notices.push(
      lang === 'vi'
        ? '🌓 Mật báo Quản Trò: Đêm qua Sói đã cắn bạn, nhưng dòng máu Bán Sói đã thức tỉnh! Bạn KHÔNG chết và từ Đêm sau sẽ thức dậy cùng đàn Ma Sói.'
        : '🌓 Secret GM Tap: Wolves bit you last night, awakening your Cursed blood! You survived and will wake with the Werewolf pack next night.'
    );
  }

  if (
    beforeMe.roleId === 'elder' &&
    afterMe.roleId === 'elder' &&
    afterMe.isAlive &&
    (beforeMe.elderLives ?? 2) > (afterMe.elderLives ?? 1)
  ) {
    notices.push(
      lang === 'vi'
        ? '👑 Mật báo Quản Trò: Đêm qua Ma Sói đã tấn công bạn, nhưng nội tại Già Làng đã cứu bạn một mạng! Bạn chỉ còn 1 mạng duy nhất.'
        : '👑 Secret GM Tap: Werewolves attacked you last night, but your Elder fortitude saved you! You now have 1 life remaining.'
    );
  }

  if (beforeMe.roleId === 'doppelganger' && afterMe.roleId !== 'doppelganger' && afterMe.isAlive) {
    const newRoleName = ROLES[afterMe.roleId].name[lang] || ROLES[afterMe.roleId].name.vi;
    notices.push(
      lang === 'vi'
        ? `🪞 Mật báo Quản Trò: Hình mẫu của bạn đã ngã xuống đêm qua — bạn chính thức kế thừa thân phận ${newRoleName}!`
        : `🪞 Secret GM Tap: Your role model died last night — you have officially inherited the ${newRoleName} role!`
    );
  }

  if (
    round === 1 &&
    !beforeMe.loverId &&
    afterMe.loverId &&
    afterMe.isAlive &&
    beforeMe.roleId !== 'cupid'
  ) {
    const partner = afterPlayers.find((p) => p.id === afterMe.loverId);
    if (partner) {
      const seat = getSeatNumber(afterPlayers, partner.id);
      notices.push(
        lang === 'vi'
          ? `💘 Mật báo Quản Trò: Đêm qua mũi tên Cupid đã ghép đôi bạn với ${partner.name} (#${seat}). Hai bạn cùng sống, cùng chết!`
          : `💘 Secret GM Tap: Cupid bound you as Lovers with ${partner.name} (#${seat}). You live and die together!`
      );
    }
  }

  return notices.length > 0 ? notices.join('\n') : null;
}

/**
 * Builds an authentic, real-life Werewolf Game Master Morning/Dawn Announcement.
 * STRICT ZERO-LEAK RULE:
 * - Announces ONLY public facts: who died (names + seats), or that it was a peaceful night (0 deaths).
 * - NEVER leaks hidden night causes or roles (Werewolf bite, Bodyguard shield, Witch heal/poison,
 *   Seer inspection, Hunter revenge shot at night, Cursed awakening, Elder 2nd life, Cupid pair, Doppelganger copy).
 * - Even if a dying Hunter pulled someone down during the night, Dawn ONLY announces that those players died!
 */
export function buildDawnGMAnnouncement(params: {
  round: number;
  beforePlayers: Player[];
  afterPlayers: Player[];
  nightKilledIds: string[];
  hunterShots?: HunterShotRecord[];
  humanDeathReason?: string | null;
  humanPlayerId: string;
  lang: Language;
}): GMAnnouncementData {
  const {
    round,
    beforePlayers,
    afterPlayers,
    nightKilledIds,
    hunterShots,
    humanDeathReason,
    humanPlayerId,
    lang,
  } = params;

  const uniqueVictimIds = new Set<string>(nightKilledIds);
  for (const shot of hunterShots || []) {
    uniqueVictimIds.add(shot.targetId);
  }
  // Also catch any player who transitioned from alive -> dead during dawn resolution (e.g., lover of Hunter's target)
  for (const bp of beforePlayers) {
    if (bp.isAlive) {
      const ap = afterPlayers.find((p) => p.id === bp.id);
      if (ap && !ap.isAlive) {
        uniqueVictimIds.add(bp.id);
      }
    }
  }

  const neutralNightDeathTag =
    lang === 'vi' ? '💀 Tử trận đêm qua' : '💀 Fallen last night';

  const victims: GMAnnouncementVictim[] = Array.from(uniqueVictimIds)
    .map((id) => {
      const p = afterPlayers.find((item) => item.id === id) || beforePlayers.find((item) => item.id === id);
      if (!p) return null;
      const seatNumber = getSeatNumber(afterPlayers, p.id);
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        seatNumber,
        tag: neutralNightDeathTag,
      };
    })
    .filter(Boolean) as GMAnnouncementVictim[];

  // Sort by seatNumber so listing order never leaks primary vs Hunter/Cupid/Witch secondary victims
  victims.sort((a, b) => a.seatNumber - b.seatNumber);

  const aliveCount = afterPlayers.filter((p) => p.isAlive).length;
  const totalCount = afterPlayers.length;
  const afterMe = afterPlayers.find((p) => p.id === humanPlayerId);
  const isHumanDead = Boolean(afterMe && !afterMe.isAlive);

  // STRICT ZERO-LEAK: Night Hunter shots are NEVER disclosed at Dawn — only the plain deaths are announced.
  const publicEvents: string[] = [];

  const victimNameList = formatNameList(
    victims.map((v) => v.name),
    lang
  );
  const victimLabelList = victims.map((v) => `${v.name} (#${v.seatNumber})`).join(', ');

  let badge = '';
  let headline = '';
  let gmQuote = '';
  let spokenNarration = '';
  let chatMessageText = '';
  let dayBarSummary = '';
  let ctaLabel = '';

  if (lang === 'vi') {
    badge = `☀️ QUẢN TRÒ CÔNG BỐ — SÁNG NGÀY ${round}`;
    ctaLabel = '☀️ Đã Rõ — Bắt Đầu Thảo Luận';
    if (victims.length === 0) {
      headline = 'Đêm qua là một đêm bình yên!';
      gmQuote =
        '“Trời đã sáng rồi! Mời cả làng mở mắt dậy. Tin vui cho ngôi làng: đêm qua là một đêm hoàn toàn bình yên, KHÔNG có ai thiệt mạng cả! Mời mọi người bắt đầu thảo luận.”';
      spokenNarration = `Trời đã sáng rồi! Mời cả làng mở mắt dậy. Đêm qua là một đêm bình yên, không có ai thiệt mạng cả! Hiện tại vẫn còn ${aliveCount} người sống sót. Mời mọi người bắt đầu thảo luận.`;
      chatMessageText = `☀️ [Sáng Ngày ${round}] Trời đã sáng! Đêm qua là một đêm bình yên — KHÔNG có ai tử trận (${aliveCount}/${totalCount} còn sống).`;
      dayBarSummary = 'Đêm qua bình yên — Không có ai chết';
    } else if (victims.length === 1) {
      const v = victims[0];
      headline = `Đêm qua, ${v.name} (#${v.seatNumber}) đã thiệt mạng!`;
      gmQuote = `“Trời đã sáng rồi! Mời cả làng mở mắt dậy. Đêm qua thật đáng buồn... ${v.name} (#${v.seatNumber}) đã không qua khỏi! Ngôi làng hiện còn ${aliveCount}/${totalCount} người sống sót. Hãy suy luận tìm ra Ma Sói!”`;
      spokenNarration = `Trời đã sáng rồi! Mời cả làng mở mắt dậy. Đêm qua thật đáng buồn, ${v.name} đã không qua khỏi! Hiện tại ngôi làng còn ${aliveCount} người sống sót. Xin mời mọi người bắt đầu thảo luận.`;
      chatMessageText = `☀️ [Sáng Ngày ${round}] Trời đã sáng! Đêm qua ${v.name} (#${v.seatNumber}) đã tử trận (${aliveCount}/${totalCount} còn sống).`;
      dayBarSummary = `💀 Đêm qua: ${v.name} (#${v.seatNumber}) đã chết`;
    } else {
      headline = `Đêm qua có ${victims.length} người đã ngã xuống!`;
      gmQuote = `“Trời đã sáng rồi! Mời cả làng mở mắt dậy. Một đêm đẫm máu vừa trôi qua... Có tới ${victims.length} người đã thiệt mạng gồm: ${victimLabelList}! Ngôi làng chỉ còn ${aliveCount}/${totalCount} người sống sót.”`;
      spokenNarration = `Trời đã sáng rồi! Mời cả làng mở mắt dậy. Đêm qua là một đêm đẫm máu, có tới ${victims.length} người đã thiệt mạng gồm ${victimNameList}. Ngôi làng chỉ còn ${aliveCount} người sống sót. Xin mời mọi người bắt đầu thảo luận.`;
      chatMessageText = `☀️ [Sáng Ngày ${round}] Trời đã sáng! Đêm qua có ${victims.length} người thiệt mạng: ${victimLabelList} (${aliveCount}/${totalCount} còn sống).`;
      dayBarSummary = `💀 Đêm qua (${victims.length} người chết): ${victimLabelList}`;
    }
  } else {
    badge = `☀️ GAME MASTER DAWN REPORT — DAY ${round}`;
    ctaLabel = '☀️ Got It — Start Discussion';
    if (victims.length === 0) {
      headline = 'It was a peaceful night — Nobody died!';
      gmQuote = `“Dawn has broken! Everyone, open your eyes. Good news for the village: last night was peaceful — nobody died! (${aliveCount}/${totalCount} alive). Let the discussion begin.”`;
      spokenNarration = `Dawn has broken! Everyone, open your eyes. Good news, last night was peaceful and nobody died. ${aliveCount} villagers remain alive. Let the discussion begin.`;
      chatMessageText = `☀️ [Day ${round} Dawn] Dawn breaks! Last night was peaceful — 0 deaths (${aliveCount}/${totalCount} alive).`;
      dayBarSummary = 'Peaceful night — 0 deaths';
    } else if (victims.length === 1) {
      const v = victims[0];
      headline = `${v.name} (#${v.seatNumber}) perished last night!`;
      gmQuote = `“Dawn has broken! Everyone, open your eyes. Sadly, ${v.name} (#${v.seatNumber}) did not survive the night! ${aliveCount}/${totalCount} villagers remain alive. Discuss and find the Werewolves!”`;
      spokenNarration = `Dawn has broken! Everyone, open your eyes. Sadly, ${v.name} did not survive the night. ${aliveCount} villagers remain alive. Begin your discussion.`;
      chatMessageText = `☀️ [Day ${round} Dawn] Dawn breaks! ${v.name} (#${v.seatNumber}) perished last night (${aliveCount}/${totalCount} alive).`;
      dayBarSummary = `💀 Last night: ${v.name} (#${v.seatNumber}) died`;
    } else {
      headline = `A bloody night — ${victims.length} villagers perished!`;
      gmQuote = `“Dawn has broken! Everyone, open your eyes. A grim night has passed — ${victims.length} villagers fell: ${victimLabelList}! Only ${aliveCount}/${totalCount} remain alive.”`;
      spokenNarration = `Dawn has broken! Everyone, open your eyes. A grim night has passed, and ${victims.length} villagers perished: ${victimNameList}. Only ${aliveCount} villagers remain alive.`;
      chatMessageText = `☀️ [Day ${round} Dawn] Dawn breaks! ${victims.length} perished last night: ${victimLabelList} (${aliveCount}/${totalCount} alive).`;
      dayBarSummary = `💀 Last night (${victims.length} dead): ${victimLabelList}`;
    }
  }

  if (publicEvents.length > 0) {
    chatMessageText = `${chatMessageText} ${publicEvents.join(' ')}`;
  }

  const basePrivateNotice = buildPrivateHumanNightNotice({
    beforePlayers,
    afterPlayers,
    humanPlayerId,
    round,
    lang,
  });
  const privateNotice =
    isHumanDead && humanDeathReason
      ? [
          humanDeathReason,
          tr(lang, {
            vi: '👻 Bạn đã thành Hồn Ma — toàn bộ vai trò trong làng đã được mở khóa để bạn theo dõi (Chat & Mic bị khóa).',
            en: '👻 You are now a Ghost — all village roles are unlocked for spectating (Chat & Mic locked).',
          }),
        ].join('\n')
      : basePrivateNotice;

  return {
    id: `gm_dawn_${round}_${Date.now()}`,
    kind: 'dawn',
    round,
    badge,
    headline,
    gmQuote,
    spokenNarration,
    chatMessageText,
    dayBarSummary,
    victims,
    publicEvents,
    privateNotice,
    aliveCount,
    totalCount,
    ctaLabel,
    isHumanDead,
  };
}

/**
 * Builds an authentic, real-life Werewolf Game Master Dusk/Vote Verdict Announcement
 * right after Day Voting concludes and before the village falls asleep for the next Night.
 */
export function buildDuskGMAnnouncement(params: {
  round: number;
  beforePlayers: Player[];
  afterPlayers: Player[];
  lynchedVictim: Player | null;
  voteCounts: Record<string, number>;
  votes?: VoteRecord[];
  isTie: boolean;
  elderLynchedPenalty?: boolean;
  hunterShots?: HunterShotRecord[];
  humanPlayerId: string;
  lang: Language;
}): GMAnnouncementData {
  const {
    round,
    beforePlayers,
    afterPlayers,
    lynchedVictim,
    voteCounts,
    votes,
    isTie,
    elderLynchedPenalty,
    hunterShots,
    humanPlayerId,
    lang,
  } = params;

  const hunterShotTargetIds = new Set((hunterShots || []).map((s) => s.targetId));

  const nextRound = round + 1;
  const aliveCount = afterPlayers.filter((p) => p.isAlive).length;
  const totalCount = afterPlayers.length;
  const afterMe = afterPlayers.find((p) => p.id === humanPlayerId);
  const isHumanDead = Boolean(afterMe && !afterMe.isAlive);

  const voteBreakdown: GMVoteTallyEntry[] =
    votes && votes.length > 0
      ? buildVoteTallyEntries(beforePlayers, votes)
      : Object.entries(voteCounts)
          .filter(([, count]) => count > 0)
          .map(([playerId, count]) => {
            const p = beforePlayers.find((item) => item.id === playerId);
            return {
              playerId,
              name: p?.name || playerId,
              avatar: p?.avatar || '👤',
              seatNumber: getSeatNumber(beforePlayers, playerId),
              votes: count,
              voters: [],
            };
          })
          .sort((a, b) => b.votes - a.votes || a.seatNumber - b.seatNumber);

  const victims: GMAnnouncementVictim[] = [];
  const publicEvents: string[] = [];

  for (const bp of beforePlayers) {
    if (!bp.isAlive) continue;
    const ap = afterPlayers.find((item) => item.id === bp.id);
    if (ap && !ap.isAlive) {
      const seatNumber = getSeatNumber(afterPlayers, ap.id);
      let tag: string;
      if (lynchedVictim && ap.id === lynchedVictim.id) {
        const vCnt = voteCounts[ap.id] || 0;
        tag =
          lang === 'vi'
            ? `⚖️ Bị treo cổ (${vCnt} phiếu)`
            : `⚖️ Executed (${vCnt} votes)`;
      } else if (hunterShotTargetIds.has(ap.id)) {
        tag =
          lang === 'vi'
            ? '🎯 Bị Thợ Săn bắn'
            : '🎯 Shot by Hunter';
      } else {
        // Strict Werewolf zero-leak rule: never announce Cupid/Lover as the cause of death publicly
        tag = lang === 'vi' ? '💀 Đã tử trận' : '💀 Eliminated';
      }
      victims.push({
        id: ap.id,
        name: ap.name,
        avatar: ap.avatar,
        seatNumber,
        tag,
      });
    }
  }

  if (elderLynchedPenalty) {
    publicEvents.push(
      tr(lang, {
        vi: '⚠️ Cảnh báo từ Quản Trò: Dân làng đã treo cổ nhầm Già Làng! Toàn bộ quyền năng đặc biệt của phe Dân Làng bị phong ấn!',
        en: '⚠️ GM Warning: The village executed the Elder! All Villager special powers are now sealed!',
      })
    );
  }

  for (const shot of hunterShots || []) {
    const hunterP =
      beforePlayers.find((p) => p.id === shot.hunterId) ||
      afterPlayers.find((p) => p.id === shot.hunterId);
    const targetP =
      afterPlayers.find((p) => p.id === shot.targetId) ||
      beforePlayers.find((p) => p.id === shot.targetId);
    if (!hunterP || !targetP) continue;
    const hunterSeat = getSeatNumber(beforePlayers, hunterP.id);
    const targetSeat = getSeatNumber(beforePlayers, targetP.id);
    publicEvents.push(
      lang === 'vi'
        ? `🎯 Trước khi lên giá treo cổ, Thợ Săn ${hunterP.name} (#${hunterSeat}) đã kích hoạt phát đạn ghim kéo theo ${targetP.name} (#${targetSeat})!`
        : `🎯 Before facing the gallows, Hunter ${hunterP.name} (#${hunterSeat})’s Night-Aim shot felled ${targetP.name} (#${targetSeat})!`
    );
  }

  let badge = '';
  let headline = '';
  let gmQuote = '';
  let spokenNarration = '';
  let chatMessageText = '';
  let ctaLabel = '';

  badge = tr(lang, {
    vi: `⚖️ QUẢN TRÒ CÔNG BỐ BIỂU QUYẾT — NGÀY ${round}`,
    en: `⚖️ GAME MASTER VOTE VERDICT — DAY ${round}`,
  });
  ctaLabel = tr(lang, {
    vi: `🌙 Cả Làng Đi Ngủ (Đêm ${nextRound})`,
    en: `🌙 Village Sleeps (Night ${nextRound})`,
  });
  if (isTie || !lynchedVictim) {
    headline = tr(lang, {
      vi: 'Hòa phiếu — Không ai bị treo cổ hôm nay!',
      en: 'Tied Vote — Nobody was executed today!',
    });
    gmQuote = tr(lang, {
      vi: `“Hết giờ bỏ phiếu! Số phiếu bầu hòa nhau nên hôm nay KHÔNG có ai bị đưa lên giá treo cổ. Trời đã tối, mời cả làng nhắm mắt đi ngủ, bước vào Đêm thứ ${nextRound}!”`,
      en: `“Voting is closed! The vote is tied, so nobody is sent to the gallows today. Dusk falls — everyone close your eyes for Night ${nextRound}!”`,
    });
    spokenNarration = tr(lang, {
      vi: `Hết giờ bỏ phiếu! Số phiếu bị hòa nên hôm nay không có ai bị treo cổ. Trời đã tối, mời cả làng nhắm mắt đi ngủ, bước vào đêm thứ ${nextRound}.`,
      en: `Voting is closed! The vote is tied, so nobody is executed today. Close your eyes as Night ${nextRound} begins.`,
    });
    chatMessageText = tr(lang, {
      vi: `⚖️ [Hoàng Hôn Ngày ${round}] Biểu quyết hòa phiếu! Không ai bị treo cổ hôm nay. Chuẩn bị bước vào Đêm ${nextRound}.`,
      en: `⚖️ [Day ${round} Dusk] Vote tied! Nobody was executed today. Preparing for Night ${nextRound}.`,
    });
  } else {
    const seat = getSeatNumber(beforePlayers, lynchedVictim.id);
    const count = voteCounts[lynchedVictim.id] || 0;
    const name = lynchedVictim.name;
    headline = tr(lang, {
      vi: `${name} (#${seat}) bị treo cổ với ${count} phiếu!`,
      en: `${name} (#${seat}) executed with ${count} votes!`,
    });
    gmQuote = tr(lang, {
      vi: `“Hết giờ bỏ phiếu! Với ${count} phiếu bầu cao nhất, cả làng đã quyết định đưa ${name} (#${seat}) lên giá treo cổ! Màn đêm thứ ${nextRound} đang buông xuống, mời mọi người đi ngủ.”`,
      en: `“Voting is closed! With ${count} votes, the village sends ${name} (#${seat}) to the gallows! ${aliveCount}/${totalCount} remain alive as Night ${nextRound} falls.”`,
    });
    spokenNarration = tr(lang, {
      vi: `Hết giờ bỏ phiếu! Với ${count} phiếu bầu, ${name} đã bị cả làng đưa lên giá treo cổ. Hiện còn ${aliveCount} người sống sót. Màn đêm thứ ${nextRound} sắp buông xuống, mời cả làng đi ngủ.`,
      en: `Voting is closed! With ${count} votes, ${name} has been executed by the village. Close your eyes as Night ${nextRound} begins.`,
    });
    chatMessageText = tr(lang, {
      vi: `⚖️ [Hoàng Hôn Ngày ${round}] ${name} (#${seat}) nhận nhiều phiếu nhất (${count} phiếu) và bị treo cổ!`,
      en: `⚖️ [Day ${round} Dusk] ${name} (#${seat}) received the most votes (${count}) and was executed!`,
    });
  }

  if (voteBreakdown.some((entry) => entry.voters && entry.voters.length > 0)) {
    const voterSummaryText = voteBreakdown
      .map((entry) => {
        const voterNames = (entry.voters || [])
          .map((v) => `#${v.seatNumber} ${v.name}`)
          .join(', ');
        return voterNames
          ? `${entry.name} (${entry.votes}: ${voterNames})`
          : `${entry.name} (${entry.votes})`;
      })
      .join(' | ');
    chatMessageText = `${chatMessageText} ${
      tr(lang, {
        vi: '🗳️ Chi tiết phiếu:',
        en: '🗳️ Votes:',
      })
    } ${voterSummaryText}.`;
  }

  if (publicEvents.length > 0) {
    chatMessageText = `${chatMessageText} ${publicEvents.join(' ')}`;
  }

  const beforeMe = beforePlayers.find((p) => p.id === humanPlayerId);
  let privateNotice: string | null = null;
  if (beforeMe?.isAlive && isHumanDead) {
    privateNotice =
      tr(lang, {
        vi: '👻 Bạn đã bị loại tại pháp trường! Từ giờ bạn là Hồn Ma — hãy giữ im lặng ở kênh chung và quan sát cuộc chơi.',
        en: '👻 You were eliminated at the gallows! You are now a Ghost Soul — stay silent in public chat and watch the match.',
      });
  } else if (beforeMe?.roleId === 'doppelganger' && afterMe && afterMe.roleId !== 'doppelganger' && afterMe.isAlive) {
    const newRoleName = ROLES[afterMe.roleId].name[lang] || ROLES[afterMe.roleId].name.vi;
    privateNotice =
      tr(lang, {
        vi: `🪞 Mật báo Quản Trò: Hình mẫu của bạn vừa bị treo cổ — bạn chính thức kế thừa thân phận ${newRoleName}!`,
        en: `🪞 Secret GM Tap: Your role model was just executed — you have inherited the ${newRoleName} role!`,
      });
  }

  return {
    id: `gm_dusk_${round}_${Date.now()}`,
    kind: 'dusk',
    round,
    badge,
    headline,
    gmQuote,
    spokenNarration,
    chatMessageText,
    dayBarSummary: headline,
    victims,
    publicEvents,
    privateNotice,
    voteBreakdown,
    votingMayorId: beforePlayers.find((p) => p.isMayor)?.id ?? null,
    aliveCount,
    totalCount,
    ctaLabel,
    isHumanDead,
  };
}

/**
 * Determines whether the phase/step should automatically advance when the countdown timer reaches 0.
 * - Never auto-advance while a Game Master Announcement (Dawn/Dusk briefing) is on screen.
 * - At 0s during Night, ALWAYS auto-advance even when the human player is awake (unselected Hunter -> null, other roles skip).
 * - At 0s during Day Voting, auto-cast Campfire Abstain for any unvoted living player and tally votes cleanly.
 */
export function shouldAutoAdvanceOnTimerZero(params: {
  shellState: 'title' | 'playing' | 'paused' | 'gameover' | 'gm_host' | 'gm_player';
  phase: Phase;
  showOnboardingTour: boolean;
  isPlayerAwakeAtNight: boolean;
  isHumanAlive: boolean;
  hasHumanVoted: boolean;
  hasActiveGMAnnouncement?: boolean;
}): boolean {
  if (
    params.shellState !== 'playing' ||
    params.showOnboardingTour ||
    params.hasActiveGMAnnouncement ||
    params.phase === 'game_over' ||
    params.phase === 'lobby'
  ) {
    return false;
  }

  if (params.phase === 'night') {
    return true;
  }

  if (params.phase === 'day_voting') {
    return true;
  }

  return true;
}

/**
 * Resolves the Hunter's night target when a human Hunter's night step times out at 0s.
 * If the human Hunter did not pick a target (`undefined`), returns explicit `null` ("Không ghim")
 * so no bot fallback can mark on their behalf.
 */
export function resolveHunterTimeoutTarget(
  stepKey: NightStepKey | null | undefined,
  isHumanHunterAwake: boolean,
  currentHunterTargetId: string | null | undefined
): string | null | undefined {
  if (stepKey === 'hunter' && isHumanHunterAwake && currentHunterTargetId === undefined) {
    return null;
  }
  return currentHunterTargetId;
}

/**
 * Determines which end-of-night short-film cinematic (if any) may legally play ONLY AFTER
 * all night actions (Werewolf, Bodyguard, Witch Heal/Poison, Elder 2-lives, Cursed, Cupid, Hunter)
 * have been fully resolved.
 *
 * RULES & ANTI-LEAK GUARANTEES:
 * 1. NEVER called during the wolf target-selection step — only after night ends.
 * 2. If a Werewolf's chosen target was saved (Bodyguard, Witch Heal, Elder 1st life, Cursed conversion),
 *    NO kill cinematic triggers at all — prevents leaking wolf identity or that the target was bitten & saved!
 * 3. If the human player is a living Werewolf/Wolf Pup AND their bitten target ACTUALLY DIED from the wolf bite,
 *    plays the dramatic 'wolf_kill' short-film cinematic targeting that confirmed dead victim.
 * 4. If the human player themselves ACTUALLY DIED tonight, they are now a Ghost (Chat & Mic strictly locked),
 *    so there is NO need to hide the truth from them: reveal exact cause of death, killer name & role!
 * 5. If the human player is alive and NOT a Werewolf, returns `null` so living villagers deduce everything
 *    strictly during Day discussion without seeing how any bot died.
 */
export function determineEndOfNightCinematic(params: {
  beforeHuman: Player;
  beforePlayers?: Player[];
  afterPlayers: Player[];
  nightResult: NightResult;
  lang: Language;
}): NightDeathCinematicState | null {
  const { beforeHuman, beforePlayers = [], afterPlayers, nightResult, lang } = params;
  const afterHuman = afterPlayers.find((p) => p.id === beforeHuman.id);
  const humanDiedTonight = Boolean(beforeHuman.isAlive && afterHuman && !afterHuman.isAlive);

  // Case A: Human player themselves actually perished tonight -> Now a Ghost (Chat/Mic locked), so reveal FULL death cause & killer!
  if (humanDiedTonight) {
    const myDetail = (nightResult.killedDetails ?? []).find((d) => d.playerId === beforeHuman.id);

    if (myDetail) {
      const causeType = myDetail.causeType ?? 'werewolf';
      const killerName = myDetail.killerName ?? null;
      const linkedLoverName = myDetail.linkedLoverName ?? null;
      let reasonText = myDetail.logicExplanation;

      if (causeType === 'witch_poison') {
        reasonText =
          lang === 'vi'
            ? `🧪 Phù Thủy ${killerName || 'bí ẩn'} đã ném Bình Độc hạ sát bạn trong màn đêm!`
            : `🧪 Witch ${killerName || 'unknown'} threw a lethal Poison potion at you during the night!`;
      } else if (causeType === 'cupid_lover') {
        reasonText =
          lang === 'vi'
            ? `💘 Tình nhân ${linkedLoverName || 'của bạn'} đã ngã xuống đêm qua — bạn qua đời theo lời nguyền Cupid!`
            : `💘 Your Lover ${linkedLoverName || ''} fell last night — you perished from Cupid's heartbreak!`;
      } else if (causeType === 'hunter_shot') {
        reasonText =
          lang === 'vi'
            ? `🎯 Thợ Săn ${killerName || ''} tử trận đêm qua và đã bóp cò bắn kéo bạn theo!`
            : `🎯 Hunter ${killerName || ''} fell last night and fired a dying revenge shot at you!`;
      } else if (causeType === 'werewolf') {
        reasonText =
          lang === 'vi'
            ? `🐺 Ma Sói ${killerName || ''} cùng bầy Sói đã tấn công cắn chết bạn trong màn đêm!`
            : `🐺 Werewolf ${killerName || ''} and the wolf pack hunted you down during the night!`;
      }

      return {
        mode: 'victim_death',
        revealKiller: true,
        victimId: beforeHuman.id,
        victimName: beforeHuman.name,
        causeType,
        killerId: myDetail.killerId ?? null,
        killerName,
        killerRoleId: myDetail.killerRoleId ?? null,
        linkedLoverId: myDetail.linkedLoverId ?? null,
        linkedLoverName,
        reasonText,
      };
    }

    const hunterShotOnHuman = (nightResult.hunterShots ?? []).find(
      (s) => s.targetId === beforeHuman.id
    );
    if (hunterShotOnHuman) {
      const hunterObj =
        beforePlayers.find((p) => p.id === hunterShotOnHuman.hunterId) ||
        afterPlayers.find((p) => p.id === hunterShotOnHuman.hunterId);
      const hunterName = hunterObj?.name || 'Thợ Săn';
      const hunterSeat = getSeatNumber(afterPlayers, hunterShotOnHuman.hunterId);
      return {
        mode: 'victim_death',
        revealKiller: true,
        victimId: beforeHuman.id,
        victimName: beforeHuman.name,
        causeType: 'hunter_shot',
        killerId: hunterObj?.id ?? hunterShotOnHuman.hunterId,
        killerName: hunterName,
        killerRoleId: 'hunter',
        linkedLoverId: null,
        linkedLoverName: null,
        reasonText:
          lang === 'vi'
            ? `🎯 Thợ Săn ${hunterName} (#${hunterSeat}) tử trận đêm qua và phát đạn ghim đã bắn kéo bạn theo!`
            : `🎯 Hunter ${hunterName} (#${hunterSeat}) died last night and shot you on the way out!`,
      };
    }

    const fallbackWolf = beforePlayers.find(
      (p) => p.isAlive && (p.roleId === 'werewolf' || p.roleId === 'wolf_pup')
    );
    return {
      mode: 'victim_death',
      revealKiller: Boolean(fallbackWolf),
      victimId: beforeHuman.id,
      victimName: beforeHuman.name,
      causeType: fallbackWolf ? 'werewolf' : 'unknown',
      killerId: fallbackWolf?.id ?? null,
      killerName: fallbackWolf?.name ?? null,
      killerRoleId: fallbackWolf?.roleId ?? null,
      linkedLoverId: null,
      linkedLoverName: null,
      reasonText:
        fallbackWolf
          ? tr(lang, {
              vi: `🐺 Ma Sói ${fallbackWolf.name} đã tấn công bạn trong màn đêm!`,
              en: `🐺 Werewolf ${fallbackWolf.name} attacked you during the night!`,
            })
          : tr(lang, {
              vi: 'Màn đêm đã cướp đi sinh mạng của bạn trước khi bình minh ló rạng.',
              en: 'The dark night claimed your life before dawn could break.',
            }),
    };
  }

  // Case B: Living human Werewolf/Wolf Pup whose bitten target ACTUALLY DIED (NOT guarded/healed/elder/cursed!)
  const isHumanWolf =
    Boolean(afterHuman?.isAlive) &&
    (beforeHuman.roleId === 'werewolf' || beforeHuman.roleId === 'wolf_pup');

  if (isHumanWolf) {
    const confirmedWolfVictim = (nightResult.killedDetails ?? []).find((d) => {
      if (d.causeType !== 'werewolf') return false;
      const afterVictim = afterPlayers.find((p) => p.id === d.playerId);
      return Boolean(afterVictim && !afterVictim.isAlive);
    });

    if (confirmedWolfVictim) {
      return {
        mode: 'wolf_kill',
        revealKiller: true,
        victimId: confirmedWolfVictim.playerId,
        victimName: confirmedWolfVictim.name,
        causeType: 'werewolf',
        killerId: beforeHuman.id,
        killerName: beforeHuman.name,
        killerRoleId: beforeHuman.roleId,
        linkedLoverId: null,
        linkedLoverName: null,
        reasonText:
          lang === 'vi'
            ? `Đêm đã tàn — con mồi ${confirmedWolfVictim.name} không nhận được phép màu nào và đã gục ngã dưới nanh vuốt của bầy Sói!`
            : `As night ends, ${confirmedWolfVictim.name} received no salvation and fell to the Werewolf hunt!`,
      };
    }
  }

  return null;
}




