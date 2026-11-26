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
  firstPersonBtn: string;
  firstPersonShort: string;
  firstPersonBanner: string;
  fpvTargetPrompt: (name: string) => string;
  dpadWalkFpv: string;
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

  // Title Screen & Match Settings
  lockerAndMaps: string;
  matchSettings: string;
  view3dBtn: string;
  expandMenuBtn: string;
  randomRoleShort: string;
  quickRulesTitle: string;
  quickRulesDesc: string;
  playTutorialTitle: string;
  playTutorialDesc: string;
  campfireMapLabel: string;
  phaseTimers: string;
  presetFast: string;
  presetStandard: string;
  presetRelaxed: string;
  nightLabel: string;
  debateLabel: string;
  voteLabel: string;
  practiceHelper: string;
  playCampfireAi: string;
  playOnline: string;
  gmAssistant: string;
  saveEloHint: string;
  signIn: string;
  createAccount: string;
  resumeMatchBtn: string;
  dismissBtn: string;

  // In-Game HUD, Role Card, Briefing, Night/Day Consoles & Pause Modal
  yourRoleIs: string;
  callingProgress: string;
  nextStep: string;
  mayorBadge: string;
  mayorTooltip: string;
  briefing: string;
  voteAction: string;
  notebookBtn: string;
  emotesAndProps: string;
  emotes3dLabel: string;
  voiceBtn: string;
  loverLabel: string;
  wolfAllyLabel: string;
  campfireGm: string;
  nightCasualties: string;
  eliminatedLabel: string;
  survivors: string;
  replayMatch: string;
  replayVoice: string;
  privateGmNotice: string;
  behindCamBtn: string;
  behindCamShort: string;
  fpvShort: string;
  thirdPartyAlive: string;
  gameOverShort: string;
  freeLookTooltip: string;
  micLockedDead: string;
  micLockedShort: string;
  ghostMicChatLocked: string;
  ghostChannelSilent: string;
  loneWolfTonight: string;
  bgmToggleLabel: string;
  sfxToggleLabel: string;
  onLabel: string;
  offLabel: string;
  phaseWaitTimersSec: string;
  guestPlayerPrefix: string;
  campfireAbstain: string;
  abstainShort: string;
  dayDiscussHint: string;
  youVotedAbstain: string;
  yourVotePrefix: string;
  selectSuspectHint: string;
  changeVoteBtn: string;
  finishBtn: string;
  holdFireBtn: string;
  nextShort: string;
  yourTurnBadge: string;
  confirmedWaiting: string;
  confirmAndEndNight: string;
  timeUpConfirmCue: string;
  packmatesPicked: string;
  tapTargetHint: string;
  witchHealDepletedDesc: string;
  witchNoFatalVictim: string;
  bittenPrefix: string;
  noVictimToHeal: string;
  poisonSealed: string;
  poisonReady: string;
  seerTargetPending: string;
  seerConfirmBtn: string;
  selectedPrefix: string;
  homeBtn: string;
  jumpToMyTurn: (roleName: string) => string;
  switchToNightRole: string;
  waitingNightTurn: string;
  blindfoldEmbersSub: string;
  sitBackBtn: string;
  sitShort: string;
  doppelModelLabel: string;
  suspectLabel: string;
  trustedLabel: string;
  votedBadge: string;
  behindViewBanner: string;
  ghostFlightBanner: string;
  winDraw: string;
  waitingHostRematch: string;
  deadChatLockedBanner: string;
  openGhostRealmBtn: string;
  ghostChatIsolatedBanner: string;
  lockedBtn: string;
  gmHostShellTitle: string;
  gmHostShellSubtitle: string;
  gmPlayerShellTitle: string;
  gmPlayerShellSubtitle: string;
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
    firstPersonBtn: 'Góc Nhìn Thứ Nhất [V]',
    firstPersonShort: 'Góc Nhìn 1 [V]',
    firstPersonBanner:
      '👁️ GÓC NHÌN THỨ NHẤT [V]: Giữ chuột kéo xoay 360° (bấm 360° khóa chuột) · WASD Đi · Space Nhảy · E/Click Tương tác',
    fpvTargetPrompt: (name) => `🎯 Đang ngắm: ${name} — Bấm [E] hoặc Click để tương tác`,
    dpadWalkFpv: 'Đi Bộ Góc Nhìn 1',
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
        badge: 'BƯỚC 1 / 5 · ĐỒNG HỒ & TRẠNG THÁI VÁN ĐẤU',
        title: 'Theo Dõi Pha Đấu, Thời Gian & Số Người Sống',
        description:
          'Thanh góc trên bên trái hiển thị vòng Đêm/Ngày hiện tại, đồng hồ đếm ngược (có nút -10s / +15s tùy chỉnh) và tổng số người chơi còn sống trong làng.',
        tips: [
          'Ban đêm, tầm nhìn sẽ tự động che tối để chống gian lận cho đến đúng lượt vai trò của bạn thức dậy.',
          'Bạn có thể tăng/giảm thời gian hoặc bấm nút qua pha nhanh bất cứ lúc nào khi đấu với AI.',
        ],
      },
      {
        badge: 'BƯỚC 2 / 5 · BẢNG HÀNH ĐỘNG THEO PHA',
        title: 'Chỉ Dẫn Nhiệm Vụ Ban Đêm & Bỏ Phiếu Ban Ngày',
        description:
          'Bảng trung tâm phía trên luôn cho biết bạn cần làm gì ngay lúc này: chọn mục tiêu dùng kỹ năng vào Ban Đêm, xem Tin Sáng khi Thảo Luận, hoặc chốt phiếu & xem bảng kiểm phiếu minh bạch khi Bỏ Phiếu.',
        tips: [
          'Mỗi người chơi chỉ có duy nhất 1 phiếu bầu công bằng — có thể bấm "Đổi phiếu" hoặc chọn Lửa Trại để bỏ phiếu trắng.',
          'Với Phù Thủy, nút Bình Cứu Sống sẽ xuất hiện trực tiếp ngay trên bảng này khi đến lượt.',
        ],
      },
      {
        badge: 'BƯỚC 3 / 5 · SÂN KHẤU LÀNG 3D & VÒNG LỬA TRẠI',
        title: 'Quan Sát Toàn Cảnh 3D, Di Chuyển & Tương Tác Trực Tiếp',
        description:
          'Khu vực trung tâm là vòng lửa trại 3D nơi mọi nhân vật ngồi quây quần. Kéo màn hình để xoay góc nhìn, bấm trực tiếp vào nhân vật 3D để dùng kỹ năng đêm, ném đạo cụ ban ngày hoặc bỏ phiếu.',
        tips: [
          'Dùng phím WASD để đứng dậy đi dạo quanh làng (Shift chạy, Space nhảy, X ngồi lại ghế).',
          'Nếu bị loại, bạn sẽ hóa thành Hồn Ma 3D bay lượn tự do nhưng chat & micro sẽ bị khóa để đảm bảo công bằng.',
        ],
      },
      {
        badge: 'BƯỚC 4 / 5 · THANH CÔNG CỤ VAI TRÒ & GÓC NHÌN',
        title: 'Xem Lại Thẻ Vai, Đổi Góc Nhìn Thứ Nhất & Âm Thanh',
        description:
          'Thanh góc trên bên phải giúp bạn mở lại Thẻ Bài Vai Trò bí mật, chuyển đổi giữa Góc Nhìn Thứ Nhất [V], chế độ xoay 360°, đổi góc máy 3D, bật/tắt Micro, Âm thanh [M] hoặc Tạm dừng [P].',
        tips: [
          'Bấm vào tên vai trò màu vàng để xem chi tiết kỹ năng & cách chơi bất cứ lúc nào.',
          'Nhấn phím [V] để nhập vai góc nhìn thứ nhất và dùng [E] hoặc Click để tương tác.',
        ],
      },
      {
        badge: 'BƯỚC 5 / 5 · BẢNG ĐIỀU KHIỂN DƯỚI & DANH SÁCH GHẾ',
        title: 'Sổ Tay Suy Luận, Biểu Cảm, Chat & Chọn Nhanh Người Chơi',
        description:
          'Thanh điều khiển phía dưới chứa toàn bộ công cụ hỗ trợ: Sổ Tay ghi chú riêng, Biểu cảm & Đạo cụ ném 3D (Cà chua, Trứng, Hoa, Nước), Kênh Voice/Chat, BXH, Luật chơi và dãy ghế chọn nhanh từng người chơi.',
        tips: [
          'Chạm vào thẻ ghế ở hàng dưới để chọn mục tiêu cực nhanh, đặc biệt tiện trên màn hình nhỏ.',
          'Nhấn phím [H] hoặc nút "Thu Gọn HUD" khi muốn ẩn thanh dưới để ngắm trọn cảnh làng 3D.',
        ],
      },
    ],
    lockerAndMaps: 'Tủ Đồ & Bản Đồ',
    matchSettings: 'Cài đặt ván đấu',
    view3dBtn: 'Ngắm 3D',
    expandMenuBtn: 'Mở Menu',
    randomRoleShort: 'Vai ngẫu nhiên',
    quickRulesTitle: 'Xem nhanh Luật & 13 Vai Trò',
    quickRulesDesc: 'Đọc kỹ năng từng vai, không cần vào trận',
    playTutorialTitle: 'Chơi Tutorial hướng dẫn 5 bước',
    playTutorialDesc: 'Vào bàn tập thực hành trực tiếp cùng AI',
    campfireMapLabel: 'Bản đồ lửa trại 3D',
    phaseTimers: 'Thời lượng các pha',
    presetFast: 'Nhanh',
    presetStandard: 'Chuẩn',
    presetRelaxed: 'Thư thả',
    nightLabel: 'Đêm',
    debateLabel: 'Thảo luận',
    voteLabel: 'Bỏ phiếu',
    practiceHelper: 'Chế độ Tập Chơi: Hiện số Sói / Dân còn sống trên HUD',
    playCampfireAi: 'Vào Làng Quanh Lửa Trại (AI)',
    playOnline: 'Chơi Online',
    gmAssistant: 'Trợ Lý Quản Trò',
    saveEloHint: 'Lưu ELO & lịch sử đấu:',
    signIn: 'Đăng Nhập',
    createAccount: 'Đăng Ký',
    resumeMatchBtn: '▶️ Tiếp tục ván đang dở',
    dismissBtn: 'Bỏ qua',
    yourRoleIs: 'Vai trò của bạn là',
    callingProgress: 'Đang gọi',
    nextStep: 'Bước tiếp',
    mayorBadge: 'Thị Trưởng (x2)',
    mayorTooltip: 'Thị Trưởng có phiếu bầu x2 để phá thế hòa',
    briefing: 'Tin sáng',
    voteAction: 'Bỏ Phiếu',
    notebookBtn: 'Sổ Tay',
    emotesAndProps: 'Biểu cảm & Đạo cụ',
    emotes3dLabel: 'Biểu cảm 3D:',
    voiceBtn: 'Voice',
    loverLabel: 'Tình nhân',
    wolfAllyLabel: 'Đồng đội Sói',
    campfireGm: 'Quản Trò Lửa Trại',
    nightCasualties: 'Thương vong đêm qua',
    eliminatedLabel: 'Người chơi bị loại',
    survivors: 'Người sống sót',
    replayMatch: 'Chơi lại',
    replayVoice: 'Đọc lại',
    privateGmNotice: 'Thông báo mật dành riêng cho bạn',
    behindCamBtn: 'Sau lưng [B]',
    behindCamShort: 'Sau lưng',
    fpvShort: 'Góc 1',
    thirdPartyAlive: 'PHE THỨ 3',
    gameOverShort: 'KẾT THÚC',
    freeLookTooltip: 'Khóa chuột xoay 360° không giới hạn (bấm Esc để mở khóa chuột)',
    micLockedDead: '👻 Đã chết (Hồn Ma) — Micro đã bị khóa',
    micLockedShort: 'Mic Khóa',
    ghostMicChatLocked: '👻 Hồn Ma — Mic & Chat Đã Khóa',
    ghostChannelSilent: 'Kênh Hồn Ma đang im lặng — quan sát ván đấu...',
    loneWolfTonight: 'Bạn là Sói duy nhất đêm nay — hãy tự chọn mục tiêu.',
    bgmToggleLabel: 'Nhạc nền & Không khí',
    sfxToggleLabel: 'Hiệu ứng & Giọng đọc',
    onLabel: 'Bật',
    offLabel: 'Tắt',
    phaseWaitTimersSec: 'Thời gian chờ các pha (Giây)',
    guestPlayerPrefix: 'Người Chơi',
    campfireAbstain: 'Lửa Trại (Phiếu Trắng)',
    abstainShort: 'Lửa Trại',
    dayDiscussHint: 'Chia sẻ manh mối quanh lửa trại trước khi bỏ phiếu',
    youVotedAbstain: '🔥 Bạn chọn Phiếu Trắng (Lửa Trại)',
    yourVotePrefix: 'Bạn bầu:',
    selectSuspectHint: 'Chọn 1 nghi phạm hoặc bấm Lửa Trại để bỏ phiếu trắng!',
    changeVoteBtn: 'Đổi phiếu',
    finishBtn: 'Kết Thúc',
    holdFireBtn: 'Giữ súng (Không bắn)',
    nextShort: 'Tiếp',
    yourTurnBadge: 'Lượt bạn',
    confirmedWaiting: '✓ Đã xác nhận — chờ người khác...',
    confirmAndEndNight: 'Xác Nhận & Kết Thúc Đêm',
    timeUpConfirmCue: '⏳ Hết giờ — bấm Xác Nhận để tiếp tục',
    packmatesPicked: 'Đồng đội Sói chọn:',
    tapTargetHint: '(Bấm vào nhân vật 3D hoặc thanh bên dưới)',
    witchHealDepletedDesc: '🧪 Bình Cứu đã dùng hết — Không thể thấy nạn nhân bị Sói cắn đêm nay',
    witchNoFatalVictim: '🐺 Đêm nay không có nạn nhân nào nguy kịch vì vết cắn Sói',
    bittenPrefix: 'Bị Sói cắn:',
    noVictimToHeal: 'Không có ai để cứu',
    poisonSealed: '🧪 Bình độc đã bị phong ấn',
    poisonReady: '🧪 Còn bình độc',
    seerTargetPending: 'Đang ngắm soi:',
    seerConfirmBtn: 'Xác Nhận Soi',
    selectedPrefix: 'Đã chọn:',
    homeBtn: 'Trang Chủ',
    jumpToMyTurn: (roleName) => `⚡ Tua Tới Lượt Tôi (${roleName})`,
    switchToNightRole: 'Đổi Vai Có Kỹ Năng Đêm',
    waitingNightTurn: 'Đang chờ lượt đêm',
    blindfoldEmbersSub: 'Màn đêm bao trùm, chỉ còn ánh lửa trại le lói...',
    sitBackBtn: 'Ngồi lại vào ghế của bạn [X]',
    sitShort: 'Về ghế',
    doppelModelLabel: 'Hình mẫu',
    suspectLabel: 'Nghi Sói',
    trustedLabel: 'Đáng tin',
    votedBadge: '✓ Bạn bầu',
    behindViewBanner:
      '👁️ GÓC NHÌN SAU LƯNG [B]: Giữ chuột kéo xoay 360° (bấm 360° khóa chuột) · WASD Đi · Space Nhảy · E/Click Tương tác',
    ghostFlightBanner:
      '👻 Chế độ Hồn Ma · Bay tự do WASD · Space Lên / Shift Xuống · Giữ chuột kéo xoay 360° · 🔒 Chat Làng & Mic đã khóa · Mở Khu Vực Ma',
    winDraw: 'HÒA — KHÔNG CÒN AI SỐNG SÓT!',
    waitingHostRematch: '⏳ Đang chờ Chủ phòng bắt đầu ván mới...',
    deadChatLockedBanner: '👻 Bạn đã thành Hồn Ma — Phòng Chính bị khóa để chống gian lận!',
    openGhostRealmBtn: 'Sang Khu Vực Ma',
    ghostChatIsolatedBanner:
      '👻 Kênh Hồn Ma cách ly — Chỉ người đã chết mới đọc được tin nhắn tại đây.',
    lockedBtn: 'Đã khóa',
    gmHostShellTitle: 'Chế Độ Quản Trò Ngoài Đời',
    gmHostShellSubtitle: 'Công cụ hỗ trợ ván đấu ngoài đời · Không liên quan chế độ Bot/Online',
    gmPlayerShellTitle: 'Thẻ Bài Cá Nhân — Phòng Quản Trò',
    gmPlayerShellSubtitle: 'Chỉ hiển thị duy nhất vai trò của bạn',
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
    firstPersonBtn: 'First-Person View [V]',
    firstPersonShort: '1st Person [V]',
    firstPersonBanner:
      '👁️ FIRST-PERSON VIEW [V]: Drag mouse to look 360° (click 360° for pointer lock) · WASD Move · Space Jump · E/Click Interact',
    fpvTargetPrompt: (name) => `🎯 Aiming at: ${name} — Press [E] or Click to interact`,
    dpadWalkFpv: '1st-Person Walk',
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
        badge: 'STEP 1 / 5 · PHASE DIAL, TIMER & SURVIVORS',
        title: 'Track Match Phase, Countdown & Alive Count',
        description:
          'The top-left panel displays the current Night/Day phase, countdown timer (with -10s / +15s controls), and how many villagers remain alive.',
        tips: [
          'At night, your screen is safely blindfolded until your own role is called to act.',
          'Adjust the timer or fast-forward phases whenever you are practicing against AI.',
        ],
      },
      {
        badge: 'STEP 2 / 5 · ACTIVE PHASE ACTION CONSOLE',
        title: 'Night Role Tasks & Daytime Voting Console',
        description:
          'The top-center console always tells you your exact current action: target a player for Night abilities, review Morning Briefings during Day Debate, or lock in your single vote with live tallies.',
        tips: [
          'Every living player casts 1 fair vote — click "Change" to switch or click Campfire to abstain.',
          'When playing Witch, your Heal potion button appears right inside this panel on your turn.',
        ],
      },
      {
        badge: 'STEP 3 / 5 · 3D CAMPFIRE VILLAGE ARENA',
        title: 'Explore the 3D Circle, Walk Around & Click Players',
        description:
          'The central 3D arena shows every player gathered around the campfire. Drag to orbit the camera, and click any 3D character directly to use Night powers, throw Day props, or cast your vote.',
        tips: [
          'Use WASD to stand up and walk around the clearing (Shift sprint, Space jump, X sit back down).',
          'If eliminated, you rise as a free-flying 3D Ghost with chat and mic locked for fair play.',
        ],
      },
      {
        badge: 'STEP 4 / 5 · ROLE, CAMERA & AUDIO TOOLBAR',
        title: 'Secret Role Card, First-Person View & Controls',
        description:
          'The top-right toolbar lets you reopen your Secret Role Card anytime, toggle First-Person View [V], 360° Free-Look, Camera Presets, Microphone, Audio [M], Tutorial, and Pause [P].',
        tips: [
          'Tap your gold Role badge anytime to check your exact powers and win condition.',
          'Press [V] to enter First-Person mode and use [E] or Click to interact with players.',
        ],
      },
      {
        badge: 'STEP 5 / 5 · BOTTOM CONTROL DOCK & SEAT STRIP',
        title: 'Deduction Notebook, Emotes, Chat & Quick Seat Select',
        description:
          'The bottom dock holds your private Deduction Notebook, daytime 3D Emotes & Throwing Props (Tomato, Egg, Rose, Water), Voice/Chat, Leaderboard, Rules, and a quick-select strip for every seat.',
        tips: [
          'Tap any player chip along the bottom strip to target them instantly—especially handy on mobile.',
          'Press [H] or tap the collapse tab to hide the dock for an unobstructed 3D view.',
        ],
      },
    ],
    lockerAndMaps: 'Locker & Maps',
    matchSettings: 'Match Settings',
    view3dBtn: '3D View',
    expandMenuBtn: 'Expand',
    randomRoleShort: 'Random role',
    quickRulesTitle: 'Quick Rules & 13 Roles',
    quickRulesDesc: 'Read role abilities without starting a match',
    playTutorialTitle: 'Play 5-Step Interactive Tutorial',
    playTutorialDesc: 'Jump into a guided live practice table',
    campfireMapLabel: '3D Campfire Map',
    phaseTimers: 'Phase Timers',
    presetFast: 'Fast',
    presetStandard: 'Standard',
    presetRelaxed: 'Relaxed',
    nightLabel: 'Night',
    debateLabel: 'Debate',
    voteLabel: 'Vote',
    practiceHelper: 'Practice Helper: Show exact Wolves / Villagers alive on HUD',
    playCampfireAi: 'Play Around Campfire (AI)',
    playOnline: 'Play Online',
    gmAssistant: 'GM Assistant',
    saveEloHint: 'Save ELO & match history:',
    signIn: 'Sign In',
    createAccount: 'Create Account',
    resumeMatchBtn: '▶️ Resume Match',
    dismissBtn: 'Dismiss',
    yourRoleIs: 'Your role is',
    callingProgress: 'Calling',
    nextStep: 'Next Step',
    mayorBadge: 'Mayor (x2)',
    mayorTooltip: 'Village Mayor has a 2x tie-breaking vote',
    briefing: 'Briefing',
    voteAction: 'Vote',
    notebookBtn: 'Notebook',
    emotesAndProps: 'Emotes & Props',
    emotes3dLabel: '3D Emotes:',
    voiceBtn: 'Voice',
    loverLabel: 'Lover',
    wolfAllyLabel: 'Wolf Ally',
    campfireGm: 'Campfire Game Master',
    nightCasualties: 'Night Casualties',
    eliminatedLabel: 'Eliminated',
    survivors: 'Survivors',
    replayMatch: 'Replay',
    replayVoice: 'Replay',
    privateGmNotice: 'Private GM Notice (Only You Can See)',
    behindCamBtn: 'Behind [B]',
    behindCamShort: '3rd',
    fpvShort: 'FPV',
    thirdPartyAlive: '3RD PARTY',
    gameOverShort: 'GAME OVER',
    freeLookTooltip: 'Lock cursor for unlimited 360° look (press Esc to unlock)',
    micLockedDead: '👻 Dead (Ghost) — Microphone Locked',
    micLockedShort: 'Mic Locked',
    ghostMicChatLocked: '👻 Ghost — Mic & Chat Locked',
    ghostChannelSilent: 'Ghost channel silent — spectating the match...',
    loneWolfTonight: 'You are the lone Wolf tonight — choose your target.',
    bgmToggleLabel: 'BGM & Ambience',
    sfxToggleLabel: 'SFX & Voice',
    onLabel: 'On',
    offLabel: 'Off',
    phaseWaitTimersSec: 'Phase Wait Timers (Seconds)',
    guestPlayerPrefix: 'Player',
    campfireAbstain: 'Campfire (Abstain)',
    abstainShort: 'Abstain',
    dayDiscussHint: 'Share campfire clues before voting',
    youVotedAbstain: '🔥 You voted Campfire Abstain',
    yourVotePrefix: 'Your vote:',
    selectSuspectHint: 'Select 1 suspect or click the Campfire to abstain!',
    changeVoteBtn: 'Change',
    finishBtn: 'Finish',
    holdFireBtn: 'Hold Fire (No Shot)',
    nextShort: 'Next',
    yourTurnBadge: 'Your Turn',
    confirmedWaiting: '✓ Confirmed — waiting for others...',
    confirmAndEndNight: 'Confirm & End Night',
    timeUpConfirmCue: '⏳ Time is up — press Confirm to continue',
    packmatesPicked: 'Packmates picked:',
    tapTargetHint: '(Tap a 3D villager or bottom dock)',
    witchHealDepletedDesc: '🧪 Heal potion depleted — Tonight’s wolf victim is hidden',
    witchNoFatalVictim: '🐺 No fatal werewolf victim tonight',
    bittenPrefix: 'Bitten:',
    noVictimToHeal: 'No victim to heal',
    poisonSealed: '🧪 Poison potion sealed',
    poisonReady: '🧪 Poison Ready',
    seerTargetPending: 'Target selected:',
    seerConfirmBtn: 'Confirm Inspect',
    selectedPrefix: 'Selected:',
    homeBtn: 'Home',
    jumpToMyTurn: (roleName) => `⚡ Jump to My Turn (${roleName})`,
    switchToNightRole: 'Switch to Night Role',
    waitingNightTurn: 'Waiting for night turn',
    blindfoldEmbersSub: 'Darkness falls, leaving only the campfire embers glowing...',
    sitBackBtn: 'Sit Back on Your Stool [X]',
    sitShort: 'Sit',
    doppelModelLabel: 'Model',
    suspectLabel: 'Suspect',
    trustedLabel: 'Trusted',
    votedBadge: '✓ Voted',
    behindViewBanner:
      '👁️ BEHIND VIEW [B]: Drag mouse to look 360° (click 360° for pointer lock) · WASD Move · Space Jump · E/Click Interact',
    ghostFlightBanner:
      '👻 Ghost Mode · Free Flight WASD · Space Up / Shift Down · Drag to Look 360° · 🔒 Village Chat & Mic Locked · Ghost Realm Open',
    winDraw: 'DRAW — NO SURVIVORS!',
    waitingHostRematch: '⏳ Waiting for Room Host to start a new match...',
    deadChatLockedBanner: '👻 You are a Ghost — Main Chat is locked to prevent cheating!',
    openGhostRealmBtn: 'Open Ghost Realm',
    ghostChatIsolatedBanner:
      '👻 Isolated Ghost Realm — Only eliminated players can read messages here.',
    lockedBtn: 'Locked',
    gmHostShellTitle: 'Real-Life Game Master Mode',
    gmHostShellSubtitle: 'Offline table companion · Isolated from Bot/Online matches',
    gmPlayerShellTitle: 'Personal Role Card — GM Room',
    gmPlayerShellSubtitle: 'Shows ONLY your own secret role',
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
    firstPersonBtn: 'Vue 1re Personne [V]',
    firstPersonShort: '1re Pers. [V]',
    firstPersonBanner:
      '👁️ VUE 1RE PERSONNE [V] : Glissez la souris pour regarder à 360° (cliquez 360° pour verrouiller le curseur) · WASD Bouger · Espace Sauter · E/Clic Interagir',
    fpvTargetPrompt: (name) => `🎯 Cible : ${name} — Appuyez sur [E] ou Cliquez`,
    dpadWalkFpv: 'Marche 1re Pers.',
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
        badge: 'ÉTAPE 1 / 5 · PHASE, CHRONO & SURVIVANTS',
        title: 'Suivez la Phase, le Temps et les Joueurs Vivants',
        description:
          'Le panneau en haut à gauche indique la phase Nuit/Jour, le compte à rebours (-10s / +15s) et le nombre de survivants.',
        tips: [
          'La nuit, la vision est protégée jusqu’au réveil de votre rôle.',
          'Ajustez le chrono ou passez rapidement la phase en mode IA.',
        ],
      },
      {
        badge: 'ÉTAPE 2 / 5 · CONSOLE D’ACTION CENTRALE',
        title: 'Missions Nocturnes & Vote Transparent du Jour',
        description:
          'La barre centrale supérieure affiche votre action en cours : pouvoir de nuit, résumé matinal ou vote unique avec décompte en direct.',
        tips: [
          'Chaque joueur vivant dispose d’un vote équitable (ou vote blanc au feu de camp).',
          'La potion de vie de la Sorcière apparaît directement dans cette console.',
        ],
      },
      {
        badge: 'ÉTAPE 3 / 5 · VILLAGE 3D & FEU DE CAMP',
        title: 'Explorez le Cercle 3D et Interagissez en Direct',
        description:
          'Faites glisser pour tourner la caméra autour du feu de camp et cliquez directement sur les personnages 3D pour agir, lancer des objets ou voter.',
        tips: [
          'Utilisez WASD pour vous lever et marcher (X pour vous rasseoir).',
          'Une fois éliminé, volez en Fantôme 3D avec micro et chat verrouillés.',
        ],
      },
      {
        badge: 'ÉTAPE 4 / 5 · BARRE RÔLE, CAMÉRA & AUDIO',
        title: 'Carte de Rôle, Vue 1re Personne [V] & Réglages',
        description:
          'En haut à droite : rouvrez votre carte secrète, activez la vue 1re personne [V], la rotation 360°, le micro, le son [M] ou la pause [P].',
        tips: [
          'Cliquez sur le badge de votre rôle pour relire vos pouvoirs à tout moment.',
          'Appuyez sur [V] pour passer en vue subjective.',
        ],
      },
      {
        badge: 'ÉTAPE 5 / 5 · BARRE INFÉRIEURE & SIÈGES',
        title: 'Carnet, Émotes 3D, Chat & Sélection Rapide',
        description:
          'La barre du bas regroupe votre Carnet de déduction, les Émotes & Objets 3D (Tomate, Œuf, Rose, Eau), le Chat, le Classement et les cartes de joueurs.',
        tips: [
          'Touchez un siège en bas pour cibler un joueur instantanément.',
          'Appuyez sur [H] pour masquer la barre et profiter de la vue 3D.',
        ],
      },
    ],
    lockerAndMaps: 'Vestiaire & Cartes',
    matchSettings: 'Paramètres',
    view3dBtn: 'Vue 3D',
    expandMenuBtn: 'Ouvrir Menu',
    randomRoleShort: 'Rôle aléatoire',
    quickRulesTitle: 'Règles & 13 Rôles',
    quickRulesDesc: 'Consultez les pouvoirs sans lancer de partie',
    playTutorialTitle: 'Tutoriel interactif en 5 étapes',
    playTutorialDesc: 'Rejoignez une table d’entraînement guidée avec l’IA',
    campfireMapLabel: 'Carte Feu de Camp 3D',
    phaseTimers: 'Durée des Phases',
    presetFast: 'Rapide',
    presetStandard: 'Standard',
    presetRelaxed: 'Détendu',
    nightLabel: 'Nuit',
    debateLabel: 'Débat',
    voteLabel: 'Vote',
    practiceHelper: 'Aide Entraînement : Afficher Loups / Villageois vivants sur le HUD',
    playCampfireAi: 'Jouer autour du Feu (IA)',
    playOnline: 'Jouer en Ligne',
    gmAssistant: 'Assistant MJ',
    saveEloHint: 'Sauvegarder ELO & historique :',
    signIn: 'Connexion',
    createAccount: 'Créer un Compte',
    resumeMatchBtn: '▶️ Reprendre la partie',
    dismissBtn: 'Ignorer',
    yourRoleIs: 'Votre rôle est',
    callingProgress: 'Appel en cours',
    nextStep: 'Étape suivante',
    mayorBadge: 'Maire (x2)',
    mayorTooltip: 'Le Maire possède un vote x2 pour départager',
    briefing: 'Bilan',
    voteAction: 'Voter',
    notebookBtn: 'Carnet',
    emotesAndProps: 'Émotes & Objets',
    emotes3dLabel: 'Émotes 3D :',
    voiceBtn: 'Vocal',
    loverLabel: 'Amoureux',
    wolfAllyLabel: 'Allié Loup',
    campfireGm: 'Maître du Feu de Camp',
    nightCasualties: 'Victimes de la nuit',
    eliminatedLabel: 'Éliminés',
    survivors: 'Survivants',
    replayMatch: 'Rejouer',
    replayVoice: 'Réécouter',
    privateGmNotice: 'Message secret du MJ (Visible par vous seul)',
    behindCamBtn: 'Dos [B]',
    behindCamShort: 'Dos',
    fpvShort: '1re',
    thirdPartyAlive: 'NEUTRES',
    gameOverShort: 'FIN',
    freeLookTooltip: 'Verrouiller le curseur pour vue 360° libre (Échap pour libérer)',
    micLockedDead: '👻 Mort (Fantôme) — Micro verrouillé',
    micLockedShort: 'Micro bloqué',
    ghostMicChatLocked: '👻 Fantôme — Micro & Chat verrouillés',
    ghostChannelSilent: 'Canal Fantôme silencieux — mode spectateur...',
    loneWolfTonight: 'Vous êtes le seul Loup cette nuit — choisissez votre cible.',
    bgmToggleLabel: 'Musique & Ambiance',
    sfxToggleLabel: 'Effets & Voix',
    onLabel: 'Activé',
    offLabel: 'Coupé',
    phaseWaitTimersSec: 'Durée des Phases (Secondes)',
    guestPlayerPrefix: 'Joueur',
    campfireAbstain: 'Feu de Camp (Abstention)',
    abstainShort: 'Abstention',
    dayDiscussHint: 'Partagez vos indices autour du feu avant le vote',
    youVotedAbstain: '🔥 Vous avez voté Blanc (Feu de Camp)',
    yourVotePrefix: 'Votre vote :',
    selectSuspectHint: 'Choisissez 1 suspect ou cliquez sur le Feu pour vous abstenir !',
    changeVoteBtn: 'Changer',
    finishBtn: 'Terminer',
    holdFireBtn: 'Ne pas tirer',
    nextShort: 'Suiv.',
    yourTurnBadge: 'À vous',
    confirmedWaiting: '✓ Confirmé — en attente des autres...',
    confirmAndEndNight: 'Confirmer & Fin de Nuit',
    timeUpConfirmCue: '⏳ Temps écoulé — confirmez pour continuer',
    packmatesPicked: 'Choix de la meute :',
    tapTargetHint: '(Cliquez un joueur 3D ou la barre du bas)',
    witchHealDepletedDesc: '🧪 Potion de vie épuisée — Victime des loups masquée',
    witchNoFatalVictim: '🐺 Aucune victime fatale des loups cette nuit',
    bittenPrefix: 'Mordu :',
    noVictimToHeal: 'Personne à sauver',
    poisonSealed: '🧪 Poison scellé',
    poisonReady: '🧪 Poison prêt',
    seerTargetPending: 'Cible choisie :',
    seerConfirmBtn: 'Confirmer Vision',
    selectedPrefix: 'Sélection :',
    homeBtn: 'Accueil',
    jumpToMyTurn: (roleName) => `⚡ Aller à mon tour (${roleName})`,
    switchToNightRole: 'Prendre un rôle nocturne',
    waitingNightTurn: 'En attente du tour nocturne',
    blindfoldEmbersSub: 'La nuit tombe, seules brillent les braises du feu...',
    sitBackBtn: 'Se rasseoir sur votre tabouret [X]',
    sitShort: 'Asseoir',
    doppelModelLabel: 'Modèle',
    suspectLabel: 'Suspect',
    trustedLabel: 'Fiable',
    votedBadge: '✓ Voté',
    behindViewBanner:
      '👁️ VUE DE DOS [B] : Glissez la souris pour regarder à 360° (cliquez 360° pour verrouiller le curseur) · WASD Bouger · Espace Sauter · E/Clic Interagir',
    ghostFlightBanner:
      '👻 Mode Fantôme · Vol libre WASD · Espace Monter / Shift Descendre · Glisser 360° · 🔒 Chat Village & Micro verrouillés · Salon Fantôme ouvert',
    winDraw: 'ÉGALITÉ — AUCUN SURVIVANT !',
    waitingHostRematch: '⏳ En attente que l’hôte lance une nouvelle partie...',
    deadChatLockedBanner: '👻 Vous êtes Fantôme — Le chat principal est verrouillé !',
    openGhostRealmBtn: 'Ouvrir Canal Fantôme',
    ghostChatIsolatedBanner:
      '👻 Canal Fantôme isolé — Seuls les joueurs éliminés peuvent lire ici.',
    lockedBtn: 'Verrouillé',
    gmHostShellTitle: 'Mode Maître du Jeu (Table)',
    gmHostShellSubtitle: 'Compagnon de jeu sur table · Séparé du mode IA/En Ligne',
    gmPlayerShellTitle: 'Carte Personnelle — Salle MJ',
    gmPlayerShellSubtitle: 'Affiche UNIQUEMENT votre rôle secret',
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
    firstPersonBtn: 'Primera Persona [V]',
    firstPersonShort: '1ra Pers. [V]',
    firstPersonBanner:
      '👁️ PRIMERA PERSONA [V]: Arrastra el ratón para mirar 360° (pulsa 360° para fijar el cursor) · WASD Mover · Espacio Saltar · E/Clic Interactuar',
    fpvTargetPrompt: (name) => `🎯 Apuntando a: ${name} — Pulsa [E] o Clic`,
    dpadWalkFpv: 'Caminar 1ra Pers.',
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
        badge: 'PASO 1 / 5 · FASE, TEMPORIZADOR Y VIVOS',
        title: 'Controla la Fase, el Tiempo y los Supervivientes',
        description:
          'El panel superior izquierdo muestra la fase Noche/Día, el temporizador (-10s / +15s) y cuántos jugadores siguen con vida.',
        tips: [
          'De noche tu vista queda protegida hasta que despierta tu rol.',
          'Ajusta el tiempo o avanza rápido cuando practiques con la IA.',
        ],
      },
      {
        badge: 'PASO 2 / 5 · CONSOLA DE ACCIÓN CENTRAL',
        title: 'Instrucciones Nocturnas y Votación Diurna',
        description:
          'La consola superior central indica tu acción actual: habilidades de noche, resumen del amanecer o tu voto único con conteo en vivo.',
        tips: [
          'Cada jugador vivo tiene exactamente 1 voto justo (o abstención en la fogata).',
          'Los botones de poción de la Bruja aparecen aquí en su turno.',
        ],
      },
      {
        badge: 'PASO 3 / 5 · ALDEA 3D Y FOGATA CENTRAL',
        title: 'Explora la Aldea 3D e Interactúa con los Jugadores',
        description:
          'Arrastra para girar la cámara alrededor de la fogata y haz clic directo en cualquier personaje 3D para usar habilidades, lanzar objetos o votar.',
        tips: [
          'Usa WASD para levantarte y caminar (X para volver a sentarte).',
          'Si mueres, vuelas libre como Fantasma 3D con chat y micro bloqueados.',
        ],
      },
      {
        badge: 'PASO 4 / 5 · BARRA DE ROL, CÁMARA Y AUDIO',
        title: 'Carta de Rol, Primera Persona [V] y Ajustes',
        description:
          'En la esquina superior derecha puedes revisar tu carta secreta, activar Primera Persona [V], giro 360°, micrófono, sonido [M] y pausa [P].',
        tips: [
          'Pulsa tu insignia de rol para consultar tus poderes en cualquier momento.',
          'Pulsa [V] para cambiar a vista en primera persona.',
        ],
      },
      {
        badge: 'PASO 5 / 5 · PANEL INFERIOR Y ASIENTOS',
        title: 'Cuaderno, Emotes 3D, Chat y Selección Rápida',
        description:
          'El panel inferior incluye tu Cuaderno privado, Emotes y Objetos 3D (Tomate, Huevo, Rosa, Agua), Voz/Chat, Ranking, Reglas y lista rápida de jugadores.',
        tips: [
          'Toca cualquier asiento abajo para seleccionar un objetivo al instante.',
          'Pulsa [H] para ocultar la barra y ver toda la aldea 3D.',
        ],
      },
    ],
    lockerAndMaps: 'Armario y Mapas',
    matchSettings: 'Ajustes',
    view3dBtn: 'Vista 3D',
    expandMenuBtn: 'Abrir Menú',
    randomRoleShort: 'Rol aleatorio',
    quickRulesTitle: 'Reglas y 13 Roles',
    quickRulesDesc: 'Lee habilidades sin iniciar una partida',
    playTutorialTitle: 'Tutorial interactivo de 5 pasos',
    playTutorialDesc: 'Entra a una mesa de práctica guiada con IA',
    campfireMapLabel: 'Mapa de Fogata 3D',
    phaseTimers: 'Tiempos de Fase',
    presetFast: 'Rápido',
    presetStandard: 'Estándar',
    presetRelaxed: 'Relajado',
    nightLabel: 'Noche',
    debateLabel: 'Debate',
    voteLabel: 'Votación',
    practiceHelper: 'Ayuda de Práctica: Mostrar Lobos / Aldeanos vivos en el HUD',
    playCampfireAi: 'Jugar en la Fogata (IA)',
    playOnline: 'Jugar Online',
    gmAssistant: 'Asistente Narrador',
    saveEloHint: 'Guardar ELO e historial:',
    signIn: 'Iniciar Sesión',
    createAccount: 'Crear Cuenta',
    resumeMatchBtn: '▶️ Reanudar partida',
    dismissBtn: 'Descartar',
    yourRoleIs: 'Tu rol es',
    callingProgress: 'Llamando',
    nextStep: 'Siguiente paso',
    mayorBadge: 'Alcalde (x2)',
    mayorTooltip: 'El Alcalde tiene voto doble para desempatar',
    briefing: 'Informe',
    voteAction: 'Votar',
    notebookBtn: 'Cuaderno',
    emotesAndProps: 'Emotes y Objetos',
    emotes3dLabel: 'Emotes 3D:',
    voiceBtn: 'Voz',
    loverLabel: 'Enamorado',
    wolfAllyLabel: 'Aliado Lobo',
    campfireGm: 'Narrador de la Fogata',
    nightCasualties: 'Bajas de la noche',
    eliminatedLabel: 'Eliminados',
    survivors: 'Supervivientes',
    replayMatch: 'Volver a jugar',
    replayVoice: 'Repetir',
    privateGmNotice: 'Aviso privado del Narrador (Solo tú lo ves)',
    behindCamBtn: 'Espalda [B]',
    behindCamShort: '3ra',
    fpvShort: '1ra',
    thirdPartyAlive: 'TERCERO',
    gameOverShort: 'FIN',
    freeLookTooltip: 'Fijar cursor para vista 360° libre (pulsa Esc para soltar)',
    micLockedDead: '👻 Muerto (Fantasma) — Micrófono bloqueado',
    micLockedShort: 'Mic bloqueado',
    ghostMicChatLocked: '👻 Fantasma — Mic y Chat bloqueados',
    ghostChannelSilent: 'Canal Fantasma en silencio — observando la partida...',
    loneWolfTonight: 'Eres el único Lobo esta noche — elige tu objetivo.',
    bgmToggleLabel: 'Música y Ambiente',
    sfxToggleLabel: 'Efectos y Voz',
    onLabel: 'Sí',
    offLabel: 'No',
    phaseWaitTimersSec: 'Temporizadores de Fase (Segundos)',
    guestPlayerPrefix: 'Jugador',
    campfireAbstain: 'Fogata (Abstención)',
    abstainShort: 'Abstenerse',
    dayDiscussHint: 'Comparte pistas en la fogata antes de votar',
    youVotedAbstain: '🔥 Votaste Abstención (Fogata)',
    yourVotePrefix: 'Tu voto:',
    selectSuspectHint: '¡Elige 1 sospechoso o pulsa la Fogata para abstenerte!',
    changeVoteBtn: 'Cambiar',
    finishBtn: 'Finalizar',
    holdFireBtn: 'No disparar',
    nextShort: 'Sig.',
    yourTurnBadge: 'Tu turno',
    confirmedWaiting: '✓ Confirmado — esperando a los demás...',
    confirmAndEndNight: 'Confirmar y Terminar Noche',
    timeUpConfirmCue: '⏳ Tiempo agotado — pulsa Confirmar para seguir',
    packmatesPicked: 'La manada eligió:',
    tapTargetHint: '(Toca un aldeano 3D o la barra inferior)',
    witchHealDepletedDesc: '🧪 Poción de cura agotada — Víctima oculta esta noche',
    witchNoFatalVictim: '🐺 Sin víctima mortal de los lobos esta noche',
    bittenPrefix: 'Mordido:',
    noVictimToHeal: 'Nadie que curar',
    poisonSealed: '🧪 Veneno sellado',
    poisonReady: '🧪 Veneno listo',
    seerTargetPending: 'Objetivo elegido:',
    seerConfirmBtn: 'Confirmar Visión',
    selectedPrefix: 'Seleccionado:',
    homeBtn: 'Inicio',
    jumpToMyTurn: (roleName) => `⚡ Ir a mi turno (${roleName})`,
    switchToNightRole: 'Cambiar a rol nocturno',
    waitingNightTurn: 'Esperando turno nocturno',
    blindfoldEmbersSub: 'Cae la noche, solo brillan las brasas de la fogata...',
    sitBackBtn: 'Volver a tu asiento [X]',
    sitShort: 'Sentarse',
    doppelModelLabel: 'Modelo',
    suspectLabel: 'Sospechoso',
    trustedLabel: 'Confiable',
    votedBadge: '✓ Votado',
    behindViewBanner:
      '👁️ VISTA TRASERA [B]: Arrastra el ratón para mirar 360° (pulsa 360° para fijar el cursor) · WASD Mover · Espacio Saltar · E/Clic Interactuar',
    ghostFlightBanner:
      '👻 Modo Fantasma · Vuelo libre WASD · Espacio Subir / Shift Bajar · Arrastrar 360° · 🔒 Chat de Aldea y Mic bloqueados · Chat Fantasma abierto',
    winDraw: '¡EMPATE — SIN SUPERVIVIENTES!',
    waitingHostRematch: '⏳ Esperando al anfitrión para nueva partida...',
    deadChatLockedBanner: '👻 Eres Fantasma — ¡El chat principal está bloqueado!',
    openGhostRealmBtn: 'Abrir Canal Fantasma',
    ghostChatIsolatedBanner:
      '👻 Canal Fantasma aislado — Solo los eliminados pueden leer aquí.',
    lockedBtn: 'Bloqueado',
    gmHostShellTitle: 'Modo Narrador en Vivo',
    gmHostShellSubtitle: 'Asistente de mesa · Separado del modo IA/Online',
    gmPlayerShellTitle: 'Carta Personal — Sala Narrador',
    gmPlayerShellSubtitle: 'Muestra SOLO tu rol secreto',
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
    firstPersonBtn: '一人称視点 [V]',
    firstPersonShort: '一人称 [V]',
    firstPersonBanner:
      '👁️ 一人称視点 [V]: マウスドラッグで360°視点（360°ボタンでポインター固定）・WASD移動・Spaceジャンプ・E/クリック操作',
    fpvTargetPrompt: (name) => `🎯 照準中: ${name} — [E]キーまたはクリックで選択`,
    dpadWalkFpv: '一人称移動',
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
        badge: 'ステップ 1 / 5 · フェーズ・タイマー・生存者',
        title: '進行フェーズと残り時間・生存人数を確認',
        description:
          '左上のパネルで現在の夜／昼フェーズ、残り秒数（-10s / +15s 調整可）、村の生存人数をいつでも確認できます。',
        tips: [
          '夜の間、自分の役職の手番が来るまで視界は安全に遮断されます。',
          'AI対戦中はタイマー調整やスキップボタンでテンポ良く進行できます。',
        ],
      },
      {
        badge: 'ステップ 2 / 5 · 中央アクションコンソール',
        title: '夜の役職行動と昼の投票ガイド',
        description:
          '上部中央のコンソールに今行うべき行動が表示されます。夜のスキル対象決定、朝の報告確認、昼の投票と開票状況がここで完結します。',
        tips: [
          '生存プレイヤーは全員公平に1票ずつ投票できます（焚き火で棄権も可能）。',
          '魔女の蘇生薬ボタンも手番時にこのパネル内に表示されます。',
        ],
      },
      {
        badge: 'ステップ 3 / 5 · 3Dキャンプ村＆焚き火サークル',
        title: '3D村を見渡し、キャラを直接クリックして行動',
        description:
          '中央の3Dステージに全員が集まります。ドラッグで視点回転し、3Dキャラクターを直接クリックして夜スキル・アイテム投げ・投票が行えます。',
        tips: [
          'WASDで席を立って自由に歩けます（Shiftダッシュ・Spaceジャンプ・X着席）。',
          '脱落後は3D幽霊として自由に飛行できます（公平性のためチャット・マイクはロック）。',
        ],
      },
      {
        badge: 'ステップ 4 / 5 · 役職・カメラ・音声ツールバー',
        title: '役職カード確認・一人称視点 [V]・各種設定',
        description:
          '右上のバーから秘密の役職カードの再確認、一人称視点 [V]、360°回転、カメラ切替、マイク、音量 [M]、一時停止 [P] を操作できます。',
        tips: [
          '役職バッジをクリックすると能力と勝利条件をいつでも確認できます。',
          '[V]キーで一人称視点に切り替え、[E]またはクリックで対象選択できます。',
        ],
      },
      {
        badge: 'ステップ 5 / 5 · 下部ドック＆クイック席リスト',
        title: '推理ノート・エモート・チャット・素早い対象選択',
        description:
          '下部パネルには個人用推理ノート、昼の3Dエモート＆投げアイテム（トマト・卵・花束・水）、ボイス／チャット、順位、ルール、全席カードが揃っています。',
        tips: [
          '下部のプレイヤーカードをタップするとスマホでも素早く対象を選択できます。',
          '[H]キーまたは折りたたみタブで下部バーを隠して3D画面を広く見られます。',
        ],
      },
    ],
    lockerAndMaps: 'ロッカー＆マップ',
    matchSettings: '試合設定',
    view3dBtn: '3Dビュー',
    expandMenuBtn: 'メニューを開く',
    randomRoleShort: 'ランダム役職',
    quickRulesTitle: 'ルール＆13役職一覧',
    quickRulesDesc: '試合を始めずに各役職の能力を確認',
    playTutorialTitle: '5ステップ体験チュートリアル',
    playTutorialDesc: 'AIとのガイド付き練習テーブルへ参加',
    campfireMapLabel: '3D焚き火マップ',
    phaseTimers: 'フェーズ時間',
    presetFast: '高速',
    presetStandard: '標準',
    presetRelaxed: 'ゆったり',
    nightLabel: '夜',
    debateLabel: '議論',
    voteLabel: '投票',
    practiceHelper: '練習補助: HUDに生存中の人狼・村人数を表示',
    playCampfireAi: '焚き火の村へ参加 (AI)',
    playOnline: 'オンライン対戦',
    gmAssistant: 'GMアシスタント',
    saveEloHint: 'ELOと対戦履歴を保存:',
    signIn: 'ログイン',
    createAccount: 'アカウント作成',
    resumeMatchBtn: '▶️ 途中の試合を再開',
    dismissBtn: '閉じる',
    yourRoleIs: 'あなたの役職は',
    callingProgress: '点呼中',
    nextStep: '次のステップ',
    mayorBadge: '村長 (x2)',
    mayorTooltip: '村長は同票決着用の2票を持ちます',
    briefing: '朝の報告',
    voteAction: '投票',
    notebookBtn: '推理ノート',
    emotesAndProps: 'エモート＆アイテム',
    emotes3dLabel: '3Dエモート:',
    voiceBtn: 'ボイス',
    loverLabel: '恋人',
    wolfAllyLabel: '仲間の人狼',
    campfireGm: '焚き火のゲームマスター',
    nightCasualties: '昨夜の犠牲者',
    eliminatedLabel: '追放者',
    survivors: '生存者',
    replayMatch: 'もう一度',
    replayVoice: '再生',
    privateGmNotice: 'GMからの極秘通知（あなたのみ閲覧可）',
    behindCamBtn: '背面 [B]',
    behindCamShort: '背面',
    fpvShort: '一人称',
    thirdPartyAlive: '第三勢力',
    gameOverShort: '終了',
    freeLookTooltip: 'カーソル固定で360°自由視点（Escで解除）',
    micLockedDead: '👻 死亡（幽霊）— マイクはロックされています',
    micLockedShort: 'マイク無効',
    ghostMicChatLocked: '👻 幽霊 — マイク＆チャット無効',
    ghostChannelSilent: '霊界チャンネルは静かです — 観戦中...',
    loneWolfTonight: '今夜はあなた一人が人狼です — 襲撃対象を選んでください。',
    bgmToggleLabel: 'BGM＆環境音',
    sfxToggleLabel: '効果音＆音声',
    onLabel: 'ON',
    offLabel: 'OFF',
    phaseWaitTimersSec: '各フェーズ待機時間 (秒)',
    guestPlayerPrefix: 'プレイヤー',
    campfireAbstain: '焚き火（棄権）',
    abstainShort: '棄権',
    dayDiscussHint: '投票前に焚き火で手がかりを話し合おう',
    youVotedAbstain: '🔥 焚き火（棄権）に投票しました',
    yourVotePrefix: '投票先:',
    selectSuspectHint: '容疑者を1人選ぶか焚き火をクリックして棄権！',
    changeVoteBtn: '変更',
    finishBtn: '終了',
    holdFireBtn: '撃たない（温存）',
    nextShort: '次へ',
    yourTurnBadge: 'あなたの手番',
    confirmedWaiting: '✓ 確定済み — 他プレイヤー待機中...',
    confirmAndEndNight: '確定して夜を終える',
    timeUpConfirmCue: '⏳ 時間切れ — 確定を押して続行',
    packmatesPicked: '仲間人狼の選択:',
    tapTargetHint: '（3Dキャラまたは下部バーをタップ）',
    witchHealDepletedDesc: '🧪 蘇生薬は使用済み — 今夜の襲撃対象は見えません',
    witchNoFatalVictim: '🐺 今夜は人狼の襲撃被害者がいません',
    bittenPrefix: '襲撃対象:',
    noVictimToHeal: '救う対象なし',
    poisonSealed: '🧪 毒薬は封印中',
    poisonReady: '🧪 毒薬あり',
    seerTargetPending: '占い対象:',
    seerConfirmBtn: '占いを確定',
    selectedPrefix: '選択中:',
    homeBtn: 'ホーム',
    jumpToMyTurn: (roleName) => `⚡ 自分の手番へ (${roleName})`,
    switchToNightRole: '夜能力のある役職へ変更',
    waitingNightTurn: '夜の手番を待機中',
    blindfoldEmbersSub: '闇が降り、焚き火の残り火だけが揺れている…',
    sitBackBtn: '席に戻る [X]',
    sitShort: '着席',
    doppelModelLabel: 'コピー元',
    suspectLabel: '容疑者',
    trustedLabel: '信頼',
    votedBadge: '✓ 投票済',
    behindViewBanner:
      '👁️ 背面視点 [B]: マウスドラッグで360°視点（360°ボタンでポインター固定）・WASD移動・Spaceジャンプ・E/クリック操作',
    ghostFlightBanner:
      '👻 幽霊モード・WASD自由飛行・Space上昇/Shift下降・ドラッグで360°視点・🔒 村チャット＆マイク無効・霊界チャット解放',
    winDraw: '引き分け — 生存者なし！',
    waitingHostRematch: '⏳ ホストが次の試合を開始するのを待機中...',
    deadChatLockedBanner: '👻 幽霊状態です — 不正防止のため村チャットはロックされています',
    openGhostRealmBtn: '霊界チャットへ',
    ghostChatIsolatedBanner:
      '👻 霊界専用チャンネル — 脱落したプレイヤーのみ閲覧できます。',
    lockedBtn: 'ロック中',
    gmHostShellTitle: '対面ゲームマスターモード',
    gmHostShellSubtitle: '対面プレイ専用ツール・AI/オンライン対戦とは独立',
    gmPlayerShellTitle: '個人役職カード — GMルーム',
    gmPlayerShellSubtitle: 'あなた自身の秘密の役職のみ表示',
  },
};

