import { Language, PropType } from '../types/game';

export interface VillageScaleI18n {
  label: string;
  badge: string;
  difficulty: string;
  summary: string;
  mechanics: string;
}

export interface TourStepI18n {
  badge: string;
  title: string;
  description: string;
  tips: [string, string];
}

export interface UITranslationSchema {
  // General & Header
  appTitle: string;
  appSubtitle: string;
  changeProfile: string;
  newbieGuide: string;
  selectRoleLabel: string;
  randomBalancedRole: string;
  villageScaleLabel: string;
  peopleUnit: string;
  hoverForDifficulty: string;
  playOnlineBtn: string;
  playGMBtn: string;
  playAIPracticeBtn: string;
  bottomControlHint: string;

  // Village Scales (6, 8, 10, 12)
  scales: Record<number, VillageScaleI18n>;

  // Playing HUD Top Bar
  nightPhaseTitle: (round: number) => string;
  dayDiscussTitle: (round: number) => string;
  dayVoteTitle: (round: number) => string;
  hunterPhaseTitle: string;
  roomBadge: (roomId: string) => string;
  aiPracticeBadge: string;
  skipNightBtn: string;
  goToVoteBtn: string;
  confirmVoteBtn: string;
  wolvesAlive: string;
  villagersAlive: string;
  yourRolePrefix: string;
  freeLook360: string;
  switchCamera: string;
  openGuide: string;
  toggleMic: string;
  toggleSound: string;
  pauseGame: string;

  // Blindfold Anti-Cheat
  antiCheatNightBadge: string;
  sleepingTitle: (roleName: string) => string;
  sleepingDesc: string;
  skipNightLongBtn: string;

  // Night Sequence & Callouts
  nightOrderLabel: string;
  confirmAndSkipNight: string;
  closeEyesSleep: string;
  wolfMindgameHint: string;
  witchOutHeal: string;
  witchHealActive: string;
  witchHealBtn: (victimName: string) => string;
  witchOutPoison: string;
  witchPoisonHint: string;

  // Fun Day Props
  funPropsLabel: string;
  propButtons: Record<PropType, string>;
  propBadges: Record<PropType, string>;
  dropPropBtn: string;
  holdingPropBanner: (propLabel: string) => string;

  // Ghost Soul & Mobile D-Pad
  ghostBannerText: string;
  dpadWalkNight: string;
  dpadFlyGhost: string;
  ghostFloatingBadge: string;
  youSuffix: string;
  votesUnit: string;
  aliveStatus: string;
  ghostStatus: string;

  // Bottom Dock & Drawers
  expandDock: string;
  collapseDock: string;
  chatBtn: string;
  gmBtn: string;
  cardsBtn: string;
  leaderboardShort: string;
  historyShort: string;
  rulesShort: string;
  closeEsc: string;
  backToTitleEsc: string;

  // Drawer Titles & Chat
  drawerChatTitle: string;
  drawerGMTitle: string;
  drawerCardsTitle: string;
  drawerLeaderboardTitle: string;
  drawerHistoryTitle: string;
  drawerRulesTitle: string;
  chatMainTab: string;
  chatGhostTab: string;
  chatPlaceholder: string;
  sendBtn: string;

  // Pause & Game Over Modals
  pauseTitle: string;
  roundStat: string;
  aliveStat: string;
  eloStat: string;
  resumeBtn: string;
  restartMatchBtn: string;
  backToTitleBtn: string;
  finalResultBadge: string;
  winWerewolves: string;
  winLovers: string;
  winTanner: string;
  winVillagers: string;
  totalRoundsStat: string;
  survivorsStat: string;
  eloDeltaStat: string;
  playAgainBtn: string;

  // Room Lobby Modal
  lobbyBadge: string;
  lobbyOnlineTitle: string;
  lobbyGMTitle: string;
  tabOnline3D: string;
  tabGMOffline: string;
  subTabCreate: string;
  subTabJoin: string;
  yourRoomCodeLabel: string;
  copyCode: string;
  copiedCode: string;
  maxSeatsLabel: (size: number) => string;
  roomListHeader: (cur: number, max: number) => string;
  humanCountBadge: (cnt: number) => string;
  botCountBadge: (cnt: number) => string;
  addOneBotBtn: string;
  fillBotsBtn: string;
  clearAllBotsBtn: string;
  invitePlaceholder: string;
  addHumanBtn: string;
  emptySeat: string;
  hostRoleLabel: string;
  botRoleLabel: string;
  humanRoleLabel: string;
  preferredRoleLobby: string;
  startOnlineMatchBtn: (cnt: number, code: string) => string;
  minPlayersWarning: (cnt: number) => string;
  gmGuideTitle: string;
  gmGuideStep1: (code: string) => string;
  gmGuideStep2: (code: string) => string;
  openGMPanelBtn: (code: string) => string;
  enterRoomCodeLabel: string;
  joinOnlineBtn: string;
  joinGMCardBtn: string;

  // Spotlight Onboarding Tour
  spotlightActiveLabel: string;
  prevBtn: string;
  understandAllBtn: string;
  nextStepBtn: (cur: number, total: number) => string;
  finishTourBtn: string;
  tourSteps: TourStepI18n[];
}

