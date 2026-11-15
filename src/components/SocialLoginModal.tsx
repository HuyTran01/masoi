import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  UserPlus,
  LogIn,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  Globe,
  AlertCircle,
  Database,
  Trophy,
} from 'lucide-react';
import { Language } from '../types/game';
import { sound } from '../utils/sound';
import { syncAuthenticatedPlayerAccountToFirestore } from '../firebase';

export type AuthProviderId = 'account' | 'guest' | 'google' | 'facebook';

export interface UserProfileData {
  id: string;
  name: string;
  avatar: string;
  elo: number;
  provider?: AuthProviderId;
  handle?: string;
  region?: string;
  matchesPlayed?: number;
  wins?: number;
}

export interface PublicDatabaseAccount {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  region: 'VN' | 'SEA' | 'GLOBAL';
  elo: number;
  matchesPlayed: number;
  wins: number;
  updatedAt: number;
}

const LOCAL_DB_ACCOUNTS_KEY = 'werewolf_db_accounts_v3';

export type AccountModalTab = 'login' | 'register' | 'profile';

interface SocialLoginModalProps {
  currentUser: UserProfileData;
  initialTab?: AccountModalTab | null;
  onSaveProfile: (profile: {
    name: string;
    avatar: string;
    provider: AuthProviderId;
    handle: string;
    region?: string;
    elo?: number;
    matchesPlayed?: number;
    wins?: number;
  }) => void;
  lang: Language;
  onClose: () => void;
}

const AVATAR_OPTIONS = ['🐺', '🔮', '🛡️', '🧪', '🎯', '💘', '🎭', '👑', '🔥', '🧑‍🌾', '🗡️', '🌓'];

const DEFAULT_FALLBACK_ACCOUNTS: PublicDatabaseAccount[] = [
  {
    id: 'acc_huy132001',
    username: 'huy132001',
    displayName: 'Huy Nguyễn',
    avatar: '🐺',
    region: 'VN',
    elo: 1680,
    matchesPlayed: 14,
    wins: 9,
    updatedAt: Date.now(),
  },
  {
    id: 'acc_thosandem',
    username: 'thosandem',
    displayName: 'Thợ Săn Đêm',
    avatar: '🎯',
    region: 'VN',
    elo: 1620,
    matchesPlayed: 8,
    wins: 5,
    updatedAt: Date.now(),
  },
];

function loadCachedAccounts(): PublicDatabaseAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_DB_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_FALLBACK_ACCOUNTS;
}

