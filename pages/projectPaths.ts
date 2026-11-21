import type { Study } from '../types';

export function projectPath(id: string) {
  return `/projects/${encodeURIComponent(id)}`;
}

export function studyPath(study: Study) {
  return `${projectPath(study.projectId)}/studies/${encodeURIComponent(study.id)}`;
}

export function scenarioPath(study: Study, scenarioId: string) {
  return `${studyPath(study)}/scenarios/${encodeURIComponent(scenarioId)}`;
}
