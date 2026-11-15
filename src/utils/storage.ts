import { GameHistoryRecord, LeaderboardUser } from '../types/game';

const INITIAL_LEADERBOARD: LeaderboardUser[] = [
  {
    id: 'user_1',
    name: 'Phan Minh Hoàng (Sói Bạc)',
    avatar: '🐺',
    elo: 1845,
    matchesPlayed: 142,
    wins: 96,
    winRate: 67.6,
    favoriteRole: 'werewolf',
    badges: ['Huyền Thoại Ma Sói', 'Bậc Thầy Ẩn Mình', 'Thợ Săn Mắt Đại Bàng'],
  },
  {
    id: 'user_2',
    name: 'Nguyễn Thảo My',
    avatar: '🔮',
    elo: 1790,
    matchesPlayed: 118,
    wins: 75,
    winRate: 63.5,
    favoriteRole: 'seer',
    badges: ['Đôi Mắt Tiên Tri', 'Dẫn Dắt Làng'],
  },
  {
    id: 'user_3',
    name: 'Trần Tuấn Kiệt',
    avatar: '🛡️',
    elo: 1720,
    matchesPlayed: 98,
    wins: 60,
    winRate: 61.2,
    favoriteRole: 'bodyguard',
    badges: ['Khiên Bất Hoại', 'Đồng Đội Vàng'],
  },
  {
    id: 'user_4',
    name: 'Lê Bảo Châu',
    avatar: '🧪',
    elo: 1685,
    matchesPlayed: 85,
    wins: 51,
    winRate: 60.0,
    favoriteRole: 'witch',
    badges: ['Phù Thủy Quyền Năng', 'Bình Độc Đoạt Mạng'],
  },
  {
    id: 'user_5',
    name: 'Alexandre Laurent',
    avatar: '🎯',
    elo: 1640,
    matchesPlayed: 74,
    wins: 42,
    winRate: 56.7,
    favoriteRole: 'hunter',
    badges: ['Phát Đạn Báo Thù'],
  },
  {
    id: 'user_6',
    name: 'Sakura Takahashi',
    avatar: '💘',
    elo: 1590,
    matchesPlayed: 62,
    wins: 34,
    winRate: 54.8,
    favoriteRole: 'cupid',
    badges: ['Tình Yêu Bất Diệt'],
  },
];

const INITIAL_HISTORY: GameHistoryRecord[] = [
  {
    id: 'match_1092',
    roomId: 'WOLF88',
    date: '11/11/2026 - 19:45',
    winner: 'villagers',
    rounds: 4,
    playersCount: 8,
    mvp: 'Nguyễn Thảo My (Tiên Tri)',
    roster: [
      { name: 'Thảo My', roleId: 'seer', isAlive: true },
      { name: 'Tuấn Kiệt', roleId: 'bodyguard', isAlive: true },
      { name: 'Minh Hoàng', roleId: 'werewolf', isAlive: false },
      { name: 'Bảo Châu', roleId: 'witch', isAlive: true },
      { name: 'Văn Nam', roleId: 'werewolf', isAlive: false },
      { name: 'Thanh Hằng', roleId: 'villager', isAlive: true },
      { name: 'Quốc Anh', roleId: 'hunter', isAlive: false },
      { name: 'Thúy Vi', roleId: 'cupid', isAlive: false },
    ],
  },
  {
    id: 'match_1091',
    roomId: 'BLOOD7',
    date: '10/11/2026 - 21:15',
    winner: 'werewolves',
    rounds: 3,
    playersCount: 8,
    mvp: 'Phan Minh Hoàng (Sói Chúa)',
    roster: [
      { name: 'Minh Hoàng', roleId: 'werewolf', isAlive: true },
      { name: 'Đức Huy', roleId: 'werewolf', isAlive: true },
      { name: 'Thảo My', roleId: 'seer', isAlive: false },
      { name: 'Bảo Châu', roleId: 'witch', isAlive: false },
      { name: 'Gia Bảo', roleId: 'tanner', isAlive: false },
      { name: 'Phương Linh', roleId: 'villager', isAlive: false },
      { name: 'Hải Đăng', roleId: 'bodyguard', isAlive: false },
      { name: 'Kim Yến', roleId: 'villager', isAlive: false },
    ],
  },
];

export function loadLeaderboard(): LeaderboardUser[] {
  try {
    const raw = localStorage.getItem('werewolf_leaderboard');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return INITIAL_LEADERBOARD;
}

export function saveLeaderboard(users: LeaderboardUser[]) {
  try {
    localStorage.setItem('werewolf_leaderboard', JSON.stringify(users));
  } catch {
    // ignore
  }
}

export function loadHistory(): GameHistoryRecord[] {
  try {
    const raw = localStorage.getItem('werewolf_history');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return INITIAL_HISTORY;
}

export function addMatchHistory(record: GameHistoryRecord) {
  try {
    const current = loadHistory();
    const updated = [record, ...current].slice(0, 25);
    localStorage.setItem('werewolf_history', JSON.stringify(updated));
  } catch {
    // ignore
  }
}
