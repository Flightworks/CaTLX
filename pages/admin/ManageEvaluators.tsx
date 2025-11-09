
import React, { useState, useMemo } from 'react';
import { useData, useSession } from '../../contexts/AppContext';
import { Evaluator } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

const EvaluatorForm: React.FC<{
  evaluator?: Evaluator | null;
  onSave: (evaluator: Omit<Evaluator, 'id'> | Evaluator) => void;
  onCancel: () => void;
}> = ({ evaluator, onSave, onCancel }) => {
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
        <label htmlFor="name" className="block text-sm font-medium text-nasa-gray-300">Name</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white"
          required
        />
      </div>
      <div>
        <label htmlFor="quality" className="block text-sm font-medium text-nasa-gray-300">Quality</label>
        <input
          type="text"
          id="quality"
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white"
          required
        />
      </div>
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-nasa-gray-300">Company</label>
        <input
          type="text"
          id="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white"
          required
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
};

const ManageEvaluators: React.FC = () => {
  const { evaluators, projects, addEvaluator, updateEvaluator, deleteEvaluator, addMemberToProject } = useData();
  const { selectedProjectId } = useSession();
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
                <p>Please select a project to manage its evaluators.</p>
            </div>
        </Card>
      )
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Manage Project Evaluators</h2>
        <Button onClick={handleAddNew} disabled={!selectedProjectId}>Add New Evaluator</Button>
      </div>
       <p className="text-sm text-nasa-gray-400 mb-4">
        This is a list of all evaluators assigned to the current project. Use the 'Add New Evaluator' button to create a new evaluator profile; they will be automatically added to this project.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-nasa-gray-700">
          <thead className="bg-nasa-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Quality</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Company</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-nasa-gray-900 divide-y divide-nasa-gray-700">
            {projectEvaluators.map((evaluator) => (
              <tr key={evaluator.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{evaluator.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-nasa-gray-300">{evaluator.quality}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-nasa-gray-300">{evaluator.company}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button size="sm" variant="secondary" onClick={() => handleEdit(evaluator)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => deleteEvaluator(evaluator.id)}>Delete</Button>
                </td>
              </tr>
            ))}
            {projectEvaluators.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center py-10 text-nasa-gray-500">
                        No evaluators have been assigned to this project yet.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvaluator ? 'Edit Evaluator' : 'Add Evaluator'}>
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