export const UI_TEXT: Record<Language, UITranslationSchema> = {
  vi: {
    appTitle: 'MA SÓI 3D',
    appSubtitle: 'THẾ GIỚI MỞ & QUẢN TRÒ',
    changeProfile: 'Hồ Sơ',
    newbieGuide: 'Hướng Dẫn',
    selectRoleLabel: 'Vai Trò Trải Nghiệm',
    randomBalancedRole: '🎲 Ngẫu Nhiên Cân Bằng',
    villageScaleLabel: 'Quy Mô Làng',
    peopleUnit: 'Người',
    hoverForDifficulty: 'Chạm/Rê xem độ khó',
    playOnlineBtn: 'CHƠI ONLINE (TẠO / VÀO PHÒNG)',
    playGMBtn: 'QUẢN TRÒ (TẠO / VÀO PHÒNG)',
    playAIPracticeBtn: 'Đấu Luyện Tập Với AI (Thế Giới Mở 3D)',
    bottomControlHint:
      'Xoay 360° · WASD / D-Pad Đi Bộ Đêm & Bay Hồn Ma · Click Ném Đạo Cụ 3D',
    scales: {
      6: {
        label: '6 Người',
        badge: 'Khởi Động',
        difficulty: 'Độ khó: Thấp',
        summary: '1 Ma Sói vs 5 Dân Làng (Tiên Tri, Bảo Vệ, Phù Thủy, Thợ Săn).',
        mechanics:
          'Ván đấu chớp nhoáng (3-5 phút), dễ suy luận loại trừ trực diện.',
      },
      8: {
        label: '8 Người',
        badge: 'Chuẩn Cân Bằng',
        difficulty: 'Độ khó: Tiêu Chuẩn',
        summary: '2 Ma Sói vs 6 Dân Làng (Tiên Tri, Bảo Vệ, Phù Thủy, Cupid).',
        mechanics:
          'Tỷ lệ 50/50 kinh điển. Sói có đồng đội phối hợp; dân làng liên kết thông tin.',
      },
      10: {
        label: '10 Người',
        badge: 'Thách Thức Cao',
        difficulty: 'Độ khó: Nâng Cao',
        summary: '1 Sói + 1 Sói Con vs 8 Dân & Phe Thứ Ba (Kẻ Chán Đời, Già Làng).',
        mechanics:
          'Cục diện đa chiều với Cặp Đôi Tình Nhân và phát đạn trả thù của Thợ Săn.',
      },
      12: {
        label: '12 Người',
        badge: 'Đại Hỗn Chiến',
        difficulty: 'Độ khó: Cực Hạn',
        summary: '3 Sói (Sói Con cuồng nộ), Kẻ Phản Bội, Bán Sói & Nhân Bản.',
        mechanics:
          'Độ khó cao nhất: Đàn Sói cắn 2 người/đêm khi Sói Con chết, nhiều bẫy tâm lý.',
      },
    },
    nightPhaseTitle: (r) => `ĐÊM THỨ ${r}`,
    dayDiscussTitle: (r) => `THẢO LUẬN NGÀY ${r}`,
    dayVoteTitle: (r) => `BỎ PHIẾU NGÀY ${r}`,
    hunterPhaseTitle: 'PHÁT SÚNG THỢ SĂN',
    roomBadge: (id) => `Phòng ${id}`,
    aiPracticeBadge: 'Đấu AI',
    skipNightBtn: 'Qua Đêm',
    goToVoteBtn: 'Bỏ Phiếu',
    confirmVoteBtn: 'Chốt Phiếu',
    wolvesAlive: 'SÓI SỐNG',
    villagersAlive: 'DÂN SỐNG',
    yourRolePrefix: 'Vai:',
    freeLook360: '360°',
    switchCamera: 'Đổi góc máy 3D',
    openGuide: 'Mở Hướng Dẫn',
    toggleMic: 'Bật/Tắt Mic',
    toggleSound: 'Bật/Tắt Âm Thanh [M]',
    pauseGame: 'Tạm Dừng & Menu [P]',
    antiCheatNightBadge: 'CHẾ ĐỘ CHỐNG GIAN LẬN BAN ĐÊM',
    sleepingTitle: (role) => `Bạn Đang Nhắm Mắt Ngủ (${role})`,
    sleepingDesc:
      'Màn đêm che khuất tầm nhìn để bảo mật tuyệt đối danh tính các vai đang thức dậy di chuyển quanh làng.',
    skipNightLongBtn: 'Qua Đêm Nhanh Sang Trời Sáng',
    nightOrderLabel: 'Thứ tự đêm:',
    confirmAndSkipNight: 'Xác Nhận & Qua Đêm',
    closeEyesSleep: 'Nhắm Mắt Ngủ',
    wolfMindgameHint: '🐺 Dùng WASD đi bộ hoặc Click cắn Dân / tự cắn Sói để hack não!',
    witchOutHeal: 'Hết Bình Cứu',
    witchHealActive: 'Đã bật Cứu nạn nhân',
    witchHealBtn: (name) => `Cứu người bị cắn (${name})`,
    witchOutPoison: 'Đã dùng Bình Độc',
    witchPoisonHint: 'Click nhân vật 3D để quăng Bình Độc',
    funPropsLabel: 'Đạo Cụ 3D:',
    propButtons: {
      tomato: '🍅 Cà Chua',
      egg: '🥚 Trứng Thối',
      rose: '💐 Tặng Hoa',
      water: '🪣 Tạt Nước',
    },
    propBadges: {
      tomato: 'Bẹp Dí Cà Chua!',
      egg: 'Dính Trứng Thối!',
      rose: 'Nhận Hoa Hồng!',
      water: 'Ướt Sũng Nước!',
    },
    dropPropBtn: 'Bỏ Cầm',
    holdingPropBanner: (label) => `Đang cầm ${label}! Chạm vào nhân vật 3D bất kỳ để ném!`,
    ghostBannerText: 'Hồn Ma 3D: Dùng WASD / D-Pad hoặc Chạm mặt đất để bay lượn quanh làng!',
    dpadWalkNight: 'Đi Bộ Đêm',
    dpadFlyGhost: 'Bay Hồn Ma',
    ghostFloatingBadge: '👻 Hồn Ma',
    youSuffix: '(Bạn)',
    votesUnit: 'PHIẾU',
    aliveStatus: 'Còn sống',
    ghostStatus: 'Hồn ma',
    expandDock: 'Mở Bảng Điều Khiển [H]',
    collapseDock: 'Thu Gọn HUD [H]',
    chatBtn: 'Chat',
    gmBtn: 'Quản Trò',
    cardsBtn: 'Thẻ Bài ĐT',
    leaderboardShort: 'BXH',
    historyShort: 'Lịch Sử',
    rulesShort: 'Luật',
    closeEsc: 'Đóng [Esc]',
    backToTitleEsc: 'Về Sảnh Chính [Esc]',
    drawerChatTitle: 'Kênh Trò Chuyện Làng & Khu Vực Ma (Anti-Cheat)',
    drawerGMTitle: 'Trợ Lý Quản Trò Bàn Chơi Thực Tế',
    drawerCardsTitle: 'Phát Thẻ Bài Bí Mật Qua Điện Thoại',
    drawerLeaderboardTitle: 'Bảng Xếp Hạng Cao Thủ Ma Sói',
    drawerHistoryTitle: 'Lịch Sử Các Trận Đấu',
    drawerRulesTitle: 'Cẩm Nang 13 Vai Trò Ma Sói',
    chatMainTab: 'Phòng Chính (Dân Sống)',
    chatGhostTab: 'Khu Vực Ma (Người Chết)',
    chatPlaceholder: 'Nhập tin nhắn suy luận...',
    sendBtn: 'Gửi',
    pauseTitle: 'TẠM DỪNG & CÀI ĐẶT',
    roundStat: 'VÒNG ĐÊM',
    aliveStat: 'CÒN SỐNG',
    eloStat: 'ELO HIỆN TẠI',
    resumeBtn: 'Tiếp Tục Chơi [Esc / P]',
    restartMatchBtn: 'Chia Lại Bài & Chơi Ván Mới',
    backToTitleBtn: 'Về Màn Hình Chính',
    finalResultBadge: 'KẾT QUẢ CHUNG CUỘC',
    winWerewolves: 'PHE MA SÓI CHIẾN THẮNG!',
    winLovers: 'CẶP ĐÔI TÌNH NHÂN CHIẾN THẮNG!',
    winTanner: 'KẺ CHÁN ĐỜI THẮNG ĐỘC LẬP!',
    winVillagers: 'PHE DÂN LÀNG CHIẾN THẮNG!',
    totalRoundsStat: 'SỐ VÒNG ĐẤU',
    survivorsStat: 'NGƯỜI SỐNG SÓT',
    eloDeltaStat: 'ĐIỂM ELO',
    playAgainBtn: 'Chơi Ván Mới Ngay',
    lobbyBadge: 'HỆ THỐNG PHÒNG CHỜ ĐA NGƯỜI CHƠI',
    lobbyOnlineTitle: 'Sảnh Phòng Chơi Online 3D',
    lobbyGMTitle: 'Sảnh Phòng Trợ Lý Quản Trò (Offline)',
    tabOnline3D: '1. Chơi Online 3D',
    tabGMOffline: '2. Quản Trò Ngoài Đời',
    subTabCreate: 'Tạo Phòng Mới (Chủ Phòng)',
    subTabJoin: 'Nhập Mã Phòng Để Vào',
    yourRoomCodeLabel: 'Mã Phòng Của Bạn (Chia sẻ cho bạn bè)',
    copyCode: 'Sao chép mã',
    copiedCode: 'Đã chép',
    maxSeatsLabel: (s) => `Số Ghế Tối Đa (${s} Người)`,
    roomListHeader: (c, m) => `Danh sách phòng (${c}/${m} ghế)`,
    humanCountBadge: (c) => `👤 ${c} Người`,
    botCountBadge: (c) => `🤖 ${c} Bot`,
    addOneBotBtn: '+1 Bot AI',
    fillBotsBtn: 'Lấp Đầy Bằng Bot',
    clearAllBotsBtn: 'Xoá Tất Cả Bot',
    invitePlaceholder: 'Nhập tên bạn bè để thêm vào phòng...',
    addHumanBtn: 'Thêm Người',
    emptySeat: 'Ghế trống...',
    hostRoleLabel: '👑 Chủ phòng',
    botRoleLabel: '🤖 Bot AI',
    humanRoleLabel: '👤 Người chơi',
    preferredRoleLobby: 'Vai trò ưu tiên của bạn:',
    startOnlineMatchBtn: (c, code) => `BẮT ĐẦU VÁN ONLINE 3D (${c} NGƯỜI · PHÒNG ${code})`,
    minPlayersWarning: (c) =>
      `⚠️ Cần tối thiểu 4 người trong phòng để bắt đầu (hiện có ${c} người). Hãy thêm bạn bè hoặc bấm "+1 Bot AI"!`,
    gmGuideTitle: '🎭 Hướng dẫn cho Quản Trò ngoài đời thực:',
    gmGuideStep1: (code) =>
      `1. Bấm nút bên dưới để mở Bảng Điều Phối Quản Trò chuyên biệt với mã phòng ${code}.`,
    gmGuideStep2: (code) =>
      `2. Nếu nhóm bạn không có bộ bài giấy, hãy đọc mã phòng ${code} để mọi người nhập vào mục "Nhập Mã Phòng Để Vào" trên điện thoại.`,
    openGMPanelBtn: (code) => `MỞ BẢNG ĐIỀU PHỐI QUẢN TRÒ (${code})`,
    enterRoomCodeLabel: 'Nhập Mã Phòng Bạn Bè Hoặc Quản Trò Cung Cấp:',
    joinOnlineBtn: 'THAM GIA PHÒNG ONLINE 3D NGAY',
    joinGMCardBtn: 'NHẬN THẺ BÀI TỪ PHÒNG QUẢN TRÒ',
    spotlightActiveLabel: '✨ Khu Vực Tiêu Điểm (Đang Sáng)',
    prevBtn: 'Quay Lại',
    understandAllBtn: 'Đã Hiểu Tất Cả',
    nextStepBtn: (c, t) => `Tiếp Theo (${c}/${t})`,
    finishTourBtn: 'Hoàn Tất & Bắt Đầu!',
    tourSteps: [
      {
        badge: 'BƯỚC 1 / 5 · CHỐNG GIAN LẬN TUYỆT ĐỐI',
        title: 'Màn Đêm Tối Mù & Gọi Vai Theo Thứ Tự',
        description:
          'Khi màn đêm buông xuống, tầm nhìn của mọi người chơi sẽ tự động tối đi. Chỉ khi đến lượt thức dậy của vai trò bạn nắm giữ, mắt bạn mới mở sáng để hành động — ngăn chặn 100% việc nhìn lén!',
        tips: [
          'Mỗi vai thức dậy đều có hiệu ứng âm thanh & câu thoại đặc trưng riêng.',
          'Thanh tiến trình ban đêm hiển thị rõ thứ tự gọi vai để bạn nắm bắt nhịp độ.',
        ],
      },
      {
        badge: 'BƯỚC 2 / 5 · THẾ GIỚI MỞ & HACK NÃO',
        title: 'Di Chuyển Thế Giới Mở & Sói Tự Cắn Đồng Bọn',
        description:
          'Khi đến lượt thức dậy ban đêm, bạn có thể dùng phím WASD / D-Pad để tự do đi bộ tới vị trí một người chơi, HOẶC chạm trực tiếp vào người đó để phi thân nhanh tới!',
        tips: [
          '🐺 Chiến thuật "Hack Não": Đàn Sói có thể chọn cắn chính mình hoặc Sói Con để lừa Phù Thủy hoặc kích hoạt Cuồng Nộ 2 mạng!',
          'Kéo màn hình hoặc bật nút 360° để xoay góc nhìn toàn cảnh ngôi làng.',
        ],
      },
      {
        badge: 'BƯỚC 3 / 5 · ĐẠO CỤ VẬT LÝ 3D BAN NGÀY',
        title: 'Ném Cà Chua 🍅, Trứng Thối 🥚, Tặng Hoa & Tạt Nước',
        description:
          'Khi trời sáng bước vào Thảo Luận, bạn có thể chọn Cà Chua, Trứng Thối, Hoa Hồng hoặc Xô Nước để ném thẳng vào nhân vật 3D với hiệu ứng văng mảnh 3D chân thực!',
        tips: [
          'Chọn loại đạo cụ rồi chạm vào nhân vật 3D hoặc thẻ ghế bên dưới để ném.',
          'Khi sang giai đoạn Bỏ Phiếu, chạm trực tiếp vào nghi phạm để dồn phiếu treo cổ.',
        ],
      },
      {
        badge: 'BƯỚC 4 / 5 · XUẤT HỒN BÓNG MA 3D',
        title: 'Hóa Thành Bóng Ma Bay Vòng Vèo Khi Tử Trận',
        description:
          'Nếu chẳng may bị Sói cắn hoặc treo cổ, bạn sẽ lập tức "Xuất Hồn" thành một Bóng Ma 3D phát sáng bay lượn tự do khắp ngôi làng.',
        tips: [
          'Dùng WASD / D-Pad hoặc chạm mặt đất để lái hồn ma bay vòng vèo quanh người sống.',
          'Trò chuyện riêng với các hồn ma khác trong kênh "Khu Vực Ma".',
        ],
      },
      {
        badge: 'BƯỚC 5 / 5 · BẢNG ĐIỀU KHIỂN ĐA NĂNG',
        title: 'Kỹ Năng Vai Trò, Chọn Nhanh Ghế & Kênh Chat',
        description:
          'Thanh điều khiển phía dưới giúp bạn chọn nhanh bất kỳ người chơi nào trên điện thoại, dùng bình thuốc Phù Thủy, xem kết quả soi Tiên Tri và mở Kênh Chat.',
        tips: [
          'Bấm phím [H] hoặc nút thu gọn để ẩn thanh điều khiển khi muốn ngắm trọn vẹn cảnh 3D.',
          'Bạn đã sẵn sàng — hãy bắt đầu ván đấu ngay!',
        ],
      },
    ],
  },
  en: {
    appTitle: 'WEREWOLF 3D',
    appSubtitle: 'OPEN WORLD & GM STUDIO',
    changeProfile: 'Profile',
    newbieGuide: 'Tutorial',
    selectRoleLabel: 'Preferred Role',
    randomBalancedRole: '🎲 Balanced Random',
    villageScaleLabel: 'Village Size',
    peopleUnit: 'Players',
    hoverForDifficulty: 'Hover/Tap for difficulty',
    playOnlineBtn: 'PLAY ONLINE (CREATE / JOIN ROOM)',
    playGMBtn: 'GAME MASTER (CREATE / JOIN)',
    playAIPracticeBtn: 'AI Practice Match (Open-World 3D Village)',
    bottomControlHint:
      'Drag 360° Orbit · WASD / D-Pad Night Walk & Ghost Flight · Tap to Throw 3D Props',
    scales: {
      6: {
        label: '6 Players',
        badge: 'Quick Start',
        difficulty: 'Difficulty: Low',
        summary: '1 Werewolf vs 5 Villagers (Seer, Bodyguard, Witch, Hunter).',
        mechanics: 'Fast 3-5 min pacing; direct deduction and low margin for wolf hiding.',
      },
      8: {
        label: '8 Players',
        badge: 'Balanced Standard',
        difficulty: 'Difficulty: Medium',
        summary: '2 Werewolves vs 6 Villagers (Seer, Bodyguard, Witch, Cupid).',
        mechanics: 'Classic 50/50 balance. Wolves coordinate bluffs while villagers cross-check info.',
      },
      10: {
        label: '10 Players',
        badge: 'High Stakes',
        difficulty: 'Difficulty: High',
        summary: '1 Wolf + 1 Wolf Pup vs 8 Villagers & Neutral (Tanner, Elder).',
        mechanics: 'Multi-faction mindgames with Cupid Lovers and Hunter revenge shot.',
      },
      12: {
        label: '12 Players',
        badge: 'Grand Chaos',
        difficulty: 'Difficulty: Extreme',
        summary: '3 Wolves (Wolf Pup Frenzy), Traitor, Cursed & Doppelgänger.',
        mechanics: 'Maximum depth: Wolves kill 2 victims after Pup dies, plus role-shifting traps.',
      },
    },
    nightPhaseTitle: (r) => `NIGHT ${r}`,
    dayDiscussTitle: (r) => `DAY ${r} DEBATE`,
    dayVoteTitle: (r) => `DAY ${r} VOTING`,
    hunterPhaseTitle: 'HUNTER REVENGE',
    roomBadge: (id) => `Room ${id}`,
    aiPracticeBadge: 'AI Match',
    skipNightBtn: 'Skip Night',
    goToVoteBtn: 'Start Vote',
    confirmVoteBtn: 'Lock Vote',
    wolvesAlive: 'WOLVES',
    villagersAlive: 'VILLAGERS',
    yourRolePrefix: 'Role:',
    freeLook360: '360°',
    switchCamera: 'Switch 3D Camera',
    openGuide: 'Open Tutorial',
    toggleMic: 'Toggle Mic',
    toggleSound: 'Toggle Sound [M]',
    pauseGame: 'Pause & Menu [P]',
    antiCheatNightBadge: 'NIGHT ANTI-CHEAT BLINDFOLD',
    sleepingTitle: (role) => `Your Eyes Are Closed (${role})`,
    sleepingDesc:
      'Your vision is dimmed to strictly protect the secret identities of night roles roaming the village.',
    skipNightLongBtn: 'Fast-Forward to Daybreak',
    nightOrderLabel: 'Night Order:',
    confirmAndSkipNight: 'Confirm & Dawn',
    closeEyesSleep: 'Close Eyes',
    wolfMindgameHint: '🐺 Walk (WASD) or Tap to bite a Villager or self-bite a Wolf as a bluff!',
    witchOutHeal: 'Heal Used',
    witchHealActive: 'Heal Armed Tonight',
    witchHealBtn: (name) => `Heal Victim (${name})`,
    witchOutPoison: 'Poison Used',
    witchPoisonHint: 'Tap a 3D character to throw Poison',
    funPropsLabel: '3D Props:',
    propButtons: {
      tomato: '🍅 Tomato',
      egg: '🥚 Rotten Egg',
      rose: '💐 Rose',
      water: '🪣 Water',
    },
    propBadges: {
      tomato: 'Tomato Splat!',
      egg: 'Rotten Egged!',
      rose: 'Rose Bouquet!',
      water: 'Soaked!',
    },
    dropPropBtn: 'Drop',
    holdingPropBanner: (label) => `Holding ${label}! Tap any 3D character to throw!`,
    ghostBannerText: '3D Ghost Soul: Use WASD / D-Pad or Tap the ground to fly around the village!',
    dpadWalkNight: 'Night Walk',
    dpadFlyGhost: 'Ghost Fly',
    ghostFloatingBadge: '👻 Ghost Soul',
    youSuffix: '(You)',
    votesUnit: 'VOTES',
    aliveStatus: 'Alive',
    ghostStatus: 'Ghost',
    expandDock: 'Expand Control Dock [H]',
    collapseDock: 'Hide HUD [H]',
    chatBtn: 'Chat',
    gmBtn: 'GM Tool',
    cardsBtn: 'Phone Cards',
    leaderboardShort: 'Ranks',
    historyShort: 'History',
    rulesShort: 'Roles',
    closeEsc: 'Close [Esc]',
    backToTitleEsc: 'Main Menu [Esc]',
    drawerChatTitle: 'Village Chat & Ghost Channel (Anti-Cheat)',
    drawerGMTitle: 'Tabletop Game Master Assistant',
    drawerCardsTitle: 'Mobile Secret Role Card Distributor',
    drawerLeaderboardTitle: 'Werewolf Grandmaster Leaderboard',
    drawerHistoryTitle: 'Match History Archive',
    drawerRulesTitle: 'Encyclopedia of All 13 Roles',
    chatMainTab: 'Living Village Chat',
    chatGhostTab: 'Ghost Realm (Dead Only)',
    chatPlaceholder: 'Type your deduction...',
    sendBtn: 'Send',
    pauseTitle: 'PAUSED & SETTINGS',
    roundStat: 'NIGHT ROUND',
    aliveStat: 'ALIVE',
    eloStat: 'CURRENT ELO',
    resumeBtn: 'Resume Game [Esc / P]',
    restartMatchBtn: 'Redeal & Restart Match',
    backToTitleBtn: 'Return to Title Screen',
    finalResultBadge: 'FINAL OUTCOME',
    winWerewolves: 'WEREWOLVES VICTORY!',
    winLovers: 'STAR-CROSSED LOVERS WIN!',
    winTanner: 'SOLO TANNER VICTORY!',
    winVillagers: 'VILLAGERS VICTORY!',
    totalRoundsStat: 'ROUNDS PLAYED',
    survivorsStat: 'SURVIVORS',
    eloDeltaStat: 'ELO RATING',
    playAgainBtn: 'Play Again Now',
    lobbyBadge: 'MULTIPLAYER ROOM LOBBY',
    lobbyOnlineTitle: 'Online 3D Village Lobby',
    lobbyGMTitle: 'Tabletop Game Master Lobby',
    tabOnline3D: '1. Online 3D Play',
    tabGMOffline: '2. Real-Life GM Tool',
    subTabCreate: 'Create New Room (Host)',
    subTabJoin: 'Join with Room Code',
    yourRoomCodeLabel: 'Your Room Code (Share with friends)',
    copyCode: 'Copy Code',
    copiedCode: 'Copied',
    maxSeatsLabel: (s) => `Max Seats (${s} Players)`,
    roomListHeader: (c, m) => `Room Roster (${c}/${m} seats)`,
    humanCountBadge: (c) => `👤 ${c} Human`,
    botCountBadge: (c) => `🤖 ${c} Bot`,
    addOneBotBtn: '+1 AI Bot',
    fillBotsBtn: 'Fill with Bots',
    clearAllBotsBtn: 'Remove All Bots',
    invitePlaceholder: 'Enter friend name to add to room...',
    addHumanBtn: 'Add Player',
    emptySeat: 'Empty seat...',
    hostRoleLabel: '👑 Host',
    botRoleLabel: '🤖 AI Bot',
    humanRoleLabel: '👤 Player',
    preferredRoleLobby: 'Your Preferred Role:',
    startOnlineMatchBtn: (c, code) => `START 3D ONLINE MATCH (${c} PLAYERS · ${code})`,
    minPlayersWarning: (c) =>
      `⚠️ Need at least 4 players in the room to start (currently ${c}). Invite friends or tap "+1 AI Bot"!`,
    gmGuideTitle: '🎭 Real-Life Game Master Instructions:',
    gmGuideStep1: (code) =>
      `1. Click below to launch the Game Master Control Panel for room ${code}.`,
    gmGuideStep2: (code) =>
      `2. Players without physical cards can enter code ${code} under "Join with Room Code" on their phones.`,
    openGMPanelBtn: (code) => `LAUNCH GM CONTROL PANEL (${code})`,
    enterRoomCodeLabel: 'Enter Room Code Provided by Host or GM:',
    joinOnlineBtn: 'JOIN 3D ONLINE ROOM NOW',
    joinGMCardBtn: 'RECEIVE SECRET CARD FROM GM',
    spotlightActiveLabel: '✨ Spotlight Area (Illuminated)',
    prevBtn: 'Back',
    understandAllBtn: 'Skip Tutorial',
    nextStepBtn: (c, t) => `Next (${c}/${t})`,
    finishTourBtn: 'Finish & Play!',
    tourSteps: [
      {
        badge: 'STEP 1 / 5 · STRICT NIGHT ANTI-CHEAT',
        title: 'Night Blindfold & Sequential Role Calls',
        description:
          'When night falls, everyone’s vision dims automatically. Only when your specific role is called do your eyes open to act — preventing any peeking!',
        tips: [
          'Every role features bespoke voice callouts and atmospheric sound effects.',
          'The Night Order bar shows the exact sequence of waking roles.',
        ],
      },
      {
        badge: 'STEP 2 / 5 · OPEN-WORLD NIGHT & BLUFFS',
        title: 'Free Night Roaming & Werewolf Self-Bite Bluffs',
        description:
          'On your night turn, use WASD / Virtual D-Pad to walk up to a player in the 3D village, OR tap them directly to dash over!',
        tips: [
          '🐺 Mindgame Tactic: Werewolves can bite themselves or the Wolf Pup to bait the Witch’s heal or trigger a 2-kill frenzy!',
          'Drag anywhere or toggle 360° mode to look around the entire village.',
        ],
      },
      {
        badge: 'STEP 3 / 5 · 3D PHYSICS DAY PROPS',
        title: 'Throw Tomatoes 🍅, Rotten Eggs 🥚, Roses & Water',
        description:
          'During Day Discussion, pick Tomatoes, Rotten Eggs, Roses, or Water Buckets to hurl at 3D characters with full 3D particle splats!',
        tips: [
          'Select a prop and tap any 3D character or bottom seat card to throw.',
          'During Voting Phase, tap a suspect to cast your execution vote.',
        ],
      },
      {
        badge: 'STEP 4 / 5 · 3D GHOST SOUL FLIGHT',
        title: 'Rise as a Free-Flying Ghost Soul Upon Death',
        description:
          'If you are eliminated, your game isn’t over! You immediately ascend as a glowing 3D Ghost Soul that can fly freely around the village.',
        tips: [
          'Use WASD / D-Pad or tap the ground to glide around living players.',
          'Chat privately with fellow ghosts in the Ghost Realm channel.',
        ],
      },
      {
        badge: 'STEP 5 / 5 · ERGONOMIC CONTROL DOCK',
        title: 'Role Powers, Quick Seat Bar & Village Chat',
        description:
          'The bottom dock lets you quickly target players on mobile, trigger Witch potions, check Seer results, and open Village Chat.',
        tips: [
          'Press [H] or tap the handle to collapse the dock for a full-screen 3D view.',
          'You are ready — enjoy the hunt!',
        ],
      },
    ],
  },
  fr: {
    appTitle: 'LOUP-GAROU 3D',
    appSubtitle: 'MONDE OUVERT & ASSISTANT MJ',
    changeProfile: 'Profil',
    newbieGuide: 'Tutoriel',
    selectRoleLabel: 'Rôle Préféré',
    randomBalancedRole: '🎲 Aléatoire Équilibré',
    villageScaleLabel: 'Taille du Village',
    peopleUnit: 'Joueurs',
    hoverForDifficulty: 'Difficulté par taille',
    playOnlineBtn: 'JOUER EN LIGNE (CRÉER / REJOINDRE)',
    playGMBtn: 'MAÎTRE DU JEU (CRÉER / REJOINDRE)',
    playAIPracticeBtn: 'Entraînement contre IA (Village 3D)',
    bottomControlHint:
      'Vue 360° · WASD Marche de Nuit & Vol Fantôme · Lancer d’Objets 3D',
    scales: {
      6: {
        label: '6 Joueurs',
        badge: 'Rapide',
        difficulty: 'Difficulté : Faible',
        summary: '1 Loup-Garou vs 5 Villageois (Voyante, Salvateur, Sorcière).',
        mechanics: 'Partie rapide de 3-5 min, déduction directe.',
      },
      8: {
        label: '8 Joueurs',
        badge: 'Équilibré',
        difficulty: 'Difficulté : Moyenne',
        summary: '2 Loups-Garous vs 6 Villageois (Voyante, Salvateur, Sorcière).',
        mechanics: 'Équilibre classique 50/50 avec coordination des loups.',
      },
      10: {
        label: '10 Joueurs',
        badge: 'Avancé',
        difficulty: 'Difficulté : Élevée',
        summary: '1 Loup + 1 Louveteau vs 8 Villageois & Cupidon.',
        mechanics: 'Amoureux de Cupidon et tir de vengeance du Chasseur.',
      },
      12: {
        label: '12 Joueurs',
        badge: 'Chaos Total',
        difficulty: 'Difficulté : Extrême',
        summary: '3 Loups (Louveteau), Traître, Maudit & Doppelgänger.',
        mechanics: 'Profondeur maximale : 2 victimes après la mort du Louveteau.',
      },
    },
    nightPhaseTitle: (r) => `NUIT ${r}`,
    dayDiscussTitle: (r) => `DÉBAT JOUR ${r}`,
    dayVoteTitle: (r) => `VOTE JOUR ${r}`,
    hunterPhaseTitle: 'TIR DU CHASSEUR',
    roomBadge: (id) => `Salle ${id}`,
    aiPracticeBadge: 'Match IA',
    skipNightBtn: 'Passer Nuit',
    goToVoteBtn: 'Voter',
    confirmVoteBtn: 'Valider Vote',
    wolvesAlive: 'LOUPS',
    villagersAlive: 'VILLAGEOIS',
    yourRolePrefix: 'Rôle:',
    freeLook360: '360°',
    switchCamera: 'Caméra 3D',
    openGuide: 'Tutoriel',
    toggleMic: 'Micro',
    toggleSound: 'Son [M]',
    pauseGame: 'Pause & Menu [P]',
    antiCheatNightBadge: 'PROTECTION ANTI-TRICHE DE NUIT',
    sleepingTitle: (role) => `Vous Dormez (${role})`,
    sleepingDesc:
      'Votre vue est assombrie pour protéger l’identité des rôles nocturnes.',
    skipNightLongBtn: 'Passer à l’Aube',
    nightOrderLabel: 'Ordre de nuit :',
    confirmAndSkipNight: 'Confirmer & Aube',
    closeEyesSleep: 'Fermer les Yeux',
    wolfMindgameHint: '🐺 Marchez (WASD) ou cliquez pour dévorer un villageois ou bluffer !',
    witchOutHeal: 'Vie Utilisée',
    witchHealActive: 'Potion de Vie Active',
    witchHealBtn: (name) => `Sauver (${name})`,
    witchOutPoison: 'Poison Utilisé',
    witchPoisonHint: 'Cliquez un personnage 3D pour empoisonner',
    funPropsLabel: 'Objets 3D :',
    propButtons: {
      tomato: '🍅 Tomate',
      egg: '🥚 Œuf Pourri',
      rose: '💐 Rose',
      water: '🪣 Eau',
    },
    propBadges: {
      tomato: 'Tomate Écrasée !',
      egg: 'Œuf Pourri !',
      rose: 'Bouquet de Roses !',
      water: 'Trempé !',
    },
    dropPropBtn: 'Poser',
    holdingPropBanner: (label) => `${label} en main ! Cliquez sur un joueur 3D !`,
    ghostBannerText: 'Esprit Fantôme 3D : Utilisez WASD / D-Pad pour voler autour du village !',
    dpadWalkNight: 'Marche Nuit',
    dpadFlyGhost: 'Vol Fantôme',
    ghostFloatingBadge: '👻 Fantôme',
    youSuffix: '(Vous)',
    votesUnit: 'VOTES',
    aliveStatus: 'Vivant',
    ghostStatus: 'Fantôme',
    expandDock: 'Ouvrir Contrôles [H]',
    collapseDock: 'Réduire HUD [H]',
    chatBtn: 'Chat',
    gmBtn: 'Outil MJ',
    cardsBtn: 'Cartes Mobile',
    leaderboardShort: 'Rang',
    historyShort: 'Historique',
    rulesShort: 'Règles',
    closeEsc: 'Fermer [Esc]',
    backToTitleEsc: 'Menu Principal [Esc]',
    drawerChatTitle: 'Chat du Village & Canal des Fantômes',
    drawerGMTitle: 'Assistant Maître du Jeu',
    drawerCardsTitle: 'Cartes Secrètes sur Mobile',
    drawerLeaderboardTitle: 'Classement des Maîtres',
    drawerHistoryTitle: 'Historique des Parties',
    drawerRulesTitle: 'Encyclopédie des 13 Rôles',
    chatMainTab: 'Village (Vivants)',
    chatGhostTab: 'Au-Delà (Fantômes)',
    chatPlaceholder: 'Écrivez votre déduction...',
    sendBtn: 'Envoyer',
    pauseTitle: 'PAUSE & OPTIONS',
    roundStat: 'TOUR',
    aliveStat: 'VIVANTS',
    eloStat: 'ELO ACTUEL',
    resumeBtn: 'Reprendre [Esc / P]',
    restartMatchBtn: 'Nouvelle Partie',
    backToTitleBtn: 'Menu Principal',
    finalResultBadge: 'RÉSULTAT FINAL',
    winWerewolves: 'VICTOIRE DES LOUPS-GAROUS !',
    winLovers: 'VICTOIRE DES AMOUREUX !',
    winTanner: 'VICTOIRE DU TANNEUR !',
    winVillagers: 'VICTOIRE DES VILLAGEOIS !',
    totalRoundsStat: 'TOURS JOUÉS',
    survivorsStat: 'SURVIVANTS',
    eloDeltaStat: 'SCORE ELO',
    playAgainBtn: 'Rejouer Maintenant',
    lobbyBadge: 'SALON MULTIJOUEUR',
    lobbyOnlineTitle: 'Salon En Ligne 3D',
    lobbyGMTitle: 'Salon Maître du Jeu',
    tabOnline3D: '1. Jeu en Ligne 3D',
    tabGMOffline: '2. Outil MJ Réel',
    subTabCreate: 'Créer une Salle (Hôte)',
    subTabJoin: 'Rejoindre avec Code',
    yourRoomCodeLabel: 'Code de votre salle',
    copyCode: 'Copier',
    copiedCode: 'Copié',
    maxSeatsLabel: (s) => `Places Max (${s} Joueurs)`,
    roomListHeader: (c, m) => `Joueurs (${c}/${m} places)`,
    humanCountBadge: (c) => `👤 ${c} Humain`,
    botCountBadge: (c) => `🤖 ${c} Bot`,
    addOneBotBtn: '+1 Bot IA',
    fillBotsBtn: 'Remplir de Bots',
    clearAllBotsBtn: 'Retirer les Bots',
    invitePlaceholder: 'Nom d’un ami à ajouter...',
    addHumanBtn: 'Ajouter',
    emptySeat: 'Place libre...',
    hostRoleLabel: '👑 Hôte',
    botRoleLabel: '🤖 Bot IA',
    humanRoleLabel: '👤 Joueur',
    preferredRoleLobby: 'Rôle préféré :',
    startOnlineMatchBtn: (c, code) => `LANCER LA PARTIE 3D (${c} JOUEURS · ${code})`,
    minPlayersWarning: (c) =>
      `⚠️ Minimum 4 joueurs requis (actuellement ${c}). Ajoutez des amis ou cliquez sur "+1 Bot IA" !`,
    gmGuideTitle: '🎭 Guide Maître du Jeu :',
    gmGuideStep1: (code) => `1. Ouvrez le panneau MJ avec le code ${code}.`,
    gmGuideStep2: (code) => `2. Les joueurs entrent le code ${code} sur leur téléphone.`,
    openGMPanelBtn: (code) => `OUVRIR PANNEAU MJ (${code})`,
    enterRoomCodeLabel: 'Entrez le code de la salle :',
    joinOnlineBtn: 'REJOINDRE LA SALLE 3D',
    joinGMCardBtn: 'RECEVOIR MA CARTE SECRÈTE',
    spotlightActiveLabel: '✨ Zone Éclairée',
    prevBtn: 'Retour',
    understandAllBtn: 'Passer',
    nextStepBtn: (c, t) => `Suivant (${c}/${t})`,
    finishTourBtn: 'Commencer !',
    tourSteps: [
      {
        badge: 'ÉTAPE 1 / 5 · ANTI-TRICHE DE NUIT',
        title: 'Nuit Noire & Appel par Rôle',
        description:
          'La nuit, la vision est masquée sauf lorsque votre rôle se réveille pour agir.',
        tips: [
          'Chaque rôle possède des effets sonores et voix uniques.',
          'Suivez l’ordre d’appel nocturne en haut de l’écran.',
        ],
      },
      {
        badge: 'ÉTAPE 2 / 5 · MONDE OUVERT & BLUFF',
        title: 'Déplacement Libre & Bluff des Loups',
        description:
          'Déplacez-vous avec WASD / D-Pad ou cliquez directement sur une cible la nuit !',
        tips: [
          '🐺 Les Loups peuvent mordre un allié pour tromper la Sorcière.',
          'Faites glisser pour tourner la caméra à 360°.',
        ],
      },
      {
        badge: 'ÉTAPE 3 / 5 · OBJETS PHYSIQUES 3D',
        title: 'Lancer de Tomates 🍅, Œufs Pourris 🥚 & Fleurs',
        description:
          'Le jour, lancez des tomates, œufs pourris, roses ou seaux d’eau en 3D sur les suspects !',
        tips: [
          'Choisissez un objet puis cliquez sur un personnage 3D.',
          'Pendant le vote, cliquez sur un suspect pour voter.',
        ],
      },
      {
        badge: 'ÉTAPE 4 / 5 · ESPRIT FANTÔME 3D',
        title: 'Volez en Fantôme 3D après la Mort',
        description:
          'Si vous mourez, votre âme devient un fantôme 3D libre de voler autour du village.',
        tips: [
          'Utilisez WASD / D-Pad pour planer autour des survivants.',
          'Discutez entre fantômes dans le canal dédié.',
        ],
      },
      {
        badge: 'ÉTAPE 5 / 5 · BARRE DE CONTRÔLE',
        title: 'Pouvoirs, Sélection Rapide & Chat',
        description:
          'La barre inférieure permet de cibler rapidement un joueur, utiliser vos potions et discuter.',
        tips: [
          'Appuyez sur [H] pour masquer l’interface et admirer la scène 3D.',
          'Bonne chance dans le village !',
        ],
      },
    ],
  },
  es: {
    appTitle: 'HOMBRE LOBO 3D',
    appSubtitle: 'MUNDO ABIERTO Y NARRADOR',
    changeProfile: 'Perfil',
    newbieGuide: 'Tutorial',
    selectRoleLabel: 'Rol Preferido',
    randomBalancedRole: '🎲 Aleatorio Equilibrado',
    villageScaleLabel: 'Tamaño de Aldea',
    peopleUnit: 'Jugadores',
    hoverForDifficulty: 'Ver dificultad',
    playOnlineBtn: 'JUGAR ONLINE (CREAR / UNIRSE)',
    playGMBtn: 'NARRADOR (CREAR / UNIRSE)',
    playAIPracticeBtn: 'Práctica con IA (Aldea 3D Abierta)',
    bottomControlHint:
      'Giro 360° · WASD Caminar de Noche y Vuelo Fantasma · Lanzar Objetos 3D',
    scales: {
      6: {
        label: '6 Jugadores',
        badge: 'Rápido',
        difficulty: 'Dificultad: Baja',
        summary: '1 Lobo vs 5 Aldeanos (Vidente, Guardaespaldas, Bruja).',
        mechanics: 'Partidas rápidas de 3-5 min con deducción directa.',
      },
      8: {
        label: '8 Jugadores',
        badge: 'Estándar',
        difficulty: 'Dificultad: Media',
        summary: '2 Lobos vs 6 Aldeanos (Vidente, Guardaespaldas, Bruja, Cupido).',
        mechanics: 'Equilibrio clásico 50/50 con coordinación de manada.',
      },
      10: {
        label: '10 Jugadores',
        badge: 'Avanzado',
        difficulty: 'Dificultad: Alta',
        summary: '1 Lobo + 1 Cachorro vs 8 Aldeanos y Neutrales.',
        mechanics: 'Enamorados de Cupido y disparo final del Cazador.',
      },
      12: {
        label: '12 Jugadores',
        badge: 'Caos Total',
        difficulty: 'Dificultad: Extrema',
        summary: '3 Lobos (Cachorro), Traidor, Maldito y Doppelgänger.',
        mechanics: 'Máxima estrategia: 2 víctimas tras caer el Cachorro.',
      },
    },
    nightPhaseTitle: (r) => `NOCHE ${r}`,
    dayDiscussTitle: (r) => `DEBATE DÍA ${r}`,
    dayVoteTitle: (r) => `VOTACIÓN DÍA ${r}`,
    hunterPhaseTitle: 'DISPARO CAZADOR',
    roomBadge: (id) => `Sala ${id}`,
    aiPracticeBadge: 'Práctica IA',
    skipNightBtn: 'Pasar Noche',
    goToVoteBtn: 'A Votar',
    confirmVoteBtn: 'Cerrar Voto',
    wolvesAlive: 'LOBOS',
    villagersAlive: 'ALDEANOS',
    yourRolePrefix: 'Rol:',
    freeLook360: '360°',
    switchCamera: 'Cámara 3D',
    openGuide: 'Tutorial',
    toggleMic: 'Micrófono',
    toggleSound: 'Sonido [M]',
    pauseGame: 'Pausa y Menú [P]',
    antiCheatNightBadge: 'PROTECCIÓN ANTI-TRAMPAS NOCTURNA',
    sleepingTitle: (role) => `Ojos Cerrados (${role})`,
    sleepingDesc:
      'Tu visión se oscurece para proteger la identidad de los roles nocturnos.',
    skipNightLongBtn: 'Avanzar al Amanecer',
    nightOrderLabel: 'Orden nocturno:',
    confirmAndSkipNight: 'Confirmar y Amanecer',
    closeEyesSleep: 'Cerrar Ojos',
    wolfMindgameHint: '🐺 ¡Camina (WASD) o toca para morder a un aldeano o engañar a la Bruja!',
    witchOutHeal: 'Cura Usada',
    witchHealActive: 'Cura Activada',
    witchHealBtn: (name) => `Curar a (${name})`,
    witchOutPoison: 'Veneno Usado',
    witchPoisonHint: 'Toca un personaje 3D para lanzar Veneno',
    funPropsLabel: 'Objetos 3D:',
    propButtons: {
      tomato: '🍅 Tomate',
      egg: '🥚 Huevo Podrido',
      rose: '💐 Rosa',
      water: '🪣 Agua',
    },
    propBadges: {
      tomato: '¡Tomatazo!',
      egg: '¡Huevo Podrido!',
      rose: '¡Ramo de Rosas!',
      water: '¡Empapado!',
    },
    dropPropBtn: 'Soltar',
    holdingPropBanner: (label) => `¡Tienes ${label}! ¡Toca cualquier personaje 3D para lanzar!`,
    ghostBannerText: 'Alma Fantasma 3D: ¡Usa WASD / D-Pad para volar por la aldea!',
    dpadWalkNight: 'Caminar',
    dpadFlyGhost: 'Volar',
    ghostFloatingBadge: '👻 Fantasma',
    youSuffix: '(Tú)',
    votesUnit: 'VOTOS',
    aliveStatus: 'Vivo',
    ghostStatus: 'Fantasma',
    expandDock: 'Abrir Controles [H]',
    collapseDock: 'Ocultar HUD [H]',
    chatBtn: 'Chat',
    gmBtn: 'Narrador',
    cardsBtn: 'Cartas Móvil',
    leaderboardShort: 'Ranking',
    historyShort: 'Historial',
    rulesShort: 'Roles',
    closeEsc: 'Cerrar [Esc]',
    backToTitleEsc: 'Menú Principal [Esc]',
    drawerChatTitle: 'Chat de la Aldea y Canal Fantasma',
    drawerGMTitle: 'Asistente de Narrador en Vivo',
    drawerCardsTitle: 'Cartas Secretas en el Móvil',
    drawerLeaderboardTitle: 'Clasificación de Maestros',
    drawerHistoryTitle: 'Historial de Partidas',
    drawerRulesTitle: 'Enciclopedia de los 13 Roles',
    chatMainTab: 'Aldea (Vivos)',
    chatGhostTab: 'Más Allá (Fantasmas)',
    chatPlaceholder: 'Escribe tu deducción...',
    sendBtn: 'Enviar',
    pauseTitle: 'PAUSA Y AJUSTES',
    roundStat: 'RONDA',
    aliveStat: 'VIVOS',
    eloStat: 'ELO ACTUAL',
    resumeBtn: 'Continuar [Esc / P]',
    restartMatchBtn: 'Nueva Partida',
    backToTitleBtn: 'Menú Principal',
    finalResultBadge: 'RESULTADO FINAL',
    winWerewolves: '¡VICTORIA DE LOS HOMBRES LOBO!',
    winLovers: '¡VICTORIA DE LOS ENAMORADOS!',
    winTanner: '¡VICTORIA DEL CURTIDOR!',
    winVillagers: '¡VICTORIA DE LOS ALDEANOS!',
    totalRoundsStat: 'RONDAS',
    survivorsStat: 'SUPERVIVIENTES',
    eloDeltaStat: 'PUNTOS ELO',
    playAgainBtn: 'Jugar de Nuevo',
    lobbyBadge: 'SALA MULTIJUGADOR',
    lobbyOnlineTitle: 'Sala Online 3D',
    lobbyGMTitle: 'Sala de Narrador',
    tabOnline3D: '1. Jugar Online 3D',
    tabGMOffline: '2. Narrador en Vivo',
    subTabCreate: 'Crear Nueva Sala',
    subTabJoin: 'Unirse con Código',
    yourRoomCodeLabel: 'Código de tu Sala',
    copyCode: 'Copiar',
    copiedCode: 'Copiado',
    maxSeatsLabel: (s) => `Asientos Máx (${s})`,
    roomListHeader: (c, m) => `Jugadores (${c}/${m} asientos)`,
    humanCountBadge: (c) => `👤 ${c} Humano`,
    botCountBadge: (c) => `🤖 ${c} Bot`,
    addOneBotBtn: '+1 Bot IA',
    fillBotsBtn: 'Llenar con Bots',
    clearAllBotsBtn: 'Quitar Bots',
    invitePlaceholder: 'Nombre de amigo para añadir...',
    addHumanBtn: 'Añadir',
    emptySeat: 'Asiento vacío...',
    hostRoleLabel: '👑 Anfitrión',
    botRoleLabel: '🤖 Bot IA',
    humanRoleLabel: '👤 Jugador',
    preferredRoleLobby: 'Tu rol preferido:',
    startOnlineMatchBtn: (c, code) => `INICIAR PARTIDA 3D (${c} JUGADORES · ${code})`,
    minPlayersWarning: (c) =>
      `⚠️ Se necesitan mínimo 4 jugadores (actualmente ${c}). ¡Añade amigos o pulsa "+1 Bot IA"!`,
    gmGuideTitle: '🎭 Guía para el Narrador:',
    gmGuideStep1: (code) => `1. Abre el panel de control con el código ${code}.`,
    gmGuideStep2: (code) => `2. Los jugadores ingresan el código ${code} en sus móviles.`,
    openGMPanelBtn: (code) => `ABRIR PANEL DE NARRADOR (${code})`,
    enterRoomCodeLabel: 'Ingresa el código de la sala:',
    joinOnlineBtn: 'UNIRSE A LA SALA 3D',
    joinGMCardBtn: 'RECIBIR MI CARTA SECRETA',
    spotlightActiveLabel: '✨ Zona Destacada (Iluminada)',
    prevBtn: 'Atrás',
    understandAllBtn: 'Omitir',
    nextStepBtn: (c, t) => `Siguiente (${c}/${t})`,
    finishTourBtn: '¡Empezar a Jugar!',
    tourSteps: [
      {
        badge: 'PASO 1 / 5 · ANTI-TRAMPAS NOCTURNO',
        title: 'Noche Oscura y Llamada por Turnos',
        description:
          'De noche la vista se oscurece automáticamente salvo cuando despierta tu rol.',
        tips: [
          'Cada rol tiene voces y efectos de sonido propios.',
          'La barra nocturna muestra el orden exacto de llamada.',
        ],
      },
      {
        badge: 'PASO 2 / 5 · MUNDO ABIERTO Y ENGAÑOS',
        title: 'Movimiento Libre y Auto-Mordida de Lobos',
        description:
          'Camina con WASD / D-Pad o toca directamente a un jugador para desplazarte.',
        tips: [
          '🐺 Los Lobos pueden morderse entre sí para engañar a la Bruja.',
          'Arrastra la pantalla o activa 360° para mirar alrededor.',
        ],
      },
      {
        badge: 'PASO 3 / 5 · OBJETOS FÍSICOS 3D',
        title: 'Lanza Tomates 🍅, Huevos Podridos 🥚 y Flores',
        description:
          'De día puedes lanzar tomates, huevos podridos, rosas o cubos de agua en 3D.',
        tips: [
          'Elige un objeto y toca a un personaje 3D.',
          'En la votación, toca al sospechoso para votar.',
        ],
      },
      {
        badge: 'PASO 4 / 5 · VUELO DE FANTASMA 3D',
        title: 'Vuela como Fantasma 3D al Morir',
        description:
          'Si mueres, te conviertes en un Fantasma 3D brillante que vuela libremente por la aldea.',
        tips: [
          'Usa WASD / D-Pad para volar alrededor de los vivos.',
          'Habla con otros espíritus en el Canal Fantasma.',
        ],
      },
      {
        badge: 'PASO 5 / 5 · PANEL DE CONTROL',
        title: 'Habilidades, Selección Rápida y Chat',
        description:
          'El panel inferior te permite seleccionar jugadores en móvil, usar pociones y abrir el chat.',
        tips: [
          'Pulsa [H] para ocultar los controles y ver la aldea 3D completa.',
          '¡Todo listo para comenzar!',
        ],
      },
    ],
  },
  ja: {
    appTitle: '人狼 3D',
    appSubtitle: 'オープンワールド＆GM支援',
    changeProfile: 'プロフィール',
    newbieGuide: 'チュートリアル',
    selectRoleLabel: '希望の役職',
    randomBalancedRole: '🎲 バランスランダム',
    villageScaleLabel: '村の規模',
    peopleUnit: '人',
    hoverForDifficulty: '難易度の詳細',
    playOnlineBtn: 'オンライン対戦 (部屋作成・参加)',
    playGMBtn: 'GM支援モード (部屋作成・参加)',
    playAIPracticeBtn: 'AI練習モード (3Dオープンワールド村)',
    bottomControlHint:
      '360°視点回転 · WASD/十字キーで夜間移動＆幽霊飛行 · タップで3Dアイテム投げ',
    scales: {
      6: {
        label: '6人村',
        badge: 'スピード決着',
        difficulty: '難易度: 低',
        summary: '人狼1 vs 村人5 (占い師・騎士・魔女・ハンター)。',
        mechanics: '3〜5分の短期決戦。消去法で人狼を特定しやすい初心者向け構成。',
      },
      8: {
        label: '8人村',
        badge: '標準バランス',
        difficulty: '難易度: 中',
        summary: '人狼2 vs 村人6 (占い師・騎士・魔女・キューピッド)。',
        mechanics: '勝率50/50の王道バランス。人狼の連携と村の情報共有が鍵。',
      },
      10: {
        label: '10人村',
        badge: '上級心理戦',
        difficulty: '難易度: 高',
        summary: '人狼1+狼の子1 vs 村人8＆第三勢力 (皮なめし職人・長老)。',
        mechanics: '恋人陣営やハンターの道連れ射撃が絡む多面的な心理戦。',
      },
      12: {
        label: '12人村',
        badge: '大乱闘カオス',
        difficulty: '難易度: 極限',
        summary: '人狼3 (狼の子覚醒)・裏切り者・呪われし者・ドッペルゲンガー。',
        mechanics: '狼の子死亡後の2人襲撃や役職変化など高度な駆け引きが満載。',
      },
    },
    nightPhaseTitle: (r) => `${r}日目の夜`,
    dayDiscussTitle: (r) => `${r}日目の議論`,
    dayVoteTitle: (r) => `${r}日目の投票`,
    hunterPhaseTitle: 'ハンターの道連れ',
    roomBadge: (id) => `部屋 ${id}`,
    aiPracticeBadge: 'AI対戦',
    skipNightBtn: '夜をスキップ',
    goToVoteBtn: '投票へ進む',
    confirmVoteBtn: '投票を確定',
    wolvesAlive: '生存人狼',
    villagersAlive: '生存村人',
    yourRolePrefix: '役職:',
    freeLook360: '360°',
    switchCamera: '3Dカメラ切替',
    openGuide: 'ガイドを開く',
    toggleMic: 'マイク切替',
    toggleSound: '音量切替 [M]',
    pauseGame: '一時停止・設定 [P]',
    antiCheatNightBadge: '夜間不正防止ブラインドモード',
    sleepingTitle: (role) => `目を閉じて眠っています (${role})`,
    sleepingDesc:
      '夜間に活動する役職の正体を守るため、手番以外のプレイヤーの視界は暗転します。',
    skipNightLongBtn: '夜をスキップして朝へ進む',
    nightOrderLabel: '夜の行動順:',
    confirmAndSkipNight: '確定して朝へ',
    closeEyesSleep: '目を閉じる',
    wolfMindgameHint: '🐺 WASD移動またはタップで襲撃！仲間を噛んで魔女を騙す頭脳戦も可能！',
    witchOutHeal: '蘇生薬 消費済',
    witchHealActive: '蘇生薬 使用中',
    witchHealBtn: (name) => `犠牲者を救う (${name})`,
    witchOutPoison: '毒薬 消費済',
    witchPoisonHint: '3Dキャラをタップして毒薬を投げる',
    funPropsLabel: '3Dアイテム:',
    propButtons: {
      tomato: '🍅 トマト',
      egg: '🥚 腐った卵',
      rose: '💐 花束',
      water: '🪣 水バケツ',
    },
    propBadges: {
      tomato: 'トマト直撃！',
      egg: '腐った卵！',
      rose: 'バラの花束！',
      water: 'ずぶ濡れ！',
    },
    dropPropBtn: '手放す',
    holdingPropBanner: (label) => `${label}を構えました！3Dキャラをタップして投げよう！`,
    ghostBannerText: '3D幽霊モード: WASD / 十字キーまたは地面タップで村を自由に飛び回れます！',
    dpadWalkNight: '夜間移動',
    dpadFlyGhost: '幽霊飛行',
    ghostFloatingBadge: '👻 幽霊',
    youSuffix: '(あなた)',
    votesUnit: '票',
    aliveStatus: '生存',
    ghostStatus: '幽霊',
    expandDock: '操作パネルを開く [H]',
    collapseDock: 'HUDを折りたたむ [H]',
    chatBtn: 'チャット',
    gmBtn: 'GM支援',
    cardsBtn: 'スマホ配役',
    leaderboardShort: '順位',
    historyShort: '履歴',
    rulesShort: '役職',
    closeEsc: '閉じる [Esc]',
    backToTitleEsc: 'タイトルへ [Esc]',
    drawerChatTitle: '村チャット＆霊界チャネル (不正防止)',
    drawerGMTitle: '対面ゲームマスター支援ツール',
    drawerCardsTitle: 'スマホ秘密の配役カード',
    drawerLeaderboardTitle: '人狼ランキング',
    drawerHistoryTitle: '対戦履歴',
    drawerRulesTitle: '全13役職ガイド',
    chatMainTab: '村チャット (生存者)',
    chatGhostTab: '霊界チャット (死者専用)',
    chatPlaceholder: '推理メッセージを入力...',
    sendBtn: '送信',
    pauseTitle: '一時停止＆設定',
    roundStat: 'ラウンド',
    aliveStat: '生存者数',
    eloStat: '現在のELO',
    resumeBtn: 'ゲームを再開 [Esc / P]',
    restartMatchBtn: '配役し直して再スタート',
    backToTitleBtn: 'タイトル画面へ戻る',
    finalResultBadge: '最終結果',
    winWerewolves: '人狼陣営の勝利！',
    winLovers: '恋人陣営の勝利！',
    winTanner: '皮なめし職人の単独勝利！',
    winVillagers: '村人陣営の勝利！',
    totalRoundsStat: '経過ラウンド',
    survivorsStat: '生存者',
    eloDeltaStat: 'ELO変動',
    playAgainBtn: 'もう一度プレイ',
    lobbyBadge: 'マルチプレイ待機ロビー',
    lobbyOnlineTitle: 'オンライン3D村ロビー',
    lobbyGMTitle: '対面GM支援ロビー',
    tabOnline3D: '1. オンライン3D対戦',
    tabGMOffline: '2. 対面GMツール',
    subTabCreate: '新しい部屋を作成 (ホスト)',
    subTabJoin: '部屋コードで参加',
    yourRoomCodeLabel: 'あなたの部屋コード (友達に共有)',
    copyCode: 'コピー',
    copiedCode: 'コピー済',
    maxSeatsLabel: (s) => `最大席数 (${s}人)`,
    roomListHeader: (c, m) => `参加者リスト (${c}/${m}席)`,
    humanCountBadge: (c) => `👤 人間 ${c}`,
    botCountBadge: (c) => `🤖 ボット ${c}`,
    addOneBotBtn: '+1 AIボット',
    fillBotsBtn: '空席をボットで埋める',
    clearAllBotsBtn: '全ボット削除',
    invitePlaceholder: '追加するプレイヤー名を入力...',
    addHumanBtn: 'プレイヤー追加',
    emptySeat: '空席...',
    hostRoleLabel: '👑 ホスト',
    botRoleLabel: '🤖 AIボット',
    humanRoleLabel: '👤 プレイヤー',
    preferredRoleLobby: '希望の役職:',
    startOnlineMatchBtn: (c, code) => `3Dオンライン対戦開始 (${c}人 · ${code})`,
    minPlayersWarning: (c) =>
      `⚠️ 開始には最低4人のプレイヤーが必要です (現在${c}人)。友達を追加するか「+1 AIボット」を押してください！`,
    gmGuideTitle: '🎭 対面ゲームマスターの手順:',
    gmGuideStep1: (code) => `1. 下のボタンで部屋コード ${code} のGM管理パネルを開きます。`,
    gmGuideStep2: (code) => `2. 参加者はスマホでコード ${code} を入力して役職カードを受け取ります。`,
    openGMPanelBtn: (code) => `GM管理パネルを開く (${code})`,
    enterRoomCodeLabel: 'ホストまたはGMの部屋コードを入力:',
    joinOnlineBtn: '3Dオンライン部屋に参加',
    joinGMCardBtn: 'GM部屋から配役カードを受信',
    spotlightActiveLabel: '✨ 注目エリア (ハイライト中)',
    prevBtn: '戻る',
    understandAllBtn: 'スキップ',
    nextStepBtn: (c, t) => `次へ (${c}/${t})`,
    finishTourBtn: '完了して開始！',
    tourSteps: [
      {
        badge: 'ステップ 1 / 5 · 夜間不正防止システム',
        title: '暗闇の夜と順番点呼',
        description:
          '夜になると全員の視界が暗転し、自分の役職の番が来た時だけ目が開いて行動できます。',
        tips: [
          '各役職に専用のボイスセリフと効果音があります。',
          '画面上部のバーで夜の点呼順を確認できます。',
        ],
      },
      {
        badge: 'ステップ 2 / 5 · オープンワールド移動＆頭脳戦',
        title: '自由移動と人狼の自噛みブラフ',
        description:
          '夜の手番ではWASD/十字キーで歩いて近づくか、対象を直接タップして素早く駆け寄れます！',
        tips: [
          '🐺 頭脳戦: 人狼はあえて仲間や狼の子を噛んで魔女を騙すことも可能です。',
          '画面ドラッグまたは360°ボタンで村全体を見渡せます。',
        ],
      },
      {
        badge: 'ステップ 3 / 5 · 3D物理アイテム投げ',
        title: 'トマト🍅・腐った卵🥚・花束・水バケツ',
        description:
          '昼の議論中はトマトや腐った卵、バラの花束、水バケツを3Dキャラに投げつけて盛り上がりましょう！',
        tips: [
          'アイテムを選んで3Dキャラまたは下部の席カードをタップ。',
          '投票フェーズでは怪しい人物をタップして投票します。',
        ],
      },
      {
        badge: 'ステップ 4 / 5 · 3D幽霊飛行モード',
        title: '死亡後は3D幽霊となって村を飛行',
        description:
          'もし処刑や襲撃で倒れても、光る3D幽霊となって村の上空を自由に飛び回ることができます。',
        tips: [
          'WASD/十字キーや地面タップで生存者の周りを飛行できます。',
          '霊界チャットで幽霊同士の会話が可能です。',
        ],
      },
      {
        badge: 'ステップ 5 / 5 · 多機能コントロールパネル',
        title: '役職スキル・クイック席選択・チャット',
        description:
          '下部パネルからスマホでも簡単にターゲット選択や魔女の薬使用、チャットが可能です。',
        tips: [
          '[H]キーまたは折りたたみボタンで3D画面を全画面表示できます。',
          '準備完了です！ゲームを始めましょう！',
        ],
      },
    ],
  },
};

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  vi: {
    appTitle: 'Ma Sói Huyền Thoại',
    appSubtitle: 'Đấu Trí Đỉnh Cao & Trợ Lý Quản Trò Thông Minh',
    playOnline: 'Chơi Online',
    playOnlineDesc: 'Tham gia phòng trực tuyến hoặc luyện tập với AI bots, chat live và voice chat',
    gmAssistant: 'Trợ Lý Quản Trò',
    gmAssistantDesc: 'Hỗ trợ gọi vai ban đêm, ghi nhớ logic và tính toán kết quả tự động cho ván chơi thực tế',
    virtualCards: 'Phát Thẻ Qua Điện Thoại',
    virtualCardsDesc: 'Xem thẻ bài bí mật và hướng dẫn chi tiết qua mã phòng mà không cần bộ bài giấy',
    leaderboard: 'Bảng Xếp Hạng',
    matchHistory: 'Lịch Sử Trận Đấu',
    roleEncyclopedia: 'Cẩm Nang Vai Trò',
    voiceChat: 'Voice Chat Trực Tiếp',
    voiceLive: 'Đang Nói',
    muteMic: 'Tắt Mic',
    unmuteMic: 'Bật Mic',
    pushToTalk: 'Nhấn để nói',
    antiCheatActive: 'Hệ Thống Chống Gian Lận Đang Bật',
    antiCheatDesc: 'Tách biệt chat người chết (Ghost chat), kiểm tra trùng lặp phiếu bầu, bảo vệ thông tin mật',
    createRoom: 'Tạo Phòng Mới',
    joinRoom: 'Vào Phòng Bằng Mã',
    quickMatch: 'Vào Nhanh Với AI Bots',
    roomId: 'Mã Phòng',
    enterRoomId: 'Nhập mã phòng (VD: WOLF88)',
    yourName: 'Tên hiển thị',
    enterName: 'Nhập tên của bạn...',
    loginSocial: 'Đăng Nhập Nhanh',
    loginGoogle: 'Tiếp tục với Google',
    loginDiscord: 'Tiếp tục với Discord',
    loginGuest: 'Chơi Khách Nhanh',
    factionVillager: 'Phe Dân Làng',
    factionWerewolf: 'Phe Ma Sói',
    factionNeutral: 'Phe Thứ Ba',
    alive: 'Còn sống',
    dead: 'Đã chết',
    nightPhase: 'Giai Đoạn Ban Đêm',
    dayDiscussion: 'Thảo Luận Ban Ngày',
    dayVoting: 'Bỏ Phiếu Xử Tử',
    hunterRetribution: 'Phát Súng Thợ Săn',
    nightFalls: 'Màn đêm buông xuống, cả làng đi ngủ...',
    dayBreaks: 'Bình minh hé rạng, cả làng thức giấc...',
    castVote: 'Bỏ Phiếu',
    skipVote: 'Bỏ Phiếu Trắng',
    revealRole: 'Xem Thẻ Bài Của Bạn',
    hideRole: 'Ẩn Thẻ Bài',
    gmNextStep: 'Bước Tiếp Theo',
    gmPrevStep: 'Bước Trước',
    gmResolveNight: 'Kết Thúc Đêm & Tính Toán',
    gmAnnounceVictims: 'Công Bố Người Bị Hại',
    gmEndGame: 'Kết Thúc Ván',
    soundToggle: 'Âm thanh',
    language: 'Ngôn ngữ',
  },
  en: {
    appTitle: 'Legend of Werewolf',
    appSubtitle: 'Social Deduction & Game Master Assistant',
    playOnline: 'Play Online',
    playOnlineDesc: 'Join online rooms or practice with AI bots, live chat & voice visualizer',
    gmAssistant: 'Game Master Assistant',
    gmAssistantDesc: 'Step-by-step night calling, logic calculation and automatic death resolution',
    virtualCards: 'Virtual Deck on Phone',
    virtualCardsDesc: 'Inspect secret roles and beginner guides via Room ID without physical cards',
    leaderboard: 'Leaderboard',
    matchHistory: 'Match History',
    roleEncyclopedia: 'Role Guide',
    voiceChat: 'Live Voice Chat',
    voiceLive: 'Speaking',
    muteMic: 'Mute Mic',
    unmuteMic: 'Unmute Mic',
    pushToTalk: 'Push to talk',
    antiCheatActive: 'Anti-Cheat Protection Active',
    antiCheatDesc: 'Dead player ghost chat separation, tamper checks, secret info shielding',
    createRoom: 'Create Room',
    joinRoom: 'Join with Code',
    quickMatch: 'Quick Match with AI',
    roomId: 'Room Code',
    enterRoomId: 'Enter room code (e.g. WOLF88)',
    yourName: 'Your Nickname',
    enterName: 'Enter your name...',
    loginSocial: 'Quick Sign In',
    loginGoogle: 'Sign in with Google',
    loginDiscord: 'Sign in with Discord',
    loginGuest: 'Play as Guest',
    factionVillager: 'Villagers',
    factionWerewolf: 'Werewolves',
    factionNeutral: 'Neutral / 3rd Party',
    alive: 'Alive',
    dead: 'Eliminated',
    nightPhase: 'Night Phase',
    dayDiscussion: 'Day Discussion',
    dayVoting: 'Voting Phase',
    hunterRetribution: 'Hunter Revenge Shot',
    nightFalls: 'Night falls, the village closes its eyes...',
    dayBreaks: 'Dawn breaks, the village awakens...',
    castVote: 'Cast Vote',
    skipVote: 'Abstain',
    revealRole: 'Tap to Reveal Secret Card',
    hideRole: 'Hide Card',
    gmNextStep: 'Next Night Step',
    gmPrevStep: 'Previous Step',
    gmResolveNight: 'Resolve Night & Calculate',
    gmAnnounceVictims: 'Announce Night Casualties',
    gmEndGame: 'End Game',
    soundToggle: 'Sound',
    language: 'Language',
  },
  fr: {
    appTitle: 'Les Loups-Garous Légendaires',
    appSubtitle: 'Déduction Sociale & Assistant Maître du Jeu',
    playOnline: 'Jouer en Ligne',
    playOnlineDesc: 'Rejoindre une partie en ligne ou jouer avec des bots IA',
    gmAssistant: 'Assistant Narrateur',
    gmAssistantDesc: 'Guide d’appel de nuit étape par étape et calcul automatique des victimes',
    virtualCards: 'Cartes Virtuelles Mobiles',
    virtualCardsDesc: 'Consulter sa carte secrète et ses instructions sur smartphone sans jeu de cartes',
    leaderboard: 'Classement',
    matchHistory: 'Historique des Parties',
    roleEncyclopedia: 'Guide des Rôles',
    voiceChat: 'Discussion Vocale',
    voiceLive: 'En train de parler',
    muteMic: 'Couper le micro',
    unmuteMic: 'Activer le micro',
    pushToTalk: 'Appuyer pour parler',
    antiCheatActive: 'Anti-Triche Actif',
    antiCheatDesc: 'Isolation des morts, vérification des votes et protection des rôles',
    createRoom: 'Créer une Salle',
    joinRoom: 'Rejoindre avec un Code',
    quickMatch: 'Partie Rapide avec IA',
    roomId: 'Code de Salle',
    enterRoomId: 'Entrer le code de salle',
    yourName: 'Votre Pseudo',
    enterName: 'Entrez votre pseudo...',
    loginSocial: 'Connexion Rapide',
    loginGoogle: 'Continuer avec Google',
    loginDiscord: 'Continuer avec Discord',
    loginGuest: 'Invité',
    factionVillager: 'Villageois',
    factionWerewolf: 'Loups-Garous',
    factionNeutral: 'Neutre',
    alive: 'Vivant',
    dead: 'Mort',
    nightPhase: 'Phase de Nuit',
    dayDiscussion: 'Discussion du Jour',
    dayVoting: 'Vote d’Élimination',
    hunterRetribution: 'Tir du Chasseur',
    nightFalls: 'La nuit tombe, le village s’endort...',
    dayBreaks: 'Le jour se lève, le village se réveille...',
    castVote: 'Voter',
    skipVote: 'S’abstenir',
    revealRole: 'Révéler ma Carte Secrète',
    hideRole: 'Masquer la Carte',
    gmNextStep: 'Étape Suivante',
    gmPrevStep: 'Étape Précédente',
    gmResolveNight: 'Résoudre la Nuit',
    gmAnnounceVictims: 'Annoncer les Morts',
    gmEndGame: 'Terminer la Partie',
    soundToggle: 'Son',
    language: 'Langue',
  },
  es: {
    appTitle: 'Leyenda de Hombres Lobo',
    appSubtitle: 'Deducción Social y Asistente de Narrador',
    playOnline: 'Jugar Online',
    playOnlineDesc: 'Únete a partidas online o juega con bots inteligentes',
    gmAssistant: 'Asistente de Narrador',
    gmAssistantDesc: 'Llamada de roles nocturna guiada y cálculo de resultados automático',
    virtualCards: 'Baraja Virtual en Móvil',
    virtualCardsDesc: 'Consulta tu carta secreta y guía de rol en el móvil sin cartas físicas',
    leaderboard: 'Clasificación',
    matchHistory: 'Historial de Partidas',
    roleEncyclopedia: 'Enciclopedia de Roles',
    voiceChat: 'Chat de Voz',
    voiceLive: 'Hablando',
    muteMic: 'Silenciar micrófono',
    unmuteMic: 'Activar micrófono',
    pushToTalk: 'Pulsar para hablar',
    antiCheatActive: 'Anti-Trampas Activado',
    antiCheatDesc: 'Separación del chat de muertos y validación de votos',
    createRoom: 'Crear Sala',
    joinRoom: 'Unirse con Código',
    quickMatch: 'Partida Rápida con IA',
    roomId: 'Código de Sala',
    enterRoomId: 'Introduce el código',
    yourName: 'Tu Apodo',
    enterName: 'Escribe tu nombre...',
    loginSocial: 'Inicio de Sesión',
    loginGoogle: 'Continuar con Google',
    loginDiscord: 'Continuar con Discord',
    loginGuest: 'Invitado',
    factionVillager: 'Aldeanos',
    factionWerewolf: 'Hombres Lobo',
    factionNeutral: 'Neutral',
    alive: 'Vivo',
    dead: 'Muerto',
    nightPhase: 'Fase Nocturna',
    dayDiscussion: 'Debate Diurno',
    dayVoting: 'Votación Diurna',
    hunterRetribution: 'Disparo del Cazador',
    nightFalls: 'Cae la noche, el pueblo se duerme...',
    dayBreaks: 'Amanece en la aldea...',
    castVote: 'Votar',
    skipVote: 'Abstenerse',
    revealRole: 'Ver Carta Secreta',
    hideRole: 'Ocultar Carta',
    gmNextStep: 'Siguiente Paso',
    gmPrevStep: 'Paso Anterior',
    gmResolveNight: 'Resolver Noche',
    gmAnnounceVictims: 'Anunciar Víctimas',
    gmEndGame: 'Finalizar Partida',
    soundToggle: 'Sonido',
    language: 'Idioma',
  },
  ja: {
    appTitle: '伝説の人狼 (Werewolf)',
    appSubtitle: 'オンライン対戦＆ゲームマスター支援ツール',
    playOnline: 'オンライン対戦',
    playOnlineDesc: 'オンライン部屋またはAIボット対戦、ボイスチャット機能付き',
    gmAssistant: 'GM（ゲームマスター）支援',
    gmAssistantDesc: '夜の点呼スクリプト、自動判定ロジックで対面プレイを完全サポート',
    virtualCards: 'スマホ配役カード',
    virtualCardsDesc: 'カードが手元になくてもスマホで役職確認＆初心者解説を表示',
    leaderboard: 'ランキング',
    matchHistory: '対戦履歴',
    roleEncyclopedia: '役職図鑑',
    voiceChat: 'ボイスチャット',
    voiceLive: '発言中',
    muteMic: 'マイクOFF',
    unmuteMic: 'マイクON',
    pushToTalk: 'プッシュトゥトーク',
    antiCheatActive: '不正防止システム稼働中',
    antiCheatDesc: '霊界チャット分離、二重投票防止、役職秘匿ガード',
    createRoom: 'ルーム作成',
    joinRoom: 'コードで参加',
    quickMatch: 'AIボットとすぐ対戦',
    roomId: 'ルームID',
    enterRoomId: 'ルームIDを入力',
    yourName: 'プレイヤー名',
    enterName: 'お名前を入力...',
    loginSocial: 'ソーシャルログイン',
    loginGoogle: 'Googleでログイン',
    loginDiscord: 'Discordでログイン',
    loginGuest: 'ゲストでプレイ',
    factionVillager: '村人陣営',
    factionWerewolf: '人狼陣営',
    factionNeutral: '第三勢力',
    alive: '生存',
    dead: '死亡',
    nightPhase: '夜のフェーズ',
    dayDiscussion: '昼の議論',
    dayVoting: '処刑投票',
    hunterRetribution: 'ハンターの道連れ射撃',
    nightFalls: '夜が訪れ、村人たちは眠りにつきました...',
    dayBreaks: '朝が来ました、村人が目覚めます...',
    castVote: '投票する',
    skipVote: '棄権する',
    revealRole: '秘密のカードを確認',
    hideRole: 'カードを伏せる',
    gmNextStep: '次の役職点呼',
    gmPrevStep: '前の役職',
    gmResolveNight: '夜の判定実行',
    gmAnnounceVictims: '犠牲者を発表',
    gmEndGame: 'ゲーム終了',
    soundToggle: 'サウンド',
    language: '言語',
  },
};
