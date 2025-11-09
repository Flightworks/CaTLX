import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { useApi } from '../../hooks/useApi';

const ManageProjects: React.FC = () => {
  const { data: projects, isLoading, error, post } = useApi<Project[]>('projects');
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      await post({ name: newProjectName, studyIds: [], evaluatorIds: [] });
      setNewProjectName('');
    }
  };

  if (isLoading) return <div>Loading projects...</div>;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Manage Projects</h1>
      <div className="mb-4">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="New project name"
          className="p-2 border rounded"
        />
        <button onClick={handleCreateProject} className="ml-2 px-4 py-2 bg-blue-500 text-white rounded">
          Create Project
        </button>
      </div>
      <ul>
        {projects?.map((project) => (
          <li key={project.id} className="p-2 border-b">
            {project.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageProjects;
