import React, { useState, useMemo } from 'react';
import { useData, useSession } from '../../contexts/AppContext';
import { Study, MTE, Evaluator } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';


const ManageStudyMTEsModal: React.FC<{
  study: Study;
  onClose: () => void;
}> = ({ study, onClose }) => {
  const { mtes, addMTEToStudy, removeMTEFromStudy } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  const mtesInStudy = useMemo(() => {
    return study.mteIds
      .map(id => mtes.find(m => m.id === id))
      .filter((m): m is MTE => !!m)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [study.mteIds, mtes]);

  const availableMtes = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    return mtes
      .filter(mte => 
        !study.mteIds.includes(mte.id) &&
        (searchQuery === '' || mte.name.toLowerCase().includes(lowercasedQuery) || mte.refNumber.toLowerCase().includes(lowercasedQuery))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mtes, study.mteIds, searchQuery]);

  return (
    <Modal isOpen={true} onClose={onClose} title={`Manage MTEs for: ${study.name}`} size="4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Available MTEs */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Available MTEs</h3>
          <input
            type="search"
            placeholder="Search catalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-nasa-gray-900 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white placeholder-nasa-gray-400 mb-3"
          />
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {availableMtes.map(mte => (
              <div key={mte.id} className="flex justify-between items-center p-2 bg-nasa-gray-700 rounded">
                <div>
                  <p className="text-sm font-medium text-white">{mte.name}</p>
                  <p className="text-xs text-nasa-gray-400 font-mono">[{mte.refNumber}]</p>
                </div>
                <Button size="sm" onClick={() => addMTEToStudy(study.id, mte.id)}>Add</Button>
              </div>
            ))}
            {availableMtes.length === 0 && <p className="text-sm text-nasa-gray-500 text-center py-4">No available MTEs match your search.</p>}
          </div>
        </div>
        {/* MTEs in Study */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">MTEs in this Study ({mtesInStudy.length})</h3>
           <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {mtesInStudy.map(mte => (
              <div key={mte.id} className="flex justify-between items-center p-2 bg-nasa-gray-700 rounded">
                <div>
                  <p className="text-sm font-medium text-white">{mte.name}</p>
                  <p className="text-xs text-nasa-gray-400 font-mono">[{mte.refNumber}]</p>
                </div>
                <Button size="sm" variant="danger" onClick={() => removeMTEFromStudy(study.id, mte.id)}>Remove</Button>
              </div>
            ))}
            {mtesInStudy.length === 0 && <p className="text-sm text-nasa-gray-500 text-center py-4">No MTEs have been added to this study.</p>}
           </div>
        </div>
      </div>
    </Modal>
  );
};

const ManageStudyEvaluatorsModal: React.FC<{
  study: Study;
  onClose: () => void;
}> = ({ study, onClose }) => {
  const { evaluators, addEvaluatorToStudy, removeEvaluatorFromStudy } = useData();

  const evaluatorsInStudy = useMemo(() => {
    return study.evaluatorIds
      .map(id => evaluators.find(e => e.id === id))
      .filter((e): e is Evaluator => !!e)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [study.evaluatorIds, evaluators]);

  const availableEvaluators = useMemo(() => {
    return evaluators
      .filter(e => !study.evaluatorIds.includes(e.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [evaluators, study.evaluatorIds]);

  return (
    <Modal isOpen={true} onClose={onClose} title={`Manage Evaluators for: ${study.name}`} size="4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Available Evaluators</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {availableEvaluators.map(evaluator => (
              <div key={evaluator.id} className="flex justify-between items-center p-2 bg-nasa-gray-700 rounded">
                <p className="text-sm font-medium text-white">{evaluator.name}</p>
                <Button size="sm" onClick={() => addEvaluatorToStudy(study.id, evaluator.id)}>Add</Button>
              </div>
            ))}
            {availableEvaluators.length === 0 && <p className="text-sm text-nasa-gray-500 text-center py-4">No other evaluators available.</p>}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Evaluators in this Study ({evaluatorsInStudy.length})</h3>
           <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {evaluatorsInStudy.map(evaluator => (
              <div key={evaluator.id} className="flex justify-between items-center p-2 bg-nasa-gray-700 rounded">
                <p className="text-sm font-medium text-white">{evaluator.name}</p>
                <Button size="sm" variant="danger" onClick={() => removeEvaluatorFromStudy(study.id, evaluator.id)}>Remove</Button>
              </div>
            ))}
            {evaluatorsInStudy.length === 0 && <p className="text-sm text-nasa-gray-500 text-center py-4">No evaluators have been added to this study.</p>}
           </div>
        </div>
      </div>
    </Modal>
  );
}

const StudyForm: React.FC<{
  study?: Study | null;
  projectId: string;
  onSave: (study: Omit<Study, 'id' | 'mteIds' | 'evaluatorIds'> | Study) => void;
  onCancel: () => void;
}> = ({ study, projectId, onSave, onCancel }) => {
  const [name, setName] = useState(study?.name || '');
  const [description, setDescription] = useState(study?.description || '');
  const [date, setDate] = useState(study ? new Date(study.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const studyDate = new Date(date).getTime();
    onSave(study ? { ...study, name, description, date: studyDate } : { name, description, date: studyDate, projectId });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-nasa-gray-300">Study Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white" />
      </div>
       <div>
        <label className="block text-sm font-medium text-nasa-gray-300">Study Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium text-nasa-gray-300">Study Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={3} className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white" />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Study</Button>
      </div>
    </form>
  );
};


const ManageStudies: React.FC = () => {
  const { studies, mtes, evaluators, addStudy, updateStudy, deleteStudy } = useData();
  const { selectedProjectId } = useSession();
    
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [managingMtesForStudy, setManagingMtesForStudy] = useState<Study | null>(null);
  const [managingEvaluatorsForStudy, setManagingEvaluatorsForStudy] = useState<Study | null>(null);
  const [editingStudy, setEditingStudy] = useState<Study | null>(null);

  const studiesInProject = useMemo(() => {
    if (!selectedProjectId) return [];
    return studies
        .filter(s => s.projectId === selectedProjectId)
        .sort((a, b) => b.date - a.date);
  }, [studies, selectedProjectId]);

  const handleSaveStudy = (study: Omit<Study, 'id' | 'mteIds' | 'evaluatorIds'> | Study) => {
    if ('id' in study) {
      updateStudy(study);
    } else {
      addStudy(study);
    }
    setIsStudyModalOpen(false);
    setEditingStudy(null);
  };
  
  if (!selectedProjectId) {
      return (
        <Card>
            <div className="text-center py-8 text-nasa-gray-400">
                <p>Please select a project to view its studies.</p>
                <p className="text-sm text-nasa-gray-500">If no projects are available, create one in the database.</p>
            </div>
        </Card>
      )
  }

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Manage Studies</h2>
        <Button onClick={() => { setEditingStudy(null); setIsStudyModalOpen(true); }}>Add New Study</Button>
      </div>
      <div className="space-y-6">
        {studiesInProject.map((study) => {
          const studyMtes = study.mteIds.map(id => mtes.find(m => m.id === id)).filter((m): m is MTE => !!m);
          const studyEvaluators = study.evaluatorIds.map(id => evaluators.find(e => e.id === id)).filter((e): e is Evaluator => !!e);
          return (
            <div key={study.id} className="p-4 bg-nasa-gray-900 rounded-lg border border-nasa-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                  <div>
                      <h3 className="text-lg font-semibold text-white">{study.name}</h3>
                      <p className="text-sm text-nasa-gray-300 font-medium">{new Date(study.date).toLocaleDateString()}</p>
                      <p className="text-sm text-nasa-gray-400 mt-1">{study.description}</p>
                  </div>
                  <div className="flex-shrink-0 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setEditingStudy(study); setIsStudyModalOpen(true); }}>Edit Info</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteStudy(study.id)}>Delete</Button>
                  </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* MTEs in Study */}
                  <div>
                      <h4 className="text-md font-medium text-nasa-gray-200 mb-2">MTEs ({studyMtes.length})</h4>
                      <div className="space-y-2">
                          {studyMtes.map(mte => (
                              <div key={mte.id} className="p-2 bg-nasa-gray-800 rounded text-sm text-white">[{mte.refNumber}] {mte.name}</div>
                          ))}
                          {studyMtes.length === 0 && <p className="text-xs text-nasa-gray-500">No MTEs assigned.</p>}
                          <Button size="sm" variant="secondary" className="w-full mt-2" onClick={() => setManagingMtesForStudy(study)}>Manage MTEs</Button>
                      </div>
                  </div>
                  {/* Evaluators in Study */}
                  <div>
                      <h4 className="text-md font-medium text-nasa-gray-200 mb-2">Evaluators ({studyEvaluators.length})</h4>
                      <div className="space-y-2">
                          {studyEvaluators.map(evaluator => (
                              <div key={evaluator.id} className="p-2 bg-nasa-gray-800 rounded text-sm text-white">{evaluator.name}</div>
                          ))}
                          {studyEvaluators.length === 0 && <p className="text-xs text-nasa-gray-500">No evaluators assigned.</p>}
                          <Button size="sm" variant="secondary" className="w-full mt-2" onClick={() => setManagingEvaluatorsForStudy(study)}>Manage Evaluators</Button>
                      </div>
                  </div>
              </div>
            </div>
          )
        })}
        {studiesInProject.length === 0 && (
            <div className="text-center py-10 text-nasa-gray-500">
                <h3 className="text-lg font-semibold">No Studies in this Project</h3>
                <p>Click "Add New Study" to get started.</p>
            </div>
        )}
      </div>

      {/* Modals */}
      {isStudyModalOpen && (
         <Modal isOpen={true} onClose={() => setIsStudyModalOpen(false)} title={editingStudy ? `Edit Study` : `Add New Study`}>
            <StudyForm study={editingStudy} projectId={selectedProjectId} onSave={handleSaveStudy} onCancel={() => setIsStudyModalOpen(false)} />
        </Modal>
      )}

      {managingMtesForStudy && (
        <ManageStudyMTEsModal 
            study={managingMtesForStudy}
            onClose={() => setManagingMtesForStudy(null)}
        />
      )}

      {managingEvaluatorsForStudy && (
        <ManageStudyEvaluatorsModal
            study={managingEvaluatorsForStudy}
            onClose={() => setManagingEvaluatorsForStudy(null)}
        />
      )}
    </Card>
  );
};

export default ManageStudies;