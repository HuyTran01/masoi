import type { Language, RoleDefinition, RoleId } from '../types/game.ts';

export const ROLES: Record<RoleId, RoleDefinition> = {
  villager: {
    id: 'villager',
    name: {
      vi: 'Dân Làng',
      en: 'Villager',
      fr: 'Villageois',
      es: 'Aldeano',
      ja: '村人',
    },
    faction: 'villager',
    wakeOrder: 0,
    description: {
      vi: 'Không có năng lực đặc biệt ban đêm. Vũ khí lớn nhất là tư duy suy luận và lá phiếu công lý vào ban ngày.',
      en: 'Has no night powers. Main weapon is sharp logic, debate and voting justice during the day.',
      fr: 'Aucun pouvoir nocturne. Votre arme est votre déduction et votre vote de jour.',
      es: 'Sin habilidades nocturnas. Tu arma es la deducción y el voto diario.',
      ja: '夜の能力はありません。昼の議論と投票による推理が最大の武器です。',
    },
    instructions: {
      vi: 'Ngủ say giấc mỗi đêm. Thức dậy vào ban ngày, lắng nghe thông tin và phân tích kẻ khả nghi.',
      en: 'Sleep through the night. Awaken at daybreak, listen to debates, and expose wolves.',
      fr: 'Dormez la nuit, écoutez les débats le jour et votez contre les suspects.',
      es: 'Duerme por la noche y participa en el debate diurno para linchar sospechosos.',
      ja: '夜は眠り、昼に目覚めて怪しい人物を投票で処刑しましょう。',
    },
    guideForNewbie: {
      vi: 'Đừng im lặng quá mức kẻo bị nghi ngờ là Sói. Chú ý thái độ bỏ phiếu của người khác và ghi nhớ lời khai mâu thuẫn.',
      en: 'Do not stay too quiet or you will be suspected. Watch voting patterns and inconsistencies.',
      fr: 'Ne restez pas trop silencieux. Observez les votes des autres joueurs.',
      es: 'No te quedes callado. Observa cómo votan los demás.',
      ja: '静かすぎると疑われます。他のプレイヤーの投票傾向を観察しましょう。',
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
      fr: 'Loup-Garou',
      es: 'Hombre Lobo',
      ja: '人狼',
    },
    faction: 'werewolf',
    wakeOrder: 20,
    description: {
      vi: 'Mỗi đêm cùng bầy sói thức giấc và thống nhất cắn chết một nạn nhân. Ban ngày trà trộn giả làm dân.',
      en: 'Wakes up each night with fellow wolves to eliminate an innocent villager. Pretends to be peaceful by day.',
      fr: 'Se réveille chaque nuit pour dévorer une victime avec sa meute.',
      es: 'Se despierta cada noche junto a los otros lobos para devorar a un aldeano.',
      ja: '毎晩仲間と目覚め、村人を1人襲撃します。昼間は村人のふりをします。',
    },
    instructions: {
      vi: 'Thức dậy cùng bầy, chọn mục tiêu bằng ám hiệu không phát ra tiếng động. Tránh tấn công trùng lặp người được bảo vệ nếu đoán được.',
      en: 'Wake with the pack, agree silently on your target, and mislead the village during day vote.',
      fr: 'Choisissez une cible discrètement la nuit et trompez le village le jour.',
      es: 'Elige una víctima en silencio por la noche y despista a los aldeanos de día.',
      ja: '夜に仲間と目覚めて無言でターゲットを指名します。',
    },
    guideForNewbie: {
      vi: 'Đừng hùa theo vote quá vội vàng. Hãy tạo ra các giả thuyết hợp lý để vu khống hoặc bảo vệ đồng đội một cách khéo léo.',
      en: 'Do not rush votes together. Blend in, support innocent theories, and sacrifice a teammate only if unavoidable.',
      fr: 'Ne votez pas tous ensemble trop vite, fondez-vous dans la masse.',
      es: 'No votes siempre con tus compañeros de manada para no delatarlos.',
      ja: '全員で同じ人に一斉投票するとバレやすくなります。自然に振る舞いましょう。',
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
      fr: 'Voyante',
      es: 'Vidente',
      ja: '占い師',
    },
    faction: 'villager',
    wakeOrder: 40,
    description: {
      vi: 'Mỗi đêm được quyền chỉ định 1 người chơi để soi xem người đó thuộc phe Dân Làng hay Ma Sói.',
      en: 'Each night, checks one player to discover whether they belong to the Villagers or Werewolves.',
      fr: 'Chaque nuit, découvre la véritable allégeance d’un joueur.',
      es: 'Cada noche investiga a un jugador para saber si es inocente o lobo.',
      ja: '毎晩1人のプレイヤーを指定して、人狼か村人かを占うことができます。',
    },
    instructions: {
      vi: 'Quản trò gọi: Tiên Tri thức dậy, chọn 1 người. Quản trò ra dấu (Ngón tay cái lên = Dân, Chỉ xuống = Sói).',
      en: 'When summoned, point to a target. Moderator signals: Thumbs up = Good, Thumbs down = Wolf.',
      fr: 'Désignez un joueur. Le maître du jeu vous indique son camp.',
      es: 'Señala a un jugador y el narrador te indicará su bando.',
      ja: '対象を指名し、ゲームマスターから人狼か否かのサインを受け取ります。',
    },
    guideForNewbie: {
      vi: 'Đừng vội vàng lộ diện ngay ngày 1 kẻo bị Sói cắn đêm 2! Hãy để dành thông tin đến khi có bằng chứng quan trọng hoặc được bảo vệ.',
      en: 'Do not claim Seer on day 1 unless crucial; wolves will kill you! Wait for Bodyguard or clear suspect.',
      fr: 'Ne vous révélez pas trop tôt, sinon les loups vous tueront la nuit suivante.',
      es: 'No te reveles en la primera ronda o serás el blanco de los lobos.',
      ja: '1日目にすぐ名乗り出ると人狼の標的になります。タイミングを見計らいましょう。',
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
      fr: 'Salvateur',
      es: 'Guardaespaldas',
      ja: '騎士 / 狩人',
    },
    faction: 'villager',
    wakeOrder: 15,
    description: {
      vi: 'Mỗi đêm bảo vệ 1 người chơi thoát khỏi móng vuốt sói. Không thể bảo vệ cùng 1 người 2 đêm liên tiếp.',
      en: 'Each night protects one player from werewolves. Cannot protect the same person two nights in a row.',
      fr: 'Protège une personne chaque nuit contre les loups. Ne peut protéger le même joueur deux nuits de suite.',
      es: 'Protege a un jugador cada noche. No puede repetir el mismo objetivo dos noches consecutivas.',
      ja: '毎晩1人を人狼の襲撃から守ります。同じ人を2夜連続で守ることはできません。',
    },
    instructions: {
      vi: 'Chọn người muốn che chở đêm nay. Nếu người đó bị sói cắn, người đó sẽ không chết.',
      en: 'Pick one target to shield tonight. If attacked by wolves, they survive.',
      fr: 'Désignez qui protéger cette nuit.',
      es: 'Elige a quién proteger esta noche.',
      ja: '今夜守りたい人を1人選択します。',
    },
    guideForNewbie: {
      vi: 'Ưu tiên bảo vệ Tiên Tri đã lộ diện hoặc người chơi có tầm ảnh hưởng lớn trong việc dẫn dắt dân làng.',
      en: 'Prioritize protecting an exposed Seer or key village leaders.',
      fr: 'Protégez en priorité la voyante si elle s’est révélée.',
      es: 'Protege a la vidente confirmada o a quien lidere al pueblo.',
      ja: '占い師など重要な役職者を優先して守りましょう。',
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
      fr: 'Sorcière',
      es: 'Bruja',
      ja: '魔女',
    },
    faction: 'villager',
    wakeOrder: 30,
    description: {
      vi: 'Sở hữu 2 lọ thuốc kỳ bí: 1 bình Cứu sống người bị sói cắn, và 1 bình Độc giết chết 1 người bất kỳ.',
      en: 'Holds two potent potions: 1 Elixir of Life to save a wolf victim, and 1 Poison bottle to eliminate anyone.',
      fr: 'Possède deux potions uniques : une de guérison et une d’empoisonnement mortel.',
      es: 'Tiene dos pociones de un solo uso: una para revivir y otra para envenenar.',
      ja: '襲撃された人を助ける「蘇生薬」と、1人を倒す「毒薬」を各1回使えます。',
    },
    instructions: {
      vi: 'Quản trò thông báo nạn nhân bị sói cắn. Phù thủy quyết định có dùng bình cứu không, và có dùng bình độc với ai không.',
      en: 'Moderator reveals who wolves attacked. Decide whether to use Heal potion or Poison potion.',
      fr: 'Le maître du jeu montre la victime des loups. Choisissez d’utiliser ou non vos potions.',
      es: 'El narrador te enseña la víctima. Decide si usas tu cura o tu veneno.',
      ja: 'ゲームマスターから被害者を教えてもらい、薬を使うかどうかを決めます。',
    },
    guideForNewbie: {
      vi: 'Bình cứu thường nên dùng ngay đêm 1 hoặc 2 để giữ số lượng dân làng. Bình độc chỉ dùng khi rất chắc chắn kẻ đó là Sói.',
      en: 'Use your heal early to preserve village numbers. Keep poison until you are very sure of a wolf.',
      fr: 'Utilisez le soin tôt pour garder l’avantage numérique. Gardez le poison pour un loup avéré.',
      es: 'Usa la poción de curar pronto y reserva el veneno para cuando estés seguro.',
      ja: '蘇生薬は序盤に使い、毒薬は確実に人狼だと分かったときに使いましょう。',
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
      fr: 'Chasseur',
      es: 'Cazador',
      ja: 'ハンター',
    },
    faction: 'villager',
    wakeOrder: 18,
    description: {
      vi: 'Mỗi đêm thức dậy để ghim nòng súng vào 1 người (hoặc chọn Không ghim). Nếu Thợ Săn chết (Sói cắn, trúng độc, chết dây chuyền Tình Nhân hoặc bị treo cổ), phát súng lập tức bắn hạ người đang bị ghim theo cùng — xuyên qua cả Khiên Bảo Vệ và Bình Cứu Phù Thủy.',
      en: 'Wakes each night to aim at one player (or choose No Target). If the Hunter dies by bite, poison, Lover bond, or lynch, the shot fires automatically at their marked target — piercing both Bodyguard shields and Witch healing.',
      fr: 'Se réveille chaque nuit pour viser un joueur (ou choisir Ne pas viser). S’il meurt (morsure, poison, lien d’amour ou vote), son coup de fusil part sur sa cible marquée — perçant bouclier du Salvateur et soin de la Sorcière.',
      es: 'Despierta cada noche para apuntar a 1 jugador (o elegir No apuntar). Si muere por lobos, veneno, enamorados o votación, su disparo alcanza automáticamente a su objetivo marcado — atravesando escudo y cura.',
      ja: '毎晩目覚めて1人に照準を合わせる（または「狙わない」を選択）。人狼の襲撃・毒・恋人の道連れ・追放で死亡すると、騎士の護衛も魔女の蘇生薬も貫通して狙った相手を道連れにします。',
    },
    instructions: {
      vi: 'Mỗi đêm thức dậy chọn 1 người để ghim đạn hoặc bấm Không ghim để giữ an toàn.',
      en: 'Wake each night to mark 1 target or choose No Target.',
      fr: 'Réveillez-vous chaque nuit pour marquer 1 cible ou choisir Ne pas viser.',
      es: 'Despierta cada noche para marcar a 1 objetivo o elegir No apuntar.',
      ja: '毎晩1人を標的に選ぶか、「狙わない」を選択します。',
    },
    guideForNewbie: {
      vi: 'Hãy ghim kẻ bạn nghi là Ma Sói nhất mỗi đêm (hoặc chọn Không ghim nếu chưa chắc để tránh bắn nhầm phe Dân). Đạn xuyên mọi lớp bảo vệ!',
      en: 'Mark your top Werewolf suspect each night, or pick No Target if unsure so you do not shoot an ally — your bullet pierces all saves!',
      fr: 'Visez votre suspect principal chaque nuit, ou abstenez-vous pour éviter un tir ami — la balle traverse toute protection !',
      es: 'Marca a tu mayor sospechoso cada noche o elige No apuntar si dudas para no herir a un aliado: ¡tu bala atraviesa cualquier protección!',
      ja: '最も怪しい人狼候補を狙うか、迷う時は「狙わない」を選んで味方撃ちを防ぎましょう。弾はあらゆる防御を貫通します！',
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
      fr: 'Cupidon',
      es: 'Cupido',
      ja: 'キューピッド',
    },
    faction: 'villager',
    wakeOrder: 10,
    description: {
      vi: 'Vào đêm đầu tiên, bắn 2 mũi tên ghép đôi 2 người chơi thành tình nhân. Nếu một người chết, người kia sẽ chết theo vì đau buồn.',
      en: 'On night 1, couples two players in love. If one dies, the other dies immediately of broken heart.',
      fr: 'Lie deux joueurs d’amour la première nuit. Si l’un meurt, l’autre périt de chagrin.',
      es: 'Une a dos enamorados la primera noche. Si uno muere, el otro fallece de tristeza.',
      ja: '最初の夜に2人を恋人として結びます。片方が死ぬともう片方も後追い自殺します。',
    },
    instructions: {
      vi: 'Thức dậy đêm đầu tiên, chọn 2 người bất kỳ (có thể ghép chính mình). Quản trò chạm vai 2 tình nhân để họ biết mặt nhau.',
      en: 'Awake on night 1, pick two players (can include yourself). Moderator touches their shoulders to reveal each other.',
      fr: 'Désignez 2 amoureux la première nuit.',
      es: 'Elige a 2 enamorados la primera noche.',
      ja: '初日の夜に2人を指名して恋人にします。',
    },
    guideForNewbie: {
      vi: 'Nếu 2 tình nhân thuộc 2 phe khác nhau (Dân + Sói), họ trở thành Phe Thứ Ba và phải tiêu diệt toàn bộ người khác để thắng!',
      en: 'If lovers belong to opposite factions (Wolf + Villager), they become a 3rd faction that must eliminate everyone else!',
      fr: 'Si un loup et un villageois s’aiment, ils forment un 3e camp et doivent survivre seuls !',
      es: 'Si un lobo y un aldeano son amantes, ¡su único objetivo es ser los últimos en pie!',
      ja: '村人と人狼が恋人になった場合、第三勢力となり二人だけで生き残る必要があります。',
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
      fr: 'Chiot Loup',
      es: 'Cachorro de Lobo',
      ja: '子狼',
    },
    faction: 'werewolf',
    wakeOrder: 22,
    description: {
      vi: 'Thuộc đàn Sói. Nếu Sói Con bị giết, đàn Sói sẽ cuồng nộ và được cắn 2 nạn nhân vào đêm kế tiếp!',
      en: 'Member of the wolf pack. When the pup dies, the pack enters a frenzy and kills two victims next night!',
      fr: 'Membre de la meute. À sa mort, les loups dévorent deux victimes la nuit suivante.',
      es: 'Lobo cachorro. Si muere, la manada enfurecida puede matar a dos víctimas la siguiente noche.',
      ja: '人狼の仲間。子狼が死ぬと、翌夜に人狼側は2人を襲撃できるようになります。',
    },
    instructions: {
      vi: 'Thức dậy cùng đàn sói mỗi đêm. Khi chết, kích hoạt hiệu ứng cuồng nộ cho đàn vào đêm sau.',
      en: 'Wake with pack. Upon your death, moderator unlocks 2 kills for wolves on the next night.',
      fr: 'Chasse avec la meute. Donne double morsure à sa mort.',
      es: 'Caza con los lobos. Si mueres, la siguiente noche habrá doble muerte.',
      ja: '毎晩人狼と共に襲撃します。死亡した次の夜は2人襲撃になります。',
    },
    guideForNewbie: {
      vi: 'Có thể chủ động tạo kịch bản hy sinh ở giữa ván để đàn sói có đòn kết liễu 2 mạng đêm sau.',
      en: 'Can be a calculated sacrifice in mid-game to grant your pack two devastating kills.',
      fr: 'Sacrifiez-vous au bon moment pour permettre à vos alliés un double festin.',
      es: 'A veces conviene sacrificarse para dar a los lobos doble ataque.',
      ja: '中盤でわざと疑われて処刑され、仲間に2人襲撃を託す戦術もあります。',
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
      fr: 'Tanneur (Idiot)',
      es: 'Curtidor',
      ja: '狂人 / 吊人',
    },
    faction: 'neutral',
    wakeOrder: 0,
    description: {
      vi: 'Mục tiêu duy nhất là làm mọi cách để Dân Làng nghi ngờ và treo cổ mình vào ban ngày. Nếu bị treo cổ, thắng ngay lập tức!',
      en: 'Hates life. Sole objective is to get lynched by village vote during the day. Wins instantly if hanged!',
      fr: 'Son but unique est d’être pendu par le village le jour. S’il est exécuté, il gagne immédiatement !',
      es: 'Su único objetivo es ser linchado en el voto diurno. ¡Gana la partida en solitario si lo logra!',
      ja: '昼の処刑投票で自分が処刑されることが唯一の勝利条件です。吊られた瞬間に単独勝利！',
    },
    instructions: {
      vi: 'Không có năng lực đêm. Ban ngày hành động kỳ quặc, sơ hở để mọi người biểu quyết xử tử mình.',
      en: 'No night power. Act slightly suspicious during day to lure the village into executing you.',
      fr: 'Comportez-vous de façon suspecte sans être trop évident.',
      es: 'Actúa de forma sospechosa pero creíble para que te voten.',
      ja: '怪しい言動をして村人たちの疑いを集め、自分に投票させましょう。',
    },
    guideForNewbie: {
      vi: 'Đừng giả sói quá lộ liễu khiến ai cũng nhận ra bạn là Kẻ Chán Đời. Hãy giả vờ như một con Sói vụng về!',
      en: 'Do not be overly obvious or smart players will ignore you. Pretend to be a clumsy wolf!',
      fr: 'Ne soyez pas trop gros, imitez un loup maladroit pour qu’ils vous votent.',
      es: 'No seas demasiado obvio; aparenta ser un lobo descuidado.',
      ja: '露骨すぎると見抜かれます。「ヘマをした人狼」っぽく演じるのがコツです。',
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
      fr: 'Ancien',
      es: 'Anciano',
      ja: '長老',
    },
    faction: 'villager',
    wakeOrder: 0,
    description: {
      vi: 'Có sức sống kiên cường, sống sót sau lần cắn đầu tiên của Ma Sói (cần 2 lần cắn mới chết). Nhưng nếu bị dân làng treo cổ, mọi người mất hết sức mạnh!',
      en: 'Tough veteran. Survives the first werewolf bite (requires 2 attacks to die). If lynched by villagers, all villagers lose powers!',
      fr: 'Survit à la première morsure de loup. Si le village le pend, tous les pouvoirs s’éteignent.',
      es: 'Sobrevive al primer ataque de lobos. Si los aldeanos lo linchan, pierden sus poderes.',
      ja: '人狼の襲撃を1回だけ耐えられます。村人に処刑されると村人陣営の能力が失われます。',
    },
    instructions: {
      vi: 'Không thức ban đêm. Quản trò ghi nhớ già làng còn 2 mạng đối với sói cắn.',
      en: 'No active night call. Has 2 lives specifically against werewolf bites.',
      fr: 'Possède 2 vies contre les loups.',
      es: 'Tiene 2 vidas contra el ataque de los lobos.',
      ja: '人狼の襲撃に対して2つのライフを持ちます。',
    },
    guideForNewbie: {
      vi: 'Hãy chứng minh bạn là chỗ dựa vững chắc cho dân làng và cảnh báo họ không được vote nhầm bạn.',
      en: 'Be a firm pillar for the village; remind them executing you has severe consequences.',
      fr: 'Rappelez aux villageois les conséquences désastreuses de votre pendaison.',
      es: 'Adviérteles que lincharte perjudicará a todos los aldeanos.',
      ja: '自分が長老であることを上手に伝え、誤って処刑されないようにしましょう。',
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
      fr: 'Sosie',
      es: 'Sosias',
      ja: 'ドッペルゲンガー',
    },
    faction: 'neutral',
    wakeOrder: 5,
    description: {
      vi: 'Đêm đầu tiên chọn 1 người mẫu. Khi người đó chết, bạn sẽ lập tức kế thừa toàn bộ vai trò và phe phái của họ!',
      en: 'Picks a model on night 1. When that target dies, inherits their role and allegiance immediately.',
      fr: 'Choisit un modèle la nuit 1. À sa mort, prend son rôle et son camp.',
      es: 'Elige a un jugador en la noche 1 y hereda su rol y bando cuando muera.',
      ja: '初日の夜に対象を1人選びます。その人が死亡したとき、その役職と陣営を引き継ぎます。',
    },
    instructions: {
      vi: 'Đêm 1 chọn 1 người làm mục tiêu sao chép. Quản trò ghi nhớ vai trò của người đó.',
      en: 'Awaken on night 1, point to chosen player. Wait for their demise to become their role.',
      fr: 'Désignez votre modèle la nuit 1.',
      es: 'Elige a tu modelo en la noche 1.',
      ja: '最初の夜にコピーしたい対象を1人選びます。',
    },
    guideForNewbie: {
      vi: 'Chọn người chơi dày dạn kinh nghiệm hoặc có vẻ sở hữu vai trò quyền năng để kế thừa lợi thế lớn.',
      en: 'Pick an experienced player likely holding an impactful role like Seer or Wolf.',
      fr: 'Choisissez un joueur qui a probablement un rôle clé.',
      es: 'Elige a alguien que aparente tener un rol fuerte.',
      ja: '占い師や重要役職を持ちそうな実力派プレイヤーを選ぶと有利です。',
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
      fr: 'Maudit',
      es: 'Maldito',
      ja: '呪われし者',
    },
    faction: 'villager',
    wakeOrder: 0,
    description: {
      vi: 'Bắt đầu như một dân làng bình thường. Nhưng khi bị Ma Sói cắn, không chết mà sẽ bị đồng hóa biến thành Ma Sói!',
      en: 'Starts as a regular villager. But if attacked by werewolves, does not die—instead transforms into a Werewolf!',
      fr: 'Commence villageois. Si mordu par les loups, survit et rejoint leur meute.',
      es: 'Empieza como aldeano, pero si los lobos lo atacan se convierte en hombre lobo.',
      ja: '初めは村人ですが、人狼に襲撃されると死亡せず人狼に変異します。',
    },
    instructions: {
      vi: 'Khi bị Sói cắn, quản trò gõ vai thông báo bạn đã hóa Sói và thức dậy cùng bầy từ đêm tiếp theo.',
      en: 'If bitten, moderator secretly informs you of your transformation into a wolf.',
      fr: 'Si attaqué, le maître du jeu vous transforme discrètement en loup.',
      es: 'Al ser atacado, el narrador te avisa de tu conversión a hombre lobo.',
      ja: '人狼に噛まれると人狼化し、次の夜から人狼として目覚めます。',
    },
    guideForNewbie: {
      vi: 'Hãy linh hoạt thích ứng! Trước khi biến hình hãy tìm cách thắng cùng dân; khi đã thành sói hãy quay sang trợ giúp đàn sói.',
      en: 'Be ready to switch mindset: help the village initially, then hunt with the pack if bitten.',
      fr: 'Adaptez-vous : aidez le village au début, puis aidez la meute dès votre transformation.',
      es: 'Juega como aldeano hasta que seas mordido, luego apoya a los lobos.',
      ja: '噛まれるまでは村人として行動し、変異したら即座に人狼陣営の勝利を目指します。',
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
      fr: 'Traître (Sbire)',
      es: 'Traidor (Esbirro)',
      ja: '狂信者 / 内通者',
    },
    faction: 'werewolf',
    wakeOrder: 0,
    description: {
      vi: 'Thuộc phe Ma Sói nhưng Tiên Tri soi ra là Dân Làng. Ban đêm không thức cùng bầy sói nhưng ban ngày tìm mọi cách bảo vệ sói.',
      en: 'Allied with Werewolves, but appears as a Villager to the Seer. Does not wake at night with wolves.',
      fr: 'Allié aux loups mais vu comme innocent par la voyante. Protège les loups le jour.',
      es: 'Aliado de los lobos pero parece inocente ante la vidente. Los apoya en el debate diurno.',
      ja: '人狼陣営ですが占い師には村人と判定されます。夜は起きず、昼に人狼を支援します。',
    },
    instructions: {
      vi: 'Không thức dậy cùng sói. Quan sát ai là sói trong ban ngày và tạo luận điểm đánh lạc hướng dân làng.',
      en: 'Does not wake at night. Discern who your wolf allies are and mislead village lynch votes.',
      fr: 'Identifiez vos loups et semez la confusion parmi les villageois.',
      es: 'Detecta a los lobos y desvía la atención de los aldeanos.',
      ja: '夜は目覚めず、昼の議論で人狼を援護し村を混乱に陥れます。',
    },
    guideForNewbie: {
      vi: 'Sẵn sàng hy sinh chịu chết thay cho Sói chúa nếu điều đó giữ an toàn cho đàn sói.',
      en: 'Be willing to take the fall if it protects real wolves and secures majority victory.',
      fr: 'Sacrifiez-vous pour sauver vos maîtres loups si nécessaire.',
      es: 'Ofrécete como sospechoso si eso salva a un verdadero lobo.',
      ja: '本物の人狼を守るためなら、自分から怪しまれて処刑されるのも有効な手です。',
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
    fr: '🛡️ Classique',
    es: '🛡️ Clásico',
    ja: '🛡️ 基本',
  },
  werewolf: {
    vi: '🐺 Hung bạo',
    en: '🐺 Predator',
    fr: '🐺 Prédateur',
    es: '🐺 Depredador',
    ja: '🐺 凶暴',
  },
  seer: {
    vi: '🔮 Thần thánh',
    en: '🔮 Mystic',
    fr: '🔮 Mystique',
    es: '🔮 Místico',
    ja: '🔮 神秘',
  },
  bodyguard: {
    vi: '🛡️ Hộ vệ',
    en: '🛡️ Guardian',
    fr: '🛡️ Gardien',
    es: '🛡️ Guardián',
    ja: '🛡️ 守護',
  },
  witch: {
    vi: '🧪 Dược sư',
    en: '🧪 Alchemist',
    fr: '🧪 Alchimiste',
    es: '🧪 Alquimista',
    ja: '🧪 錬金術',
  },
  hunter: {
    vi: '🎯 Thiện xạ',
    en: '🎯 Marksman',
    fr: '🎯 Tireur',
    es: '🎯 Tirador',
    ja: '🎯 狙撃手',
  },
  cupid: {
    vi: '💘 Se duyên',
    en: '💘 Matchmaker',
    fr: '💘 Entremetteur',
    es: '💘 Enlazador',
    ja: '💘 縁結び',
  },
  wolf_pup: {
    vi: '🔥 Cuồng nộ',
    en: '🔥 Frenzy',
    fr: '🔥 Frénésie',
    es: '🔥 Frenesí',
    ja: '🔥 狂乱',
  },
  tanner: {
    vi: '🎭 Đơn độc',
    en: '🎭 Solo Trickster',
    fr: '🎭 Solitaire',
    es: '🎭 Solitario',
    ja: '🎭 単独',
  },
  elder: {
    vi: '👑 Kiên cường',
    en: '👑 Resilient',
    fr: '👑 Résistant',
    es: '👑 Resistente',
    ja: '👑 不屈',
  },
  doppelganger: {
    vi: '🪞 Sao chép',
    en: '🪞 Shapeshifter',
    fr: '🪞 Métamorphe',
    es: '🪞 Cambiaformas',
    ja: '🪞 変身',
  },
  cursed: {
    vi: '🌓 Biến hình',
    en: '🌓 Turned',
    fr: '🌓 Maudit',
    es: '🌓 Transformable',
    ja: '🌓 変異',
  },
  traitor: {
    vi: '🗡️ Gián điệp',
    en: '🗡️ Spy',
    fr: '🗡️ Espion',
    es: '🗡️ Espía',
    ja: '🗡️ 内通者',
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
