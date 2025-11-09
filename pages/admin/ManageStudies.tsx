import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/AppContext';
import { Project, Study, MTE, Evaluator } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';


const ProjectForm: React.FC<{
  project?: Project | null;
  onSave: (project: Omit<Project, 'id' | 'ownerId' | 'memberIds'> | Project) => void;
  onCancel: () => void;
}> = ({ project, onSave, onCancel }) => {
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(project ? { ...project, name, description } : { name, description });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-nasa-gray-300">Project Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium text-nasa-gray-300">Project Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white" />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Project</Button>
      </div>
    </form>
  );
};

const StudyForm: React.FC<{
  study?: Study | null;
  projectId: string;
  onSave: (study: Omit<Study, 'id' | 'mteIds'> | Study) => void;
  onCancel: () => void;
}> = ({ study, projectId, onSave, onCancel }) => {
  const [name, setName] = useState(study?.name || '');
  const [description, setDescription] = useState(study?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(study ? { ...study, name, description } : { name, description, projectId });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-nasa-gray-300">Study Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium text-nasa-gray-300">Study Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} required className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-white" />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Study</Button>
      </div>
    </form>
  );
};

const AddMemberModal: React.FC<{
    project: Project;
    onClose: () => void;
}> = ({ project, onClose }) => {
    const { evaluators, addMemberToProject } = useData();
    const [selectedEvaluatorId, setSelectedEvaluatorId] = useState('');

    const availableEvaluators = useMemo(() => {
        return evaluators.filter(e => !project.memberIds.includes(e.id));
    }, [evaluators, project]);

    React.useEffect(() => {
        if (availableEvaluators.length > 0) {
            setSelectedEvaluatorId(availableEvaluators[0].id);
        }
    }, [availableEvaluators]);

    const handleAdd = () => {
        if (selectedEvaluatorId) {
            addMemberToProject(project.id, selectedEvaluatorId);
            onClose();
        }
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={`Add Member to ${project.name}`}>
            {availableEvaluators.length > 0 ? (
                 <div className="flex items-end gap-4">
                    <div className="flex-grow">
                        <Select label="Select Evaluator" id="member-select" value={selectedEvaluatorId} onChange={e => setSelectedEvaluatorId(e.target.value)}>
                            {availableEvaluators.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </Select>
                    </div>
                     <Button onClick={handleAdd}>Add Member</Button>
                </div>
            ) : (
                <p className="text-nasa-gray-400 text-center">All available evaluators are already members of this project.</p>
            )}
        </Modal>
    )
}


const ManageProjects: React.FC = () => {
  const { 
      projects, evaluators, studies, addProject, updateProject, deleteProject, 
      addStudy, updateStudy, deleteStudy, addMemberToProject, removeMemberFromProject 
    } = useData();
    
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingStudy, setEditingStudy] = useState<Study | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const handleSaveProject = (project: Omit<Project, 'id' | 'ownerId' | 'memberIds'> | Project) => {
    if ('id' in project) {
      updateProject(project);
    } else {
      // For new projects, we need an owner. Let's assume first evaluator is admin/creator.
      const ownerId = evaluators[0]?.id;
      if (ownerId) {
        addProject(project, ownerId);
      } else {
        alert("Cannot create a project without at least one evaluator in the system to act as owner.");
      }
    }
    setIsProjectModalOpen(false);
    setEditingProject(null);
  };

  const handleSaveStudy = (study: Omit<Study, 'id' | 'mteIds'> | Study) => {
    if ('id' in study) {
      updateStudy(study);
    } else {
      addStudy(study);
    }
    setIsStudyModalOpen(false);
    setEditingStudy(null);
    setActiveProject(null);
  };
  

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Projects</h2>
        <Button onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }}>Add New Project</Button>
      </div>
      <div className="space-y-6">
        {projects.map((project) => (
          <div key={project.id} className="p-4 bg-nasa-gray-900 rounded-lg">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                    <p className="text-sm text-nasa-gray-400">{project.description}</p>
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                    <Button size="sm" variant="secondary" onClick={() => { setEditingProject(project); setIsProjectModalOpen(true); }}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => deleteProject(project.id)}>Delete</Button>
                </div>
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Members */}
                <div>
                    <h4 className="text-md font-medium text-nasa-gray-200 mb-2">Members</h4>
                    <ul className="space-y-2">
                        {project.memberIds.map(memberId => {
                            const member = evaluators.find(e => e.id === memberId);
                            if (!member) return null;
                            return (
                                <li key={member.id} className="flex justify-between items-center p-2 bg-nasa-gray-800 rounded">
                                    <span className="text-sm">{member.name}</span>
                                    <Button size="sm" variant="danger" onClick={() => removeMemberFromProject(project.id, member.id)} disabled={member.id === project.ownerId}>
                                        {member.id === project.ownerId ? 'Owner' : 'Remove'}
                                    </Button>
                                </li>
                            )
                        })}
                    </ul>
                    <Button size="sm" variant="secondary" className="mt-3" onClick={() => { setActiveProject(project); setIsMemberModalOpen(true);}}>Add Member</Button>
                </div>
                {/* Studies */}
                <div>
                    <h4 className="text-md font-medium text-nasa-gray-200 mb-2">Studies</h4>
                    <ul className="space-y-2">
                        {studies.filter(s => s.projectId === project.id).map(study => (
                             <li key={study.id} className="flex justify-between items-center p-2 bg-nasa-gray-800 rounded">
                                <span className="text-sm">{study.name}</span>
                                <div>
                                    <Button size="sm" variant="secondary" onClick={() => {setEditingStudy(study); setActiveProject(project); setIsStudyModalOpen(true); }}>Edit</Button>
                                    <Button size="sm" variant="danger" className="ml-2" onClick={() => deleteStudy(study.id)}>Delete</Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                     <Button size="sm" variant="primary" className="mt-3" onClick={() => { setEditingStudy(null); setActiveProject(project); setIsStudyModalOpen(true); }}>Add Study</Button>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title={editingProject ? 'Edit Project' : 'Add New Project'}>
        <ProjectForm project={editingProject} onSave={handleSaveProject} onCancel={() => setIsProjectModalOpen(false)} />
      </Modal>
      
      {isStudyModalOpen && activeProject && (
         <Modal isOpen={true} onClose={() => setIsStudyModalOpen(false)} title={editingStudy ? `Edit Study in ${activeProject.name}` : `Add New Study to ${activeProject.name}`}>
            <StudyForm study={editingStudy} projectId={activeProject.id} onSave={handleSaveStudy} onCancel={() => setIsStudyModalOpen(false)} />
        </Modal>
      )}

      {isMemberModalOpen && activeProject && (
          <AddMemberModal project={activeProject} onClose={() => setIsMemberModalOpen(false)} />
      )}
    </Card>
  );
};

export default ManageProjects;
