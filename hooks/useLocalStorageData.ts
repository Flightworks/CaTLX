import { useEffect, useRef, useState } from 'react';
import { createDataSource, emptyWorkspace } from '../data/workspace';
import type { WorkspaceData } from '../types';

const keys = {
  projects: 'catlx_projects',
  evaluators: 'catlx_evaluators',
  studies: 'catlx_studies',
  mtes: 'catlx_mtes',
  ratings: 'catlx_ratings',
  pairwiseComparisons: 'catlx_pairwise_comparisons',
} satisfies Record<keyof WorkspaceData, string>;

const collections = Object.keys(keys) as (keyof WorkspaceData)[];

function readLocalData(): WorkspaceData {
  return Object.fromEntries(collections.map(collection => {
    try {
      const stored = localStorage.getItem(keys[collection]);
      const value = stored && JSON.parse(stored);
      return [collection, Array.isArray(value) ? value : emptyWorkspace[collection]];
    } catch {
      return [collection, emptyWorkspace[collection]];
    }
  })) as unknown as WorkspaceData;
}

export default function useLocalStorageData() {
  const [data, setData] = useState(readLocalData);
  const current = useRef(data);

  const source = createDataSource(data, change => {
    const next = change(current.current);
    for (const collection of collections) {
      if (next[collection] !== current.current[collection]) {
        localStorage.setItem(keys[collection], JSON.stringify(next[collection]));
      }
    }
    current.current = next;
    setData(next);
  });

  useEffect(() => {
    if (current.current.projects.length === 0) {
      source.addProject({
        name: 'Default Project',
        description: 'Automatically created default project',
      }, 'local-admin');
    }
  }, []);

  return source;
}
