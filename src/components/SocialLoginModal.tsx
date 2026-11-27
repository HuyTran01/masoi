import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  UserPlus,
  LogIn,
  ShieldCheck,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  Globe,
  AlertCircle,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { Language } from '../types/game';
import { sound } from '../utils/sound';
import { UI_TEXT } from '../utils/i18n';
import {
  signInWithGoogleFirebase,
  signOutFirebase,
  syncAuthenticatedPlayerAccountToFirestore,
} from '../firebase';

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

export type AccountModalTab = 'login' | 'register' | 'profile';

interface SocialLoginModalProps {
  currentUser: UserProfileData;
  authToken?: string | null;
  initialTab?: AccountModalTab | null;
  onSaveProfile: (
    profile: {
      id?: string;
      name: string;
      avatar: string;
      provider: AuthProviderId;
      handle: string;
      region?: string;
      elo?: number;
      matchesPlayed?: number;
      wins?: number;
    },
    token?: string | null
  ) => void;
  lang: Language;
  onClose: () => void;
}

const AVATAR_OPTIONS = ['🐺', '🔮', '🛡️', '🧪', '🎯', '💘', '🎭', '👑', '🔥', '🧑‍🌾', '🗡️', '🌓'];

const ACCOUNT_I18N: Record<
  Language,
  {
    modalTitle: string;
    loggedInBadge: (username: string) => string;
    guestBadge: string;
    tabLogin: string;
    tabRegister: string;
    tabProfile: string;
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
    googleSignInBtn: string;
    saveProfileBtn: string;
    signOutBtn: string;
    submittingText: string;
    noAccountYet: string;
    switchToRegister: string;
    alreadyHaveAccount: string;
    switchToLogin: string;
    syncNotice: string;
    errInvalidUsername: string;
    errInvalidPassword: string;
    errPasswordMismatch: string;
    errInvalidDisplayName: string;
    errNetwork: string;
    errSessionExpired: string;
  }
> = {
  vi: {
    modalTitle: 'Tài Khoản & Hồ Sơ Người Chơi',
    loggedInBadge: (u) => `Đã đăng nhập · @${u}`,
    guestBadge: 'Đang chơi chế độ Khách',
    tabLogin: 'Đăng Nhập',
    tabRegister: 'Đăng Ký Mới',
    tabProfile: 'Hồ Sơ Cá Nhân',
    usernameLabel: 'Tên tài khoản (*)',
    usernamePlaceholder: 'VD: thosandem (3–32 ký tự chữ hoặc số)',
    passwordLabel: 'Mật khẩu (*)',
    passwordPlaceholder: 'Nhập mật khẩu (tối thiểu 6 ký tự)',
    confirmPasswordLabel: 'Nhập lại mật khẩu (*)',
    confirmPasswordPlaceholder: 'Xác nhận lại mật khẩu',
    displayNameLabel: 'Tên hiển thị trong Làng 3D (*)',
    displayNamePlaceholder: 'VD: Huy Nguyễn, Thợ Săn Đêm...',
    regionLabel: 'Máy chủ khu vực',
    avatarLabel: 'Biểu tượng đại diện',
    loginSubmitBtn: 'Đăng Nhập',
    registerSubmitBtn: 'Tạo Tài Khoản',
    googleSignInBtn: 'Đăng nhập nhanh bằng Google',
    saveProfileBtn: 'Lưu Hồ Sơ',
    signOutBtn: 'Đăng Xuất',
    submittingText: 'Đang xác thực...',
    noAccountYet: 'Chưa có tài khoản?',
    switchToRegister: 'Đăng ký ngay →',
    alreadyHaveAccount: 'Đã có tài khoản?',
    switchToLogin: '← Quay về Đăng nhập',
    syncNotice: 'Điểm ELO, lịch sử chiến thắng và biểu tượng 3D được lưu an toàn theo tài khoản của bạn.',
    errInvalidUsername: 'Tên tài khoản phải từ 3–32 ký tự (chữ cái, số, _, ., - hoặc @).',
    errInvalidPassword: 'Mật khẩu phải có tối thiểu 6 ký tự.',
    errPasswordMismatch: 'Mật khẩu xác nhận không khớp.',
    errInvalidDisplayName: 'Tên hiển thị phải từ 2–40 ký tự.',
    errNetwork: 'Không thể kết nối máy chủ. Vui lòng thử lại sau.',
    errSessionExpired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để lưu thay đổi.',
  },
  en: {
    modalTitle: 'Player Account & Profile',
    loggedInBadge: (u) => `Signed in · @${u}`,
    guestBadge: 'Playing as Guest',
    tabLogin: 'Sign In',
    tabRegister: 'Create Account',
    tabProfile: 'My Profile',
    usernameLabel: 'Username (*)',
    usernamePlaceholder: 'e.g. nighthunter (3–32 chars)',
    passwordLabel: 'Password (*)',
    passwordPlaceholder: 'Enter password (min 6 chars)',
    confirmPasswordLabel: 'Confirm Password (*)',
    confirmPasswordPlaceholder: 'Re-enter your password',
    displayNameLabel: 'Display Name in 3D Village (*)',
    displayNamePlaceholder: 'e.g. Night Hunter',
    regionLabel: 'Server Region',
    avatarLabel: 'Avatar Emblem',
    loginSubmitBtn: 'Sign In',
    registerSubmitBtn: 'Create Account',
    googleSignInBtn: 'Continue with Google',
    saveProfileBtn: 'Save Profile',
    signOutBtn: 'Sign Out',
    submittingText: 'Verifying...',
    noAccountYet: "Don't have an account?",
    switchToRegister: 'Create one →',
    alreadyHaveAccount: 'Already have an account?',
    switchToLogin: '← Back to Sign In',
    syncNotice: 'Your ELO rating, match wins, and 3D emblem stay safely linked to your account.',
    errInvalidUsername: 'Username must be 3–32 characters (letters, numbers, _, ., - or @).',
    errInvalidPassword: 'Password must be at least 6 characters.',
    errPasswordMismatch: 'Confirmation password does not match.',
    errInvalidDisplayName: 'Display name must be 2–40 characters.',
    errNetwork: 'Unable to reach server. Please try again.',
    errSessionExpired: 'Your session expired. Please sign in again to save changes.',
  },
};

