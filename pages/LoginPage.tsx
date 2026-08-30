import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AppContext';
import Button from '../components/ui/Button';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { APP_ICON } from '../assets';

const LoginPage: React.FC = () => {
  const { login, register, requestPasswordReset, authLoading, authError } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showOnline, setShowOnline] = useState(false);
  const [onlineProvider, setOnlineProvider] = useState<'firebase' | 'api'>('firebase');
  const [isRegistering, setIsRegistering] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleLogin = async (mode: 'demo' | 'local') => {
    await login(mode);
    navigate('/evaluator');
  };

  const handleOnlineSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    try {
      if (onlineProvider === 'firebase' && isRegistering) {
        await register({ email, password }, displayName);
        setPassword('');
        setIsRegistering(false);
        setNotice(t('login.registration_pending', 'Account created. An administrator must approve it before you can sign in.'));
        return;
      }
      await login(onlineProvider, { email, password });
      navigate('/evaluator');
    } catch {
      // authError is displayed below without exposing provider details.
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setNotice(t('login.enter_email_first', 'Enter your email address first.'));
      return;
    }
    await requestPasswordReset(email);
    setNotice(t('login.reset_sent', 'If this address is registered, password reset instructions will be sent.'));
  };

  const firebaseTitle = t('login.firebase_mode', 'Online mode (Firebase)');
  const apiTitle = t('login.api_mode', 'Legacy API mode');

  return (
    <div className="flex items-center justify-center min-h-screen bg-nasa-gray-900">
      <div className="text-center p-8 max-w-md w-full">
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <img src={APP_ICON} alt="CaTLX Logo" className="w-12 h-12 rounded-full mr-3" />
            <h1 className="text-4xl font-bold text-white tracking-wider">{t('login.title')}</h1>
          </div>
          <p className="text-nasa-gray-300 mt-2">{t('login.subtitle')}</p>
        </div>

        <div className="bg-nasa-gray-800 p-8 rounded-lg shadow-2xl">
          <h2 className="text-2xl font-semibold text-white mb-8">{t('login.choose_mode')}</h2>
          <div className="space-y-4">
            <Button onClick={() => void handleLogin('demo')} className="w-full !justify-start !p-4 text-left">
              <div className="flex flex-col">
                <span className="font-bold text-base">{t('login.demo_mode')}</span>
                <span className="text-sm font-normal text-nasa-gray-200">{t('login.demo_mode_desc')}</span>
              </div>
            </Button>
            <Button onClick={() => void handleLogin('local')} variant="secondary" className="w-full !justify-start !p-4 text-left">
              <div className="flex flex-col">
                <span className="font-bold text-base">{t('login.local_mode')}</span>
                <span className="text-sm font-normal text-nasa-gray-300">{t('login.local_mode_desc')}</span>
              </div>
            </Button>
            <Button
              onClick={() => setShowOnline((value) => !value)}
              variant="secondary"
              className="w-full !justify-start !p-4 text-left"
            >
              <div className="flex flex-col">
                <span className="font-bold text-base">{firebaseTitle}</span>
                <span className="text-sm font-normal text-nasa-gray-300">{t('login.firebase_mode_desc', 'Secure online accounts and role-based access.')}</span>
              </div>
            </Button>
          </div>

          {showOnline && (
            <div className="mt-6 text-left">
              <div className="flex gap-2 mb-4" role="tablist" aria-label={t('login.online_provider', 'Online provider')}>
                <Button
                  type="button"
                  size="sm"
                  variant={onlineProvider === 'firebase' ? 'primary' : 'secondary'}
                  onClick={() => { setOnlineProvider('firebase'); setIsRegistering(false); setNotice(null); }}
                >
                  {firebaseTitle}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={onlineProvider === 'api' ? 'primary' : 'secondary'}
                  onClick={() => { setOnlineProvider('api'); setIsRegistering(false); setNotice(null); }}
                >
                  {apiTitle}
                </Button>
              </div>

              <form onSubmit={(event) => void handleOnlineSubmit(event)} className="space-y-3">
                {onlineProvider === 'firebase' && isRegistering && (
                  <input
                    aria-label={t('login.display_name', 'Display name')}
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder={t('login.display_name', 'Display name')}
                    className="w-full p-2 rounded bg-white text-black"
                  />
                )}
                <input
                  aria-label="Email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  className="w-full p-2 rounded bg-white text-black"
                />
                <input
                  aria-label="Password"
                  required
                  minLength={8}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t('login.password', 'Password')}
                  className="w-full p-2 rounded bg-white text-black"
                />
                <Button type="submit" disabled={authLoading} className="w-full">
                  {authLoading
                    ? t('login.loading', 'Please wait…')
                    : isRegistering
                      ? t('login.create_account', 'Create account')
                      : t('login.sign_in', 'Sign in')}
                </Button>
              </form>

              {onlineProvider === 'firebase' && (
                <div className="mt-4 flex flex-col gap-2 text-sm">
                  <button type="button" className="text-nasa-blue hover:underline" onClick={() => { setIsRegistering((value) => !value); setNotice(null); }}>
                    {isRegistering ? t('login.back_to_sign_in', 'Back to sign in') : t('login.create_account', 'Create account')}
                  </button>
                  {!isRegistering && (
                    <button type="button" className="text-nasa-blue hover:underline" onClick={() => void handlePasswordReset()}>
                      {t('login.forgot_password', 'Forgot password?')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {authError && <p role="alert" className="mt-5 text-sm text-red-300">{authError}</p>}
          {notice && <p role="status" className="mt-5 text-sm text-green-300">{notice}</p>}
        </div>

        <div className="mt-6 flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
