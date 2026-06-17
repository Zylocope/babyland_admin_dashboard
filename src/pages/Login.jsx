import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { IconBabyCarriage, IconEye, IconEyeOff } from '@tabler/icons-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const result = login(username.trim(), password);
    setLoading(false);
    if (result.success) navigate('/');
    else setError(t('login.invalid'));
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand rounded-xl shadow-hover mb-4">
            <IconBabyCarriage stroke={1.5} size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-ink">{t('login.brand')}</h1>
          <p className="text-sub text-sm mt-1">{t('login.subtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl shadow-hover border border-app p-8">
          <h2 className="text-lg font-semibold text-ink mb-6">{t('login.heading')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('login.username')}</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={t('login.usernamePlaceholder')}
                autoComplete="username"
                required
                className="w-full px-4 py-2.5 border border-app rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('login.password')}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-2.5 pr-11 border border-app rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors"
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-sub">
                  {showPw ? <IconEyeOff stroke={1.5} size={16} /> : <IconEye stroke={1.5} size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors shadow-card disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
            >
              {loading ? t('login.signingIn') : t('login.signIn')}
            </button>
          </form>

          <p className="text-xs text-mute text-center mt-6">
            {t('login.note')}
          </p>
        </div>

        {/* Dev hint */}
        <div className="mt-4 bg-brand-light border border-app rounded-xl p-4 text-xs text-sub">
          <p className="font-medium text-ink mb-1">Dev credentials</p>
          <p>Manager: <code className="bg-card border border-app px-1.5 py-0.5 rounded text-brand">manager55</code> / <code className="bg-card border border-app px-1.5 py-0.5 rounded text-brand">manager55</code></p>
          <p className="mt-1">Sale Staff: <code className="bg-card border border-app px-1.5 py-0.5 rounded text-brand">sale77</code> / <code className="bg-card border border-app px-1.5 py-0.5 rounded text-brand">sale77</code></p>
          <p className="mt-1">Ticket Staff: <code className="bg-card border border-app px-1.5 py-0.5 rounded text-brand">ticket77</code> / <code className="bg-card border border-app px-1.5 py-0.5 rounded text-brand">ticket77</code></p>
        </div>
      </div>
    </div>
  );
}
