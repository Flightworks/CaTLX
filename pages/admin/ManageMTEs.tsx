import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../../contexts/AppContext';
import { MTE } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

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


const ManageMTEs: React.FC<{ projectId?: string }> = ({ projectId }) => {
  const { t } = useTranslation();
  const { mtes, studies, ratings, addMte, updateMte, deleteMte } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMte, setEditingMte] = useState<MTE | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const catalog = useMemo(() => {
    if (!projectId) return mtes;
    const assignedIds = new Set(studies.filter(study => study.projectId === projectId).flatMap(study => study.mteIds));
    return mtes.filter(mte => assignedIds.has(mte.id));
  }, [mtes, projectId, studies]);

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
        <h2 className="text-xl font-bold">{t('admin.mte_catalog')}</h2>
        {projectId ? (
          <Link to="/projects/catalog" className="text-sm text-accent-ink underline">{t('catalog.open_global')}</Link>
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">{t('evaluator.description')}</th>
              {!projectId && <th scope="col" className="relative px-6 py-3"><span className="sr-only">{t('common.actions')}</span></th>}
            </tr>
          </thead>
          <tbody className="bg-nasa-gray-900 divide-y divide-nasa-gray-700">
            {filteredMtes.map((mte) => (
              <tr key={mte.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-nasa-gray-400">{mte.refNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{mte.name}</td>
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
                    <td colSpan={projectId ? 3 : 4} className="text-center py-10 text-nasa-gray-500">{t(projectId ? 'catalog.project_empty' : 'catalog.empty')}</td>
                </tr>
            )}
            {catalog.length > 0 && filteredMtes.length === 0 && (
              <tr>
                <td colSpan={projectId ? 3 : 4} className="text-center py-10 text-nasa-gray-500">
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