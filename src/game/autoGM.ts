import { Language, NightActions, Phase, Player, RoleId, VoteRecord } from '../types/game';
import { ROLES } from './roles';
import { buildVoteTallyEntries, VoteTallyVoter } from './rules';

export type NightStepKey =
  | 'doppelganger'
  | 'cupid'
  | 'werewolf'
  | 'witch'
  | 'seer'
  | 'bodyguard';

export interface CustomTimerConfig {
  nightActionSec: number; // Human turn duration at night (default 20s, range 5..120s)
  botStepSec: number; // Bot-only step duration at night (default 4s, range 2..20s)
  dayDiscussSec: number; // Day discussion duration (default 35s, range 10..300s)
  dayVoteSec: number; // Day voting duration (default 25s, range 10..180s)
  hunterShotSec: number; // Hunter revenge shot duration (default 20s, range 5..90s)
}

export const DEFAULT_TIMER_CONFIG: CustomTimerConfig = {
  nightActionSec: 20,
  botStepSec: 4,
  dayDiscussSec: 35,
  dayVoteSec: 25,
  hunterShotSec: 20,
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
      fr: 'Le Sosie se réveille',
      es: 'El Sosias despierta',
      ja: 'ドッペルゲンガーの目覚め',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Nhân Bản thức dậy! Hãy chọn 1 người chơi làm hình mẫu kế thừa."',
      en: '🤖 Auto-GM: "Doppelgänger, wake up! Choose 1 player as your role model."',
      fr: '🤖 MJ Auto : « Le Sosie se réveille ! Choisissez un modèle à copier. »',
      es: '🤖 Narrador Auto: "¡Sosias, despierta! Elige a un jugador como modelo."',
      ja: '🤖 自動GM：「ドッペルゲンガーは目覚めて、模倣する対象を1人選んでください。」',
    },
    playerInstruction: {
      vi: 'Chạm vào 1 người chơi khác (trong cảnh 3D hoặc thanh bên dưới) để chọn làm hình mẫu kế thừa khi họ chết.',
      en: 'Tap 1 other player to copy. When they die, you inherit their role.',
      fr: 'Cliquez sur un autre joueur pour copier son rôle à sa mort.',
      es: 'Toca a otro jugador para heredar su rol cuando muera.',
      ja: '他のプレイヤーを1人選択してください。その人が死亡すると役職を引き継ぎます。',
    },
  },
  cupid: {
    roleId: 'cupid',
    title: {
      vi: 'Thần Tình Yêu Cupid',
      en: 'Cupid Wakes',
      fr: 'Cupidon se réveille',
      es: 'Cupido despierta',
      ja: 'キューピッドの目覚め',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Cupid thức dậy! Hãy bắn mũi tên ghép đôi 2 người thành Tình Nhân sinh tử."',
      en: '🤖 Auto-GM: "Cupid, wake up! Bind 2 players together as star-crossed Lovers."',
      fr: '🤖 MJ Auto : « Cupidon se réveille ! Désignez 2 amoureux liés à la vie à la mort. »',
      es: '🤖 Narrador Auto: "¡Cupido, despierta! Une a 2 jugadores como Enamorados."',
      ja: '🤖 自動GM：「キューピッドは目覚めて、運命を共にする恋人2人を選んでください。」',
    },
    playerInstruction: {
      vi: 'Chọn lần lượt 2 người chơi (có thể chọn chính bạn) để ghép đôi Tình Nhân.',
      en: 'Select 2 players (can include yourself) to link as Lovers.',
      fr: 'Sélectionnez 2 joueurs (vous inclus si souhaité) pour les lier d’amour.',
      es: 'Selecciona a 2 jugadores (puedes incluirte) para unirlos como Enamorados.',
      ja: '恋人にするプレイヤーを2人（自分も含められます）選んでください。',
    },
  },
  werewolf: {
    roleId: 'werewolf',
    title: {
      vi: 'Đàn Ma Sói Săn Mồi',
      en: 'Werewolves Hunt',
      fr: 'Chasse des Loups-Garous',
      es: 'Caza de Hombres Lobo',
      ja: '人狼の襲撃',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Đàn Ma Sói thức dậy! Nhận diện đồng đội và thống nhất chọn con mồi đêm nay."',
      en: '🤖 Auto-GM: "Werewolves, wake up! Recognize your pack and choose tonight’s victim."',
      fr: '🤖 MJ Auto : « Les Loups-Garous se réveillent ! Choisissez votre victime de la nuit. »',
      es: '🤖 Narrador Auto: "¡Hombres Lobo, despertad! Elegid a vuestra presa de esta noche."',
      ja: '🤖 自動GM：「人狼は目覚めて仲間を確認し、今夜襲撃する獲物を1人選んでください。」',
    },
    playerInstruction: {
      vi: 'Chọn nạn nhân để cắn đêm nay (nếu Sói Con chết đêm trước, đàn Sói được chọn 2 nạn nhân!).',
      en: 'Select a victim to bite tonight (2 victims if Wolf Pup frenzy is active!).',
      fr: 'Choisissez une victime à dévorer (2 victimes si la fureur du Louveteau est active !).',
      es: 'Elige una víctima para morder (¡2 víctimas si el Cachorro murió la ronda anterior!).',
      ja: '今夜襲撃する対象を選択してください（子狼死亡の翌夜は2人選択可能）。',
    },
  },
  witch: {
    roleId: 'witch',
    title: {
      vi: 'Phù Thủy Pha Thuốc',
      en: 'Witch’s Potions',
      fr: 'Potions de la Sorcière',
      es: 'Pociones de la Bruja',
      ja: '魔女の秘薬',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Ma Sói đi ngủ. Phù Thủy thức dậy! Đêm nay có người bị cắn, bạn có cứu hay đầu độc ai không?"',
      en: '🤖 Auto-GM: "Werewolves sleep. Witch, wake up! Will you use your Heal or Poison potion tonight?"',
      fr: '🤖 MJ Auto : « La Sorcière se réveille ! Voulez-vous utiliser votre potion de soin ou de poison ? »',
      es: '🤖 Narrador Auto: "¡Bruja, despierta! ¿Usarás tu poción de cura o de veneno esta noche?"',
      ja: '🤖 自動GM：「魔女は目覚めてください。今夜の襲撃対象を蘇生薬で救うか、毒薬を使うか選んでください。」',
    },
    playerInstruction: {
      vi: 'Xem nạn nhân bị Sói cắn để bấm nút dùng Bình Cứu (1 lần/ván), hoặc chạm vào 1 người để quăng Bình Độc (1 lần/ván).',
      en: 'Decide whether to Heal tonight’s wolf victim (1/game) or tap a player to Poison (1/game).',
      fr: 'Décidez de sauver la victime des loups (1/partie) ou cliquez sur un joueur pour l’empoisonner (1/partie).',
      es: 'Decide si curas a la víctima de los lobos (1/partida) o tocas a alguien para envenenarlo (1/partida).',
      ja: '蘇生薬で被害者を救うか（1回限り）、誰かに毒薬を使うか（1回限り）を選択してください。',
    },
  },
  seer: {
    roleId: 'seer',
    title: {
      vi: 'Tiên Tri Soi Danh Tính',
      en: 'Seer Divination',
      fr: 'Divination de la Voyante',
      es: 'Visión de la Vidente',
      ja: '占い師の透視',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Phù Thủy đi ngủ. Tiên Tri thức dậy! Hãy chỉ định 1 người chơi để soi phe phái."',
      en: '🤖 Auto-GM: "Witch sleeps. Seer, wake up! Point to 1 player to reveal their alignment."',
      fr: '🤖 MJ Auto : « La Voyante se réveille ! Désignez 1 joueur pour découvrir son camp. »',
      es: '🤖 Narrador Auto: "¡Vidente, despierta! Señala a 1 jugador para descubrir su bando."',
      ja: '🤖 自動GM：「占い師は目覚めて、今夜正体を占うプレイヤーを1人だけ選んでください。」',
    },
    playerInstruction: {
      vi: 'Chọn duy nhất 1 người chơi còn sống để soi (👍 Dân Làng hoặc 👎 Ma Sói).',
      en: 'Select exactly 1 living player to inspect (👍 Villager or 👎 Werewolf).',
      fr: 'Sélectionnez 1 seul joueur vivant à inspecter (👍 Villageois ou 👎 Loup-Garou).',
      es: 'Selecciona exactamente a 1 jugador vivo para investigar (👍 Aldeano o 👎 Lobo).',
      ja: '生存しているプレイヤーを1人だけ選んで占ってください（👍村人陣営 / 👎人狼）。',
    },
  },
  bodyguard: {
    roleId: 'bodyguard',
    title: {
      vi: 'Bảo Vệ Đặt Khiên',
      en: 'Bodyguard Shield',
      fr: 'Bouclier du Salvateur',
      es: 'Escudo del Guardaespaldas',
      ja: '騎士の護衛',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Tiên Tri đi ngủ. Bảo Vệ thức dậy! Chọn 1 người để che chở đêm nay (không trùng đêm trước)."',
      en: '🤖 Auto-GM: "Seer sleeps. Bodyguard, wake up! Choose 1 player to shield tonight (no consecutive repeats)."',
      fr: '🤖 MJ Auto : « Le Salvateur se réveille ! Choisissez qui protéger cette nuit (pas 2 nuits de suite). »',
      es: '🤖 Narrador Auto: "¡Guardaespaldas, despierta! Elige a quién proteger hoy (sin repetir 2 noches seguidas)."',
      ja: '🤖 自動GM：「騎士は目覚めて、今夜護衛する人を1人選んでください（2夜連続で同じ人は不可）。」',
    },
    playerInstruction: {
      vi: 'Chạm vào 1 người chơi (kể cả chính bạn) để đặt khiên chống Sói cắn. Không được chọn người vừa bảo vệ đêm qua!',
      en: 'Tap 1 living player to shield from Werewolf bites. Cannot pick the player shielded last night!',
      fr: 'Cliquez sur un joueur vivant pour le protéger des loups (interdit sur le joueur protégé hier).',
      es: 'Toca a un jugador vivo para protegerlo de los lobos (no puedes repetir al protegido de anoche).',
      ja: '人狼の襲撃から守るプレイヤーを1人選んでください（昨夜守った人は選べません）。',
    },
  },
};

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
    case 'werewolf':
      return player.roleId === 'werewolf' || player.roleId === 'wolf_pup';
    case 'witch':
      return player.roleId === 'witch';
    case 'seer':
      return player.roleId === 'seer';
    case 'bodyguard':
      return player.roleId === 'bodyguard';
    default:
      return false;
  }
}

