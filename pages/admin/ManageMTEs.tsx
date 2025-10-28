import React, { useState } from 'react';
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
        <label htmlFor="refNumber" className="block text-sm font-medium text-nasa-gray-300">Reference Number (optional)</label>
        <input
          type="text"
          id="refNumber"
          value={refNumber}
          onChange={(e) => setRefNumber(e.target.value)}
          className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-nasa-gray-300">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white"
          required
          rows={3}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save MTE</Button>
      </div>
    </form>
  );
};


const ManageMTEs: React.FC = () => {
  const { mtes, addMte, updateMte, deleteMte } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMte, setEditingMte] = useState<MTE | null>(null);

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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Mission Task Element (MTE) Catalog</h2>
        <Button onClick={handleAddNew}>Add New MTE</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-nasa-gray-700">
          <thead className="bg-nasa-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider w-24">Ref #</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-nasa-gray-300 uppercase tracking-wider">Description</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-nasa-gray-900 divide-y divide-nasa-gray-700">
            {mtes.map((mte) => (
              <tr key={mte.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-nasa-gray-400">{mte.refNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{mte.name}</td>
                <td className="px-6 py-4 text-sm text-nasa-gray-300">{mte.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <Button size="sm" variant="secondary" onClick={() => handleEdit(mte)}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => deleteMte(mte.id)}>Delete</Button>
                </td>
              </tr>
            ))}
             {mtes.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center py-10 text-nasa-gray-500">No MTEs in the catalog yet.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMte ? 'Edit MTE' : 'Add MTE'}>
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