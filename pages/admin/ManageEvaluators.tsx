
import React, { useState } from 'react';
import { useData } from '../../contexts/AppContext';
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
  const { evaluators, addEvaluator, updateEvaluator, deleteEvaluator } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvaluator, setEditingEvaluator] = useState<Evaluator | null>(null);

  const handleSave = (evaluator: Omit<Evaluator, 'id'> | Evaluator) => {
    if ('id' in evaluator) {
      updateEvaluator(evaluator);
    } else {
      addEvaluator(evaluator);
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

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Evaluators</h2>
        <Button onClick={handleAddNew}>Add New Evaluator</Button>
      </div>
       <p className="text-sm text-nasa-gray-400 mb-4">
        This is a global list of all evaluators in the system. Adding an evaluator here will automatically create a personal project for them. You can assign them to other projects in the "Manage Projects" tab.
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
            {evaluators.map((evaluator) => (
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