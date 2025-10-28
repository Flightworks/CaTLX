import React, { useState } from 'react';
import { useData } from '../../contexts/AppContext';
import { Study, MTE } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

// Form for Study
const StudyForm: React.FC<{
  study?: Study | null;
  onSave: (study: Omit<Study, 'id' | 'mteIds'> | Study) => void;
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


const AddMteToStudyModal: React.FC<{
  study: Study;
  onClose: () => void;
}> = ({ study, onClose }) => {
  const { mtes, addMTEToStudy, addMte } = useData();
  const [selectedMteId, setSelectedMteId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const availableMtes = mtes.filter(mte => !study.mteIds.includes(mte.id));
  
  React.useEffect(() => {
    if (availableMtes.length > 0) {
      setSelectedMteId(availableMtes[0].id);
    } else {
      setSelectedMteId('');
    }
  }, [study, mtes]);

  const handleAddSelected = () => {
    if (selectedMteId) {
      addMTEToStudy(study.id, selectedMteId);
      onClose();
    }
  };
  
  const handleSaveNewMte = (mteData: Omit<MTE, 'id' | 'refNumber'> & { refNumber?: string }) => {
    const newMte = addMte(mteData);
    if (newMte) {
      addMTEToStudy(study.id, newMte.id);
      onClose();
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={showCreateForm ? `Create & Add New MTE` : `Add MTE to "${study.name}"`}>
      {showCreateForm ? (
        <MTEForm 
          onSave={handleSaveNewMte} 
          onCancel={() => setShowCreateForm(false)} 
        />
      ) : (
        <>
          <div className="space-y-4">
            {availableMtes.length > 0 ? (
              <>
                <label className="block text-sm font-medium text-nasa-gray-300">Select MTE from Catalog</label>
                <select
                  value={selectedMteId}
                  onChange={e => setSelectedMteId(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base bg-nasa-gray-700 border-nasa-gray-600 focus:outline-none focus:ring-nasa-blue focus:border-nasa-blue sm:text-sm rounded-md text-white"
                >
                  {availableMtes.map(mte => (
                    <option key={mte.id} value={mte.id}>
                      [{mte.refNumber}] {mte.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <p className="text-nasa-gray-400 text-center py-4">All MTEs from the catalog have already been added to this study.</p>
            )}
          </div>
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-nasa-gray-700">
             <Button type="button" variant="secondary" onClick={() => setShowCreateForm(true)}>
              Or Create New MTE...
            </Button>
            <div className="flex items-center space-x-2">
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={handleAddSelected} disabled={!selectedMteId || availableMtes.length === 0}>Add Selected</Button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
};


const ManageStudies: React.FC = () => {
  const { studies, mtes, addStudy, updateStudy, deleteStudy, addMTEToStudy, removeMTEFromStudy } = useData();
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isAddMTEModalOpen, setIsAddMTEModalOpen] = useState(false);
  const [editingStudy, setEditingStudy] = useState<Study | null>(null);
  const [studyForMTE, setStudyForMTE] = useState<Study | null>(null);

  const handleSaveStudy = (study: Omit<Study, 'id' | 'mteIds'> | Study) => {
    if ('id' in study) {
      updateStudy(study);
    } else {
      addStudy(study);
    }
    setIsStudyModalOpen(false);
    setEditingStudy(null);
  };

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
                    {study.mteIds.map(mteId => {
                        const mte = mtes.find(m => m.id === mteId);
                        if (!mte) return null;
                        return (
                            <li key={mte.id} className="flex justify-between items-center p-2 bg-nasa-gray-800 rounded">
                                <div className="flex items-center">
                                    <span className="font-mono text-xs text-nasa-gray-400 mr-3 bg-nasa-gray-700 px-1.5 py-0.5 rounded-sm">{mte.refNumber}</span>
                                    <span className="text-sm">{mte.name}</span>
                                </div>
                                <Button size="sm" variant="danger" onClick={() => removeMTEFromStudy(study.id, mte.id)}>Remove</Button>
                            </li>
                        );
                    })}
                     {study.mteIds.length === 0 && <p className="text-sm text-nasa-gray-500">No MTEs added yet.</p>}
                </ul>
                <Button size="sm" variant="primary" className="mt-3" onClick={() => { setStudyForMTE(study); setIsAddMTEModalOpen(true);}}>Add MTE from Catalog</Button>
            </div>
          </div>
        ))}
      </div>
      <Modal isOpen={isStudyModalOpen} onClose={() => setIsStudyModalOpen(false)} title={editingStudy ? 'Edit Study' : 'Add Study'}>
        <StudyForm study={editingStudy} onSave={handleSaveStudy} onCancel={() => setIsStudyModalOpen(false)} />
      </Modal>
      {isAddMTEModalOpen && studyForMTE && (
        <AddMteToStudyModal 
            study={studyForMTE}
            onClose={() => {
              setIsAddMTEModalOpen(false);
              setStudyForMTE(null);
            }}
        />
      )}
    </Card>
  );
};

export default ManageStudies;