const makeDefaultGuestName = (prefix: string) => `${prefix} #${Math.floor(100 + Math.random() * 900)}`;

export const SocialLoginModal: React.FC<SocialLoginModalProps> = ({
  currentUser,
  authToken = null,
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
    if (isLoggedInAccount) return 'profile';
    if (initialTab) return initialTab;
    return 'login';
  });

  const [username, setUsername] = useState<string>(() =>
    currentUser.handle && currentUser.handle !== 'guest' ? currentUser.handle : ''
  );
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>(
    () => currentUser.name || makeDefaultGuestName(UI_TEXT[lang].guestPlayerPrefix)
  );
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentUser.avatar || '🐺');
  const [region, setRegion] = useState<'VN' | 'SEA' | 'GLOBAL'>(
    (currentUser.region as 'VN' | 'SEA' | 'GLOBAL') || 'VN'
  );
  const [validationError, setValidationError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSwitchTab = (next: AccountModalTab) => {
    setActiveTab(next);
    setPassword('');
    setConfirmPassword('');
    setValidationError('');
  };

  useEffect(() => {
    if (isLoggedInAccount && activeTab !== 'profile') {
      setActiveTab('profile');
    }
  }, [isLoggedInAccount, activeTab]);

  useEffect(() => {
    setValidationError('');
  }, [activeTab, username, password, confirmPassword, displayName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleGoogleSignIn = async () => {
    sound.playCardFlip();
    setIsSubmitting(true);
    setValidationError('');
    try {
      const profile = await signInWithGoogleFirebase();
      sound.playDayGong();
      onSaveProfile(
        {
          id: profile.uid,
          name: profile.displayName,
          avatar: profile.avatar,
          provider: 'google',
          handle: profile.username,
          region: profile.region,
          elo: profile.elo,
          matchesPlayed: profile.matchesPlayed,
          wins: profile.wins,
        },
        null
      );
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('popup-closed-by-user')
          ? lang === 'vi'
            ? 'Bạn đã đóng cửa sổ đăng nhập Google.'
            : 'Google sign-in popup was closed.'
          : lang === 'vi'
          ? 'Đăng nhập Google hiện tạm thời không khả dụng trên trình duyệt này. Bạn có thể dùng Tài khoản & Mật khẩu bên dưới.'
          : 'Google sign-in is currently unavailable in this browser. Please use Username & Password below.';
      setValidationError(msg);
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    if (cleanUser.length < 3 || cleanUser.length > 32) {
      setValidationError(st.errInvalidUsername);
      return;
    }
    if (!password || password.length < 6) {
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
      if (!res.ok || !data?.ok || !data?.token) {
        setValidationError(data?.error || st.errInvalidPassword);
        setIsSubmitting(false);
        return;
      }

      const acc: PublicDatabaseAccount = data.account;
      sound.playDayGong();
      onSaveProfile(
        {
          id: acc.id,
          name: acc.displayName,
          avatar: acc.avatar,
          provider: 'account',
          handle: acc.username,
          region: acc.region,
          elo: acc.elo,
          matchesPlayed: acc.matchesPlayed,
          wins: acc.wins,
        },
        String(data.token)
      );
      setIsSubmitting(false);
      onClose();
    } catch {
      setValidationError(st.errNetwork);
      setIsSubmitting(false);
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
    if (!password || password.length < 6) {
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
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.token) {
        setValidationError(data?.error || st.errInvalidUsername);
        setIsSubmitting(false);
        return;
      }

      const acc: PublicDatabaseAccount = data.account;
      sound.playDayGong();
      onSaveProfile(
        {
          id: acc.id,
          name: acc.displayName,
          avatar: acc.avatar,
          provider: 'account',
          handle: acc.username,
          region: acc.region,
          elo: acc.elo,
          matchesPlayed: acc.matchesPlayed,
          wins: acc.wins,
        },
        String(data.token)
      );
      setIsSubmitting(false);
      onClose();
    } catch {
      setValidationError(st.errNetwork);
      setIsSubmitting(false);
    }
  };

  const handleUpdateProfileSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = displayName.trim();
    if (cleanName.length < 2 || cleanName.length > 40) {
      setValidationError(st.errInvalidDisplayName);
      return;
    }

    sound.playCardFlip();
    setIsSubmitting(true);
    setValidationError('');

    let savedAccountId = currentUser.id;
    if (currentUser.provider === 'account' && currentUser.handle) {
      if (!authToken) {
        setValidationError(st.errSessionExpired);
        setIsSubmitting(false);
        return;
      }
      try {
        const res = await fetch('/api/accounts/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            username: currentUser.handle,
            displayName: cleanName,
            avatar: selectedAvatar,
            region,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setValidationError(data?.error || st.errSessionExpired);
          setIsSubmitting(false);
          return;
        }
        if (data.account?.id) {
          savedAccountId = String(data.account.id);
        }
      } catch {
        setValidationError(st.errNetwork);
        setIsSubmitting(false);
        return;
      }
    } else if (currentUser.provider === 'google' && currentUser.handle) {
      await syncAuthenticatedPlayerAccountToFirestore({
        username: currentUser.handle,
        displayName: cleanName,
        avatar: selectedAvatar,
        region,
        elo: currentUser.elo,
        matchesPlayed: currentUser.matchesPlayed || 0,
        wins: currentUser.wins || 0,
      }).catch(() => {});
    }

    sound.playDayGong();
    onSaveProfile(
      {
        id: savedAccountId,
        name: cleanName,
        avatar: selectedAvatar,
        provider: currentUser.provider || 'guest',
        handle: currentUser.handle || 'guest',
        region,
        elo: currentUser.elo,
        matchesPlayed: currentUser.matchesPlayed,
        wins: currentUser.wins,
      },
      authToken
    );
    setIsSubmitting(false);
    onClose();
  };

  const handleSignOut = async () => {
    sound.playCardFlip();
    if (currentUser.provider === 'google') {
      await signOutFirebase();
    }
    onSaveProfile(
      {
        name: makeDefaultGuestName(UI_TEXT[lang].guestPlayerPrefix),
        avatar: '🐺',
        provider: 'guest',
        handle: '',
        region: 'VN',
        elo: 1620,
        matchesPlayed: 0,
        wins: 0,
      },
      null
    );
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={st.modalTitle}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pointer-events-auto"
      style={{ backgroundColor: 'rgba(4, 7, 15, 0.9)' }}
      data-testid="account-auth-modal"
    >
      <div className="w-full max-w-md bg-[#0b1120] border-2 border-amber-500/60 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
              {selectedAvatar}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-amber-100 truncate">
                {st.modalTitle}
              </h3>
              <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1 truncate">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                {isLoggedInAccount && currentUser.handle
                  ? st.loggedInBadge(currentUser.handle)
                  : st.guestBadge}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs (Hide Login/Register tabs once user is logged in) */}
        {!isLoggedInAccount && (
          <div className="grid grid-cols-3 gap-1.5 bg-[#070a14] p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              data-testid="account-tab-login"
              onClick={() => handleSwitchTab('login')}
              className={`py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{st.tabLogin}</span>
            </button>
            <button
              type="button"
              data-testid="account-tab-register"
              onClick={() => handleSwitchTab('register')}
              className={`py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{st.tabRegister}</span>
            </button>
            <button
              type="button"
              data-testid="account-tab-profile"
              onClick={() => handleSwitchTab('profile')}
              className={`py-2 px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{st.tabProfile}</span>
            </button>
          </div>
        )}

        {validationError && (
          <div
            role="alert"
            data-testid="account-error-banner"
            className="px-3 py-2.5 rounded-xl bg-rose-950/90 border border-rose-500/60 text-xs text-rose-200 font-semibold flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
              data-testid="google-signin-btn"
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{st.googleSignInBtn}</span>
            </button>

            <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wider">
              <div className="flex-1 h-px bg-slate-800" />
              <span>{lang === 'vi' ? 'Hoặc tài khoản mật khẩu' : 'Or username & password'}</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            <div>
              <label className="text-[11px] font-bold text-amber-300 block mb-1">
                {st.usernameLabel}
              </label>
              <input
                type="text"
                autoComplete="username"
                data-testid="login-username-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={st.usernamePlaceholder}
                className="w-full bg-[#070a14] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-amber-300 block mb-1">
                {st.passwordLabel}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  data-testid="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={st.passwordPlaceholder}
                  className="w-full bg-[#070a14] border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2.5 pr-10 text-xs text-slate-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="login-submit-btn"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isSubmitting ? st.submittingText : st.loginSubmitBtn}</span>
            </button>

            <div className="text-center text-xs text-slate-400 pt-1">
              {st.noAccountYet}{' '}
              <button
                type="button"
                onClick={() => handleSwitchTab('register')}
                className="text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                {st.switchToRegister}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-emerald-300 block mb-1">
                  {st.usernameLabel}
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  data-testid="register-username-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={st.usernamePlaceholder}
                  className="w-full bg-[#070a14] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-emerald-300 block mb-1">
                  {st.displayNameLabel}
                </label>
                <input
                  type="text"
                  data-testid="register-displayname-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={st.displayNamePlaceholder}
                  className="w-full bg-[#070a14] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-emerald-300 block mb-1">
                  {st.passwordLabel}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  data-testid="register-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={st.passwordPlaceholder}
                  className="w-full bg-[#070a14] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-emerald-300 block mb-1">
                  {st.confirmPasswordLabel}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  data-testid="register-confirm-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={st.confirmPasswordPlaceholder}
                  className="w-full bg-[#070a14] border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                {st.avatarLabel}
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`py-1.5 rounded-lg border text-base cursor-pointer ${
                      selectedAvatar === av
                        ? 'bg-emerald-900/70 border-emerald-400'
                        : 'bg-[#070a14] border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="register-submit-btn"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? st.submittingText : st.registerSubmitBtn}</span>
            </button>

            <div className="text-center text-xs text-slate-400">
              {st.alreadyHaveAccount}{' '}
              <button
                type="button"
                onClick={() => handleSwitchTab('login')}
                className="text-amber-300 font-bold hover:underline cursor-pointer"
              >
                {st.switchToLogin}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: PROFILE */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfileSubmit} className="space-y-3">
            <div className="grid grid-cols-3 gap-2 bg-[#070a14] border border-slate-800 rounded-2xl p-3 text-center">
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-bold">ELO</div>
                <div className="text-base font-black text-amber-300 font-mono flex items-center justify-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  {currentUser.elo}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-bold">
                  {lang === 'vi' ? 'Số trận' : 'Matches'}
                </div>
                <div className="text-base font-black text-sky-300 font-mono">
                  {currentUser.matchesPlayed || 0}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-slate-400 font-bold">
                  {lang === 'vi' ? 'Thắng' : 'Wins'}
                </div>
                <div className="text-base font-black text-emerald-300 font-mono">
                  {currentUser.wins || 0}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-sky-300 block mb-1">
                {st.displayNameLabel}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#070a14] border border-slate-700 focus:border-sky-400 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-sky-300 block mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {st.regionLabel}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['VN', 'SEA', 'GLOBAL'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegion(r)}
                    className={`py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                      region === r
                        ? 'bg-sky-600 border-sky-300 text-white'
                        : 'bg-[#070a14] border-slate-800 text-slate-400'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                {st.avatarLabel}
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`py-1.5 rounded-lg border text-base cursor-pointer ${
                      selectedAvatar === av
                        ? 'bg-sky-900/70 border-sky-400'
                        : 'bg-[#070a14] border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-black text-xs cursor-pointer"
              >
                {isSubmitting ? st.submittingText : st.saveProfileBtn}
              </button>
              {isLoggedInAccount && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-950/90 hover:bg-rose-800 border border-rose-500/50 text-rose-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{st.signOutBtn}</span>
                </button>
              )}
            </div>
          </form>
        )}

        <p className="text-[10px] text-slate-400 text-center leading-relaxed border-t border-slate-800/80 pt-2.5">
          {st.syncNotice}
        </p>
      </div>
    </div>
  );
};
