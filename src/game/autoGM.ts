import { Language, NightActions, Player, RoleId, VoteRecord } from '../types/game';
import { ROLES } from './roles';

export type NightStepKey =
  | 'doppelganger'
  | 'cupid'
  | 'werewolf'
  | 'witch'
  | 'seer'
  | 'bodyguard';

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
      vi: '1. Nhân Bản Thức Dậy',
      en: '1. Doppelgänger Wakes',
      fr: '1. Le Sosie se réveille',
      es: '1. El Sosias despierta',
      ja: '1. ドッペルゲンガーの目覚め',
    },
    gmNarration: {
      vi: '🤖 Quản Trò Máy: "Nhân Bản thức dậy! Hãy chọn 1 người chơi làm hình mẫu kế thừa."',
      en: '🤖 Auto-GM: "Doppelgänger, wake up! Choose 1 player as your role model."',
      fr: '🤖 MJ Auto : « Le Sosie se réveille ! Choisissez un modèle à copier. »',
      es: '🤖 Narrador Auto: "¡Sosias, despierta! Elige a un jugador como modelo."',
      ja: '🤖 自動GM：「ドッペルゲンガーは目覚めて、模倣する対象を1人選んでください。」',
    },
    playerInstruction: {
      vi: 'Chạm vào 1 người chơi khác để chọn làm hình mẫu. Khi người đó chết, bạn sẽ kế thừa vai trò của họ.',
      en: 'Tap 1 other player to copy. When they die, you inherit their role.',
      fr: 'Cliquez sur un autre joueur pour copier son rôle à sa mort.',
      es: 'Toca a otro jugador para heredar su rol cuando muera.',
      ja: '他のプレイヤーを1人選択してください。その人が死亡すると役職を引き継ぎます。',
    },
  },
  cupid: {
    roleId: 'cupid',
    title: {
      vi: '2. Thần Tình Yêu Cupid',
      en: '2. Cupid Wakes',
      fr: '2. Cupidon se réveille',
      es: '2. Cupido despierta',
      ja: '2. キューピッドの目覚め',
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
      vi: 'Xem nạn nhân bị Sói cắn để quyết định dùng Bình Cứu (1 lần/ván), hoặc chạm vào 1 người để quăng Bình Độc (1 lần/ván).',
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
 * Builds the sequential Night Call Schedule for the Automated Game Master ("Quản Trò Máy")
 * strictly following canonical Werewolf rules & wakeOrder:
 * Night 1: Doppelgänger (if in roster) -> Cupid (if in roster) -> Werewolves -> Witch -> Seer -> Bodyguard
 * Night 2+: Werewolves -> Witch -> Seer -> Bodyguard
 */
export function buildAutoGMNightSchedule(
  players: Player[],
  round: number
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

  return keys.map((key, idx) => {
    const meta = STEP_TRANSLATIONS[key];
    return {
      key,
      roleId: meta.roleId,
      stepIndex: idx,
      totalSteps: keys.length,
      title: meta.title,
      gmNarration: meta.gmNarration,
      playerInstruction: meta.playerInstruction,
      humanDurationSec: 18,
      botDurationSec: 5,
    };
  });
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
    if (!isHumanLivingWolf || !currentActions.wolfTargetId) {
      if (preyPool.length > 0) {
        const primary = preyPool[Math.floor(Math.random() * preyPool.length)];
        updates.wolfTargetId = primary.id;
      }
    }

    const chosenPrimary = updates.wolfTargetId || currentActions.wolfTargetId;
    if (
      options.wolfPupFrenzy &&
      (!isHumanLivingWolf || !currentActions.secondWolfTargetId)
    ) {
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
  seerInspection?: { playerId: string; roleId: RoleId; isWerewolf: boolean } | null
): { senderId: string; senderName: string; text: string }[] {
  const aliveBots = players.filter((p) => p.isBot && p.isAlive);
  if (aliveBots.length === 0) return [];

  const lines: { senderId: string; senderName: string; text: string }[] = [];
  const shuffled = [...aliveBots].sort(() => Math.random() - 0.5);

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
            ? `Đêm qua ${killedNames.join(', ')} đã ngã xuống rồi... Chúng ta phải tìm ra Sói ngay hôm nay!`
            : `Đêm qua không ai chết! Chắc chắn Bảo Vệ đã che chở đúng người hoặc Phù Thủy đã dùng Bình Cứu.`;
      } else {
        text = `Tôi thấy ${randomSuspect} hơi im lặng từ đầu ván, ý mọi người thế nào trước khi bỏ phiếu?`;
      }
    } else {
      if (idx === 0) {
        text =
          killedNames.length > 0
            ? `We lost ${killedNames.join(', ')} last night... Let’s analyze carefully before voting!`
            : `Nobody died last night! Either the Bodyguard blocked the bite or the Witch used her Heal potion.`;
      } else {
        text = `I think ${randomSuspect} has been unusually quiet. What does the village think?`;
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
