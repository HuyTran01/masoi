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
  hunterNoMarkBtn: string;
  hunterNoMarkStatus: string;
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
  lbWaitingHostStart: string;
  lbEnterCodeOnline: string;
  lbEnterCodeGM: string;
  lbGMToolShort: string;
  lbGMRoomNotFound: (code: string) => string;
  lbGMUnreachable: string;
  lbJoinTimeout: (code: string) => string;
  lbLiveServer: string;
  lbConnecting: string;
  lbSyncWs: string;
  lbSyncHttp: string;
  lbGuestReadonly: string;
  lbLeaveRoom: string;
  lbRoomHost: string;
  lbJoinedRoomCode: string;
  lbMaxSeats: string;
  lbRoomSettingsHost: string;
  lbSeats: string;
  lbShareCode: (code: string) => string;
  lbSyncedFromHost: string;
  lbConnectTimeout: string;
  lbRetry: string;
  lbYou: string;
  lbPhaseTimers: string;
  lbTimerFast: string;
  lbTimerStandard: string;
  lbTimerRelaxed: string;
  lbTimerNight: string;
  lbTimerDebate: string;
  lbTimerVote: string;
  lbStarting: string;
  lbSyncingRoom: string;
  lbNoPhysicalDeck: string;
  lbNoPhysicalDeckDesc: string;
  lbHavePhysicalDeck: string;
  lbHavePhysicalDeckDesc: string;
  lbCompanionTitle: string;
  lbCompanionStep1: (code: string) => string;
  lbCompanionStep2: (code: string) => string;
  lbOpenOnlineRooms: string;
  lbRefresh: string;
  lbNoOpenRooms: string;
  lbInMatch: string;
  lbJoin: string;
  lbOpenGMRooms: string;
  lbNoGMRooms: string;
  lbPhysical: string;
  lbVirtual: string;
  lbJoining: string;
  lbChecking: string;
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
  roleRevealRosterTitle: string;
  aliveSuffix: string;
  campfireAbstainBanner: string;
  tabOnline3DShort: string;
  closeAria: string;
  decreasePlayersAria: string;
  increasePlayersAria: string;
  winReasonVillagers: string;
  winReasonWerewolves: string;
  winReasonLovers: string;
  winReasonTanner: string;
  winReasonDraw: string;
  autoGmSenderName: string;
  waitingHostRematch: string;
  deadChatLockedBanner: string;
  openGhostRealmBtn: string;
  ghostChatIsolatedBanner: string;
  lockedBtn: string;
  gmHostShellTitle: string;
  gmHostShellSubtitle: string;
  gmPlayerShellTitle: string;
  gmPlayerShellSubtitle: string;
  storylineLabel: string;
  ghostNightSpectatorTitle: string;
  skipCutsceneBtn: string;
  ghostFastForwardStep: string;
  ghostNoLivingActor: string;
  ghostActorAllDead: string;
  ghostActorPowerSpent: string;
  ghostWatchingAction: string;
  skipNightStepBtn: string;
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
        summary: '2 Ma Sói vs 4 Dân Làng (Tiên Tri, Bảo Vệ, 2 Dân Làng).',
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
    hunterNoMarkBtn: 'Không ghim',
    hunterNoMarkStatus: 'Chưa ghim ai (đạn sẽ không bắn)',
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
    lbWaitingHostStart: 'Đang chờ Chủ phòng bắt đầu ván đấu...',
    lbEnterCodeOnline: 'Nhập mã phòng hợp lệ (VD: ONL-4821)',
    lbEnterCodeGM: 'Nhập mã phòng Quản Trò hợp lệ (VD: GM-4821)',
    lbGMToolShort: '2. Quản Trò',
    lbGMRoomNotFound: (c) => `Không tìm thấy phòng Quản Trò "${c}". Hãy kiểm tra lại mã phòng từ Quản Trò.`,
    lbGMUnreachable: 'Không thể kiểm tra phòng Quản Trò. Vui lòng thử lại.',
    lbJoinTimeout: (c) => `Quá thời gian kết nối máy chủ phòng "${c}" (10s). Kiểm tra mạng hoặc bấm Thử lại.`,
    lbLiveServer: 'Máy chủ trực tuyến',
    lbConnecting: 'Đang kết nối...',
    lbSyncWs: '⚡ Đồng bộ Thời Gian Thực (WebSocket · Server-Authoritative)',
    lbSyncHttp: '☁️ Đồng bộ Cloud (HTTP Sync · Server-Authoritative)',
    lbGuestReadonly: 'Khách mời · Chỉ Chủ phòng được tùy chỉnh thông tin phòng',
    lbLeaveRoom: 'Rời phòng',
    lbRoomHost: 'Chủ phòng',
    lbJoinedRoomCode: 'MÃ PHÒNG ĐANG THAM GIA',
    lbMaxSeats: 'Số ghế tối đa',
    lbRoomSettingsHost: 'Cấu hình phòng (Chủ phòng đặt)',
    lbSeats: 'ghế',
    lbShareCode: (c) => `Gửi mã ${c} cho bạn bè ở thiết bị khác nhập tại tab "Nhập Mã Phòng Để Vào" để cùng chơi trực tuyến thời gian thực.`,
    lbSyncedFromHost: 'Danh sách thành viên và cấu hình phòng được đồng bộ trực tiếp từ Chủ phòng.',
    lbConnectTimeout: 'Không thể kết nối máy chủ phòng trực tuyến sau 10 giây. Vui lòng thử lại.',
    lbRetry: 'Thử lại',
    lbYou: 'Bạn',
    lbPhaseTimers: 'Thời gian mỗi pha:',
    lbTimerFast: 'Nhanh',
    lbTimerStandard: 'Chuẩn',
    lbTimerRelaxed: 'Thư thả',
    lbTimerNight: 'Đêm:',
    lbTimerDebate: 'Thảo luận:',
    lbTimerVote: 'Bỏ phiếu:',
    lbStarting: 'Đang bắt đầu ván đấu...',
    lbSyncingRoom: 'Đang đồng bộ phòng với máy chủ...',
    lbNoPhysicalDeck: 'Không có bộ bài ngoài đời',
    lbNoPhysicalDeckDesc: 'App chia vai tự động. Người chơi vào mã phòng chỉ thấy duy nhất vai trò của riêng mình.',
    lbHavePhysicalDeck: 'Đã có bộ bài giấy ngoài đời',
    lbHavePhysicalDeckDesc: 'Người chơi tự nhập lá bài mình bốc trước trận đấu, hoặc Quản Trò nhập hộ trực tiếp.',
    lbCompanionTitle: 'Chế độ hỗ trợ chơi ngoài đời (tách biệt hoàn toàn với game 3D Online/Bot):',
    lbCompanionStep1: (c) => `1. Quản Trò mở bảng điều khiển phòng ${c} để gọi đêm, ghi nhớ Bảo Vệ/Phù Thủy/Sói Con.`,
    lbCompanionStep2: (c) => `2. Người chơi nhập mã ${c} ở tab "Nhập Mã Phòng Để Vào" — chỉ xem được mỗi vai trò của mình hoặc tự nhập bài trước khi bắt đầu.`,
    lbOpenOnlineRooms: 'Phòng Online đang mở trên máy chủ:',
    lbRefresh: 'Làm mới',
    lbNoOpenRooms: 'Chưa có phòng nào đang mở. Hãy tạo phòng mới hoặc nhập mã từ bạn bè!',
    lbInMatch: 'Đang chơi',
    lbJoin: 'Vào ngay',
    lbOpenGMRooms: 'Phòng Quản Trò đang mở:',
    lbNoGMRooms: 'Chưa có phòng Quản Trò nào đang mở. Hãy tạo phòng hoặc nhập mã từ Quản Trò!',
    lbPhysical: '🎴 Bài giấy',
    lbVirtual: '🃏 Chia bài ảo',
    lbJoining: 'Đang vào phòng...',
    lbChecking: 'Đang kiểm tra mã phòng...',
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
    roleRevealRosterTitle: 'Bảng Lật Vai Trò Toàn Làng',
    aliveSuffix: 'sống sót',
    campfireAbstainBanner: 'Lửa Trại · Phiếu Trắng',
    tabOnline3DShort: '1. Online 3D',
    closeAria: 'Close',
    decreasePlayersAria: 'Decrease player count',
    increasePlayersAria: 'Increase player count',
    winReasonVillagers: 'Toàn bộ Ma Sói đã bị tiêu diệt! Bình minh thực sự đã trở lại với Phe Dân Làng!',
    winReasonWerewolves: 'Bầy Ma Sói đã làm chủ hoàn toàn ngôi làng. Phe Ma Sói thắng!',
    winReasonLovers: 'Cặp đôi Tình Nhân khác phe đã vượt qua định kiến và chiến thắng!',
    winReasonTanner: 'Kẻ Chán Đời đã lừa cả làng treo cổ mình thành công và giành chiến thắng tuyệt đối!',
    winReasonDraw: 'Không còn ai sống sót trong ngôi làng. Trận đấu khép lại với kết quả Hòa!',
    autoGmSenderName: '🤖 Quản Trò Máy',
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
    storylineLabel: 'Kịch bản AI',
    ghostNightSpectatorTitle: '👻 Chế Độ Hồn Ma Toàn Tri — Đang chứng kiến ban đêm',
    skipCutsceneBtn: 'Bỏ qua ⏭',
    ghostFastForwardStep: 'Tua nhanh ⏭',
    ghostNoLivingActor: '💤 Vai này không có ai hành động đêm nay (đã tử trận hoặc hết quyền năng)',
    ghostActorAllDead: '💀 Người giữ vai này đã tử trận',
    ghostActorPowerSpent: '💤 Vai này còn sống nhưng đã hết quyền năng hoặc đang bị phong ấn đêm nay',
    ghostWatchingAction: 'Đang chứng kiến:',
    skipNightStepBtn: '⏭ Bỏ qua',
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
        summary: '2 Werewolves vs 4 Villagers (Seer, Bodyguard, 2 Villagers).',
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
    hunterNoMarkBtn: 'No Mark',
    hunterNoMarkStatus: 'No target marked (gun will not fire)',
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
    lbWaitingHostStart: 'Waiting for the Room Host to start the match...',
    lbEnterCodeOnline: 'Enter a valid room code',
    lbEnterCodeGM: 'Enter a valid room code',
    lbGMToolShort: '2. GM Tool',
    lbGMRoomNotFound: (c) => `GM room "${c}" not found. Check the code with your Game Master.`,
    lbGMUnreachable: 'Could not reach GM server. Please try again.',
    lbJoinTimeout: (c) => `Connection timed out while joining "${c}" (10s). Please retry.`,
    lbLiveServer: 'Live Server',
    lbConnecting: 'Connecting...',
    lbSyncWs: '⚡ Real-Time Sync (WebSocket · Server-Authoritative)',
    lbSyncHttp: '☁️ Cloud Sync (HTTP Sync · Server-Authoritative)',
    lbGuestReadonly: 'Guest · Only the Room Host can modify room settings',
    lbLeaveRoom: 'Leave Room',
    lbRoomHost: 'Room Host',
    lbJoinedRoomCode: 'JOINED ROOM CODE',
    lbMaxSeats: 'Maximum seats',
    lbRoomSettingsHost: 'Room Settings (Host Only)',
    lbSeats: 'seats',
    lbShareCode: (c) => `Share code ${c} with friends on other devices to enter in "Join with Room Code" and play live.`,
    lbSyncedFromHost: 'Participant list and room rules are synced live from the Room Host.',
    lbConnectTimeout: 'Could not reach the live room server after 10s. Please retry.',
    lbRetry: 'Retry',
    lbYou: 'You',
    lbPhaseTimers: 'Phase timers:',
    lbTimerFast: 'Fast',
    lbTimerStandard: 'Standard',
    lbTimerRelaxed: 'Relaxed',
    lbTimerNight: 'Night:',
    lbTimerDebate: 'Debate:',
    lbTimerVote: 'Vote:',
    lbStarting: 'Starting match...',
    lbSyncingRoom: 'Syncing room with server...',
    lbNoPhysicalDeck: 'No physical deck (Virtual)',
    lbNoPhysicalDeckDesc: 'App deals balanced roles. Players join with the room code and see ONLY their own role.',
    lbHavePhysicalDeck: 'Have physical deck',
    lbHavePhysicalDeckDesc: 'Players submit their own drawn card before match starts, or GM enters it for them.',
    lbCompanionTitle: 'Real-life companion mode (completely isolated from 3D Online/Bot matches):',
    lbCompanionStep1: (c) => `1. GM opens room ${c} to track nights, potions, lovers, and wolf pup frenzy.`,
    lbCompanionStep2: (c) => `2. Players enter ${c} in "Join with Room Code" to view ONLY their own secret role or enter their physical card.`,
    lbOpenOnlineRooms: 'Open Online rooms on server:',
    lbRefresh: 'Refresh',
    lbNoOpenRooms: 'No open rooms yet. Create one or enter a friend’s room code!',
    lbInMatch: 'In match',
    lbJoin: 'Join',
    lbOpenGMRooms: 'Active GM rooms on server:',
    lbNoGMRooms: 'No active GM rooms yet. Create one or enter your Game Master’s code!',
    lbPhysical: '🎴 Physical',
    lbVirtual: '🃏 Virtual',
    lbJoining: 'Joining room...',
    lbChecking: 'Checking room...',
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
    roleRevealRosterTitle: 'Full Village Role Reveal',
    aliveSuffix: 'alive',
    campfireAbstainBanner: 'Campfire · Abstain',
    tabOnline3DShort: '1. Online 3D',
    closeAria: 'Close',
    decreasePlayersAria: 'Decrease player count',
    increasePlayersAria: 'Increase player count',
    winReasonVillagers: 'Every werewolf has been eliminated! Dawn has truly returned to the Villagers!',
    winReasonWerewolves: 'The Werewolf pack has taken over the village completely. Werewolves win!',
    winReasonLovers: 'The Lovers from opposing sides overcame their differences and won!',
    winReasonTanner: 'The Tanner tricked the whole village into lynching them and wins outright!',
    winReasonDraw: 'No one is left alive in the village. The game ends in a Draw!',
    autoGmSenderName: '🤖 Auto-GM',
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
    storylineLabel: 'AI Storyline',
    ghostNightSpectatorTitle: '👻 Omniscient Ghost Mode — Witnessing the Night',
    skipCutsceneBtn: 'Skip ⏭',
    ghostFastForwardStep: 'Fast-Forward ⏭',
    ghostNoLivingActor: '💤 No one acts for this role tonight (fallen or power spent)',
    ghostActorAllDead: '💀 All holders of this role have fallen',
    ghostActorPowerSpent: '💤 Alive, but power is already spent or sealed tonight',
    ghostWatchingAction: 'Witnessing action:',
    skipNightStepBtn: '⏭ Skip',
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
};
