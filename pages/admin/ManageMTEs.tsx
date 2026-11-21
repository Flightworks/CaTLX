import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../../contexts/AppContext';
import type { MTE, Project, Scenario, Study } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { projectPath, scenarioPath, studyPath } from '../projectPaths';

type StudyUsage = { study: Study; project: Project; scenarios: Scenario[] };

const columnHeading = 'px-4 py-2 text-left text-xs font-medium text-nasa-gray-400 xl:px-5';
const rowAction = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-nasa-gray-400 transition-colors enabled:hover:bg-hover-surface enabled:hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink disabled:cursor-not-allowed disabled:opacity-40 lg:h-8 lg:w-8';

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

const MTEForm: React.FC<{
  mte?: MTE | null;
  onSave: (mte: (Omit<MTE, 'id' | 'refNumber'> & { refNumber?: string }) | MTE) => void;
  onCancel: () => void;
}> = ({ mte, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(mte?.name || '');
  const [description, setDescription] = useState(mte?.description || '');
  const [refNumber, setRefNumber] = useState(mte?.refNumber || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(mte ? { ...mte, name, description, refNumber } : { name, description, refNumber });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-nasa-gray-300">{t('evaluator.name')}</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-foreground"
          required
        />
      </div>
      <div>
        <label htmlFor="refNumber" className="block text-sm font-medium text-nasa-gray-300">{t('evaluator.ref_number')}</label>
        <input
          type="text"
          id="refNumber"
          value={refNumber}
          onChange={(e) => setRefNumber(e.target.value)}
          className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-foreground"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-nasa-gray-300">{t('evaluator.optional_description')}</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-foreground"
          rows={3}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t('evaluator.cancel')}</Button>
        <Button type="submit">{t('catalog.save')}</Button>
      </div>
    </form>
  );
};


const ManageMTEs: React.FC<{ projectId?: string; standalone?: boolean }> = ({ projectId, standalone }) => {
  const { t } = useTranslation();
  const { mtes, projects, studies, scenarios, ratings, addMte, updateMte, deleteMte } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMte, setEditingMte] = useState<MTE | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const Heading = standalone ? 'h1' : 'h2';
  const columnCount = projectId ? 4 : 5;

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

  const catalog = useMemo(() => projectId ? mtes.filter(mte => usages.has(mte.id)) : mtes, [mtes, projectId, usages]);

  const filteredMtes = useMemo(() => {
    if (!searchQuery) {
      return catalog;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return catalog.filter(mte =>
      mte.name.toLowerCase().includes(lowercasedQuery) ||
      mte.refNumber.toLowerCase().includes(lowercasedQuery)
    );
  }, [catalog, searchQuery]);

  const handleSave = (mte: (Omit<MTE, 'id' | 'refNumber'> & { refNumber?: string }) | MTE) => {
    if ('id' in mte) {
      updateMte(mte);
    } else {
      addMte(mte);
    }
    setIsModalOpen(false);
    setEditingMte(null);
  };

  const handleAddNew = () => {
    setEditingMte(null);
    setIsModalOpen(true);
  };

  const handleEdit = (mte: MTE) => {
    setEditingMte(mte);
    setIsModalOpen(true);
  };

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
          ) : <Button size="sm" onClick={handleAddNew} className="min-h-9 whitespace-nowrap px-3">{t('catalog.new')}</Button>}
        </div>
      </header>

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
            {filteredMtes.map((mte) => (
              <tr key={mte.id} role="row" className={`relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 px-4 py-2.5 align-top hover:bg-hover-surface/50 lg:table-row ${projectId ? '' : 'pr-28'}`}>
                <td role="cell" className="col-start-2 row-start-1 max-w-20 break-words font-mono text-xs leading-5 text-nasa-gray-400 empty:hidden lg:max-w-32 lg:px-4 lg:py-2.5 lg:empty:table-cell xl:px-5">{mte.refNumber}</td>
                <td role="cell" className="col-start-1 row-start-1 min-w-0 break-words text-sm font-semibold leading-5 text-foreground lg:px-4 lg:py-2.5 xl:px-5">{mte.name}</td>
                <td role="cell" className="col-span-2 min-w-0 break-words text-sm leading-5 text-nasa-gray-300 empty:hidden lg:px-4 lg:py-2.5 lg:empty:table-cell xl:px-5">{mte.description}</td>
                <td role="cell" className="col-span-2 text-xs leading-5 text-foreground lg:min-w-36 lg:px-4 lg:py-2.5 xl:px-5">
                  <MteUsage entries={usages.get(mte.id)} showProject={!projectId} />
                </td>
                {!projectId && (
                  <td role="cell" className="absolute right-4 top-1.5 lg:static lg:py-1 lg:pl-2 lg:pr-3 xl:pr-4">
                    <div className="flex justify-end gap-1">
                      <button type="button" className={rowAction} aria-label={t('common.edit')} title={t('common.edit')} onClick={() => handleEdit(mte)}>
                        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m14 5 5 5M4 20l4.5-1 12-12a1.5 1.5 0 0 0 0-2l-1.5-1.5a1.5 1.5 0 0 0-2 0l-12 12L4 20Z" />
                        </svg>
                      </button>
                      <button type="button" className={`${rowAction} enabled:hover:!text-danger-ink`} aria-label={t('common.delete')} title={t('common.delete')}
                        disabled={ratings.some(rating => rating.mteId === mte.id)} onClick={() => deleteMte(mte.id)}>
                        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 7h16m-10 4v5m4-5v5M9 7V4h6v3m3 0-.8 12a1 1 0 0 1-1 .9H7.8a1 1 0 0 1-1-.9L6 7" />
                        </svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filteredMtes.length === 0 && (
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t(editingMte ? 'catalog.edit' : 'catalog.new')}>
        <MTEForm
          mte={editingMte}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </section>
  );
};

export default ManageMTEs;