export interface TranslationSchema {
  appTitle: string;
  appSubtitle: string;
  playOnline: string;
  playOnlineDesc: string;
  gmAssistant: string;
  gmAssistantDesc: string;
  virtualCards: string;
  virtualCardsDesc: string;
  leaderboard: string;
  matchHistory: string;
  roleEncyclopedia: string;
  voiceChat: string;
  voiceLive: string;
  muteMic: string;
  unmuteMic: string;
  pushToTalk: string;
  antiCheatActive: string;
  antiCheatDesc: string;
  createRoom: string;
  joinRoom: string;
  quickMatch: string;
  roomId: string;
  enterRoomId: string;
  yourName: string;
  enterName: string;
  loginSocial: string;
  loginGoogle: string;
  loginDiscord: string;
  loginGuest: string;
  factionVillager: string;
  factionWerewolf: string;
  factionNeutral: string;
  alive: string;
  dead: string;
  nightPhase: string;
  dayDiscussion: string;
  dayVoting: string;
  hunterRetribution: string;
  nightFalls: string;
  dayBreaks: string;
  castVote: string;
  skipVote: string;
  revealRole: string;
  hideRole: string;
  gmNextStep: string;
  gmPrevStep: string;
  gmResolveNight: string;
  gmAnnounceVictims: string;
  gmEndGame: string;
  soundToggle: string;
  language: string;
  // GM Companion Header, Setup & Phase Controls
  gmHideRoles: string;
  gmShowRoles: string;
  gmHiddenMask: string;
  gmRoomCodeQrLabel: string;
  gmCopyCode: string;
  gmCopied: string;
  gmZoomQr: string;
  gmCopyLink: string;
  gmCopiedLink: string;
  gmPlayerViewBtn: string;
  gmSoundboardTitle: string;
  gmVirtualDeckTitle: string;
  gmPhysicalCardsTitle: string;
  gmPlayerListTitle: string;
  gmCustomCount: string;
  gmReshuffleRoles: string;
  gmFillVillagers: string;
  gmAddPlayerPlaceholder: string;
  gmAddBtn: string;
  gmStartMatchBtn: string;
  gmNightOrderHint: string;
  gmDayPhaseHint: string;
  gmPlayCalloutBtn: string;
  gmUndoBtn: string;
  gmResetMatchBtn: string;
  gmConfirmResetBtn: string;
  gmCancelBtn: string;
  gmDiscussTimerTitle: string;
  gmTimerStart: string;
  gmTimerPause: string;
  gmLynchPrompt: string;
  gmSkipLynchBtn: string;
  gmConfirmLynchBtn: string;
  gmPlayNewMatchBtn: string;
  gmScanQrTitle: string;
  gmUnassignedRole: string;
  gmSelectRolePlaceholder: string;
  gmStepLabel: string;
  gmNightTitlePrefix: string;
  gmDayTitlePrefix: string;
}

