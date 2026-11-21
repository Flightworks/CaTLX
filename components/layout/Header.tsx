import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AppContext';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import ThemeSwitch from '../ui/ThemeSwitch';
import { APP_ICON } from '../../assets';

const links = [
  { to: '/projects', label: 'projects.title', path: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { to: '/workspace/quick-rating', label: 'quick_rating.title', path: 'M3 13h4l3-8 4 14 3-6h4' },
  { to: '/admin', label: 'header.administration', path: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' },
  { to: '/about', label: 'header.about', path: 'M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
];

function Icon({ path }: { path: string }) {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/projects" onClick={onClick} className="flex w-fit items-center gap-2.5 rounded font-semibold tracking-tight">
      <img src={APP_ICON} alt="" className="h-7 w-7 rounded-md" />
      CaTLX
    </Link>
  );
}

function Navigation({ close }: { close?: () => void }) {
  const { mode, logout, offlineEnrollment } = useAuth();
  const { t } = useTranslation();
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-5">
        <Brand onClick={close} />
        {close && (
          <button type="button" className="workspace-icon-button" aria-label={t('common.close')} onClick={close}>
            <Icon path="m6 6 12 12M18 6 6 18" />
          </button>
        )}
      </div>
      <nav aria-label={t('header.main_navigation')} className="flex-1 space-y-1 px-2.5">
        {links.map(item => (
          <NavLink key={item.to} to={item.to} onClick={close} className="workspace-nav-link">
            <Icon path={item.path} />
            <span>{t(item.label)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="space-y-3 border-t border-separator px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <LanguageSwitcher />
          <ThemeSwitch />
          {mode !== 'cloud' && <span className="text-xs text-nasa-gray-300">{t(`header.${mode}`)}</span>}
        </div>
        {offlineEnrollment && (
          <>
            <button type="button" className="workspace-nav-link w-full" disabled={offlineEnrollment.busy}
              onClick={offlineEnrollment.activate}>
              <Icon path="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5" />
              {t('offline.enable')}
            </button>
            {offlineEnrollment.error && <p role="alert" className="text-xs text-danger-ink">{t(offlineEnrollment.error)}</p>}
          </>
        )}
        <button type="button" className="workspace-nav-link w-full" onClick={() => { close?.(); logout(); }}>
          <Icon path="M10 5H5v14h5m-1-7h12m-4-4 4 4-4 4" />
          {t('header.logout')}
        </button>
      </div>
    </>
  );
}

export default function Header() {
  const { t } = useTranslation();
  const drawer = useRef<HTMLDialogElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  return (
    <>
      <aside className="workspace-sidebar hidden md:sticky md:top-0 md:flex md:h-dvh md:w-52 md:shrink-0 md:flex-col lg:w-56">
        <Navigation />
      </aside>
      <header className="workspace-sidebar flex min-h-12 items-center justify-between gap-3 border-b border-separator px-3 md:hidden">
        <button ref={openButton} type="button" className="workspace-icon-button"
          aria-label={t('header.open_menu')} aria-haspopup="dialog" aria-controls="workspace-menu"
          onClick={() => drawer.current?.showModal()}>
          <Icon path="M4 6h16M4 12h16M4 18h16" />
        </button>
        <Brand />
      </header>
      <dialog ref={drawer} id="workspace-menu" aria-label={t('header.main_navigation')}
        className="workspace-drawer"
        onClick={event => { if (event.target === event.currentTarget) drawer.current?.close(); }}
        onClose={() => { if (openButton.current?.offsetParent) openButton.current.focus(); }}>
        <div className="workspace-sidebar flex min-h-full flex-col">
          <Navigation close={() => drawer.current?.close()} />
        </div>
      </dialog>
    </>
  );
}
