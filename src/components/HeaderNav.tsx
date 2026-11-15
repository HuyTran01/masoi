import React from 'react';
import { Volume2, VolumeX, Moon, Shield, Trophy, History, BookOpen, Smartphone, User, Play, Radio } from 'lucide-react';
import { Language } from '../types/game';
import { TRANSLATIONS } from '../utils/i18n';
import { sound } from '../utils/sound';

interface HeaderNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  lang: Language;
  setLang: (l: Language) => void;
  currentUser: { name: string; avatar: string; elo: number };
  onOpenProfile: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentTab,
  setCurrentTab,
  lang,
  setLang,
  currentUser,
  onOpenProfile,
  isMuted,
  onToggleMute,
}) => {
  const t = TRANSLATIONS[lang];

  return (
    <header className="sticky top-0 z-50 border-b border-rose-950/40 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Logo and Brand */}
        <button
          onClick={() => {
            sound.playCardFlip();
            setCurrentTab('online');
          }}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-700 via-red-900 to-slate-950 flex items-center justify-center border border-rose-500/30 shadow-lg shadow-rose-950/50 group-hover:scale-105 transition-transform">
            <Moon className="w-5 h-5 text-rose-300 fill-rose-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-['Cinzel'] font-bold text-base sm:text-lg tracking-wider text-rose-200 group-hover:text-rose-100 transition-colors">
                MA SÓI
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800/40">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Online & Trợ Lý Quản Trò
            </p>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => {
              sound.playCardFlip();
              setCurrentTab('online');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'online'
                ? 'bg-gradient-to-r from-rose-900 to-red-900 text-rose-100 shadow-sm border border-rose-700/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-rose-400" />
            {t.playOnline}
          </button>

          <button
            onClick={() => {
              sound.playCardFlip();
              setCurrentTab('gm_assistant');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'gm_assistant'
                ? 'bg-gradient-to-r from-amber-900 to-yellow-900 text-amber-100 shadow-sm border border-amber-700/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            {t.gmAssistant}
          </button>

          <button
            onClick={() => {
              sound.playCardFlip();
              setCurrentTab('virtual_cards');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'virtual_cards'
                ? 'bg-gradient-to-r from-purple-900 to-indigo-900 text-purple-100 shadow-sm border border-purple-700/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-purple-400" />
            {t.virtualCards}
          </button>

          <button
            onClick={() => {
              sound.playCardFlip();
              setCurrentTab('leaderboard');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'leaderboard'
                ? 'bg-slate-800 text-yellow-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            {t.leaderboard}
          </button>

          <button
            onClick={() => {
              sound.playCardFlip();
              setCurrentTab('history');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'history'
                ? 'bg-slate-800 text-sky-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <History className="w-3.5 h-3.5 text-sky-400" />
            {t.matchHistory}
          </button>

          <button
            onClick={() => {
              sound.playCardFlip();
              setCurrentTab('encyclopedia');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'encyclopedia'
                ? 'bg-slate-800 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            {t.roleEncyclopedia}
          </button>
        </nav>

        {/* Right utility actions */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-rose-400" />}
          </button>

          {/* Language Selector */}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Language)}
            className="bg-slate-900 border border-slate-800 text-xs font-medium rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            aria-label="Select Language"
          >
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="en">🇬🇧 English</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="es">🇪🇸 Español</option>
            <option value="ja">🇯🇵 日本語</option>
          </select>

          {/* User Profile / Login */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-900/90 border border-slate-800 rounded-lg hover:border-slate-700 transition-all text-xs"
          >
            <span className="text-base">{currentUser.avatar}</span>
            <div className="text-left hidden sm:block">
              <span className="block font-semibold text-slate-200 leading-tight truncate max-w-[100px]">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                {currentUser.elo} ELO
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-900 bg-slate-950 px-2 py-1.5 overflow-x-auto">
        <button
          onClick={() => setCurrentTab('online')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium ${
            currentTab === 'online' ? 'text-rose-400' : 'text-slate-400'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Online</span>
        </button>
        <button
          onClick={() => setCurrentTab('gm_assistant')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium ${
            currentTab === 'gm_assistant' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Quản Trò</span>
        </button>
        <button
          onClick={() => setCurrentTab('virtual_cards')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium ${
            currentTab === 'virtual_cards' ? 'text-purple-400' : 'text-slate-400'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Thẻ Bài</span>
        </button>
        <button
          onClick={() => setCurrentTab('leaderboard')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium ${
            currentTab === 'leaderboard' ? 'text-yellow-400' : 'text-slate-400'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>BXH</span>
        </button>
        <button
          onClick={() => setCurrentTab('encyclopedia')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium ${
            currentTab === 'encyclopedia' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Cẩm Nang</span>
        </button>
      </div>
    </header>
  );
};
