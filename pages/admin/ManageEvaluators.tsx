
import { useTranslation } from 'react-i18next';
import React, { useState, useMemo } from 'react';
import { useData, useSession } from '../../contexts/AppContext';
import { Evaluator } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import RowAction from '../../components/ui/RowAction';

const tableHeading = 'px-2 py-2 text-left text-xs font-medium text-nasa-gray-400 sm:px-3';

const EvaluatorForm: React.FC<{
  evaluator?: Evaluator | null;
  onSave: (evaluator: Omit<Evaluator, 'id'> | Evaluator) => void;
  onCancel: () => void;
}> = ({ evaluator, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(evaluator?.name || '');
  const [quality, setQuality] = useState(evaluator?.quality || '');
  const [company, setCompany] = useState(evaluator?.company || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(evaluator ? { ...evaluator, name, quality, company } : { name, quality, company });
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
        <label htmlFor="quality" className="block text-sm font-medium text-nasa-gray-300">{t('people.quality')}</label>
        <input
          type="text"
          id="quality"
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-foreground"
          required
        />
      </div>
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-nasa-gray-300">{t('people.company')}</label>
        <input
          type="text"
          id="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-foreground"
          required
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t('evaluator.cancel')}</Button>
        <Button type="submit">{t('common.save')}</Button>
      </div>
    </form>
  );
};

const ManageEvaluators: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const { t } = useTranslation();
  const { evaluators, projects, ratings, addEvaluator, updateEvaluator, deleteEvaluator, addMemberToProject } = useData();
  const session = useSession();
  const selectedProjectId = projectId ?? session.selectedProjectId;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvaluator, setEditingEvaluator] = useState<Evaluator | null>(null);

  const projectEvaluators = useMemo(() => {
    if (!selectedProjectId) return [];
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return [];
    return evaluators
      .filter(e => project.memberIds.includes(e.id))
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [evaluators, projects, selectedProjectId]);


  const handleSave = (evaluator: Omit<Evaluator, 'id'> | Evaluator) => {
    if ('id' in evaluator) {
      updateEvaluator(evaluator);
    } else {
      const newEvaluator = addEvaluator(evaluator);
      if (selectedProjectId) {
        addMemberToProject(selectedProjectId, newEvaluator.id);
      }
    }
    setIsModalOpen(false);
    setEditingEvaluator(null);
  };

  const handleAddNew = () => {
    setEditingEvaluator(null);
    setIsModalOpen(true);
  };
  
  const handleEdit = (evaluator: Evaluator) => {
    setEditingEvaluator(evaluator);
    setIsModalOpen(true);
  }
  
  if (!selectedProjectId) {
      return (
        <Card>
            <div className="text-center py-8 text-nasa-gray-400">
                <p>{t('people.choose_project')}</p>
            </div>
        </Card>
      )
  }

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{t('admin.manage_evaluators')}</h2>
        <Button size="sm" onClick={handleAddNew}>{t('people.new')}</Button>
      </div>
      <p className="mb-3 text-sm text-nasa-gray-400">
        {t('people.hint')}
      </p>
      <div className="overflow-hidden rounded-lg border border-separator">
        <table className="w-full table-fixed divide-y divide-separator">
          <thead>
            <tr>
              <th scope="col" className={tableHeading}>{t('evaluator.name')}</th>
              <th scope="col" className={tableHeading}>{t('people.quality')}</th>
              <th scope="col" className={tableHeading}>{t('people.company')}</th>
              <th scope="col" className="w-24 lg:w-20"><span className="sr-only">{t('common.actions')}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-separator">
            {projectEvaluators.map((evaluator) => (
              <tr key={evaluator.id} className="align-top hover:bg-hover-surface/50">
                <td className="break-words px-2 py-2.5 text-sm font-semibold text-foreground sm:px-3">{evaluator.name}</td>
                <td className="break-words px-2 py-2.5 text-sm text-nasa-gray-300 sm:px-3">{evaluator.quality}</td>
                <td className="break-words px-2 py-2.5 text-sm text-nasa-gray-300 sm:px-3">{evaluator.company}</td>
                <td className="px-1 py-1">
                  <div className="flex justify-end gap-1">
                    <RowAction icon="edit" label={t('common.edit')} onClick={() => handleEdit(evaluator)} />
                    <RowAction icon="delete" label={t('common.delete')}
                      disabled={ratings.some(rating => rating.evaluatorId === evaluator.id)}
                      onClick={() => deleteEvaluator(evaluator.id)} />
                  </div>
                </td>
              </tr>
            ))}
            {projectEvaluators.length === 0 && (
                <tr>
                    <td colSpan={4} className="px-3 py-7 text-center text-sm text-nasa-gray-400">
                        {t('people.empty')}
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t(editingEvaluator ? 'people.edit' : 'people.new')}>
        <EvaluatorForm
          evaluator={editingEvaluator}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </Card>
  );
};

export default ManageEvaluators;
