import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../../contexts/AppContext';
import { indexMtePaths, mteReferenceKey, MteReferenceError, nextSubMteReference } from '../../data/mte';
import type { MTE, Project, Scenario, Study } from '../../types';
import MteForm from '../../components/admin/MteForm';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import RowAction from '../../components/ui/RowAction';
import { projectPath, scenarioPath, studyPath } from '../projectPaths';

type StudyUsage = { study: Study; project: Project; scenarios: Scenario[] };
type CatalogDialog = { mteId?: string; initialReference?: string; addChildAfterSave?: boolean };

function entryId(id: string) {
  return `catalog-mte-${id}`;
}

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
  const { t, i18n } = useTranslation();
  const { mtes, projects, studies, scenarios, ratings, passages, saveMte, deleteMte } = useData();
  const [dialog, setDialog] = useState<CatalogDialog | null>(null);
  const [search, setSearch] = useState('');
  const [focusId, setFocusId] = useState<string>();
  const query = search.trim().toLocaleLowerCase();
  const Heading = standalone ? 'h1' : 'h2';
  const paths = useMemo(() => indexMtePaths(mtes), [mtes]);

  useEffect(() => {
    if (!focusId) return;
    const entry = document.getElementById(entryId(focusId));
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
      for (const ancestor of paths.get(id) ?? []) ids.add(ancestor.id);
    }
    return mtes.filter(mte => ids.has(mte.id));
  }, [mtes, paths, projectId, usages]);

  const rows = useMemo(() => {
    const matched = new Set<string>();
    const context = new Set<string>();
    if (query) {
      for (const mte of catalog) {
        const fields = [mte.refNumber, mte.name, mte.description, ...(mte.criteria ?? []).map(criterion => criterion.label)];
        if (!fields.some(field => field.toLocaleLowerCase().includes(query))) continue;
        matched.add(mte.id);
        for (const entry of paths.get(mte.id) ?? []) context.add(entry.id);
      }
    }

    const compare = new Intl.Collator(i18n.resolvedLanguage, { numeric: true, sensitivity: 'base' });
    const siblings = new Map<string | undefined, MTE[]>();
    for (const mte of catalog) {
      const path = paths.get(mte.id) ?? [mte];
      if (query && !context.has(mte.id) && !path.some(entry => matched.has(entry.id))) continue;
      const key = path.at(-2)?.id;
      const group = siblings.get(key) ?? [];
      group.push(mte);
      siblings.set(key, group);
    }

    const ordered: { mte: MTE; depth: number }[] = [];
    function append(parentId: string | undefined, depth: number) {
      const entries = siblings.get(parentId) ?? [];
      entries.sort((a, b) => Number(!a.refNumber.trim()) - Number(!b.refNumber.trim()) ||
        compare.compare(a.refNumber, b.refNumber) || compare.compare(a.name, b.name));
      for (const mte of entries) {
        ordered.push({ mte, depth });
        append(mte.id, depth + 1);
      }
    }
    append(undefined, 0);
    return ordered;
  }, [catalog, i18n.resolvedLanguage, paths, query]);

  const protectedIds = new Set([
    ...ratings.map(rating => rating.mteId),
    ...(passages ?? []).flatMap(passage => passage.mteIds),
  ]);
  const parents = new Set(mtes.flatMap(mte => [mte.parentId, paths.get(mte.id)?.at(-2)?.id]));
  const editing = dialog?.mteId ? mtes.find(mte => mte.id === dialog.mteId) : undefined;

  function referenceTaken(reference: string, exceptId?: string) {
    const key = mteReferenceKey(reference);
    return mtes.some(mte => mte.id !== exceptId && mteReferenceKey(mte.refNumber) === key);
  }

  function addChild(mte: MTE) {
    if (!mte.refNumber.trim() || referenceTaken(mte.refNumber, mte.id)) {
      setDialog({ mteId: mte.id, addChildAfterSave: true });
    } else {
      setDialog({ initialReference: nextSubMteReference(mte, mtes) });
    }
  }

  async function save(input: Parameters<typeof saveMte>[0]) {
    if (dialog?.addChildAfterSave && referenceTaken(input.refNumber, input.id)) throw new MteReferenceError('duplicate');
    const id = await saveMte(input);
    setSearch('');
    if (dialog?.addChildAfterSave) {
      const initialReference = nextSubMteReference({ ...input, id }, mtes);
      setDialog(current => current === dialog ? { initialReference } : current);
    } else {
      setDialog(current => current === dialog ? null : current);
      setFocusId(id);
    }
  }

  return (
    <section data-workspace-surface className="overflow-hidden rounded-xl bg-nasa-gray-800">
      <header className="space-y-3 border-b border-separator p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Heading className="text-2xl font-semibold tracking-tight">{t(projectId ? 'admin.mte_catalog' : 'catalog.global_title')}</Heading>
          {projectId ? (
            <Link to="/catalog" className="rounded px-1 text-sm font-medium text-accent-ink hover:underline">{t('catalog.open_global')}</Link>
          ) : (
            <Button size="sm" className="min-h-9 px-3" onClick={() => setDialog({})}>
              <span aria-hidden="true" className="mr-1.5 text-base leading-none">+</span>{t('catalog.new')}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="relative w-full max-w-xs">
            <span className="sr-only">{t('catalog.search')}</span>
            <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 size-4 text-nasa-gray-400"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" />
            </svg>
            <input type="search" placeholder={t('catalog.search')} value={search} onChange={event => setSearch(event.target.value)}
              className="h-9 w-full rounded-md border border-separator bg-nasa-gray-900 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-nasa-gray-400 focus-visible:border-accent-ink" />
          </label>
          {!projectId && <p className="text-xs text-nasa-gray-300">{t('catalog.reference_example')}</p>}
        </div>
      </header>

      {rows.length > 0 ? (
        <ul className="divide-y divide-separator">
          {rows.map(({ mte, depth }) => {
            const isParent = parents.has(mte.id);
            const hasDetails = mte.description || mte.criteria?.length || usages.has(mte.id);
            const entry = <>
              <span className="flex min-w-0 items-baseline gap-1.5">
                {depth > 0 && <span aria-hidden="true" className="inline-block size-2 shrink-0 self-center rounded-bl-sm border-b border-l border-nasa-gray-400" />}
                <span className={`min-w-0 break-all font-mono text-xs font-medium ${mte.refNumber ? 'text-accent-ink' : 'text-nasa-gray-300'}`}>
                  {mte.refNumber || t('catalog.no_reference')}
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                <span className="min-w-0 break-words">{mte.name}</span>
                {!projectId && <svg aria-hidden="true" className="size-3.5 shrink-0 text-nasa-gray-400" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m14 5 5 5M4 20l4.5-1 12-12a1.5 1.5 0 0 0 0-2l-1.5-1.5a1.5 1.5 0 0 0-2 0l-12 12L4 20Z" />
                </svg>}
              </span>
            </>;
            const entryClass = 'grid min-w-0 flex-1 items-baseline gap-x-2 gap-y-1 rounded px-1 py-1.5 text-left sm:grid-cols-[minmax(5rem,1fr)_minmax(0,4fr)]';
            return (
              <li key={mte.id} className="px-3 py-1.5 sm:px-4">
                <div className="min-w-0" style={{ paddingInlineStart: Math.min(depth, 4) * 12 }}>
                  <div className="flex items-start justify-between gap-1 sm:gap-3">
                    {projectId ? <div id={entryId(mte.id)} tabIndex={-1} className={entryClass}>{entry}</div> : (
                      <button id={entryId(mte.id)} type="button" aria-label={t('catalog.edit_named', { name: mte.name, reference: mte.refNumber })}
                        className={`${entryClass} hover:bg-hover-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink`}
                        onClick={() => setDialog({ mteId: mte.id })}>{entry}</button>
                    )}
                    {!projectId && <div className="flex shrink-0 items-center gap-0.5">
                      <Button size="sm" variant="secondary" className="min-h-8 whitespace-nowrap" onClick={() => addChild(mte)}>
                        <span aria-hidden="true" className="mr-1 font-normal">+</span>{t('catalog.subtask')}
                      </Button>
                      <RowAction icon="delete" label={t(isParent ? 'catalog.delete_has_children' : 'common.delete')}
                        disabled={isParent || protectedIds.has(mte.id)} onClick={() => deleteMte(mte.id)} />
                    </div>}
                  </div>
                  {hasDetails ? <div className="space-y-1 px-1 pb-1 text-sm text-nasa-gray-300">
                    {mte.description && <p className="whitespace-pre-line break-words">{mte.description}</p>}
                    <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
                      {!!mte.criteria?.length && <MteCriteria criteria={mte.criteria} />}
                      <MteUsage entries={usages.get(mte.id)} showProject={!projectId} />
                    </div>
                  </div> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="p-5 text-sm text-nasa-gray-300">{query
          ? t('catalog.no_results', { query: search.trim() }) : t(projectId ? 'catalog.project_empty' : 'catalog.empty')}</p>
      )}

      <Modal isOpen={dialog !== null} onClose={() => setDialog(null)} size="lg"
        title={t(dialog?.addChildAfterSave ? 'catalog.assign_reference' : editing ? 'catalog.edit' :
          dialog?.initialReference ? 'catalog.new_subtask' : 'catalog.new')}>
        {dialog && <MteForm key={editing?.id ?? 'new'} mte={editing} mtes={mtes} paths={paths}
          initialReference={dialog.initialReference} requireReference={dialog.addChildAfterSave}
          onSave={save} onCancel={() => setDialog(null)} />}
      </Modal>
    </section>
  );
}
