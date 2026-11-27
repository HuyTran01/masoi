import type { Language, RoleDefinition, RoleId } from '../types/game.ts';

export const ROLES: Record<RoleId, RoleDefinition> = {
  villager: {
    id: 'villager',
    name: {
      vi: 'Dân Làng',
      en: 'Villager',
    },
    faction: 'villager',
    wakeOrder: 0,
    description: {
      vi: 'Không có năng lực đặc biệt ban đêm. Vũ khí lớn nhất là tư duy suy luận và lá phiếu công lý vào ban ngày.',
      en: 'Has no night powers. Main weapon is sharp logic, debate and voting justice during the day.',
    },
    instructions: {
      vi: 'Ngủ say giấc mỗi đêm. Thức dậy vào ban ngày, lắng nghe thông tin và phân tích kẻ khả nghi.',
      en: 'Sleep through the night. Awaken at daybreak, listen to debates, and expose wolves.',
    },
    guideForNewbie: {
      vi: 'Đừng im lặng quá mức kẻo bị nghi ngờ là Sói. Chú ý thái độ bỏ phiếu của người khác và ghi nhớ lời khai mâu thuẫn.',
      en: 'Do not stay too quiet or you will be suspected. Watch voting patterns and inconsistencies.',
    },
    icon: 'user-check',
    color: '#38bdf8', // Sky blue
    badge: '🛡️ Phổ thông',
  },
  werewolf: {
    id: 'werewolf',
    name: {
      vi: 'Ma Sói',
      en: 'Werewolf',
    },
    faction: 'werewolf',
    wakeOrder: 20,
    description: {
      vi: 'Mỗi đêm cùng bầy sói thức giấc và thống nhất cắn chết một nạn nhân. Ban ngày trà trộn giả làm dân.',
      en: 'Wakes up each night with fellow wolves to eliminate an innocent villager. Pretends to be peaceful by day.',
    },
    instructions: {
      vi: 'Thức dậy cùng bầy, chọn mục tiêu bằng ám hiệu không phát ra tiếng động. Tránh tấn công trùng lặp người được bảo vệ nếu đoán được.',
      en: 'Wake with the pack, agree silently on your target, and mislead the village during day vote.',
    },
    guideForNewbie: {
      vi: 'Đừng hùa theo vote quá vội vàng. Hãy tạo ra các giả thuyết hợp lý để vu khống hoặc bảo vệ đồng đội một cách khéo léo.',
      en: 'Do not rush votes together. Blend in, support innocent theories, and sacrifice a teammate only if unavoidable.',
    },
    icon: 'skull',
    color: '#ef4444', // Red
    badge: '🐺 Hung bạo',
  },
  seer: {
    id: 'seer',
    name: {
      vi: 'Tiên Tri',
      en: 'Seer',
    },
    faction: 'villager',
    wakeOrder: 40,
    description: {
      vi: 'Mỗi đêm được quyền chỉ định 1 người chơi để soi xem người đó thuộc phe Dân Làng hay Ma Sói.',
      en: 'Each night, checks one player to discover whether they belong to the Villagers or Werewolves.',
    },
    instructions: {
      vi: 'Quản trò gọi: Tiên Tri thức dậy, chọn 1 người. Quản trò ra dấu (Ngón tay cái lên = Dân, Chỉ xuống = Sói).',
      en: 'When summoned, point to a target. Moderator signals: Thumbs up = Good, Thumbs down = Wolf.',
    },
    guideForNewbie: {
      vi: 'Đừng vội vàng lộ diện ngay ngày 1 kẻo bị Sói cắn đêm 2! Hãy để dành thông tin đến khi có bằng chứng quan trọng hoặc được bảo vệ.',
      en: 'Do not claim Seer on day 1 unless crucial; wolves will kill you! Wait for Bodyguard or clear suspect.',
    },
    icon: 'eye',
    color: '#a855f7', // Purple
    badge: '🔮 Thần thánh',
  },
  bodyguard: {
    id: 'bodyguard',
    name: {
      vi: 'Bảo Vệ',
      en: 'Bodyguard',
    },
    faction: 'villager',
    wakeOrder: 15,
    description: {
      vi: 'Mỗi đêm bảo vệ 1 người chơi thoát khỏi móng vuốt sói. Không thể bảo vệ cùng 1 người 2 đêm liên tiếp.',
      en: 'Each night protects one player from werewolves. Cannot protect the same person two nights in a row.',
    },
    instructions: {
      vi: 'Chọn người muốn che chở đêm nay. Nếu người đó bị sói cắn, người đó sẽ không chết.',
      en: 'Pick one target to shield tonight. If attacked by wolves, they survive.',
    },
    guideForNewbie: {
      vi: 'Ưu tiên bảo vệ Tiên Tri đã lộ diện hoặc người chơi có tầm ảnh hưởng lớn trong việc dẫn dắt dân làng.',
      en: 'Prioritize protecting an exposed Seer or key village leaders.',
    },
    icon: 'shield',
    color: '#10b981', // Emerald green
    badge: '🛡️ Hộ vệ',
  },
  witch: {
    id: 'witch',
    name: {
      vi: 'Phù Thủy',
      en: 'Witch',
    },
    faction: 'villager',
    wakeOrder: 30,
    description: {
      vi: 'Sở hữu 2 lọ thuốc kỳ bí: 1 bình Cứu sống người bị sói cắn, và 1 bình Độc giết chết 1 người bất kỳ.',
      en: 'Holds two potent potions: 1 Elixir of Life to save a wolf victim, and 1 Poison bottle to eliminate anyone.',
    },
    instructions: {
      vi: 'Quản trò thông báo nạn nhân bị sói cắn. Phù thủy quyết định có dùng bình cứu không, và có dùng bình độc với ai không.',
      en: 'Moderator reveals who wolves attacked. Decide whether to use Heal potion or Poison potion.',
    },
    guideForNewbie: {
      vi: 'Bình cứu thường nên dùng ngay đêm 1 hoặc 2 để giữ số lượng dân làng. Bình độc chỉ dùng khi rất chắc chắn kẻ đó là Sói.',
      en: 'Use your heal early to preserve village numbers. Keep poison until you are very sure of a wolf.',
    },
    icon: 'flask-conical',
    color: '#ec4899', // Pink
    badge: '🧪 Dược sư',
  },
  hunter: {
    id: 'hunter',
    name: {
      vi: 'Thợ Săn',
      en: 'Hunter',
    },
    faction: 'villager',
    wakeOrder: 18,
    description: {
      vi: 'Mỗi đêm thức dậy để ghim nòng súng vào 1 người (hoặc chọn Không ghim). Nếu Thợ Săn chết vào ban đêm (Sói cắn, Bình Độc, chết theo Tình Nhân), phát súng lập tức bắn hạ người đang bị ghim theo cùng — xuyên qua cả Khiên Bảo Vệ và Bình Cứu Phù Thủy. Nếu bị treo cổ ban ngày, súng không kích hoạt.',
      en: 'Wakes each night to aim at one player (or choose No Mark). If the Hunter dies at night (wolf bite, poison, or Lover bond), the shot fires automatically at their marked target — piercing both Bodyguard shields and Witch healing. If lynched during the day, the gun does not fire.',
    },
    instructions: {
      vi: 'Mỗi đêm thức dậy chọn 1 người để ghim đạn hoặc bấm Không ghim để giữ an toàn.',
      en: 'Wake each night to mark 1 target or choose No Target.',
    },
    guideForNewbie: {
      vi: 'Hãy ghim kẻ bạn nghi là Ma Sói nhất mỗi đêm (hoặc chọn Không ghim nếu chưa chắc để tránh bắn nhầm phe Dân). Đạn xuyên mọi lớp bảo vệ!',
      en: 'Mark your top Werewolf suspect each night, or pick No Target if unsure so you do not shoot an ally — your bullet pierces all saves!',
    },
    icon: 'crosshair',
    color: '#eab308', // Yellow
    badge: '🎯 Thiện xạ',
  },
  cupid: {
    id: 'cupid',
    name: {
      vi: 'Cupid (Thần Tình Yêu)',
      en: 'Cupid',
    },
    faction: 'villager',
    wakeOrder: 10,
    description: {
      vi: 'Vào đêm đầu tiên, bắn 2 mũi tên ghép đôi 2 người chơi thành tình nhân. Nếu một người chết, người kia sẽ chết theo vì đau buồn.',
      en: 'On night 1, couples two players in love. If one dies, the other dies immediately of broken heart.',
    },
    instructions: {
      vi: 'Thức dậy đêm đầu tiên, chọn 2 người bất kỳ (có thể ghép chính mình). Quản trò chạm vai 2 tình nhân để họ biết mặt nhau.',
      en: 'Awake on night 1, pick two players (can include yourself). Moderator touches their shoulders to reveal each other.',
    },
    guideForNewbie: {
      vi: 'Nếu 2 tình nhân thuộc 2 phe khác nhau (Dân + Sói), họ trở thành Phe Thứ Ba và phải tiêu diệt toàn bộ người khác để thắng!',
      en: 'If lovers belong to opposite factions (Wolf + Villager), they become a 3rd faction that must eliminate everyone else!',
    },
    icon: 'heart',
    color: '#f43f5e', // Rose
    badge: '💘 Se duyên',
  },
  wolf_pup: {
    id: 'wolf_pup',
    name: {
      vi: 'Sói Con',
      en: 'Wolf Pup',
    },
    faction: 'werewolf',
    wakeOrder: 22,
    description: {
      vi: 'Thuộc đàn Sói. Nếu Sói Con bị giết, đàn Sói sẽ cuồng nộ và được cắn 2 nạn nhân vào đêm kế tiếp!',
      en: 'Member of the wolf pack. When the pup dies, the pack enters a frenzy and kills two victims next night!',
    },
    instructions: {
      vi: 'Thức dậy cùng đàn sói mỗi đêm. Khi chết, kích hoạt hiệu ứng cuồng nộ cho đàn vào đêm sau.',
      en: 'Wake with pack. Upon your death, moderator unlocks 2 kills for wolves on the next night.',
    },
    guideForNewbie: {
      vi: 'Có thể chủ động tạo kịch bản hy sinh ở giữa ván để đàn sói có đòn kết liễu 2 mạng đêm sau.',
      en: 'Can be a calculated sacrifice in mid-game to grant your pack two devastating kills.',
    },
    icon: 'flame',
    color: '#f97316', // Orange
    badge: '🔥 Cuồng nộ',
  },
  tanner: {
    id: 'tanner',
    name: {
      vi: 'Kẻ Chán Đời',
      en: 'Tanner (Fool)',
    },
    faction: 'neutral',
    wakeOrder: 0,
    description: {
      vi: 'Mục tiêu duy nhất là làm mọi cách để Dân Làng nghi ngờ và treo cổ mình vào ban ngày. Nếu bị treo cổ, thắng ngay lập tức!',
      en: 'Hates life. Sole objective is to get lynched by village vote during the day. Wins instantly if hanged!',
    },
    instructions: {
      vi: 'Không có năng lực đêm. Ban ngày hành động kỳ quặc, sơ hở để mọi người biểu quyết xử tử mình.',
      en: 'No night power. Act slightly suspicious during day to lure the village into executing you.',
    },
    guideForNewbie: {
      vi: 'Đừng giả sói quá lộ liễu khiến ai cũng nhận ra bạn là Kẻ Chán Đời. Hãy giả vờ như một con Sói vụng về!',
      en: 'Do not be overly obvious or smart players will ignore you. Pretend to be a clumsy wolf!',
    },
    icon: 'smile',
    color: '#eab308',
    badge: '🎭 Đơn độc',
  },
  elder: {
    id: 'elder',
    name: {
      vi: 'Già Làng',
      en: 'Elder',
    },
    faction: 'villager',
    wakeOrder: 0,
    description: {
      vi: 'Có sức sống kiên cường, sống sót sau lần cắn đầu tiên của Ma Sói (cần 2 lần cắn mới chết). Nhưng nếu bị dân làng treo cổ, mọi người mất hết sức mạnh!',
      en: 'Tough veteran. Survives the first werewolf bite (requires 2 attacks to die). If lynched by villagers, all villagers lose powers!',
    },
    instructions: {
      vi: 'Không thức ban đêm. Quản trò ghi nhớ già làng còn 2 mạng đối với sói cắn.',
      en: 'No active night call. Has 2 lives specifically against werewolf bites.',
    },
    guideForNewbie: {
      vi: 'Hãy chứng minh bạn là chỗ dựa vững chắc cho dân làng và cảnh báo họ không được vote nhầm bạn.',
      en: 'Be a firm pillar for the village; remind them executing you has severe consequences.',
    },
    icon: 'award',
    color: '#06b6d4',
    badge: '👑 Kiên cường',
  },
  doppelganger: {
    id: 'doppelganger',
    name: {
      vi: 'Nhân Bản',
      en: 'Doppelgänger',
    },
    faction: 'neutral',
    wakeOrder: 5,
    description: {
      vi: 'Đêm đầu tiên chọn 1 người mẫu. Khi người đó chết, bạn sẽ lập tức kế thừa toàn bộ vai trò và phe phái của họ!',
      en: 'Picks a model on night 1. When that target dies, inherits their role and allegiance immediately.',
    },
    instructions: {
      vi: 'Đêm 1 chọn 1 người làm mục tiêu sao chép. Quản trò ghi nhớ vai trò của người đó.',
      en: 'Awaken on night 1, point to chosen player. Wait for their demise to become their role.',
    },
    guideForNewbie: {
      vi: 'Chọn người chơi dày dạn kinh nghiệm hoặc có vẻ sở hữu vai trò quyền năng để kế thừa lợi thế lớn.',
      en: 'Pick an experienced player likely holding an impactful role like Seer or Wolf.',
    },
    icon: 'copy',
    color: '#8b5cf6',
    badge: '🪞 Sao chép',
  },
  cursed: {
    id: 'cursed',
    name: {
      vi: 'Bán Sói (Kẻ Bị Nguyền)',
      en: 'Cursed (Lycan)',
    },
    faction: 'villager',
    wakeOrder: 0,
    description: {
      vi: 'Bắt đầu như một dân làng bình thường. Nhưng khi bị Ma Sói cắn, không chết mà sẽ bị đồng hóa biến thành Ma Sói!',
      en: 'Starts as a regular villager. But if attacked by werewolves, does not die—instead transforms into a Werewolf!',
    },
    instructions: {
      vi: 'Khi bị Sói cắn, quản trò gõ vai thông báo bạn đã hóa Sói và thức dậy cùng bầy từ đêm tiếp theo.',
      en: 'If bitten, moderator secretly informs you of your transformation into a wolf.',
    },
    guideForNewbie: {
      vi: 'Hãy linh hoạt thích ứng! Trước khi biến hình hãy tìm cách thắng cùng dân; khi đã thành sói hãy quay sang trợ giúp đàn sói.',
      en: 'Be ready to switch mindset: help the village initially, then hunt with the pack if bitten.',
    },
    icon: 'moon',
    color: '#a855f7',
    badge: '🌓 Biến hình',
  },
  traitor: {
    id: 'traitor',
    name: {
      vi: 'Kẻ Phản Bội (Tay Sai)',
      en: 'Traitor (Minion)',
    },
    faction: 'werewolf',
    wakeOrder: 0,
    description: {
      vi: 'Thuộc phe Ma Sói nhưng Tiên Tri soi ra là Dân Làng. Ban đêm không thức cùng bầy sói nhưng ban ngày tìm mọi cách bảo vệ sói.',
      en: 'Allied with Werewolves, but appears as a Villager to the Seer. Does not wake at night with wolves.',
    },
    instructions: {
      vi: 'Không thức dậy cùng sói. Quan sát ai là sói trong ban ngày và tạo luận điểm đánh lạc hướng dân làng.',
      en: 'Does not wake at night. Discern who your wolf allies are and mislead village lynch votes.',
    },
    guideForNewbie: {
      vi: 'Sẵn sàng hy sinh chịu chết thay cho Sói chúa nếu điều đó giữ an toàn cho đàn sói.',
      en: 'Be willing to take the fall if it protects real wolves and secures majority victory.',
    },
    icon: 'drama',
    color: '#dc2626',
    badge: '🗡️ Gián điệp',
  },
};

