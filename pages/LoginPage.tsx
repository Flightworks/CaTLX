
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AppContext';
import { DEMO_PROJECT_ID } from '../data/demoProject';
import { projectPath } from './projectPaths';
import Button from '../components/ui/Button';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import ThemeSwitch from '../components/ui/ThemeSwitch';
import { APP_ICON } from '../assets';

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
);

const LoginPage: React.FC = () => {
  const { mode, login, signInWithGoogle, cloudError, continueOnline, checkingOnlineAccess, offlineUnlock } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogin = (mode: 'demo' | 'local') => {
    login(mode);
    navigate(mode === 'demo' ? projectPath(DEMO_PROJECT_ID) : '/projects');
  };

  const handleGoogleLogin = async () => {
    setConnecting(true);
    try {
      await (continueOnline ?? signInWithGoogle)?.();
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-nasa-gray-900">
      <div className="text-center p-8 max-w-md w-full">
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <img src={APP_ICON} alt="" className="w-12 h-12 rounded-xl mr-3" />
            <h1 className="text-4xl font-bold text-foreground tracking-wider">{t('login.title')}</h1>
          </div>
          <p className="text-nasa-gray-300 mt-2">{t('login.subtitle')}</p>
        </div>
        <div className="bg-nasa-gray-800 p-8 rounded-lg shadow-2xl">
          <h2 className="text-2xl font-semibold text-foreground mb-8">
            {t(mode === 'cloud' ? 'login.cloud_title' : 'login.choose_mode')}
          </h2>
          <div className="space-y-4">
            {mode === 'cloud' ? (
              <>
                {(!offlineUnlock || continueOnline) && (
                  <Button onClick={() => void handleGoogleLogin()} disabled={connecting || checkingOnlineAccess || offlineUnlock?.busy}
                    variant="secondary" className="w-full !justify-start !p-4 text-left">
                    <div className="flex items-center">
                      <GoogleIcon />
                      <div className="flex flex-col">
                        <span className="font-bold text-base">
                          {t(connecting || checkingOnlineAccess ? 'cloud.checking_access' : continueOnline ? 'offline.continue_online' : 'login.cloud_login')}
                        </span>
                        <span className="text-sm font-normal text-nasa-gray-300">
                          {t(offlineUnlock ? 'offline.continue_online_hint' : 'login.cloud_login_desc')}
                        </span>
                      </div>
                    </div>
                  </Button>
                )}
                {offlineUnlock && (
                  <div className="space-y-2">
                    <Button onClick={offlineUnlock.activate} disabled={offlineUnlock.busy || connecting} variant="secondary" className="w-full">
                      {t('offline.unlock')}
                    </Button>
                    {offlineUnlock.error && <p role="alert" className="text-left text-danger-ink">{t(offlineUnlock.error)}</p>}
                  </div>
                )}
              </>
            ) : (
              <>
                <Button onClick={() => handleLogin('demo')} className="w-full !justify-start !p-4 text-left">
                  <div className="flex flex-col">
                    <span className="font-bold text-base">{t('login.demo_mode')}</span>
                    <span className="text-sm font-normal text-nasa-gray-200">{t('login.demo_mode_desc')}</span>
                  </div>
                </Button>
                <Button onClick={() => handleLogin('local')} variant="secondary" className="w-full !justify-start !p-4 text-left">
                  <div className="flex flex-col">
                    <span className="font-bold text-base">{t('login.local_mode')}</span>
                    <span className="text-sm font-normal text-nasa-gray-300">{t('login.local_mode_desc')}</span>
                  </div>
                </Button>
              </>
            )}
            <Button onClick={() => navigate('/quick-rating')} variant="secondary" className="w-full">
              {t('quick_rating.title')}
            </Button>
            {cloudError && <p role="alert" className="text-left text-danger-ink">{t(`cloud.${cloudError}`)}</p>}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center items-center gap-3">
          <LanguageSwitcher />
          <ThemeSwitch />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