function saveCachedAccounts(list: PublicDatabaseAccount[]) {
  try {
    localStorage.setItem(LOCAL_DB_ACCOUNTS_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    // ignore
  }
}

const ACCOUNT_I18N: Record<
  Language,
  {
    modalTitle: string;
    loggedInBadge: (username: string) => string;
    guestBadge: string;
    tabLogin: string;
    tabRegister: string;
    tabProfile: string;
    savedAccountsLabel: string;
    usernameLabel: string;
    usernamePlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    displayNameLabel: string;
    displayNamePlaceholder: string;
    regionLabel: string;
    avatarLabel: string;
    loginSubmitBtn: string;
    registerSubmitBtn: string;
    saveProfileBtn: string;
    signOutBtn: string;
    submittingText: string;
    noAccountYet: string;
    switchToRegister: string;
    alreadyHaveAccount: string;
    switchToLogin: string;
    dbSyncNotice: string;
    errInvalidUsername: string;
    errInvalidPassword: string;
    errPasswordMismatch: string;
    errInvalidDisplayName: string;
    defaultPassHint: string;
  }
> = {
  vi: {
    modalTitle: 'Tài Khoản Người Chơi & Lưu Trữ Database',
    loggedInBadge: (u) => `Đã đăng nhập · @${u}`,
    guestBadge: 'Tài khoản Khách (Chưa đăng ký)',
    tabLogin: 'Đăng Nhập',
    tabRegister: 'Đăng Ký Mới',
    tabProfile: 'Hồ Sơ Cá Nhân',
    savedAccountsLabel: 'Tài khoản trên Database (Bấm để điền nhanh):',
    usernameLabel: 'Tên tài khoản / Username (*):',
    usernamePlaceholder: 'VD: huy132001 (3–32 ký tự chữ hoặc số)...',
    passwordLabel: 'Mật khẩu (*):',
    passwordPlaceholder: 'Nhập mật khẩu (tối thiểu 4 ký tự)...',
    confirmPasswordLabel: 'Nhập lại mật khẩu (*):',
    confirmPasswordPlaceholder: 'Xác nhận lại mật khẩu...',
    displayNameLabel: 'Tên hiển thị trong Làng 3D (*):',
    displayNamePlaceholder: 'VD: Huy Nguyễn, Thợ Săn Đêm...',
    regionLabel: 'Máy chủ khu vực:',
    avatarLabel: 'Biểu tượng nhân vật đại diện:',
    loginSubmitBtn: 'Đăng Nhập Tài Khoản',
    registerSubmitBtn: 'Tạo Tài Khoản & Lưu Vào Database',
    saveProfileBtn: 'Cập Nhật Hồ Sơ Lên Database',
    signOutBtn: 'Đăng Xuất',
    submittingText: 'Đang đồng bộ với Database...',
    noAccountYet: 'Bạn chưa có tài khoản?',
    switchToRegister: 'Đăng ký tài khoản mới ngay →',
    alreadyHaveAccount: 'Đã có tài khoản trên Database?',
    switchToLogin: '← Quay về Đăng nhập',
    dbSyncNotice:
      'Tài khoản, điểm ELO, số trận thắng và hồ sơ 3D được lưu trữ trực tiếp trên Database.',
    errInvalidUsername:
      'Tên tài khoản phải từ 3–32 ký tự (chỉ gồm chữ cái, số, _, ., - hoặc @)!',
    errInvalidPassword: 'Mật khẩu phải có tối thiểu 4 ký tự!',
    errPasswordMismatch: 'Mật khẩu xác nhận không khớp!',
    errInvalidDisplayName: 'Tên hiển thị phải từ 2–40 ký tự!',
    defaultPassHint: 'Gợi ý: Mật khẩu mặc định của tài khoản mẫu là werewolf2026',
  },
  en: {
    modalTitle: 'Player Account & Database Storage',
    loggedInBadge: (u) => `Signed in · @${u}`,
    guestBadge: 'Guest Account (Unregistered)',
    tabLogin: 'Sign In',
    tabRegister: 'Create Account',
    tabProfile: 'My Profile',
    savedAccountsLabel: 'Accounts in Database (Click to quick-fill):',
    usernameLabel: 'Account Username (*):',
    usernamePlaceholder: 'e.g. huy132001 (3–32 alphanumeric chars)...',
    passwordLabel: 'Password (*):',
    passwordPlaceholder: 'Enter password (min 4 characters)...',
    confirmPasswordLabel: 'Confirm Password (*):',
    confirmPasswordPlaceholder: 'Re-enter your password...',
    displayNameLabel: 'Display Name in 3D Village (*):',
    displayNamePlaceholder: 'e.g. Night Hunter...',
    regionLabel: 'Server Region:',
    avatarLabel: 'Character Avatar Emblem:',
    loginSubmitBtn: 'Sign In to Account',
    registerSubmitBtn: 'Create Account & Save to Database',
    saveProfileBtn: 'Update Profile in Database',
    signOutBtn: 'Sign Out',
    submittingText: 'Syncing with Database...',
    noAccountYet: "Don't have an account yet?",
    switchToRegister: 'Create a new account →',
    alreadyHaveAccount: 'Already have an account?',
    switchToLogin: '← Back to Sign In',
    dbSyncNotice:
      'Your account, ELO rating, wins, and 3D avatar are persisted directly in the Database.',
    errInvalidUsername:
      'Username must be 3–32 characters (letters, numbers, _, ., - or @)!',
    errInvalidPassword: 'Password must be at least 4 characters!',
    errPasswordMismatch: 'Confirmation password does not match!',
    errInvalidDisplayName: 'Display name must be 2–40 characters!',
    defaultPassHint: 'Tip: Default password for demo accounts is werewolf2026',
  },
  fr: {
    modalTitle: 'Compte Joueur & Base de Données',
    loggedInBadge: (u) => `Connecté · @${u}`,
    guestBadge: 'Compte Invité',
    tabLogin: 'Connexion',
    tabRegister: 'Créer un Compte',
    tabProfile: 'Mon Profil',
    savedAccountsLabel: 'Comptes enregistrés en base :',
    usernameLabel: 'Nom d’utilisateur (*):',
    usernamePlaceholder: 'ex: huy132001 (3–32 caractères)...',
    passwordLabel: 'Mot de passe (*):',
    passwordPlaceholder: 'Mot de passe (min 4 caractères)...',
    confirmPasswordLabel: 'Confirmer le mot de passe (*):',
    confirmPasswordPlaceholder: 'Confirmez le mot de passe...',
    displayNameLabel: 'Pseudo dans le Village 3D (*):',
    displayNamePlaceholder: 'Entrez votre pseudo...',
    regionLabel: 'Région du serveur :',
    avatarLabel: 'Emblème d’Avatar :',
    loginSubmitBtn: 'Se Connecter',
    registerSubmitBtn: 'Créer le Compte & Sauvegarder',
    saveProfileBtn: 'Mettre à jour le profil',
    signOutBtn: 'Déconnexion',
    submittingText: 'Synchronisation...',
    noAccountYet: 'Pas encore de compte ?',
    switchToRegister: 'Créer un compte →',
    alreadyHaveAccount: 'Déjà inscrit ?',
    switchToLogin: '← Retour à la connexion',
    dbSyncNotice: 'Votre compte, ELO et statistiques sont sauvegardés dans la base de données.',
    errInvalidUsername: 'Nom d’utilisateur invalide (3–32 caractères) !',
    errInvalidPassword: 'Mot de passe trop court (min 4 caractères) !',
    errPasswordMismatch: 'Les mots de passe ne correspondent pas !',
    errInvalidDisplayName: 'Le pseudo doit contenir entre 2 et 40 caractères !',
    defaultPassHint: 'Astuce : Mot de passe démo = werewolf2026',
  },
  es: {
    modalTitle: 'Cuenta de Jugador y Base de Datos',
    loggedInBadge: (u) => `Conectado · @${u}`,
    guestBadge: 'Cuenta de Invitado',
    tabLogin: 'Iniciar Sesión',
    tabRegister: 'Crear Cuenta',
    tabProfile: 'Mi Perfil',
    savedAccountsLabel: 'Cuentas en la Base de Datos:',
    usernameLabel: 'Nombre de usuario (*):',
    usernamePlaceholder: 'ej: huy132001 (3–32 caracteres)...',
    passwordLabel: 'Contraseña (*):',
    passwordPlaceholder: 'Contraseña (mín. 4 caracteres)...',
    confirmPasswordLabel: 'Confirmar contraseña (*):',
    confirmPasswordPlaceholder: 'Repite la contraseña...',
    displayNameLabel: 'Nombre en la Aldea 3D (*):',
    displayNamePlaceholder: 'Ingresa tu nombre...',
    regionLabel: 'Región del Servidor:',
    avatarLabel: 'Emblema de Personaje:',
    loginSubmitBtn: 'Iniciar Sesión',
    registerSubmitBtn: 'Crear Cuenta y Guardar en BD',
    saveProfileBtn: 'Actualizar Perfil en BD',
    signOutBtn: 'Cerrar Sesión',
    submittingText: 'Sincronizando con BD...',
    noAccountYet: '¿Aún no tienes cuenta?',
    switchToRegister: 'Crear una cuenta nueva →',
    alreadyHaveAccount: '¿Ya tienes cuenta?',
    switchToLogin: '← Volver a Iniciar Sesión',
    dbSyncNotice: 'Tu cuenta, ELO y victorias se guardan directamente en la base de datos.',
    errInvalidUsername: '¡Usuario inválido (3–32 caracteres)!',
    errInvalidPassword: '¡La contraseña debe tener al menos 4 caracteres!',
    errPasswordMismatch: '¡Las contraseñas no coinciden!',
    errInvalidDisplayName: '¡El nombre debe tener entre 2 y 40 caracteres!',
    defaultPassHint: 'Consejo: Contraseña demo = werewolf2026',
  },
  ja: {
    modalTitle: 'プレイヤーアカウント＆データベース保存',
    loggedInBadge: (u) => `ログイン中 · @${u}`,
    guestBadge: 'ゲストアカウント（未登録）',
    tabLogin: 'ログイン',
    tabRegister: '新規アカウント作成',
    tabProfile: 'プロフィール設定',
    savedAccountsLabel: 'データベース保存済みアカウント（クリックで自動入力）:',
    usernameLabel: 'ユーザーID / アカウント名 (*):',
    usernamePlaceholder: '例: huy132001 (3〜32文字の英数字)...',
    passwordLabel: 'パスワード (*):',
    passwordPlaceholder: 'パスワード（4文字以上）...',
    confirmPasswordLabel: 'パスワード確認 (*):',
    confirmPasswordPlaceholder: 'もう一度パスワードを入力...',
    displayNameLabel: '3D村での表示名 (*):',
    displayNamePlaceholder: 'ニックネームを入力...',
    regionLabel: 'サーバー地域:',
    avatarLabel: 'キャラクターアバター:',
    loginSubmitBtn: 'アカウントにログイン',
    registerSubmitBtn: 'アカウントを作成してDBに保存',
    saveProfileBtn: 'プロフィールをDBに更新',
    signOutBtn: 'ログアウト',
    submittingText: 'データベース同期中...',
    noAccountYet: 'アカウントをお持ちでないですか？',
    switchToRegister: '新規アカウント作成へ →',
    alreadyHaveAccount: '既にアカウントをお持ちですか？',
    switchToLogin: '← ログイン画面に戻る',
    dbSyncNotice: 'アカウント、ELOレート、戦績はデータベースに直接保存されます。',
    errInvalidUsername: 'ユーザーIDは3〜32文字の半角英数字で入力してください！',
    errInvalidPassword: 'パスワードは4文字以上で入力してください！',
    errPasswordMismatch: '確認用パスワードが一致しません！',
    errInvalidDisplayName: '表示名は2〜40文字で入力してください！',
    defaultPassHint: 'ヒント: サンプルアカウントのパスワードは werewolf2026 です',
  },
};

export const SocialLoginModal: React.FC<SocialLoginModalProps> = ({
  currentUser,
  initialTab = null,
  onSaveProfile,
  lang,
  onClose,
}) => {
  const st = ACCOUNT_I18N[lang] || ACCOUNT_I18N.vi;
  const isLoggedInAccount = Boolean(
    currentUser.provider && currentUser.provider !== 'guest' && currentUser.handle
  );

  const [activeTab, setActiveTab] = useState<AccountModalTab>(() => {
    if (initialTab) return initialTab;
    return isLoggedInAccount ? 'profile' : 'login';
  });

  const [dbAccounts, setDbAccounts] = useState<PublicDatabaseAccount[]>(() =>
    loadCachedAccounts()
  );

  const [username, setUsername] = useState<string>(() => {
    if (currentUser.handle && currentUser.handle !== 'guest') return currentUser.handle;
    return initialTab === 'register' ? '' : 'huy132001';
  });
  const [password, setPassword] = useState<string>(() =>
    initialTab === 'register' ? '' : 'werewolf2026'
  );
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>(currentUser.name || 'Thợ Săn Đêm');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentUser.avatar || '🐺');
  const [region, setRegion] = useState<'VN' | 'SEA' | 'GLOBAL'>(
    (currentUser.region as 'VN' | 'SEA' | 'GLOBAL') || 'VN'
  );
  const [validationError, setValidationError] = useState<string>('');
  const [successBanner, setSuccessBanner] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setValidationError('');
    setSuccessBanner('');
  }, [activeTab, username, password, confirmPassword, displayName]);

  // Fetch registered accounts from Server Database on mount
  useEffect(() => {
    fetch('/api/accounts/list')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.ok && Array.isArray(data.accounts) && data.accounts.length > 0) {
          setDbAccounts(data.accounts);
          saveCachedAccounts(data.accounts);
        }
      })
      .catch(() => {});
  }, []);

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    if (cleanUser.length < 3 || cleanUser.length > 32) {
      setValidationError(st.errInvalidUsername);
      return;
    }
    if (!password || password.length < 4) {
      setValidationError(st.errInvalidPassword);
      return;
    }

    sound.playCardFlip();
    setIsSubmitting(true);
    setValidationError('');

    try {
      const res = await fetch('/api/accounts/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setValidationError(data?.error || st.errInvalidPassword);
        setIsSubmitting(false);
        return;
      }

      const acc: PublicDatabaseAccount = data.account;
      if (Array.isArray(data.accounts)) {
        setDbAccounts(data.accounts);
        saveCachedAccounts(data.accounts);
      }

      // Sync with Firestore if authenticated
      syncAuthenticatedPlayerAccountToFirestore({
        username: acc.username,
        displayName: acc.displayName,
        avatar: acc.avatar,
        region: acc.region,
        elo: acc.elo,
        matchesPlayed: acc.matchesPlayed || 0,
        wins: acc.wins || 0,
      }).catch(() => {});

      sound.playDayGong();
      onSaveProfile({
        name: acc.displayName,
        avatar: acc.avatar,
        provider: 'account',
        handle: acc.username,
        region: acc.region,
        elo: acc.elo,
        matchesPlayed: acc.matchesPlayed,
        wins: acc.wins,
      });
      setIsSubmitting(false);
      onClose();
    } catch {
      // Fallback to local cached database if offline
      const localMatch = dbAccounts.find(
        (a) => a.username.toLowerCase() === cleanUser
      );
      if (!localMatch) {
        setValidationError('Tài khoản chưa tồn tại trong Database!');
        setIsSubmitting(false);
        return;
      }
      sound.playDayGong();
      onSaveProfile({
        name: localMatch.displayName,
        avatar: localMatch.avatar,
        provider: 'account',
        handle: localMatch.username,
        region: localMatch.region,
        elo: localMatch.elo,
        matchesPlayed: localMatch.matchesPlayed,
        wins: localMatch.wins,
      });
      setIsSubmitting(false);
      onClose();
    }
  };

  const handleRegisterSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanName = displayName.trim();

    if (
      cleanUser.length < 3 ||
      cleanUser.length > 32 ||
      !/^[a-z0-9_.\-@]+$/.test(cleanUser)
    ) {
      setValidationError(st.errInvalidUsername);
      return;
    }
    if (!password || password.length < 4) {
      setValidationError(st.errInvalidPassword);
      return;
    }
    if (confirmPassword !== password) {
      setValidationError(st.errPasswordMismatch);
      return;
    }
    if (cleanName.length < 2 || cleanName.length > 40) {
      setValidationError(st.errInvalidDisplayName);
      return;
    }

    sound.playCardFlip();
    setIsSubmitting(true);
    setValidationError('');

    try {
      const res = await fetch('/api/accounts/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          password,
          displayName: cleanName,
          avatar: selectedAvatar,
          region,
          elo: currentUser.elo || 1620,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setValidationError(data?.error || st.errInvalidUsername);
        setIsSubmitting(false);
        return;
      }

      const acc: PublicDatabaseAccount = data.account;
      if (Array.isArray(data.accounts)) {
        setDbAccounts(data.accounts);
        saveCachedAccounts(data.accounts);
      }

      // Sync with Firestore if authenticated
      syncAuthenticatedPlayerAccountToFirestore({
        username: acc.username,
        displayName: acc.displayName,
        avatar: acc.avatar,
        region: acc.region,
        elo: acc.elo,
        matchesPlayed: acc.matchesPlayed || 0,
        wins: acc.wins || 0,
      }).catch(() => {});

      sound.playDayGong();
      onSaveProfile({
        name: acc.displayName,
        avatar: acc.avatar,
        provider: 'account',
        handle: acc.username,
        region: acc.region,
        elo: acc.elo,
        matchesPlayed: acc.matchesPlayed,
        wins: acc.wins,
      });
      setIsSubmitting(false);
      onClose();
    } catch {
      const fallbackAcc: PublicDatabaseAccount = {
        id: `acc_${cleanUser}_${Date.now()}`,
        username: cleanUser,
        displayName: cleanName,
        avatar: selectedAvatar,
        region,
        elo: currentUser.elo || 1620,
        matchesPlayed: 0,
        wins: 0,
        updatedAt: Date.now(),
      };
      const updated = [fallbackAcc, ...dbAccounts];
      setDbAccounts(updated);
      saveCachedAccounts(updated);
      sound.playDayGong();
      onSaveProfile({
        name: fallbackAcc.displayName,
        avatar: fallbackAcc.avatar,
        provider: 'account',
        handle: fallbackAcc.username,
        region: fallbackAcc.region,
        elo: fallbackAcc.elo,
        matchesPlayed: 0,
        wins: 0,
      });
      setIsSubmitting(false);
      onClose();
    }
  };

  const handleUpdateProfileSubmit = async () => {
    const cleanName = displayName.trim();
    if (cleanName.length < 2 || cleanName.length > 40) {
      setValidationError(st.errInvalidDisplayName);
      return;
    }

    sound.playCardFlip();
    setIsSubmitting(true);

    if (isLoggedInAccount && currentUser.handle) {
      try {
        const res = await fetch('/api/accounts/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: currentUser.handle,
            displayName: cleanName,
            avatar: selectedAvatar,
            region,
            elo: currentUser.elo,
          }),
        });
        const data = await res.json();
        if (data?.ok && Array.isArray(data.accounts)) {
          setDbAccounts(data.accounts);
          saveCachedAccounts(data.accounts);
        }
      } catch {
        // ignore offline error
      }

      syncAuthenticatedPlayerAccountToFirestore({
        username: currentUser.handle,
        displayName: cleanName,
        avatar: selectedAvatar,
        region,
        elo: currentUser.elo || 1620,
        matchesPlayed: currentUser.matchesPlayed || 0,
        wins: currentUser.wins || 0,
      }).catch(() => {});
    }

    sound.playDayGong();
    onSaveProfile({
      name: cleanName,
      avatar: selectedAvatar,
      provider: isLoggedInAccount ? 'account' : 'guest',
      handle: currentUser.handle || '',
      region,
      elo: currentUser.elo,
      matchesPlayed: currentUser.matchesPlayed,
      wins: currentUser.wins,
    });
    setIsSubmitting(false);
    onClose();
  };

  const handleSignOut = () => {
    sound.playCardFlip();
    setDisplayName('Thợ Săn Đêm');
    setSelectedAvatar('🐺');
    setUsername('huy132001');
    setPassword('werewolf2026');
    onSaveProfile({
      name: 'Thợ Săn Đêm',
      avatar: '🐺',
      provider: 'guest',
      handle: '',
      region: 'VN',
      elo: 1620,
      matchesPlayed: 0,
      wins: 0,
    });
    setActiveTab('login');
  };

  return (
    <div
      data-testid="social-login-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 pointer-events-auto"
    >
      <div className="w-full max-w-md bg-[#0b101e] border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 max-h-[92vh] overflow-y-auto">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/40 shrink-0">
              <Database className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h3 className="font-black text-sm sm:text-base text-slate-100 truncate">
                {st.modalTitle}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isLoggedInAccount && currentUser.handle ? (
                  <span
                    data-testid="connected-provider-badge"
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border text-emerald-200 bg-emerald-950/90 border-emerald-500/50 inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{st.loggedInBadge(currentUser.handle)}</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">
                    {st.guestBadge}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Mode Switcher Tabs: Đăng Nhập | Đăng Ký Mới | Hồ Sơ */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#070a14] p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            data-testid="tab-account-login"
            onClick={() => {
              sound.playCardFlip();
              setActiveTab('login');
            }}
            className={`py-2 px-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{st.tabLogin}</span>
          </button>

          <button
            type="button"
            data-testid="tab-account-register"
            onClick={() => {
              sound.playCardFlip();
              setActiveTab('register');
              if (username === 'huy132001') setUsername('');
              if (password === 'werewolf2026') {
                setPassword('');
                setConfirmPassword('');
              }
            }}
            className={`py-2 px-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{st.tabRegister}</span>
          </button>

          <button
            type="button"
            data-testid="tab-account-profile"
            onClick={() => {
              sound.playCardFlip();
              setActiveTab('profile');
            }}
            className={`py-2 px-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-sky-500 text-slate-950 shadow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{st.tabProfile}</span>
          </button>
        </div>

        {/* Database Notice Banner */}
        <div className="flex items-center gap-2 text-[10px] text-emerald-300/95 bg-emerald-950/35 border border-emerald-500/30 rounded-xl px-2.5 py-1.5">
          <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{st.dbSyncNotice}</span>
        </div>

        {/* TAB 1: ĐĂNG NHẬP TÀI KHOẢN (SIGN IN) */}
        {activeTab === 'login' && (
          <form
            data-testid="account-login-form"
            onSubmit={handleLoginSubmit}
            className="space-y-3"
          >
            {/* Quick-Fill Saved Accounts in Database */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400">
                  {st.savedAccountsLabel}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {dbAccounts.length} accounts
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                {dbAccounts.slice(0, 6).map((acc) => {
                  const isSelected = username.toLowerCase() === acc.username.toLowerCase();
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      data-testid={`quick-db-account-${acc.username}`}
                      onClick={() => {
                        sound.playCardFlip();
                        setUsername(acc.username);
                        setPassword('werewolf2026');
                        setDisplayName(acc.displayName);
                        setSelectedAvatar(acc.avatar);
                        setRegion(acc.region || 'VN');
                      }}
                      className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-amber-100'
                          : 'bg-[#070a14] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{acc.avatar}</span>
                        <div className="min-w-0">
                          <div className="text-[11px] font-extrabold truncate">
                            {acc.displayName}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400 truncate">
                            @{acc.username} · {acc.elo} ELO
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 italic">{st.defaultPassHint}</p>
            </div>

            <div className="space-y-2.5 bg-[#070a14] border border-slate-800 rounded-2xl p-3">
              <div>
                <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>{st.usernameLabel}</span>
                </label>
                <input
                  type="text"
                  data-testid="account-username-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={st.usernamePlaceholder}
                  className="w-full bg-[#0b101e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>{st.passwordLabel}</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    data-testid="account-password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={st.passwordPlaceholder}
                    className="w-full bg-[#0b101e] border border-slate-700 rounded-xl pl-3 pr-9 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {validationError && (
              <div
                data-testid="account-validation-error"
                className="p-2.5 rounded-xl bg-rose-950/90 border border-rose-500/60 text-xs text-rose-200 font-bold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <button
              type="submit"
              data-testid="account-login-submit-btn"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? st.submittingText : st.loginSubmitBtn}</span>
            </button>

            <div className="text-center pt-1">
              <span className="text-[11px] text-slate-400 mr-1.5">{st.noAccountYet}</span>
              <button
                type="button"
                data-testid="switch-to-register-btn"
                onClick={() => {
                  sound.playCardFlip();
                  setActiveTab('register');
                  setUsername('');
                  setPassword('');
                  setConfirmPassword('');
                }}
                className="text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
              >
                {st.switchToRegister}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ĐĂNG KÝ TÀI KHOẢN MỚI (CREATE ACCOUNT) */}
        {activeTab === 'register' && (
          <form
            data-testid="account-register-form"
            onSubmit={handleRegisterSubmit}
            className="space-y-2.5"
          >
            <div className="space-y-2.5 bg-[#070a14] border border-slate-800 rounded-2xl p-3">
              {/* 1. Username */}
              <div>
                <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5 mb-1">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{st.usernameLabel}</span>
                </label>
                <input
                  type="text"
                  data-testid="register-username-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={st.usernamePlaceholder}
                  className="w-full bg-[#0b101e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* 2. Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1 mb-1">
                    <KeyRound className="w-3 h-3 text-emerald-400" />
                    <span>{st.passwordLabel}</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    data-testid="register-password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={st.passwordPlaceholder}
                    className="w-full bg-[#0b101e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1 mb-1">
                    <KeyRound className="w-3 h-3 text-emerald-400" />
                    <span>{st.confirmPasswordLabel}</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    data-testid="register-confirm-password-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={st.confirmPasswordPlaceholder}
                    className="w-full bg-[#0b101e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* 3. Display Name & 4. Region */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-200 block mb-1">
                    {st.displayNameLabel}
                  </label>
                  <input
                    type="text"
                    data-testid="register-displayname-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={st.displayNamePlaceholder}
                    className="w-full bg-[#0b101e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1 mb-1">
                    <Globe className="w-3 h-3 text-sky-400" />
                    <span>{st.regionLabel}</span>
                  </label>
                  <select
                    value={region}
                    onChange={(e) =>
                      setRegion(e.target.value as 'VN' | 'SEA' | 'GLOBAL')
                    }
                    data-testid="register-region-select"
                    className="w-full bg-[#0b101e] border border-slate-700 rounded-xl px-2 py-2 text-xs font-bold text-amber-200 focus:outline-none"
                  >
                    <option value="VN">🇻🇳 VN</option>
                    <option value="SEA">🌏 SEA</option>
                    <option value="GLOBAL">🌐 Global</option>
                  </select>
                </div>
              </div>

              {/* 5. Character Avatar Emblem */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {st.avatarLabel}
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`py-1.5 rounded-lg text-base border transition-all cursor-pointer ${
                        selectedAvatar === emoji
                          ? 'bg-emerald-500/20 border-emerald-400 scale-105'
                          : 'bg-[#0b101e] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {validationError && (
              <div
                data-testid="account-validation-error"
                className="p-2.5 rounded-xl bg-rose-950/90 border border-rose-500/60 text-xs text-rose-200 font-bold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <button
              type="submit"
              data-testid="register-submit-btn"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? st.submittingText : st.registerSubmitBtn}</span>
            </button>

            <div className="text-center pt-0.5">
              <span className="text-[11px] text-slate-400 mr-1.5">
                {st.alreadyHaveAccount}
              </span>
              <button
                type="button"
                onClick={() => {
                  sound.playCardFlip();
                  setActiveTab('login');
                }}
                className="text-[11px] font-extrabold text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                {st.switchToLogin}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: HỒ SƠ CÁ NHÂN (MY PROFILE & DATABASE STATS) */}
        {activeTab === 'profile' && (
          <div data-testid="account-profile-view" className="space-y-3">
            {/* Account Stats Card */}
            <div className="p-3 rounded-2xl bg-[#070a14] border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0">
                  {selectedAvatar}
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-slate-100 truncate">
                    {displayName}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 truncate">
                    {isLoggedInAccount && currentUser.handle
                      ? `@${currentUser.handle} · Database Synced`
                      : st.guestBadge}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-black text-amber-400 flex items-center justify-end gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{currentUser.elo} ELO</span>
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  {currentUser.wins || 0}W / {currentUser.matchesPlayed || 0}M
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-[#070a14] border border-slate-800 rounded-2xl p-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {st.displayNameLabel}
                </label>
                <input
                  type="text"
                  data-testid="profile-name-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={st.displayNamePlaceholder}
                  className="w-full bg-[#0b101e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  {st.avatarLabel}
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`p-2 rounded-xl text-lg border transition-all cursor-pointer ${
                        selectedAvatar === emoji
                          ? 'bg-amber-500/20 border-amber-400 scale-105 shadow-md'
                          : 'bg-[#0b101e] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {validationError && (
              <div className="p-2 rounded-xl bg-rose-950/90 border border-rose-500/60 text-xs text-rose-200 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {successBanner && (
              <div className="p-2 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-xs text-emerald-200 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successBanner}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                data-testid="save-profile-btn"
                disabled={isSubmitting}
                onClick={handleUpdateProfileSubmit}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSubmitting ? st.submittingText : st.saveProfileBtn}</span>
              </button>

              {isLoggedInAccount && (
                <button
                  type="button"
                  data-testid="social-logout-btn"
                  onClick={handleSignOut}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{st.signOutBtn}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
