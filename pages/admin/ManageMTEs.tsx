import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../../contexts/AppContext';
import { mtePath, validMteParent } from '../../data/mte';
import type { MTE, MteLevel, Project, Scenario, Study } from '../../types';
import MteForm from '../../components/admin/MteForm';
import MteAttachmentForm from '../../components/admin/MteAttachmentForm';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import RowAction from '../../components/ui/RowAction';
import { projectPath, scenarioPath, studyPath } from '../projectPaths';

type StudyUsage = { study: Study; project: Project; scenarios: Scenario[] };
type CatalogDialog =
  | { mode: 'create'; level?: MteLevel; parentId?: string }
  | { mode: 'edit'; mteId: string }
  | { mode: 'attach'; mteId?: string; parentId?: string };

function entryId(id: string) {
  return `catalog-mte-${id}`;
}

const independentHeadingId = 'catalog-independent-heading';

function MteUsage({ entries, showProject }: { entries: Map<string, StudyUsage> | undefined; showProject: boolean }) {
  const { t } = useTranslation();
  if (!entries?.size) return null;

  const uses = [...entries.values()];
  const scenarioCount = uses.reduce((count, use) => count + use.scenarios.length, 0);
  return (
    <details className="group">
      <summary className="flex w-fit cursor-pointer list-none items-start gap-2 rounded text-xs font-medium leading-5 text-accent-ink hover:underline focus-visible:outline focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-[-45deg] border-b border-r border-current transition-transform group-open:rotate-45" />
        <span>
          {t('projects.study_count', { count: uses.length })}
          {scenarioCount > 0 && ` · ${t('catalog.scenario_count', { count: scenarioCount })}`}
        </span>
      </summary>
      <ul className="mt-2 space-y-2 border-l border-separator pl-3">
        {uses.map(({ study, project, scenarios }) => (
          <li key={study.id}>
            {showProject && <Link className="block text-xs text-nasa-gray-300 hover:underline" to={projectPath(project.id)}>{project.name}</Link>}
            <Link className="font-medium underline" to={studyPath(study)}>{study.name}</Link>
            {scenarios.length > 0 && (
              <ul className="mt-1 space-y-1 pl-3 text-xs">
                {scenarios.map(scenario => (
                  <li key={scenario.id}>
                    <Link className="underline" to={scenarioPath(study, scenario.id)}>{scenario.name}</Link>
                    {scenario.archived && <span className="text-nasa-gray-400"> · {t('projects.archived')}</span>}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function MteCriteria({ criteria }: { criteria: NonNullable<MTE['criteria']> }) {
  const { t } = useTranslation();
  return (
    <details className="group">
      <summary className="flex w-fit cursor-pointer list-none items-start gap-2 rounded text-xs font-medium leading-5 text-accent-ink hover:underline focus-visible:outline focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-[-45deg] border-b border-r border-current transition-transform group-open:rotate-45" />
        {t('catalog.criteria_count', { count: criteria.length })}
      </summary>
      <ul className="mt-2 space-y-2 border-l border-separator pl-3 text-xs">
        {criteria.map(criterion => (
          <li key={criterion.id}>
            <p className="font-semibold text-foreground">{criterion.label}</p>
            <p className="text-nasa-gray-400">
              {t(criterion.type === 'errorRate' ? 'catalog.criterion_error_rate' : 'catalog.criterion_score')}
              {criterion.maxErrorRate !== undefined && ` · ${t('catalog.error_rate_target', { rate: criterion.maxErrorRate })}`}
            </p>
            {criterion.instructions && <p className="whitespace-pre-line">{criterion.instructions}</p>}
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function ManageMTEs({ projectId, standalone }: { projectId?: string; standalone?: boolean }) {
  const { t } = useTranslation();
  const { mtes, projects, studies, scenarios, ratings, passages, saveMte, deleteMte } = useData();
  const [dialog, setDialog] = useState<CatalogDialog | null>(null);
  const [activePhaseId, setActivePhaseId] = useState<string | null>();
  const [search, setSearch] = useState('');
  const [focusId, setFocusId] = useState<string>();
  const query = search.trim().toLocaleLowerCase();
  const Heading = standalone ? 'h1' : 'h2';
  const mtesById = useMemo(() => new Map(mtes.map(mte => [mte.id, mte])), [mtes]);

  useEffect(() => {
    if (!focusId) return;
    const entry = document.getElementById(focusId);
    if (!entry) return;
    entry.focus({ preventScroll: true });
    entry.scrollIntoView({ block: 'nearest' });
    setFocusId(undefined);
  }, [focusId, mtes]);

  const usages = useMemo(() => {
    const projectsById = new Map(projects.map(project => [project.id, project]));
    const studiesById = new Map<string, { study: Study; project: Project }>();
    const byMte = new Map<string, Map<string, StudyUsage>>();

    function register(mteId: string, entry: { study: Study; project: Project }) {
      let entries = byMte.get(mteId);
      if (!entries) {
        entries = new Map();
        byMte.set(mteId, entries);
      }
      let usage = entries.get(entry.study.id);
      if (!usage) {
        usage = { ...entry, scenarios: [] };
        entries.set(entry.study.id, usage);
      }
      return usage;
    }

    for (const study of studies) {
      const project = projectsById.get(study.projectId);
      if (!project || (projectId && project.id !== projectId)) continue;
      const entry = { study, project };
      studiesById.set(study.id, entry);
      for (const mteId of study.mteIds) register(mteId, entry);
    }
    for (const scenario of scenarios ?? []) {
      const entry = studiesById.get(scenario.studyId);
      if (!entry) continue;
      for (const mteId of new Set(scenario.mteIds)) register(mteId, entry).scenarios.push(scenario);
    }
    return byMte;
  }, [projectId, projects, studies, scenarios]);

  const catalog = useMemo(() => {
    if (!projectId) return mtes;
    const ids = new Set(usages.keys());
    for (const id of usages.keys()) {
      const mte = mtesById.get(id);
      if (!mte) continue;
      for (const ancestor of mtePath(mte, mtesById)) ids.add(ancestor.id);
    }
    return mtes.filter(mte => ids.has(mte.id));
  }, [mtes, mtesById, projectId, usages]);

  const { phases, independent, children } = useMemo(() => {
    const phases: MTE[] = [];
    const independent: MTE[] = [];
    const children = new Map<string, MTE[]>();
    for (const mte of catalog) {
      if (mte.parentId && validMteParent(mte, mtesById.get(mte.parentId))) {
        const siblings = children.get(mte.parentId) ?? [];
        siblings.push(mte);
        children.set(mte.parentId, siblings);
      } else {
        (mte.level === 'phase' ? phases : independent).push(mte);
      }
    }
    return { phases, independent, children };
  }, [catalog, mtesById]);

  const parents = useMemo(() => new Set(mtes.map(mte => mte.parentId)), [mtes]);
  const evaluated = useMemo(() => new Set([
    ...ratings.map(rating => rating.mteId),
    ...(passages ?? []).flatMap(passage => passage.mteIds),
  ]), [passages, ratings]);
  const attachable = independent.filter(mte => !mte.level && !mte.parentId && !parents.has(mte.id));
  const attachableIds = new Set(attachable.map(mte => mte.id));
  const phase = activePhaseId === null ? undefined : phases.find(entry => entry.id === activePhaseId) ?? phases[0];
  const generalMtes = phase ? children.get(phase.id) ?? [] : [];
  const matches = query ? catalog.filter(mte =>
    [mte.name, mte.refNumber, mte.description, ...(mte.criteria ?? []).map(criterion => criterion.label)]
      .some(text => text.toLocaleLowerCase().includes(query))) : [];
  const editing = dialog && 'mteId' in dialog && dialog.mteId ? mtesById.get(dialog.mteId) : undefined;
  const destination = dialog && 'parentId' in dialog && dialog.parentId ? mtesById.get(dialog.parentId) : undefined;

  function reveal(headingId: string, phaseId: string | null) {
    setSearch('');
    setActivePhaseId(phaseId);
    setFocusId(headingId);
  }

  async function save(input: Parameters<typeof saveMte>[0]) {
    const id = await saveMte(input);
    const parent = input.parentId ? mtesById.get(input.parentId) : undefined;
    const root = parent ? mtePath(parent, mtesById)[0] : undefined;
    reveal(entryId(id), input.level === 'phase' ? id : root?.level === 'phase' ? root.id : null);
    setDialog(current => current === dialog ? null : current);
  }

  function metadata(mte: MTE) {
    const usage = usages.get(mte.id);
    if (!mte.description && !mte.criteria?.length && !usage?.size) return null;
    return <div className="space-y-1 text-sm text-nasa-gray-300">
      {mte.description && <p className="whitespace-pre-line break-words">{mte.description}</p>}
      {!!mte.criteria?.length && <MteCriteria criteria={mte.criteria} />}
      <MteUsage entries={usage} showProject={!projectId} />
    </div>;
  }

  function editActions(mte: MTE) {
    if (projectId) return null;
    const isParent = parents.has(mte.id);
    return <div className="flex shrink-0 items-center gap-1">
      <Button size="sm" variant="secondary" className="min-h-8" onClick={() => setDialog({ mode: 'edit', mteId: mte.id })}>
        {t('common.edit')}
      </Button>
      <RowAction icon="delete" label={t(isParent ? 'catalog.delete_has_children' : 'common.delete')}
        disabled={isParent || evaluated.has(mte.id)} onClick={() => deleteMte(mte.id)} />
    </div>;
  }

  function addActions(parent: MTE) {
    if (projectId) return null;
    const level = parent.level === 'phase' ? 'general' : 'detail';
    return <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant={level === 'general' ? 'primary' : 'secondary'} className="min-h-8"
        onClick={() => setDialog({ mode: 'create', level, parentId: parent.id })}>
        {t(`catalog.add_${level}`)}
      </Button>
      {attachable.length > 0 && (
        <button type="button" className="min-h-8 rounded px-1 text-sm font-medium text-accent-ink hover:underline focus-visible:outline focus-visible:outline-2"
          onClick={() => setDialog({ mode: 'attach', parentId: parent.id })}>
          {t('catalog.attach_existing')}
        </button>
      )}
    </div>;
  }

  function reference(mte: MTE) {
    return mte.refNumber && <span className="break-words font-mono text-xs font-normal text-nasa-gray-300">{mte.refNumber}</span>;
  }

  function taskName(mte: MTE) {
    return <><span className="break-words">{mte.name}</span>{reference(mte)}</>;
  }

  function taskRow(mte: MTE, kind: 'independent' | 'detail') {
    const TaskHeading = kind === 'independent' ? 'h3' : 'h5';
    const canAttach = kind === 'independent' && !projectId && phases.length > 0 && attachableIds.has(mte.id);
    return <li key={mte.id} className="space-y-1.5 px-3 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <TaskHeading id={entryId(mte.id)} tabIndex={-1}
          className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink">
          {taskName(mte)}
        </TaskHeading>
        <div className="flex flex-wrap items-center gap-2">
          {canAttach && <Button size="sm" className="min-h-8" onClick={() => setDialog({ mode: 'attach', mteId: mte.id })}>
            {t('catalog.attach')}
          </Button>}
          {editActions(mte)}
        </div>
      </div>
      {metadata(mte)}
    </li>;
  }

  const dialogTitle = dialog?.mode === 'attach' ? 'catalog.attach_existing' :
    dialog?.mode === 'edit' ? 'catalog.edit' :
    dialog?.level ? `catalog.new_${dialog.level}` : 'catalog.new_standalone';

  const navClass = (current: boolean) => `flex w-full min-w-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink ${current
    ? 'bg-[var(--workspace-active)] font-semibold text-[var(--workspace-active-text)]'
    : 'text-foreground hover:bg-hover-surface'}`;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Heading className="text-2xl font-semibold tracking-tight">{t(projectId ? 'admin.mte_catalog' : 'catalog.global_title')}</Heading>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="relative w-full min-w-0 sm:w-64">
            <span className="sr-only">{t('catalog.search')}</span>
            <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 size-4 text-nasa-gray-400"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" />
            </svg>
            <input type="search" placeholder={t('catalog.search')} value={search} onChange={event => setSearch(event.target.value)}
              className="h-9 w-full rounded-md border border-separator bg-nasa-gray-900 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-nasa-gray-400 focus-visible:border-accent-ink" />
          </label>
          {projectId && <Link to="/catalog" className="rounded-md px-2 py-1.5 text-sm font-medium text-accent-ink hover:bg-hover-surface hover:underline">
            {t('catalog.open_global')}
          </Link>}
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(0,3fr)]">
        <nav aria-label={t('catalog.structure')} data-workspace-surface className="min-w-0 space-y-2 rounded-xl bg-nasa-gray-800 p-3">
          <p className="px-3 pt-1 text-sm font-semibold text-nasa-gray-300">{t('catalog.phases')}</p>
          {phases.length > 0 && (
            <ul className="space-y-1">
              {phases.map(entry => {
                const current = !query && phase?.id === entry.id;
                return <li key={entry.id}>
                  <button type="button" aria-pressed={current} className={navClass(current)} onClick={() => reveal(entryId(entry.id), entry.id)}>
                    <span className="min-w-0 break-words">{entry.name}</span>{reference(entry)}
                  </button>
                </li>;
              })}
            </ul>
          )}
          {projectId ? phases.length === 0 && <p className="px-3 text-sm text-nasa-gray-400">{t('catalog.no_project_phases')}</p> : (
            <Button size="sm" className="min-h-9 w-full px-3" onClick={() => setDialog({ mode: 'create', level: 'phase' })}>
              {t('catalog.new_phase')}
            </Button>
          )}
          <div className="border-t border-separator pt-2">
            <button type="button" aria-pressed={!query && !phase} className={navClass(!query && !phase)}
              onClick={() => reveal(independentHeadingId, null)}>
              <span className="min-w-0 break-words">{t('catalog.independent')}</span>
              <span className="text-xs tabular-nums">{independent.length}</span>
            </button>
          </div>
        </nav>

        <div className="min-w-0 space-y-4">
          {query ? (
            <section data-workspace-surface className="rounded-xl bg-nasa-gray-800">
              <h2 className="px-4 pt-4 text-lg font-semibold">{t('catalog.search_results')}</h2>
              {matches.length ? (
                <ul className="divide-y divide-separator p-2">
                  {matches.map(mte => {
                    const path = mtePath(mte, mtesById);
                    const root = path[0];
                    return <li key={mte.id}>
                      <button type="button" className="w-full space-y-0.5 rounded-md px-3 py-2.5 text-left hover:bg-hover-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink"
                        onClick={() => reveal(entryId(mte.id), root.level === 'phase' ? root.id : null)}>
                        <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-accent-ink">{taskName(mte)}</span>
                        <span className="block break-words text-xs text-nasa-gray-300">{path.length > 1
                          ? path.slice(0, -1).map(entry => entry.name).join(' › ')
                          : t(root.level === 'phase' ? 'catalog.level_phase' : 'catalog.independent')}</span>
                      </button>
                    </li>;
                  })}
                </ul>
              ) : <p className="p-4 text-sm text-nasa-gray-300">{t('catalog.no_results', { query: search.trim() })}</p>}
            </section>
          ) : phase ? (
            <section data-workspace-surface className="space-y-4 rounded-xl bg-nasa-gray-800 p-3 sm:p-5">
              <header className="space-y-2 border-b border-separator pb-3">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-accent-ink">{t('catalog.level_phase')}</p>
                    <h2 id={entryId(phase.id)} tabIndex={-1}
                      className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-xl font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink">
                      {taskName(phase)}
                    </h2>
                  </div>
                  {editActions(phase)}
                </div>
                {metadata(phase)}
              </header>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold">{t('catalog.general_mtes')}</h3>
                {addActions(phase)}
              </div>
              {generalMtes.length ? (
                <ul className="space-y-3">
                  {generalMtes.map(general => {
                    const detailedMtes = children.get(general.id) ?? [];
                    return <li key={general.id} className="rounded-lg border border-separator bg-nasa-gray-900">
                      <div className="space-y-2 p-3 sm:p-4">
                        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                          <h4 id={entryId(general.id)} tabIndex={-1}
                            className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink">
                            {taskName(general)}
                          </h4>
                          {editActions(general)}
                        </div>
                        {metadata(general)}
                        {(detailedMtes.length > 0 || !projectId) && (
                          <div className="space-y-2 border-l-2 border-separator pl-2.5 sm:pl-4">
                            <p className="text-sm font-medium text-nasa-gray-300">{t('catalog.detailed_mtes')}</p>
                            {detailedMtes.length > 0 && (
                              <ul className="divide-y divide-separator rounded-md border border-separator bg-nasa-gray-800">
                                {detailedMtes.map(mte => taskRow(mte, 'detail'))}
                              </ul>
                            )}
                            {addActions(general)}
                          </div>
                        )}
                      </div>
                    </li>;
                  })}
                </ul>
              ) : <p className="rounded-lg border border-dashed border-separator p-4 text-sm text-nasa-gray-300">{t('catalog.no_general_mtes')}</p>}
            </section>
          ) : (
            <section data-workspace-surface className="overflow-hidden rounded-xl bg-nasa-gray-800">
              <header className="space-y-2 border-b border-separator px-4 py-3 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id={independentHeadingId} tabIndex={-1}
                    className="text-lg font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink">
                    {t('catalog.independent')}
                  </h2>
                  {!projectId && <Button size="sm" variant="secondary" className="min-h-8" onClick={() => setDialog({ mode: 'create' })}>
                    {t('catalog.new_standalone')}
                  </Button>}
                </div>
                {!projectId && phases.length === 0 && <p className="text-sm text-nasa-gray-300">{t('catalog.start_with_phase')}</p>}
              </header>
              {independent.length > 0 ? <ul className="divide-y divide-separator">
                {independent.map(mte => taskRow(mte, 'independent'))}
              </ul> : <p className="p-4 text-sm text-nasa-gray-300">
                {t(projectId && catalog.length === 0 ? 'catalog.project_empty' : 'catalog.no_independent')}
              </p>}
            </section>
          )}
        </div>
      </div>

      <Modal isOpen={dialog !== null} onClose={() => setDialog(null)} title={t(dialogTitle)} size={dialog?.mode === 'attach' ? 'lg' : 'xl'}>
        {dialog?.mode === 'attach' ? (
          <MteAttachmentForm mtes={mtesById} available={attachable} mte={editing} parent={destination}
            onSave={(mte, parent) => save({ ...mte, level: parent.level === 'phase' ? 'general' : 'detail', parentId: parent.id })}
            onCancel={() => setDialog(null)} />
        ) : dialog && (
          <MteForm mte={editing} mtes={mtesById}
            initialLevel={dialog.mode === 'create' ? dialog.level : undefined}
            initialParentId={destination?.id}
            onSave={save} onCancel={() => setDialog(null)} />
        )}
      </Modal>
    </section>
  );
}
