import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../../contexts/AppContext';
import { mtePath, validMteParent } from '../../data/mte';
import type { MTE, MteLevel, Project, Scenario, Study } from '../../types';
import MteForm from '../../components/admin/MteForm';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import RowAction from '../../components/ui/RowAction';
import { projectPath, scenarioPath, studyPath } from '../projectPaths';

type StudyUsage = { study: Study; project: Project; scenarios: Scenario[] };
type CatalogRow = { mte: MTE; depth: number; hasChildren: boolean };
type CatalogEditor = { mte?: MTE; level?: MteLevel; parentId?: string };

const columnHeading = 'px-4 py-2 text-left text-xs font-medium text-nasa-gray-400 xl:px-5';

function MteUsage({ entries, showProject }: { entries: Map<string, StudyUsage> | undefined; showProject: boolean }) {
  const { t } = useTranslation();
  if (!entries?.size) return <span className="text-nasa-gray-400">{t('catalog.no_usage')}</span>;

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

const ManageMTEs: React.FC<{ projectId?: string; standalone?: boolean }> = ({ projectId, standalone }) => {
  const { t } = useTranslation();
  const { mtes, projects, studies, scenarios, ratings, passages, saveMte, deleteMte } = useData();
  const [editor, setEditor] = useState<CatalogEditor | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const query = searchQuery.trim().toLowerCase();
  const Heading = standalone ? 'h1' : 'h2';
  const columnCount = projectId ? 4 : 5;
  const mtesById = useMemo(() => new Map(mtes.map(mte => [mte.id, mte])), [mtes]);

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

  const { roots, children } = useMemo(() => {
    const ids = new Set(catalog.map(mte => mte.id));
    const roots: MTE[] = [];
    const children = new Map<string, MTE[]>();
    for (const mte of catalog) {
      if (mte.parentId && ids.has(mte.parentId) && validMteParent(mte, mtesById.get(mte.parentId))) {
        const siblings = children.get(mte.parentId) ?? [];
        siblings.push(mte);
        children.set(mte.parentId, siblings);
      } else {
        roots.push(mte);
      }
    }
    return {
      roots: [...roots.filter(mte => mte.level === 'phase'), ...roots.filter(mte => mte.level !== 'phase')],
      children,
    };
  }, [catalog, mtesById]);

  const rows = useMemo(() => {
    const matches = new Set<string>();
    const context = new Set<string>();
    if (query) {
      for (const mte of catalog) {
        if (mte.name.toLowerCase().includes(query) || mte.refNumber.toLowerCase().includes(query)) {
          matches.add(mte.id);
          for (const ancestor of mtePath(mte, mtesById)) context.add(ancestor.id);
        }
      }
    }
    const rows: CatalogRow[] = [];
    function append(mte: MTE, depth: number, matchedAncestor: boolean) {
      const matchesBranch = matchedAncestor || matches.has(mte.id);
      if (query && !matchesBranch && !context.has(mte.id)) return;
      const childMtes = children.get(mte.id) ?? [];
      const hasChildren = childMtes.some(child => !query || matchesBranch || context.has(child.id));
      rows.push({ mte, depth, hasChildren });
      if (query || !collapsed.has(mte.id)) {
        for (const child of childMtes) append(child, depth + 1, matchesBranch);
      }
    }
    for (const root of roots) append(root, 0, false);
    return rows;
  }, [catalog, children, collapsed, mtesById, query, roots]);

  const parents = useMemo(() => new Set(mtes.map(mte => mte.parentId)), [mtes]);
  const hasMissionPhases = roots.some(mte => mte.level === 'phase');
  const evaluated = useMemo(() => new Set([
    ...ratings.map(rating => rating.mteId),
    ...(passages ?? []).flatMap(passage => passage.mteIds),
  ]), [passages, ratings]);

  function toggleBranch(id: string) {
    setCollapsed(current => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  return (
    <section data-workspace-surface className="rounded-xl bg-nasa-gray-800">
      <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-separator px-4 py-3.5 xl:px-5">
        <Heading className="text-lg font-semibold tracking-tight">{t(projectId ? 'admin.mte_catalog' : 'catalog.global_title')}</Heading>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="relative w-full min-w-0 sm:w-[17rem]">
            <span className="sr-only">{t('projects.search_tasks')}</span>
            <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-nasa-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              type="search"
              placeholder={t('projects.search_tasks')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-md border border-separator bg-nasa-gray-900 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-nasa-gray-400 focus-visible:border-accent-ink"
            />
          </label>
          {projectId ? (
            <Link to="/catalog" className="rounded-md px-2 py-1.5 text-sm font-medium text-accent-ink hover:bg-hover-surface hover:underline">{t('catalog.open_global')}</Link>
          ) : <>
            <Button size="sm" variant="secondary" onClick={() => setEditor({})} className="min-h-9 px-3">
              {t('catalog.new')}
            </Button>
            <Button size="sm" onClick={() => setEditor({ level: 'phase' })} className="min-h-9 px-3">
              {t('catalog.new_phase')}
            </Button>
          </>}
        </div>
      </header>

      {!hasMissionPhases && !query && (
        <div className="space-y-1 border-b border-separator bg-nasa-gray-900/50 px-4 py-3 text-sm xl:px-5">
          <p className="font-semibold text-foreground">{t('catalog.mission_hierarchy')}</p>
          <p className="text-nasa-gray-300">{t(projectId ? 'catalog.project_hierarchy_hint' : 'catalog.hierarchy_hint')}</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-b-xl">
        <table role="table" className="block w-full lg:table">
          <thead role="rowgroup" className="sr-only border-b border-separator lg:not-sr-only lg:table-header-group">
            <tr role="row">
              <th role="columnheader" scope="col" className={columnHeading}>{t('catalog.reference')}</th>
              <th role="columnheader" scope="col" className={columnHeading}>{t('evaluator.name')}</th>
              <th role="columnheader" scope="col" className={columnHeading}>{t('evaluator.description')}</th>
              <th role="columnheader" scope="col" className={columnHeading}>{t('catalog.usage')}</th>
              {!projectId && <th role="columnheader" scope="col" className={columnHeading}><span className="sr-only">{t('common.actions')}</span></th>}
            </tr>
          </thead>
          <tbody role="rowgroup" className="block divide-y divide-separator lg:table-row-group">
            {rows.map(({ mte, depth, hasChildren }) => {
              const expanded = !!query || !collapsed.has(mte.id);
              const childLevel = mte.level === 'phase' ? 'general' : mte.level === 'general' ? 'detail' : null;
              const isParent = parents.has(mte.id);
              return (
                <tr key={mte.id} role="row" className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 px-4 py-2.5 align-top hover:bg-hover-surface/50 lg:table-row">
                  <td role="cell" className="col-start-2 row-start-1 max-w-20 break-words font-mono text-xs leading-5 text-nasa-gray-400 empty:hidden lg:max-w-32 lg:px-4 lg:py-2.5 lg:empty:table-cell xl:px-5">{mte.refNumber}</td>
                  <td role="cell" className="col-start-1 row-start-1 min-w-0 lg:w-1/3 lg:px-4 lg:py-2.5 xl:px-5">
                    <div className="flex min-w-0 items-start gap-1.5" style={{ paddingInlineStart: depth * 16 }}>
                      {hasChildren && !query ? (
                        <button
                          type="button"
                          aria-label={t(expanded ? 'catalog.collapse' : 'catalog.expand', { name: mte.name })}
                          aria-expanded={expanded}
                          onClick={() => toggleBranch(mte.id)}
                          className="inline-flex size-5 shrink-0 items-center justify-center rounded text-accent-ink hover:bg-hover-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink"
                        >
                          <span aria-hidden="true" className={`size-1.5 border-b border-r border-current ${expanded ? '-translate-y-0.5 rotate-45' : 'rotate-[-45deg]'}`} />
                        </button>
                      ) : (
                        <span aria-hidden="true" className="inline-flex size-5 shrink-0 items-start justify-center">
                          {depth > 0 && <span className="mt-1 size-2.5 border-b border-l border-separator" />}
                        </span>
                      )}
                      <div className="min-w-0 break-words">
                        <div className="text-sm font-semibold leading-5 text-foreground">{mte.name}</div>
                        <div className="text-xs leading-4 text-nasa-gray-400">{t(`catalog.level_${mte.level ?? 'standalone'}`)}</div>
                      </div>
                    </div>
                  </td>
                  <td role="cell" className="col-span-2 min-w-0 space-y-1 break-words text-sm leading-5 text-nasa-gray-300 empty:hidden lg:px-4 lg:py-2.5 lg:empty:table-cell xl:px-5">
                    {mte.description && <p>{mte.description}</p>}
                    {!!mte.criteria?.length && <MteCriteria criteria={mte.criteria} />}
                  </td>
                  <td role="cell" className="col-start-1 text-xs leading-5 text-foreground lg:min-w-36 lg:px-4 lg:py-2.5 xl:px-5">
                    <MteUsage entries={usages.get(mte.id)} showProject={!projectId} />
                  </td>
                  {!projectId && (
                    <td role="cell" className="col-start-2 lg:py-1 lg:pl-2 lg:pr-3 xl:pr-4">
                      <div className="flex justify-end gap-1">
                        {childLevel && (
                          <button
                            type="button"
                            aria-label={t('catalog.add_child')}
                            title={t('catalog.add_child')}
                            onClick={() => setEditor({ level: childLevel, parentId: mte.id })}
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-nasa-gray-400 transition-colors hover:bg-hover-surface hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink lg:size-8"
                          >
                            <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </button>
                        )}
                        <RowAction icon="edit" label={t('common.edit')} onClick={() => setEditor({ mte })} />
                        <RowAction icon="delete" label={t(isParent ? 'catalog.delete_has_children' : 'common.delete')}
                          disabled={isParent || evaluated.has(mte.id)} onClick={() => deleteMte(mte.id)} />
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr role="row" className="block lg:table-row">
                <td role="cell" colSpan={columnCount} className="block px-4 py-8 text-center text-sm text-nasa-gray-400 lg:table-cell">
                  {catalog.length > 0
                    ? t('catalog.no_results', { query: searchQuery })
                    : t(projectId ? 'catalog.project_empty' : 'catalog.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal isOpen={editor !== null} onClose={() => setEditor(null)}
        title={t(editor?.mte ? 'catalog.edit' : editor?.level === 'phase' ? 'catalog.new_phase' : 'catalog.new')} size="xl">
        {editor && (
          <MteForm
            mte={editor.mte}
            mtes={mtesById}
            initialLevel={editor.level}
            initialParentId={editor.parentId}
            onSave={async input => {
              await saveMte(input);
              const parent = input.parentId ? mtesById.get(input.parentId) : undefined;
              if (parent) {
                const parentPath = mtePath(parent, mtesById);
                setCollapsed(current => new Set([...current].filter(id => !parentPath.some(ancestor => ancestor.id === id))));
              }
              setEditor(current => current === editor ? null : current);
            }}
            onCancel={() => setEditor(null)}
          />
        )}
      </Modal>
    </section>
  );
};

export default ManageMTEs;
