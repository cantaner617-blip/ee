import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialMode, onClose }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(username || email, password);
      } else {
        await register(username, email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'login'
              ? 'Görsellerinizi yönetmek için hesabınıza erişin'
              : 'Ücretsiz üye olun, görsellerinizi albümlerde saklayın'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {mode === 'login' ? 'Kullanıcı Adı veya E-posta' : 'Kullanıcı Adı'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={mode === 'login' ? 'kullaniciadi veya ad@mail.com' : 'ornek_kullanici'}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ad@ornek.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Şifre
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-500 text-white font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? 'Lütfen bekleyin...'
              : mode === 'login'
              ? 'Giriş Yap'
              : 'Kayıt Ol'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
          {mode === 'login' ? (
            <p>
              Hesabınız yok mu?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
              >
                Hemen Kayıt Olun
              </button>
            </p>
          ) : (
            <p>
              Zaten hesabınız var mı?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
              >
                Giriş Yapın
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
