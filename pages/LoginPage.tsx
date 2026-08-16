import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AppContext';
import Button from '../components/ui/Button';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { APP_ICON } from '../assets';

const LoginPage: React.FC = () => {
  const { login, mode, authLoading, authError } = useAuth(); const navigate = useNavigate(); const { t } = useTranslation();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [showApi, setShowApi] = useState(false);
  const handleLogin = async (loginMode: 'demo' | 'local') => { await login(loginMode); navigate('/evaluator'); };
  const handleApiLogin = async (event: React.FormEvent) => { event.preventDefault(); try { await login('api', { email, password }); navigate('/evaluator'); } catch { /* authError is displayed */ } };
  return <div className="flex items-center justify-center min-h-screen bg-nasa-gray-900"><div className="text-center p-8 max-w-md w-full"><div className="mb-8"><div className="flex items-center justify-center"><img src={APP_ICON} alt="CaTLX Logo" className="w-12 h-12 rounded-full mr-3" /><h1 className="text-4xl font-bold text-white tracking-wider">{t('login.title')}</h1></div><p className="text-nasa-gray-300 mt-2">{t('login.subtitle')}</p></div><div className="bg-nasa-gray-800 p-8 rounded-lg shadow-2xl"><h2 className="text-2xl font-semibold text-white mb-8">{t('login.choose_mode')}</h2><div className="space-y-4"><Button onClick={() => void handleLogin('demo')} className="w-full !justify-start !p-4 text-left"><div className="flex flex-col"><span className="font-bold text-base">{t('login.demo_mode')}</span><span className="text-sm font-normal text-nasa-gray-200">{t('login.demo_mode_desc')}</span></div></Button><Button onClick={() => void handleLogin('local')} variant="secondary" className="w-full !justify-start !p-4 text-left"><div className="flex flex-col"><span className="font-bold text-base">{t('login.local_mode')}</span><span className="text-sm font-normal text-nasa-gray-300">{t('login.local_mode_desc')}</span></div></Button><Button onClick={() => setShowApi(v => !v)} variant="secondary" className="w-full !justify-start !p-4 text-left"><span className="font-bold text-base">{t('login.cloud_login')}</span></Button>{showApi && <form onSubmit={(e) => void handleApiLogin(e)} className="space-y-3 text-left"><input aria-label="Email" required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 rounded bg-white text-black" /><input aria-label="Password" required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full p-2 rounded bg-white text-black" /><Button type="submit" disabled={authLoading} className="w-full">{authLoading ? 'Connexion…' : 'Se connecter'}</Button>{authError && <p role="alert" className="text-red-400">{authError}</p>}</form>}</div></div><div className="mt-6 flex justify-center items-center"><LanguageSwitcher /></div></div></div>;
};
export default LoginPage;