/**
 * Builds the sequential Night Call Schedule for the Automated Game Master ("Quản Trò Máy")
 * strictly following canonical Werewolf rules & wakeOrder:
 * Night 1: Doppelgänger (if in roster) -> Cupid (if in roster) -> Werewolves -> Witch -> Seer -> Bodyguard
 * Night 2+: Werewolves -> Witch -> Seer -> Bodyguard
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

  // Werewolves always wake every night
  keys.push('werewolf');

  if (hasRoleInMatch('witch')) keys.push('witch');
  if (hasRoleInMatch('seer')) keys.push('seer');
  if (hasRoleInMatch('bodyguard')) keys.push('bodyguard');

  const humanPlayer = humanPlayerId
    ? players.find((p) => p.id === humanPlayerId)
    : players.find((p) => !p.isBot) || players[0];

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
      humanDurationSec: Math.max(5, timerConfig.nightActionSec || 20),
      botDurationSec: Math.max(2, timerConfig.botStepSec || 4),
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
      headline:
        lang === 'vi'
          ? `👻 Bạn đã tử trận (${roleName})`
          : `👻 You are a Ghost Soul (${roleName})`,
      subtext:
        lang === 'vi'
          ? 'Hồn ma có thể tự do bay lượn quan sát làng nhưng không còn quyền năng ban đêm.'
          : 'You can fly around the village and watch, but cannot use night powers.',
    };
  }

  if (player.hasUsedPower && (player.roleId === 'seer' || player.roleId === 'bodyguard' || player.roleId === 'witch')) {
    return {
      wakesTonight: false,
      headline:
        lang === 'vi'
          ? `⚠️ Quyền năng ${roleName} đã bị phong ấn!`
          : `⚠️ ${roleName} power is sealed!`,
      subtext:
        lang === 'vi'
          ? 'Do dân làng đã treo cổ nhầm Già Làng, toàn bộ chức năng đặc biệt bị vô hiệu hóa.'
          : 'Because the village executed the Elder, special powers are sealed.',
    };
  }

  switch (player.roleId) {
    case 'doppelganger':
      return round === 1
        ? {
            wakesTonight: true,
            headline:
              lang === 'vi'
                ? `🪞 Vai của bạn (${roleName}) thức dậy ở Bước 1 Đêm Đầu!`
                : `🪞 Your role (${roleName}) wakes on Step 1 of Night 1!`,
            subtext:
              lang === 'vi'
                ? 'Hãy chọn 1 người chơi làm hình mẫu. Khi người đó chết, bạn sẽ kế thừa vai của họ.'
                : 'Choose 1 role model. When they die, you inherit their role.',
          }
        : {
            wakesTonight: false,
            headline:
              lang === 'vi'
                ? `🪞 ${roleName} chỉ thức dậy vào Đêm 1 (Đang chờ hình mẫu tử trận)`
                : `🪞 ${roleName} only wakes on Night 1 (Waiting to inherit role)`,
            subtext:
              lang === 'vi'
                ? 'Khi người bạn chọn làm hình mẫu chết, bạn sẽ lập tức biến thành vai trò của họ.'
                : 'Once your chosen model dies, you will transform into their role.',
          };
    case 'cupid':
      return round === 1
        ? {
            wakesTonight: true,
            headline:
              lang === 'vi'
                ? `💘 Vai của bạn (${roleName}) thức dậy ở Đêm Đầu Tiên!`
                : `💘 Your role (${roleName}) wakes on Night 1!`,
            subtext:
              lang === 'vi'
                ? 'Chọn 2 người chơi bất kỳ để ghép thành cặp Tình Nhân sinh tử.'
                : 'Pick 2 players to bind together as star-crossed Lovers.',
          }
        : {
            wakesTonight: false,
            headline:
              lang === 'vi'
                ? `💘 ${roleName} đã ghép đôi xong ở Đêm 1 (Từ Đêm 2 ngủ như Dân Làng)`
                : `💘 ${roleName} already linked Lovers on Night 1 (Sleeps from Night 2+)`,
            subtext:
              lang === 'vi'
                ? 'Từ đêm thứ 2 trở đi, Cupid không thức dậy nữa mà suy luận ban ngày cùng Dân Làng.'
                : 'From Night 2 onward, Cupid sleeps at night and helps the village by day.',
          };
    case 'werewolf':
    case 'wolf_pup':
      return {
        wakesTonight: true,
        headline:
          lang === 'vi'
            ? `🐺 Vai của bạn (${roleName}) thức dậy mỗi đêm ở lượt Ma Sói!`
            : `🐺 Your role (${roleName}) wakes every night on the Werewolf turn!`,
        subtext:
          lang === 'vi'
            ? 'Khi Quản Trò Máy gọi Ma Sói, bảng hành động sẽ mở để bạn chọn con mồi.'
            : 'When Auto-GM calls Werewolves, your action console opens to choose a victim.',
      };
    case 'witch':
      return {
        wakesTonight: true,
        headline:
          lang === 'vi'
            ? `🧪 Vai của bạn (${roleName}) thức dậy ngay sau lượt Ma Sói!`
            : `🧪 Your role (${roleName}) wakes right after the Werewolves!`,
        subtext:
          lang === 'vi'
            ? 'Quản Trò Máy sẽ báo ai vừa bị Sói cắn để bạn chọn Cứu hoặc Đầu Độc.'
            : 'Auto-GM will reveal who was bitten so you can Heal or Poison.',
      };
    case 'seer':
      return {
        wakesTonight: true,
        headline:
          lang === 'vi'
            ? `🔮 Vai của bạn (${roleName}) thức dậy mỗi đêm ở lượt Tiên Tri!`
            : `🔮 Your role (${roleName}) wakes every night on the Seer turn!`,
        subtext:
          lang === 'vi'
            ? 'Khi đến lượt Tiên Tri, hãy chọn 1 người chơi để biết chính xác họ là Sói hay Dân.'
            : 'On the Seer turn, pick 1 player to reveal their true alignment.',
      };
    case 'bodyguard':
      return {
        wakesTonight: true,
        headline:
          lang === 'vi'
            ? `🛡️ Vai của bạn (${roleName}) thức dậy mỗi đêm ở lượt Bảo Vệ!`
            : `🛡️ Your role (${roleName}) wakes every night on the Bodyguard turn!`,
        subtext:
          lang === 'vi'
            ? 'Chọn 1 người để đặt khiên chống Sói cắn (không trùng người đêm trước).'
            : 'Choose 1 player to shield from wolf bites (no consecutive repeats).',
      };
    case 'hunter':
      return {
        wakesTonight: false,
        headline:
          lang === 'vi'
            ? `🎯 Vai của bạn là ${roleName} (Kỹ năng Phản Đòn Khi Chết — Ngủ ban đêm)`
            : `🎯 Your role is ${roleName} (Death Retribution Passive — Sleeps at night)`,
        subtext:
          lang === 'vi'
            ? 'Thợ Săn không thức dậy ban đêm. Ngay khi bạn bị Sói cắn hoặc bị treo cổ, Quản Trò Máy sẽ gọi bạn rút súng bắn kéo theo 1 người!'
            : 'The Hunter sleeps at night. If killed by wolves or vote, Auto-GM immediately prompts your final revenge shot!',
      };
    case 'elder':
      return {
        wakesTonight: false,
        headline:
          lang === 'vi'
            ? `👑 Vai của bạn là ${roleName} (Nội tại 2 Mạng chống Sói — Ngủ ban đêm)`
            : `👑 Your role is ${roleName} (2 Lives vs Wolves Passive — Sleeps at night)`,
        subtext:
          lang === 'vi'
            ? `Bạn có ${player.elderLives ?? 2} mạng trước hàm răng Ma Sói và tự động chịu đòn mà không cần thức dậy.`
            : `You have ${player.elderLives ?? 2} lives against Werewolf bites automatically without waking.`,
      };
    case 'cursed':
      return {
        wakesTonight: false,
        headline:
          lang === 'vi'
            ? `🌓 Vai của bạn là ${roleName} (Nội tại Hóa Sói khi bị cắn — Ngủ ban đêm)`
            : `🌓 Your role is ${roleName} (Turns into Werewolf if bitten — Sleeps at night)`,
        subtext:
          lang === 'vi'
            ? 'Hiện tại bạn thuộc phe Dân Làng. Nếu đêm nay bị Sói cắn, bạn không chết mà biến thành Ma Sói từ đêm sau!'
            : 'Currently a Villager. If bitten by wolves, you survive and wake as a Werewolf next night!',
      };
    case 'tanner':
      return {
        wakesTonight: false,
        headline:
          lang === 'vi'
            ? `🎭 Vai của bạn là ${roleName} (Thắng khi bị treo cổ ban ngày — Ngủ ban đêm)`
            : `🎭 Your role is ${roleName} (Wins if executed by Day Vote — Sleeps at night)`,
        subtext:
          lang === 'vi'
            ? 'Ban đêm bạn ngủ. Khi trời sáng, hãy giả vờ khả nghi để lừa cả làng bỏ phiếu treo cổ mình!'
            : 'Sleep through the night. By day, act suspicious so the village votes to execute you!',
      };
    case 'traitor':
      return {
        wakesTonight: false,
        headline:
          lang === 'vi'
            ? `🗡️ Vai của bạn là ${roleName} (Gián điệp Phe Sói — Không thức ban đêm)`
            : `🗡️ Your role is ${roleName} (Werewolf Minion — Sleeps at night)`,
        subtext:
          lang === 'vi'
            ? 'Bạn thắng cùng phe Ma Sói và Tiên Tri soi bạn ra Dân Làng. Hãy bảo vệ Sói vào ban ngày!'
            : 'You win with Werewolves and appear Good to the Seer. Defend the wolves during daytime!',
      };
    default:
      return {
        wakesTonight: false,
        headline:
          lang === 'vi'
            ? `🧑‍🌾 Vai của bạn là ${roleName} (Không có kỹ năng đêm — Suy luận ban ngày)`
            : `🧑‍🌾 Your role is ${roleName} (No night action — Day Deduction & Voting)`,
        subtext:
          lang === 'vi'
            ? 'Dân Làng ngủ suốt đêm. Bạn có thể bấm "Tua Tới Sáng" ngay để bước vào Thảo Luận & Bỏ Phiếu!'
            : 'Villagers sleep at night. Click "Skip to Dawn" anytime to start Day Discussion & Voting!',
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
  }
): Partial<NightActions> {
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
      const primaryWolfVictim = currentActions.wolfTargetId;

      // Bot Witch uses Heal if she herself was bitten, or 60% chance on Round 1-2 to save a victim
      if (!botWitch.hasUsedHeal && primaryWolfVictim) {
        if (
          primaryWolfVictim === botWitch.id ||
          primaryWolfVictim === botWitch.loverId ||
          (options.round <= 2 && Math.random() < 0.6)
        ) {
          updates.witchHealTargetId = primaryWolfVictim;
        }
      }

      // Bot Witch uses Poison on Round >= 2 if she hasn't poisoned yet (45% chance)
      if (!botWitch.hasUsedPoison && options.round >= 2 && Math.random() < 0.45) {
        const poisonCandidates = alivePlayers.filter(
          (p) =>
            p.id !== botWitch.id &&
            p.id !== botWitch.loverId &&
            p.id !== primaryWolfVictim
        );
        if (poisonCandidates.length > 0) {
          const wolvesInPool = poisonCandidates.filter(
            (p) => p.roleId === 'werewolf' || p.roleId === 'wolf_pup'
          );
          // 50% chance Witch's intuition hits a wolf if available
          const pick =
            wolvesInPool.length > 0 && Math.random() < 0.5
              ? wolvesInPool[Math.floor(Math.random() * wolvesInPool.length)]
              : poisonCandidates[Math.floor(Math.random() * poisonCandidates.length)];
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
      const alreadyKnown = new Set(options.knownWolfIdsByBotSeer || []);
      const candidates = alivePlayers.filter(
        (p) => p.id !== botSeer.id && !alreadyKnown.has(p.id)
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

  return {};
}

/**
 * Generates intelligent, rule-aware AI Bot votes during Day Voting.
 * - Werewolves never vote against fellow Werewolves unless no other option exists.
 * - Players never vote against their Cupid Lover (`loverId`).
 * - Seer & Villagers prioritize known/suspected wolves.
 */
