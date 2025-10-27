
import React, { useState } from 'react';
import { useData } from '../../contexts/AppContext';
import { Study, MTE } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

// Form for Study
const StudyForm: React.FC<{
  study?: Study | null;
  onSave: (study: Omit<Study, 'id' | 'mtes'> | Study) => void;
  onCancel: () => void;
}> = ({ study, onSave, onCancel }) => {
  const [name, setName] = useState(study?.name || '');
  const [description, setDescription] = useState(study?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(study ? { ...study, name, description } : { name, description });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-nasa-gray-300">Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium text-nasa-gray-300">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white" />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Study</Button>
      </div>
    </form>
  );
};

// Form for MTE
const MTEForm: React.FC<{
  onSave: (mte: Omit<MTE, 'id'>) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-nasa-gray-300">MTE Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium text-nasa-gray-300">MTE Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white" />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Add MTE</Button>
      </div>
    </form>
  );
};


const ManageStudies: React.FC = () => {
  const { studies, addStudy, updateStudy, deleteStudy, addMTEToStudy, removeMTEFromStudy } = useData();
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isMTEModalOpen, setIsMTEModalOpen] = useState(false);
  const [editingStudy, setEditingStudy] = useState<Study | null>(null);
  const [studyForMTE, setStudyForMTE] = useState<Study | null>(null);

  const handleSaveStudy = (study: Omit<Study, 'id' | 'mtes'> | Study) => {
    if ('id' in study) {
      updateStudy(study);
    } else {
      addStudy(study);
    }
    setIsStudyModalOpen(false);
    setEditingStudy(null);
  };

  const handleSaveMTE = (mte: Omit<MTE, 'id'>) => {
      if (studyForMTE) {
          addMTEToStudy(studyForMTE.id, mte);
      }
      setIsMTEModalOpen(false);
      setStudyForMTE(null);
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Studies</h2>
        <Button onClick={() => { setEditingStudy(null); setIsStudyModalOpen(true); }}>Add New Study</Button>
      </div>
      <div className="space-y-6">
        {studies.map((study) => (
          <div key={study.id} className="p-4 bg-nasa-gray-900 rounded-lg">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-semibold text-white">{study.name}</h3>
                    <p className="text-sm text-nasa-gray-400">{study.description}</p>
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                    <Button size="sm" variant="secondary" onClick={() => { setEditingStudy(study); setIsStudyModalOpen(true); }}>Edit Study</Button>
                    <Button size="sm" variant="danger" onClick={() => deleteStudy(study.id)}>Delete Study</Button>
                </div>
            </div>
            <div className="mt-4">
                <h4 className="text-md font-medium text-nasa-gray-200 mb-2">Mission Task Elements (MTEs)</h4>
                <ul className="space-y-2">
                    {study.mtes.map(mte => (
                        <li key={mte.id} className="flex justify-between items-center p-2 bg-nasa-gray-800 rounded">
                            <span className="text-sm">{mte.name}</span>
                            <Button size="sm" variant="danger" onClick={() => removeMTEFromStudy(study.id, mte.id)}>Remove</Button>
                        </li>
                    ))}
                     {study.mtes.length === 0 && <p className="text-sm text-nasa-gray-500">No MTEs added yet.</p>}
                </ul>
                <Button size="sm" variant="primary" className="mt-3" onClick={() => { setStudyForMTE(study); setIsMTEModalOpen(true);}}>Add MTE</Button>
            </div>
          </div>
        ))}
      </div>
      <Modal isOpen={isStudyModalOpen} onClose={() => setIsStudyModalOpen(false)} title={editingStudy ? 'Edit Study' : 'Add Study'}>
        <StudyForm study={editingStudy} onSave={handleSaveStudy} onCancel={() => setIsStudyModalOpen(false)} />
      </Modal>
      <Modal isOpen={isMTEModalOpen} onClose={() => setIsMTEModalOpen(false)} title={`Add MTE to "${studyForMTE?.name}"`}>
        <MTEForm onSave={handleSaveMTE} onCancel={() => setIsMTEModalOpen(false)} />
      </Modal>
    </Card>
  );
};

export default ManageStudies;