export const ROLE_BADGES: Record<RoleId, Record<Language, string>> = {
  villager: {
    vi: '🛡️ Phổ thông',
    en: '🛡️ Classic',
  },
  werewolf: {
    vi: '🐺 Hung bạo',
    en: '🐺 Predator',
  },
  seer: {
    vi: '🔮 Thần thánh',
    en: '🔮 Mystic',
  },
  bodyguard: {
    vi: '🛡️ Hộ vệ',
    en: '🛡️ Guardian',
  },
  witch: {
    vi: '🧪 Dược sư',
    en: '🧪 Alchemist',
  },
  hunter: {
    vi: '🎯 Thiện xạ',
    en: '🎯 Marksman',
  },
  cupid: {
    vi: '💘 Se duyên',
    en: '💘 Matchmaker',
  },
  wolf_pup: {
    vi: '🔥 Cuồng nộ',
    en: '🔥 Frenzy',
  },
  tanner: {
    vi: '🎭 Đơn độc',
    en: '🎭 Solo Trickster',
  },
  elder: {
    vi: '👑 Kiên cường',
    en: '👑 Resilient',
  },
  doppelganger: {
    vi: '🪞 Sao chép',
    en: '🪞 Shapeshifter',
  },
  cursed: {
    vi: '🌓 Biến hình',
    en: '🌓 Turned',
  },
  traitor: {
    vi: '🗡️ Gián điệp',
    en: '🗡️ Spy',
  },
};

const STRIP_LEADING_EMOJI_RE = /^[\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u;

export function getRoleBadge(roleId: RoleId, lang: Language): string {
  return ROLE_BADGES[roleId]?.[lang] ?? ROLES[roleId]?.badge ?? roleId;
}

export function localizeRoleArchetype(tag: string, lang: Language): string {
  const trimmed = tag.trim();
  if (!trimmed) return tag;
  if (trimmed in ROLE_BADGES) {
    return ROLE_BADGES[trimmed as RoleId][lang];
  }
  const strippedInput = trimmed.replace(STRIP_LEADING_EMOJI_RE, '');
  const hasLeadingEmoji = strippedInput !== trimmed;
  for (const badges of Object.values(ROLE_BADGES)) {
    for (const candidate of Object.values(badges)) {
      if (
        trimmed === candidate ||
        strippedInput === candidate.replace(STRIP_LEADING_EMOJI_RE, '')
      ) {
        const target = badges[lang];
        return hasLeadingEmoji ? target : target.replace(STRIP_LEADING_EMOJI_RE, '');
      }
    }
  }
  return tag;
}