export function computeSmartBotDayVotes(
  players: Player[],
  knownWolfIds: string[] = [],
  humanTargetId?: string | null
): VoteRecord[] {
  const alive = players.filter((p) => p.isAlive);
  const aliveBots = alive.filter((p) => p.isBot);
  const knownSet = new Set(knownWolfIds);

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
      bot.roleId === 'wolf_pup' ||
      bot.roleId === 'traitor';

    if (isBotWolfTeam) {
      const nonWolfTargets = basePool.filter(
        (p) => p.roleId !== 'werewolf' && p.roleId !== 'wolf_pup'
      );
      if (nonWolfTargets.length > 0) {
        const pick =
          nonWolfTargets[Math.floor(Math.random() * nonWolfTargets.length)];
        return { voterId: bot.id, targetId: pick.id };
      }
    } else {
      // If Seer or Villagers have a known wolf suspect, prioritize voting for them
      const knownWolvesAlive = basePool.filter((p) => knownSet.has(p.id));
      if (knownWolvesAlive.length > 0 && (bot.roleId === 'seer' || Math.random() < 0.65)) {
        return { voterId: bot.id, targetId: knownWolvesAlive[0].id };
      }
      // Slight coordination with human player's vote if target is not a confirmed villager
      if (humanTargetId && Math.random() < 0.35) {
        const humanTarget = basePool.find((p) => p.id === humanTargetId);
        if (humanTarget) {
          return { voterId: bot.id, targetId: humanTarget.id };
        }
      }
    }

    const pick = basePool[Math.floor(Math.random() * basePool.length)];
    return { voterId: bot.id, targetId: pick.id };
  });
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

  const lines: { senderId: string; senderName: string; text: string }[] = [];
  const shuffled = [...aliveBots];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  // If a living bot Seer inspected someone last night, let them share a deduction clue
  const botSeer = aliveBots.find((p) => p.roleId === 'seer' && !p.hasUsedPower);
  if (botSeer && seerInspection) {
    const target = players.find((p) => p.id === seerInspection.playerId);
    if (target && target.isAlive) {
      const seerLine =
        lang === 'vi'
          ? seerInspection.isWerewolf
            ? `🔮 Tôi đã quan sát kỹ đêm qua, mọi người hãy cẩn thận với ${target.name} — rất đáng ngờ là Ma Sói!`
            : `🔮 Theo suy luận của tôi, ${target.name} có vẻ đáng tin cậy thuộc phe Dân Làng.`
          : seerInspection.isWerewolf
          ? `🔮 Watch out everyone, my night read points strongly to ${target.name} being a Werewolf!`
          : `🔮 From my perspective, ${target.name} seems trustworthy on the Villager side.`;
      lines.push({
        senderId: botSeer.id,
        senderName: botSeer.name,
        text: seerLine,
      });
    }
  }

  const otherBots = shuffled.filter((b) => b.id !== botSeer?.id).slice(0, 2);
  otherBots.forEach((bot, idx) => {
    const suspectPool = players.filter((p) => p.isAlive && p.id !== bot.id);
    const randomSuspect =
      suspectPool[Math.floor(Math.random() * suspectPool.length)]?.name || '...';

    let text = '';
    if (lang === 'vi') {
      if (idx === 0) {
        text =
          killedNames.length > 0
            ? `Đêm qua ${killedNames.join(', ')} đã ngã xuống rồi... Chúng ta hãy chia sẻ manh mối trước khi bỏ phiếu!`
            : `Đêm qua bình yên, không ai tử trận! Chắc chắn Bảo Vệ đã che chở đúng người hoặc Phù Thủy đã dùng Bình Cứu.`;
      } else if (round <= 1) {
        text = `Mới sáng ngày đầu tiên, mọi người thấy ai có phản ứng lạ không? ${randomSuspect}, bạn nghi ngờ ai nhất?`;
      } else {
        text = `Qua mấy lượt vừa rồi, tôi thấy ${randomSuspect} hơi im lặng và ít đưa lập luận — mọi người nghĩ sao?`;
      }
    } else {
      if (idx === 0) {
        text =
          killedNames.length > 0
            ? `We lost ${killedNames.join(', ')} last night... Let’s share clues carefully before voting!`
            : `A peaceful night — nobody died! Either the Bodyguard blocked the bite or the Witch used her Heal potion.`;
      } else if (round <= 1) {
        text = `It’s Day 1 — does anyone have an early read? ${randomSuspect}, who are you watching first?`;
      } else {
        text = `After the last round, ${randomSuspect} has stayed pretty quiet. What does the village think?`;
      }
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
 */
export function getStepInitialTimerSeconds(
  step: AutoGMNightStep | null,
  myNightStepIdx: number,
  currentStepIdx: number
): number {
  if (!step) return 20;
  if (step.isHumanTurn) {
    return step.humanDurationSec;
  }
  if (myNightStepIdx > currentStepIdx) {
    return Math.min(2, step.botDurationSec);
  }
  return Math.min(2, step.botDurationSec);
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
  } = {}
): PreparedNightStart {
  const schedule = buildAutoGMNightSchedule(players, round, timerConfig, humanPlayerId);
  const humanPlayer = humanPlayerId
    ? players.find((p) => p.id === humanPlayerId)
    : players.find((p) => !p.isBot) || players[0];
  const myStepIdx = findHumanNightStepIndex(schedule, humanPlayer, round);

  if (myStepIdx <= 0) {
    const firstStep = schedule[0] || null;
    return {
      schedule,
      initialStepIndex: 0,
      initialTimerSec: firstStep
        ? firstStep.isHumanTurn
          ? firstStep.humanDurationSec
          : Math.min(2, firstStep.botDurationSec)
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
  if (lang === 'fr') {
    return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
  }
  if (lang === 'es') {
    return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
  }
  if (lang === 'ja') {
    return names.join('、');
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
        : lang === 'fr'
        ? '👻 Vous avez péri cette nuit ! Vous devenez un Fantôme — gardez le silence sur le canal public.'
        : lang === 'es'
        ? '👻 ¡Has caído esta noche! Ahora eres un Fantasma — guarda silencio en el chat público.'
        : lang === 'ja'
        ? '👻 昨夜あなたは命を落としました！ここからは霊界の幽霊として静かに見守ってください。'
        : '👻 You perished last night! You are now a Ghost Soul — stay silent in public chat and watch the village.'
    );
  }

  if (beforeMe.roleId === 'cursed' && afterMe.roleId === 'werewolf') {
    notices.push(
      lang === 'vi'
        ? '🌓 Mật báo Quản Trò: Đêm qua Sói đã cắn bạn, nhưng dòng máu Bán Sói đã thức tỉnh! Bạn KHÔNG chết và từ Đêm sau sẽ thức dậy cùng đàn Ma Sói.'
        : lang === 'fr'
        ? '🌓 Message secret du MJ : Les loups vous ont mordu, mais votre sang maudit s’est éveillé ! Vous rejoignez la meute dès la prochaine nuit.'
        : lang === 'es'
        ? '🌓 Aviso secreto del Narrador: ¡Los lobos te mordieron y despertaste como Hombre Lobo! Cazarás con la manada la próxima noche.'
        : lang === 'ja'
        ? '🌓 GMからの密書：昨夜人狼に襲われましたが、呪われた血が覚醒しました！今夜から人狼陣営として目覚めます。'
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
        : lang === 'fr'
        ? '👑 Message secret du MJ : Les loups vous ont attaqué cette nuit, mais votre résistance d’Ancien vous a sauvé ! Il ne vous reste plus qu’une vie.'
        : lang === 'es'
        ? '👑 Aviso secreto del Narrador: ¡Los lobos te atacaron anoche, pero sobreviviste! Solo te queda 1 vida.'
        : lang === 'ja'
        ? '👑 GMからの密書：昨夜人狼に襲われましたが、長老の耐久力で生き延びました！残りの命はあと1つです。'
        : '👑 Secret GM Tap: Werewolves attacked you last night, but your Elder fortitude saved you! You now have 1 life remaining.'
    );
  }

  if (beforeMe.roleId === 'doppelganger' && afterMe.roleId !== 'doppelganger' && afterMe.isAlive) {
    const newRoleName = ROLES[afterMe.roleId].name[lang] || ROLES[afterMe.roleId].name.vi;
    notices.push(
      lang === 'vi'
        ? `🪞 Mật báo Quản Trò: Hình mẫu của bạn đã ngã xuống đêm qua — bạn chính thức kế thừa thân phận ${newRoleName}!`
        : lang === 'fr'
        ? `🪞 Message secret du MJ : Votre modèle est mort cette nuit — vous héritez désormais du rôle ${newRoleName} !`
        : lang === 'es'
        ? `🪞 Aviso secreto del Narrador: Tu modelo cayó anoche — ¡ahora heredas el rol de ${newRoleName}!`
        : lang === 'ja'
        ? `🪞 GMからの密書：昨夜あなたの対象が死亡し、あなたは正式に「${newRoleName}」を引き継ぎました！`
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
          : lang === 'fr'
          ? `💘 Message secret du MJ : Cupidon vous a lié à ${partner.name} (#${seat}). Vous vivez et mourez ensemble !`
          : lang === 'es'
          ? `💘 Aviso secreto del Narrador: Cupido te ha unido con ${partner.name} (#${seat}). ¡Viven y mueren juntos!`
          : lang === 'ja'
          ? `💘 GMからの密書：昨夜キューピッドの矢があなたと${partner.name}（#${seat}）を恋人として結びました。二人は運命共同体です！`
          : `💘 Secret GM Tap: Cupid bound you as Lovers with ${partner.name} (#${seat}). You live and die together!`
      );
    }
  }

  return notices.length > 0 ? notices.join('\n') : null;
}

/**
 * Builds an authentic, real-life Werewolf Game Master Morning/Dawn Announcement.
 * STRICT ZERO-LEAK RULE:
 * - Announces ONLY public facts: who died (names + seats), or that it was a peaceful night (0 deaths),
 *   plus any public dawn Hunter revenge shot.
 * - NEVER leaks hidden night causes or roles (Bodyguard shield, Witch heal/poison, Seer inspection,
 *   Cursed awakening, Elder 2nd life, Cupid pair, Doppelganger copy).
 */
export function buildDawnGMAnnouncement(params: {
  round: number;
  beforePlayers: Player[];
  afterPlayers: Player[];
  nightKilledIds: string[];
  hunterShotEvent?: {
    hunterName: string;
    hunterSeat: number;
    targetId: string;
    targetName: string;
    targetSeat: number;
    extraLoverName?: string;
    extraLoverSeat?: number;
  } | null;
  humanPlayerId: string;
  lang: Language;
}): GMAnnouncementData {
  const { round, beforePlayers, afterPlayers, nightKilledIds, hunterShotEvent, humanPlayerId, lang } =
    params;

  const uniqueVictimIds = new Set<string>(nightKilledIds);
  if (hunterShotEvent) {
    uniqueVictimIds.add(hunterShotEvent.targetId);
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

  const victims: GMAnnouncementVictim[] = Array.from(uniqueVictimIds)
    .map((id) => {
      const p = afterPlayers.find((item) => item.id === id) || beforePlayers.find((item) => item.id === id);
      if (!p) return null;
      const seatNumber = getSeatNumber(afterPlayers, p.id);
      let tag: string | undefined;
      if (hunterShotEvent && p.id === hunterShotEvent.targetId) {
        tag =
          lang === 'vi'
            ? '🎯 Bị Thợ Săn bắn'
            : lang === 'fr'
            ? '🎯 Abattu par le Chasseur'
            : lang === 'es'
            ? '🎯 Disparado por el Cazador'
            : lang === 'ja'
            ? '🎯 狩人の道連れ'
            : '🎯 Shot by Hunter';
      } else {
        tag =
          lang === 'vi'
            ? '💀 Tử trận đêm qua'
            : lang === 'fr'
            ? '💀 Mort cette nuit'
            : lang === 'es'
            ? '💀 Murió anoche'
            : lang === 'ja'
            ? '💀 昨夜死亡'
            : '💀 Fallen last night';
      }
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        seatNumber,
        tag,
      };
    })
    .filter(Boolean) as GMAnnouncementVictim[];

  // Sort by seatNumber so listing order never leaks primary vs Cupid/Witch secondary victims
  victims.sort((a, b) => a.seatNumber - b.seatNumber);

  const aliveCount = afterPlayers.filter((p) => p.isAlive).length;
  const totalCount = afterPlayers.length;
  const afterMe = afterPlayers.find((p) => p.id === humanPlayerId);
  const isHumanDead = Boolean(afterMe && !afterMe.isAlive);

  const publicEvents: string[] = [];
  if (hunterShotEvent) {
    publicEvents.push(
      lang === 'vi'
        ? `🎯 Trước lúc ngã xuống, Thợ Săn ${hunterShotEvent.hunterName} (#${hunterShotEvent.hunterSeat}) đã rút súng bắn hạ ${hunterShotEvent.targetName} (#${hunterShotEvent.targetSeat})!`
        : lang === 'fr'
        ? `🎯 Dans son dernier souffle, le Chasseur ${hunterShotEvent.hunterName} (#${hunterShotEvent.hunterSeat}) a abattu ${hunterShotEvent.targetName} (#${hunterShotEvent.targetSeat}) !`
        : lang === 'es'
        ? `🎯 En su último aliento, el Cazador ${hunterShotEvent.hunterName} (#${hunterShotEvent.hunterSeat}) disparó contra ${hunterShotEvent.targetName} (#${hunterShotEvent.targetSeat})!`
        : lang === 'ja'
        ? `🎯 倒れる間際、狩人 ${hunterShotEvent.hunterName}（#${hunterShotEvent.hunterSeat}）が ${hunterShotEvent.targetName}（#${hunterShotEvent.targetSeat}）を道連れにしました！`
        : `🎯 With their dying breath, Hunter ${hunterShotEvent.hunterName} (#${hunterShotEvent.hunterSeat}) shot down ${hunterShotEvent.targetName} (#${hunterShotEvent.targetSeat})!`
    );
  }

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
  } else if (lang === 'fr') {
    badge = `☀️ ANNONCE DU MENEUR — MATIN DU JOUR ${round}`;
    ctaLabel = '☀️ Compris — Lancer le Débat';
    if (victims.length === 0) {
      headline = 'La nuit a été paisible — Aucune victime !';
      gmQuote = `« Le jour se lève ! Ouvrez tous les yeux. Bonne nouvelle : la nuit fut calme, personne n’est mort ! (${aliveCount}/${totalCount} survivants). »`;
      spokenNarration = `Le jour se lève ! Ouvrez tous les yeux. Bonne nouvelle, personne n'est mort cette nuit ! Vous pouvez commencer à débattre.`;
      chatMessageText = `☀️ [Jour ${round}] Le village se réveille ! Nuit paisible — 0 victime (${aliveCount}/${totalCount} en vie).`;
      dayBarSummary = 'Nuit paisible — 0 victime';
    } else {
      headline =
        victims.length === 1
          ? `${victims[0].name} (#${victims[0].seatNumber}) est mort cette nuit !`
          : `${victims.length} villageois sont tombés cette nuit !`;
      gmQuote = `« Le jour se lève ! Ouvrez tous les yeux. Tragédie cette nuit : ${victimLabelList} ${victims.length > 1 ? 'ont péri' : 'a péri'} ! Il reste ${aliveCount}/${totalCount} survivants. »`;
      spokenNarration = `Le jour se lève ! Ouvrez les yeux. Cette nuit, ${victimNameList} ${victims.length > 1 ? 'ont péri' : 'a péri'}. Le débat commence.`;
      chatMessageText = `☀️ [Jour ${round}] Le village se réveille ! Victime(s) de la nuit : ${victimLabelList} (${aliveCount}/${totalCount} en vie).`;
      dayBarSummary = `💀 Cette nuit : ${victimLabelList}`;
    }
  } else if (lang === 'es') {
    badge = `☀️ ANUNCIO DEL NARRADOR — AMANECER DÍA ${round}`;
    ctaLabel = '☀️ Entendido — Iniciar Debate';
    if (victims.length === 0) {
      headline = '¡Fue una noche tranquila — Nadie murió!';
      gmQuote = `“¡Ha amanecido! Abrid todos los ojos. Buenas noticias: anoche nadie perdió la vida. Quedan ${aliveCount}/${totalCount} sobrevivientes.”`;
      spokenNarration = `Ha amanecido. Abrid todos los ojos. Fue una noche tranquila, nadie murió anoche. Podéis comenzar a debatir.`;
      chatMessageText = `☀️ [Día ${round}] ¡Amanece en la aldea! Noche tranquila — 0 víctimas (${aliveCount}/${totalCount} vivos).`;
      dayBarSummary = 'Noche tranquila — 0 muertos';
    } else {
      headline =
        victims.length === 1
          ? `¡Anoche murió ${victims[0].name} (#${victims[0].seatNumber})!`
          : `¡Anoche cayeron ${victims.length} aldeanos!`;
      gmQuote = `“¡Ha amanecido! Abrid todos los ojos. Triste noticia: anoche ${victims.length > 1 ? 'murieron' : 'murió'} ${victimLabelList}. Quedan ${aliveCount}/${totalCount} sobrevivientes.”`;
      spokenNarration = `Ha amanecido. Abrid los ojos. Anoche ${victims.length > 1 ? 'murieron' : 'murió'} ${victimNameList}. Quedan ${aliveCount} sobrevivientes.`;
      chatMessageText = `☀️ [Día ${round}] ¡Amanece! Víctimas de la noche: ${victimLabelList} (${aliveCount}/${totalCount} vivos).`;
      dayBarSummary = `💀 Anoche: ${victimLabelList}`;
    }
  } else if (lang === 'ja') {
    badge = `☀️ GMの朝の発表 — ${round}日目の朝`;
    ctaLabel = '☀️ 確認して議論を始める';
    if (victims.length === 0) {
      headline = '昨夜は平和な夜でした — 犠牲者なし！';
      gmQuote = `「朝が来ました！全員目を開けてください。昨夜は平和な夜で、犠牲者はいませんでした！（生存者 ${aliveCount}/${totalCount}名）」`;
      spokenNarration = `朝が来ました。全員目を開けてください。昨夜は平和な夜で、犠牲者はいませんでした。議論を始めてください。`;
      chatMessageText = `☀️ [${round}日目の朝] 朝が来ました！昨夜は平和な夜で、犠牲者なし（生存 ${aliveCount}/${totalCount}名）。`;
      dayBarSummary = '昨夜は平和 — 犠牲者0名';
    } else {
      headline =
        victims.length === 1
          ? `昨夜、${victims[0].name}（#${victims[0].seatNumber}）が命を落としました！`
          : `昨夜、${victims.length}名が犠牲になりました！`;
      gmQuote = `「朝が来ました！全員目を開けてください。恐ろしい夜でした…昨夜、${victimLabelList}が犠牲となりました。残り生存者は${aliveCount}/${totalCount}名です。」`;
      spokenNarration = `朝が来ました。全員目を開けてください。昨夜、${victimNameList}が犠牲となりました。残り生存者は${aliveCount}名です。議論を始めてください。`;
      chatMessageText = `☀️ [${round}日目の朝] 朝が来ました！昨夜の犠牲者：${victimLabelList}（生存 ${aliveCount}/${totalCount}名）。`;
      dayBarSummary = `💀 昨夜の犠牲者: ${victimLabelList}`;
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

  const privateNotice = buildPrivateHumanNightNotice({
    beforePlayers,
    afterPlayers,
    humanPlayerId,
    round,
    lang,
  });

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
  hunterShotEvent?: {
    hunterName: string;
    hunterSeat: number;
    targetId: string;
    targetName: string;
    targetSeat: number;
  } | null;
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
    hunterShotEvent,
    humanPlayerId,
    lang,
  } = params;

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
            : lang === 'fr'
            ? `⚖️ Exécuté (${vCnt} votes)`
            : lang === 'es'
            ? `⚖️ Ejecutado (${vCnt} votos)`
            : lang === 'ja'
            ? `⚖️ 追放処刑（${vCnt}票）`
            : `⚖️ Executed (${vCnt} votes)`;
      } else if (hunterShotEvent && ap.id === hunterShotEvent.targetId) {
        tag =
          lang === 'vi'
            ? '🎯 Bị Thợ Săn bắn'
            : lang === 'fr'
            ? '🎯 Abattu par le Chasseur'
            : lang === 'es'
            ? '🎯 Disparado por el Cazador'
            : lang === 'ja'
            ? '🎯 狩人の道連れ'
            : '🎯 Shot by Hunter';
      } else {
        // Strict Werewolf zero-leak rule: never announce Cupid/Lover as the cause of death publicly
        tag =
          lang === 'vi'
            ? '💀 Đã tử trận'
            : lang === 'fr'
            ? '💀 Éliminé'
            : lang === 'es'
            ? '💀 Eliminado'
            : lang === 'ja'
            ? '💀 脱落'
            : '💀 Eliminated';
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
      lang === 'vi'
        ? '⚠️ Cảnh báo từ Quản Trò: Dân làng đã treo cổ nhầm Già Làng! Toàn bộ quyền năng đặc biệt của phe Dân Làng bị phong ấn!'
        : '⚠️ GM Warning: The village executed the Elder! All Villager special powers are now sealed!'
    );
  }

  if (hunterShotEvent) {
    publicEvents.push(
      lang === 'vi'
        ? `🎯 Trước khi lên giá treo cổ, Thợ Săn ${hunterShotEvent.hunterName} (#${hunterShotEvent.hunterSeat}) đã nổ súng kéo theo ${hunterShotEvent.targetName} (#${hunterShotEvent.targetSeat})!`
        : `🎯 Before facing the gallows, Hunter ${hunterShotEvent.hunterName} (#${hunterShotEvent.hunterSeat}) fired a final shot at ${hunterShotEvent.targetName} (#${hunterShotEvent.targetSeat})!`
    );
  }

  let badge = '';
  let headline = '';
  let gmQuote = '';
  let spokenNarration = '';
  let chatMessageText = '';
  let ctaLabel = '';

  if (lang === 'vi') {
    badge = `⚖️ QUẢN TRÒ CÔNG BỐ BIỂU QUYẾT — NGÀY ${round}`;
    ctaLabel = `🌙 Cả Làng Đi Ngủ (Đêm ${nextRound})`;
    if (isTie || !lynchedVictim) {
      headline = 'Hòa phiếu — Không ai bị treo cổ hôm nay!';
      gmQuote = `“Hết giờ bỏ phiếu! Số phiếu bầu hòa nhau nên hôm nay KHÔNG có ai bị đưa lên giá treo cổ. Trời đã tối, mời cả làng nhắm mắt đi ngủ, bước vào Đêm thứ ${nextRound}!”`;
      spokenNarration = `Hết giờ bỏ phiếu! Số phiếu bị hòa nên hôm nay không có ai bị treo cổ. Trời đã tối, mời cả làng nhắm mắt đi ngủ, bước vào đêm thứ ${nextRound}.`;
      chatMessageText = `⚖️ [Hoàng Hôn Ngày ${round}] Biểu quyết hòa phiếu! Không ai bị treo cổ hôm nay. Chuẩn bị bước vào Đêm ${nextRound}.`;
    } else {
      const seat = getSeatNumber(beforePlayers, lynchedVictim.id);
      const count = voteCounts[lynchedVictim.id] || 0;
      headline = `${lynchedVictim.name} (#${seat}) bị treo cổ với ${count} phiếu!`;
      gmQuote = `“Hết giờ bỏ phiếu! Với ${count} phiếu bầu cao nhất, cả làng đã quyết định đưa ${lynchedVictim.name} (#${seat}) lên giá treo cổ! Màn đêm thứ ${nextRound} đang buông xuống, mời mọi người đi ngủ.”`;
      spokenNarration = `Hết giờ bỏ phiếu! Với ${count} phiếu bầu, ${lynchedVictim.name} đã bị cả làng đưa lên giá treo cổ. Hiện còn ${aliveCount} người sống sót. Màn đêm thứ ${nextRound} sắp buông xuống, mời cả làng đi ngủ.`;
      chatMessageText = `⚖️ [Hoàng Hôn Ngày ${round}] ${lynchedVictim.name} (#${seat}) nhận nhiều phiếu nhất (${count} phiếu) và bị treo cổ!`;
    }
  } else {
    badge = `⚖️ GAME MASTER VOTE VERDICT — DAY ${round}`;
    ctaLabel = `🌙 Village Sleeps (Night ${nextRound})`;
    if (isTie || !lynchedVictim) {
      headline = 'Tied Vote — Nobody was executed today!';
      gmQuote = `“Voting is closed! The vote is tied, so nobody is sent to the gallows today. Dusk falls — everyone close your eyes for Night ${nextRound}!”`;
      spokenNarration = `Voting is closed! The vote is tied, so nobody is executed today. Close your eyes as Night ${nextRound} begins.`;
      chatMessageText = `⚖️ [Day ${round} Dusk] Vote tied! Nobody was executed today. Preparing for Night ${nextRound}.`;
    } else {
      const seat = getSeatNumber(beforePlayers, lynchedVictim.id);
      const count = voteCounts[lynchedVictim.id] || 0;
      headline = `${lynchedVictim.name} (#${seat}) executed with ${count} votes!`;
      gmQuote = `“Voting is closed! With ${count} votes, the village sends ${lynchedVictim.name} (#${seat}) to the gallows! ${aliveCount}/${totalCount} remain alive as Night ${nextRound} falls.”`;
      spokenNarration = `Voting is closed! With ${count} votes, ${lynchedVictim.name} has been executed by the village. Close your eyes as Night ${nextRound} begins.`;
      chatMessageText = `⚖️ [Day ${round} Dusk] ${lynchedVictim.name} (#${seat}) received the most votes (${count}) and was executed!`;
    }
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
      lang === 'vi' ? '🗳️ Chi tiết phiếu:' : '🗳️ Votes:'
    } ${voterSummaryText}.`;
  }

  if (publicEvents.length > 0) {
    chatMessageText = `${chatMessageText} ${publicEvents.join(' ')}`;
  }

  const beforeMe = beforePlayers.find((p) => p.id === humanPlayerId);
  let privateNotice: string | null = null;
  if (beforeMe?.isAlive && isHumanDead) {
    privateNotice =
      lang === 'vi'
        ? '👻 Bạn đã bị loại tại pháp trường! Từ giờ bạn là Hồn Ma — hãy giữ im lặng ở kênh chung và quan sát cuộc chơi.'
        : '👻 You were eliminated at the gallows! You are now a Ghost Soul — stay silent in public chat and watch the match.';
  } else if (beforeMe?.roleId === 'doppelganger' && afterMe && afterMe.roleId !== 'doppelganger' && afterMe.isAlive) {
    const newRoleName = ROLES[afterMe.roleId].name[lang] || ROLES[afterMe.roleId].name.vi;
    privateNotice =
      lang === 'vi'
        ? `🪞 Mật báo Quản Trò: Hình mẫu của bạn vừa bị treo cổ — bạn chính thức kế thừa thân phận ${newRoleName}!`
        : `🪞 Secret GM Tap: Your role model was just executed — you have inherited the ${newRoleName} role!`;
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
    aliveCount,
    totalCount,
    ctaLabel,
    isHumanDead,
  };
}

/**
 * Determines whether the phase/step should automatically advance when the countdown timer reaches 0.
 * CRITICAL GAMEPLAY PROTECTION:
 * - Never auto-advance while a Game Master Announcement (Dawn/Dusk briefing) is on screen!
 * - Never auto-skip the human player's active night turn (`isPlayerAwakeAtNight === true`)!
 *   Always wait for the human player to choose their target and confirm (or explicitly skip).
 * - Never auto-end the final night step for a living human player without their click.
 * - Never auto-skip human Hunter revenge shot (`isHumanHunterRevenge === true`).
 * - Never auto-skip Day Voting while the human player is alive and has not yet cast a vote (`isHumanAlive && !hasHumanVoted`).
 */
export function shouldAutoAdvanceOnTimerZero(params: {
  shellState: 'title' | 'playing' | 'paused' | 'gameover' | 'gm_host' | 'gm_player';
  phase: Phase;
  showOnboardingTour: boolean;
  isPlayerAwakeAtNight: boolean;
  isHumanAlive: boolean;
  hasHumanVoted: boolean;
  isHumanHunterRevenge: boolean;
  isLastNightStep?: boolean;
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
    if (params.isPlayerAwakeAtNight) {
      return false;
    }
    if (params.isHumanAlive && params.isLastNightStep) {
      return false;
    }
    return true;
  }

  if (params.phase === 'hunter_revenge') {
    if (params.isHumanHunterRevenge) {
      return false;
    }
    return true;
  }

  if (params.phase === 'day_voting') {
    if (params.isHumanAlive && !params.hasHumanVoted) {
      return false;
    }
    return true;
  }

  return true;
}



