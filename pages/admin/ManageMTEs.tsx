import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../../contexts/AppContext';
import type { MTE, Project, Scenario, Study } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { projectPath, scenarioPath, studyPath } from '../projectPaths';

type StudyUsage = { study: Study; project: Project; scenarios: Scenario[] };

function MteUsage({ entries, showProject }: { entries: Map<string, StudyUsage> | undefined; showProject: boolean }) {
  const { t } = useTranslation();
  if (!entries?.size) return <span className="text-nasa-gray-400">{t('catalog.no_usage')}</span>;

  const uses = [...entries.values()];
  const scenarioCount = uses.reduce((count, use) => count + use.scenarios.length, 0);
  return (
    <details>
      <summary className="cursor-pointer rounded font-medium text-accent-ink focus-visible:outline focus-visible:outline-2">
        {t('projects.study_count', { count: uses.length })}
        {scenarioCount > 0 && ` · ${t('catalog.scenario_count', { count: scenarioCount })}`}
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
    <Card>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <Heading className="text-xl font-bold">{t(projectId ? 'admin.mte_catalog' : 'catalog.global_title')}</Heading>
        {projectId ? (
          <Link to="/catalog" className="text-sm text-accent-ink underline">{t('catalog.open_global')}</Link>
        ) : <Button onClick={handleAddNew} className="w-full sm:w-auto">{t('catalog.new')}</Button>}
      </div>

      <div className="mb-4">
        <label htmlFor="mte-search" className="sr-only">{t('projects.search_tasks')}</label>
        <input
          type="search"
          id="mte-search"
          placeholder={t('projects.search_tasks')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-foreground placeholder-nasa-gray-400"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-nasa-gray-700">
          <thead className="bg-nasa-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider w-24">{t('catalog.reference')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">{t('evaluator.name')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">{t('catalog.usage')}</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">{t('evaluator.description')}</th>
              {!projectId && <th scope="col" className="relative px-6 py-3"><span className="sr-only">{t('common.actions')}</span></th>}
            </tr>
          </thead>
          <tbody className="bg-nasa-gray-900 divide-y divide-nasa-gray-700">
            {filteredMtes.map((mte) => (
              <tr key={mte.id} className="align-top">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-nasa-gray-400">{mte.refNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{mte.name}</td>
                <td className="min-w-[10rem] px-6 py-4 text-sm text-foreground">
                  <MteUsage entries={usages.get(mte.id)} showProject={!projectId} />
                </td>
                <td className="px-6 py-4 text-sm text-nasa-gray-300">{mte.description}</td>
                {!projectId && <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button size="sm" variant="secondary" onClick={() => handleEdit(mte)}>{t('common.edit')}</Button>
                  <Button size="sm" variant="danger" disabled={ratings.some(rating => rating.mteId === mte.id)}
                    onClick={() => deleteMte(mte.id)}>{t('common.delete')}</Button>
                </td>}
              </tr>
            ))}
             {catalog.length === 0 && (
                <tr>
                    <td colSpan={columnCount} className="text-center py-10 text-nasa-gray-500">{t(projectId ? 'catalog.project_empty' : 'catalog.empty')}</td>
                </tr>
            )}
            {catalog.length > 0 && filteredMtes.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="text-center py-10 text-nasa-gray-500">
                  {t('catalog.no_results', { query: searchQuery })}
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
    </Card>
  );
};

export default ManageMTEs;
