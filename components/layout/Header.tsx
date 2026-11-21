import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useMatch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, useData } from '../../contexts/AppContext';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import ThemeSwitch from '../ui/ThemeSwitch';
import { APP_ICON } from '../../assets';

const projectLink = { to: '/projects', label: 'projects.title', path: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' };
const catalogLink = { to: '/projects/catalog', label: 'admin.mte_catalog', path: 'M4 6h16v14H4zM4 6l2-3h12l2 3m-10 5h4' };

const scenarioIcon = 'M6 9v6m0-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0-6c7 0 12-1 12-6m0 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6z';

const links = [
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

function Brand({ onClick, compact = false }: { onClick?: () => void; compact?: boolean }) {
  return (
    <Link to="/projects" onClick={onClick} aria-label="CaTLX" title={compact ? 'CaTLX' : undefined}
      className="flex w-fit items-center gap-2.5 rounded font-semibold tracking-tight">
      <img src={APP_ICON} alt="" className="h-7 w-7 rounded-md" />
      {!compact && <span>CaTLX</span>}
    </Link>
  );
}

type NavigationItem = { to: string; label: string; path: string; end?: boolean };

function Navigation({ close, collapsed = false, toggle }: { close?: () => void; collapsed?: boolean; toggle?: () => void }) {
  const { mode, logout, offlineEnrollment } = useAuth();
  const { t } = useTranslation();
  const { projects, studies } = useData();
  const projectMatch = useMatch('/projects/:projectId/*');
  const studyMatch = useMatch('/projects/:projectId/studies/:studyId/*');
  const project = projects.find(entry => entry.id === projectMatch?.params.projectId);
  const study = studies.find(entry => entry.projectId === project?.id && entry.id === studyMatch?.params.studyId);
  const projectPath = project ? `/projects/${encodeURIComponent(project.id)}` : '';
  const studyPath = study ? `${projectPath}/studies/${encodeURIComponent(study.id)}` : '';
  const projectLinks: NavigationItem[] = [
    { to: projectPath, label: 'projects.studies', path: 'M7 4h10v14H7zM4 7v14h10M10 8h4m-4 4h4', end: true },
    { ...catalogLink, to: `${projectPath}/catalog` },
    { to: `${projectPath}/evaluators`, label: 'header.evaluators', path: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 0a4 4 0 0 1 0 8' },
    { to: `${projectPath}/scenarios`, label: 'projects.scenarios', path: 'M3 4h6v5H3zM15 10h6v5h-6zM3 16h6v5H3zM6 9v7m0-4h9' },
    { to: `${projectPath}/results`, label: 'header.project_results', path: 'M3 4v16h18M8 16v-4m5 4V7m5 9v-6' },
  ];
  const studyLinks: NavigationItem[] = [
    { to: studyPath, label: 'projects.study_tasks', path: 'M5 4h14v16H5zM8 8h.01m3 0h5m-8 4h.01m3 0h5m-8 4h.01m3 0h5', end: true },
    { to: `${studyPath}/scenarios`, label: 'header.study_scenarios', path: scenarioIcon },
    { to: `${studyPath}/results`, label: 'header.study_results', path: 'M3 4v16h18M7 15l4-4 3 2 5-6' },
    { to: `${studyPath}/settings`, label: 'projects.study_settings', path: 'M4 7h4m4 0h8M4 17h8m4 0h4M8 4v6m8 4v6' },
  ];
  const toggleLabel = t(collapsed ? 'header.expand_sidebar' : 'header.collapse_sidebar');

  function renderLink(item: NavigationItem, nested = false) {
    const label = t(item.label);
    return (
      <NavLink key={item.to} to={item.to} end={item.end} onClick={close}
        title={collapsed ? label : undefined} className={`workspace-nav-link ${nested ? 'workspace-nav-child' : ''}`}>
        <Icon path={item.path} />
        <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
      </NavLink>
    );
  }

  function renderSection(name: string, items: NavigationItem[]) {
    return (
      <div role="group" aria-label={name} className="workspace-nav-section">
        {!collapsed && <p aria-hidden="true" title={name} className="truncate px-2.5 pb-1 text-xs font-semibold text-nasa-gray-400">{name}</p>}
        {items.map(item => renderLink(item, true))}
      </div>
    );
  }

  const preferences = (
    <>
      <LanguageSwitcher />
      <ThemeSwitch />
      {mode !== 'cloud' && <span className="text-xs text-nasa-gray-300">{t(`header.${mode}`)}</span>}
    </>
  );

  return (
    <>
      <div className={`flex items-center gap-2 pb-3 pt-4 ${collapsed ? 'flex-col' : 'justify-between px-4'}`}>
        <Brand onClick={close} compact={collapsed} />
        {toggle && (
          <button type="button" className="workspace-icon-button" title={toggleLabel}
            aria-label={toggleLabel} aria-expanded={!collapsed} aria-controls="workspace-desktop-navigation" onClick={toggle}>
            <Icon path={collapsed ? 'M3 5h18v14H3zM9 5v14m4-10 3 3-3 3' : 'M3 5h18v14H3zM9 5v14m7-10-3 3 3 3'} />
          </button>
        )}
        {close && (
          <button type="button" className="workspace-icon-button" aria-label={t('common.close')} onClick={close}>
            <Icon path="m6 6 12 12M18 6 6 18" />
          </button>
        )}
      </div>
      <nav id={toggle ? 'workspace-desktop-navigation' : undefined} aria-label={t('header.main_navigation')}
        className="flex-1 space-y-1 px-2.5 pb-3">
        {renderLink({ ...projectLink, end: true })}
        {project ? renderSection(t('header.project_section'), projectLinks) : renderLink(catalogLink, true)}
        {study && renderSection(study.name, studyLinks)}
        <div className="workspace-nav-section">
          {links.map(item => renderLink(item))}
        </div>
      </nav>
      <div className={`space-y-2 border-t border-separator py-3 ${collapsed ? 'px-2.5' : 'px-4'}`}>
        {collapsed ? (
          <>
            <button type="button" className="workspace-nav-link w-full" aria-label={t('header.preferences')}
              title={t('header.preferences')} popoverTarget="workspace-preferences">
              <Icon path="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM10 3h4l1 3 3 1 3 3v4l-3 3-3 1-1 3h-4l-1-3-3-1-3-3v-4l3-3 3-1z" />
            </button>
            <div id="workspace-preferences" popover="auto" className="workspace-preferences rounded-lg border border-separator bg-nasa-gray-800 p-3 text-foreground shadow-lg">
              <div className="flex items-center gap-3">{preferences}</div>
            </div>
          </>
        ) : <div className="flex flex-wrap items-center justify-between gap-2 pb-1">{preferences}</div>}
        {offlineEnrollment && (
          <>
            <button type="button" className="workspace-nav-link w-full" disabled={offlineEnrollment.busy}
              title={collapsed ? t('offline.enable') : undefined} onClick={offlineEnrollment.activate}>
              <Icon path="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5" />
              <span className={collapsed ? 'sr-only' : undefined}>{t('offline.enable')}</span>
            </button>
            {offlineEnrollment.error && <p role="alert" title={t(offlineEnrollment.error)}
              className="text-xs text-danger-ink">
              {collapsed && <span aria-hidden="true" className="block text-center font-bold">!</span>}
              <span className={collapsed ? 'sr-only' : undefined}>{t(offlineEnrollment.error)}</span>
            </p>}
          </>
        )}
        <button type="button" className="workspace-nav-link w-full" title={collapsed ? t('header.logout') : undefined}
          onClick={() => { close?.(); logout(); }}>
          <Icon path="M10 5H5v14h5m-1-7h12m-4-4 4 4-4 4" />
          <span className={collapsed ? 'sr-only' : undefined}>{t('header.logout')}</span>
        </button>
      </div>
    </>
  );
}

const sidebarStorageKey = 'catlx-sidebar-collapsed';

export default function Header() {
  const { t } = useTranslation();
  const drawer = useRef<HTMLDialogElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(sidebarStorageKey) === 'true';
    } catch {
      return false;
    }
  });

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(sidebarStorageKey, String(next));
    } catch {
      // The current tab can still change the sidebar width.
    }
  }

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  return (
    <>
      <aside data-collapsed={collapsed} className={`workspace-sidebar hidden md:sticky md:top-0 md:flex md:h-dvh md:shrink-0 md:flex-col md:overflow-y-auto ${collapsed ? 'md:w-16' : 'md:w-52 lg:w-56'}`}>
        <Navigation collapsed={collapsed} toggle={toggleSidebar} />
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