export const TRANSLATIONS: Record<Language, TranslationSchema> = {
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
    gmHideRoles: '🙈 Ẩn Vai Trò (Chống nhìn trộm)',
    gmShowRoles: '👁️ Hiện Vai Trò',
    gmHiddenMask: '••• (Đã ẩn)',
    gmRoomCodeQrLabel: 'Mã Phòng & QR Cho Người Chơi',
    gmCopyCode: 'Chép mã',
    gmCopied: 'Đã chép',
    gmZoomQr: '🔍 Phóng to QR',
    gmCopyLink: 'Chép link vào phòng',
    gmCopiedLink: 'Đã sao chép link phòng',
    gmPlayerViewBtn: 'Xem Giao Diện Người Chơi',
    gmSoundboardTitle: 'Bàn Phím Âm Hiệu & Giọng Gọi Vai Kịch Tính',
    gmVirtualDeckTitle: 'Không Có Bộ Bài Ngoài Đời (App Chia Vai)',
    gmPhysicalCardsTitle: 'Đã Có Bài Giấy (Người Chơi Tự Nhập / GM Nhập Hộ)',
    gmPlayerListTitle: 'Danh Sách Người Chơi',
    gmCustomCount: 'Tuỳ chỉnh:',
    gmReshuffleRoles: 'Phân Lại Vai Ngẫu Nhiên',
    gmFillVillagers: 'Điền Dân Làng Cho Ghế Trống',
    gmAddPlayerPlaceholder: 'Nhập tên người chơi mới...',
    gmAddBtn: 'Thêm',
    gmStartMatchBtn: 'Bắt Đầu Ván Đấu Thực Tế (Vòng 1)',
    gmNightOrderHint: 'Quản trò gọi các vai theo thứ tự bên dưới.',
    gmDayPhaseHint: 'Công bố kết quả đêm và biểu quyết treo cổ.',
    gmPlayCalloutBtn: '🔊 Phát Tiếng Gọi',
    gmUndoBtn: '↩️ Hoàn tác bước vừa rồi',
    gmResetMatchBtn: 'Thiết Lập Lại Ván',
    gmConfirmResetBtn: 'Xác nhận xóa ván?',
    gmCancelBtn: 'Hủy',
    gmDiscussTimerTitle: 'Đồng Hồ Thảo Luận',
    gmTimerStart: 'Chạy Giờ',
    gmTimerPause: 'Tạm Dừng',
    gmLynchPrompt: 'Chọn Người Bị Làng Biểu Quyết Treo Cổ Hôm Nay:',
    gmSkipLynchBtn: 'Không Treo Cổ Ai (Sang Đêm Tiếp)',
    gmConfirmLynchBtn: 'Xác Nhận Treo Cổ',
    gmPlayNewMatchBtn: 'Chơi Ván Mới',
    gmScanQrTitle: 'Quét Mã QR Để Vào Phòng Quản Trò',
    gmUnassignedRole: 'Chưa gán bài',
    gmSelectRolePlaceholder: '-- Chờ nhập vai / Chọn hộ --',
    gmStepLabel: 'Bước',
    gmNightTitlePrefix: 'Đêm Thứ',
    gmDayTitlePrefix: 'Ngày Thứ',
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
    gmHideRoles: '🙈 Hide Roles (Privacy)',
    gmShowRoles: '👁️ Show Roles',
    gmHiddenMask: '••• (Hidden)',
    gmRoomCodeQrLabel: 'Player Room Code & QR',
    gmCopyCode: 'Copy code',
    gmCopied: 'Copied',
    gmZoomQr: '🔍 Zoom QR',
    gmCopyLink: 'Copy join link',
    gmCopiedLink: 'Join link copied',
    gmPlayerViewBtn: 'Open Player View',
    gmSoundboardTitle: 'Soundboard & Dramatic Role Callouts',
    gmVirtualDeckTitle: 'No Physical Cards (App Deals Roles)',
    gmPhysicalCardsTitle: 'Physical Deck (Self-Input / GM Assign)',
    gmPlayerListTitle: 'Player Roster',
    gmCustomCount: 'Custom:',
    gmReshuffleRoles: 'Reshuffle Balanced Roles',
    gmFillVillagers: 'Fill Empty as Villager',
    gmAddPlayerPlaceholder: 'Enter new player name...',
    gmAddBtn: 'Add',
    gmStartMatchBtn: 'Start Tabletop Match (Round 1)',
    gmNightOrderHint: 'Call each active role in the night order below.',
    gmDayPhaseHint: 'Announce dawn results and run the day vote.',
    gmPlayCalloutBtn: '🔊 Play Callout',
    gmUndoBtn: '↩️ Undo Last Step',
    gmResetMatchBtn: 'Reset Match',
    gmConfirmResetBtn: 'Confirm Reset?',
    gmCancelBtn: 'Cancel',
    gmDiscussTimerTitle: 'Discussion Timer',
    gmTimerStart: 'Start',
    gmTimerPause: 'Pause',
    gmLynchPrompt: 'Select Today’s Village Execution Target:',
    gmSkipLynchBtn: 'No Execution (Next Night)',
    gmConfirmLynchBtn: 'Confirm Execution',
    gmPlayNewMatchBtn: 'New Match',
    gmScanQrTitle: 'Scan QR Code to Join GM Room',
    gmUnassignedRole: 'Unassigned',
    gmSelectRolePlaceholder: '-- Waiting / Assign Role --',
    gmStepLabel: 'Step',
    gmNightTitlePrefix: 'Night',
    gmDayTitlePrefix: 'Day',
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
    gmHideRoles: '🙈 Masquer les rôles (Privé)',
    gmShowRoles: '👁️ Afficher les rôles',
    gmHiddenMask: '••• (Masqué)',
    gmRoomCodeQrLabel: 'Code Salle & QR Joueurs',
    gmCopyCode: 'Copier code',
    gmCopied: 'Copié',
    gmZoomQr: '🔍 Agrandir QR',
    gmCopyLink: 'Copier lien',
    gmCopiedLink: 'Lien copié',
    gmPlayerViewBtn: 'Vue Joueur',
    gmSoundboardTitle: 'Effets Sonores & Appels de Rôles',
    gmVirtualDeckTitle: 'Sans Cartes Physiques (Distribution Auto)',
    gmPhysicalCardsTitle: 'Cartes Physiques (Saisie Joueur / MJ)',
    gmPlayerListTitle: 'Liste des Joueurs',
    gmCustomCount: 'Perso :',
    gmReshuffleRoles: 'Redistribuer les Rôles',
    gmFillVillagers: 'Remplir en Villageois',
    gmAddPlayerPlaceholder: 'Nom du nouveau joueur...',
    gmAddBtn: 'Ajouter',
    gmStartMatchBtn: 'Démarrer la Partie (Tour 1)',
    gmNightOrderHint: 'Appelez chaque rôle actif dans l’ordre ci-dessous.',
    gmDayPhaseHint: 'Annoncez les résultats de la nuit puis lancez le vote.',
    gmPlayCalloutBtn: '🔊 Jouer l’Appel',
    gmUndoBtn: '↩️ Annuler dernière action',
    gmResetMatchBtn: 'Réinitialiser',
    gmConfirmResetBtn: 'Confirmer ?',
    gmCancelBtn: 'Annuler',
    gmDiscussTimerTitle: 'Chrono de Débat',
    gmTimerStart: 'Démarrer',
    gmTimerPause: 'Pause',
    gmLynchPrompt: 'Choisissez le joueur éliminé par le vote :',
    gmSkipLynchBtn: 'Personne d’éliminé (Nuit suivante)',
    gmConfirmLynchBtn: 'Confirmer l’Élimination',
    gmPlayNewMatchBtn: 'Nouvelle Partie',
    gmScanQrTitle: 'Scannez le QR pour rejoindre la salle MJ',
    gmUnassignedRole: 'Non assigné',
    gmSelectRolePlaceholder: '-- En attente / Choisir Rôle --',
    gmStepLabel: 'Étape',
    gmNightTitlePrefix: 'Nuit',
    gmDayTitlePrefix: 'Jour',
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
    gmHideRoles: '🙈 Ocultar roles (Privacidad)',
    gmShowRoles: '👁️ Mostrar roles',
    gmHiddenMask: '••• (Oculto)',
    gmRoomCodeQrLabel: 'Código y QR para Jugadores',
    gmCopyCode: 'Copiar código',
    gmCopied: 'Copiado',
    gmZoomQr: '🔍 Ampliar QR',
    gmCopyLink: 'Copiar enlace',
    gmCopiedLink: 'Enlace copiado',
    gmPlayerViewBtn: 'Vista de Jugador',
    gmSoundboardTitle: 'Efectos de Sonido y Llamadas de Rol',
    gmVirtualDeckTitle: 'Sin Cartas Físicas (App Reparte Roles)',
    gmPhysicalCardsTitle: 'Cartas Físicas (Auto-registro / Narrador)',
    gmPlayerListTitle: 'Lista de Jugadores',
    gmCustomCount: 'Pers.:',
    gmReshuffleRoles: 'Repartir Roles de Nuevo',
    gmFillVillagers: 'Llenar con Aldeanos',
    gmAddPlayerPlaceholder: 'Nombre del nuevo jugador...',
    gmAddBtn: 'Añadir',
    gmStartMatchBtn: 'Iniciar Partida (Ronda 1)',
    gmNightOrderHint: 'Llama a cada rol activo en el orden de abajo.',
    gmDayPhaseHint: 'Anuncia los resultados nocturnos y realiza la votación.',
    gmPlayCalloutBtn: '🔊 Reproducir Llamada',
    gmUndoBtn: '↩️ Deshacer último paso',
    gmResetMatchBtn: 'Reiniciar Partida',
    gmConfirmResetBtn: '¿Confirmar?',
    gmCancelBtn: 'Cancelar',
    gmDiscussTimerTitle: 'Temporizador de Debate',
    gmTimerStart: 'Iniciar',
    gmTimerPause: 'Pausa',
    gmLynchPrompt: 'Elige al jugador linchado hoy:',
    gmSkipLynchBtn: 'Nadie linchado (Siguiente Noche)',
    gmConfirmLynchBtn: 'Confirmar Linchamiento',
    gmPlayNewMatchBtn: 'Nueva Partida',
    gmScanQrTitle: 'Escanea el QR para unirte a la sala',
    gmUnassignedRole: 'Sin asignar',
    gmSelectRolePlaceholder: '-- Esperando / Asignar Rol --',
    gmStepLabel: 'Paso',
    gmNightTitlePrefix: 'Noche',
    gmDayTitlePrefix: 'Día',
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
    gmHideRoles: '🙈 役職を隠す（覗き見防止）',
    gmShowRoles: '👁️ 役職を表示',
    gmHiddenMask: '•••（非表示）',
    gmRoomCodeQrLabel: '参加者用ルームコード＆QR',
    gmCopyCode: 'コピー',
    gmCopied: 'コピー済',
    gmZoomQr: '🔍 QR拡大',
    gmCopyLink: '参加リンクをコピー',
    gmCopiedLink: 'リンクをコピーしました',
    gmPlayerViewBtn: 'プレイヤー画面を開く',
    gmSoundboardTitle: '効果音＆役職点呼サウンドボード',
    gmVirtualDeckTitle: '紙カードなし（アプリが配役）',
    gmPhysicalCardsTitle: '紙カードあり（各自入力 / GM入力）',
    gmPlayerListTitle: 'プレイヤー一覧',
    gmCustomCount: '人数指定:',
    gmReshuffleRoles: '役職を再シャッフル',
    gmFillVillagers: '空席を村人で埋める',
    gmAddPlayerPlaceholder: '新しいプレイヤー名を入力...',
    gmAddBtn: '追加',
    gmStartMatchBtn: '対面ゲームを開始（第1夜）',
    gmNightOrderHint: '以下の順番で夜の役職を点呼してください。',
    gmDayPhaseHint: '朝の結果を発表し、昼の投票を進行します。',
    gmPlayCalloutBtn: '🔊 点呼ボイス再生',
    gmUndoBtn: '↩️ 直前の操作を戻す',
    gmResetMatchBtn: '試合をリセット',
    gmConfirmResetBtn: 'リセット確定？',
    gmCancelBtn: 'キャンセル',
    gmDiscussTimerTitle: '議論タイマー',
    gmTimerStart: '開始',
    gmTimerPause: '一時停止',
    gmLynchPrompt: '本日の処刑対象を選択:',
    gmSkipLynchBtn: '処刑なし（次の夜へ）',
    gmConfirmLynchBtn: '処刑を確定',
    gmPlayNewMatchBtn: '新しい試合',
    gmScanQrTitle: 'QRコードをスキャンしてGMルームへ参加',
    gmUnassignedRole: '未割当',
    gmSelectRolePlaceholder: '-- 入力待ち / 役職を選択 --',
    gmStepLabel: 'ステップ',
    gmNightTitlePrefix: '夜',
    gmDayTitlePrefix: '昼',
  },
};
