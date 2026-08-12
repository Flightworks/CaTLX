import { useCallback, useEffect, useState } from 'react';
import { Evaluator, Study, MTE, Rating, PairwiseComparison, IDataSource, Project } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8099/api';
export const API_TOKEN_KEY = 'catlx_api_token';

const id = () => crypto.randomUUID();
const token = () => (typeof localStorage === 'undefined' ? null : localStorage.getItem(API_TOKEN_KEY));

export async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const jwt = token();
  if (jwt) headers.set('Authorization', `Bearer ${jwt}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try { message = (await response.json()).error || message; } catch { /* empty response */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const normalizeProject = (p: any): Project => ({ id: p.id, name: p.name, description: p.description || '', ownerId: p.ownerId ?? p.owner_id, memberIds: p.memberIds || [] });
const normalizeEvaluator = (e: any): Evaluator => ({ id: e.id, name: e.name, quality: e.quality || '', company: e.company || '' });
const normalizeMte = (m: any): MTE => ({ id: m.id, name: m.name, description: m.description || '', refNumber: m.refNumber ?? m.ref_number ?? '' });
const normalizeStudy = (s: any): Study => ({ id: s.id, name: s.name, description: s.description || '', date: Number(s.date), mteIds: s.mteIds || s.mte_ids || [], evaluatorIds: s.evaluatorIds || s.evaluator_ids || [], projectId: s.projectId ?? s.project_id });
const normalizeRating = (r: any): Rating => ({ id: r.id, evaluatorId: r.evaluatorId ?? r.evaluator_id, studyId: r.studyId ?? r.study_id, mteId: r.mteId ?? r.mte_id, scores: typeof r.scores === 'string' ? JSON.parse(r.scores) : r.scores, timestamp: Number(r.timestamp), comments: r.comments || undefined });
const normalizePairwise = (p: any): PairwiseComparison => ({ evaluatorId: p.evaluatorId ?? p.evaluator_id, studyId: p.studyId ?? p.study_id, weights: typeof p.weights === 'string' ? JSON.parse(p.weights) : p.weights, isWeighted: Boolean(p.isWeighted ?? p.is_weighted) });
const body = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });
const put = (value: unknown): RequestInit => ({ method: 'PUT', body: JSON.stringify(value) });
const remove = (): RequestInit => ({ method: 'DELETE' });

const useApiData = (): IDataSource => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [mtes, setMtes] = useState<MTE[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [pairwiseComparisons, setPairwiseComparisons] = useState<PairwiseComparison[]>([]);

  const reload = useCallback(async () => {
    if (!token()) return;
    const [p, e, s, m, r, pc] = await Promise.all([
      apiRequest<any[]>('/projects'), apiRequest<any[]>('/evaluators'), apiRequest<any[]>('/studies'),
      apiRequest<any[]>('/mtes'), apiRequest<any[]>('/ratings'), apiRequest<any[]>('/pairwise-comparisons'),
    ]);
    setProjects(p.map(normalizeProject)); setEvaluators(e.map(normalizeEvaluator)); setStudies(s.map(normalizeStudy));
    setMtes(m.map(normalizeMte)); setRatings(r.map(normalizeRating)); setPairwiseComparisons(pc.map(normalizePairwise));
  }, []);
  useEffect(() => {
    reload().catch(console.error);
    const handleTokenChange = () => { reload().catch(console.error); };
    window.addEventListener('catlx-auth-changed', handleTokenChange);
    return () => window.removeEventListener('catlx-auth-changed', handleTokenChange);
  }, [reload]);

  const addProject = (project: Omit<Project, 'id' | 'ownerId' | 'memberIds'>, _ownerId: string) => { void apiRequest<any>('/projects', body(project)).then(p => setProjects(x => [...x, normalizeProject(p)])).catch(console.error); };
  const updateProject = (p: Project) => { void apiRequest<any>(`/projects/${p.id}`, put({ ...p, ownerId: p.ownerId, memberIds: p.memberIds })).then(x => setProjects(v => v.map(y => y.id === p.id ? normalizeProject(x) : y))); };
  const deleteProject = (projectId: string) => { void apiRequest(`/projects/${projectId}`, remove()).then(() => setProjects(v => v.filter(x => x.id !== projectId))); };
  const addMemberToProject = (projectId: string, evaluatorId: string) => { void apiRequest(`/projects/${projectId}/members`, body({ evaluatorId })).then(() => setProjects(v => v.map(p => p.id === projectId && !p.memberIds.includes(evaluatorId) ? { ...p, memberIds: [...p.memberIds, evaluatorId] } : p))); };
  const removeMemberFromProject = (projectId: string, evaluatorId: string) => { void apiRequest(`/projects/${projectId}/members/${evaluatorId}`, remove()).then(() => setProjects(v => v.map(p => p.id === projectId ? { ...p, memberIds: p.memberIds.filter(x => x !== evaluatorId) } : p))); };
  const addEvaluator = (evaluator: Omit<Evaluator, 'id'>): Evaluator => { const optimistic = { ...evaluator, id: id() }; void apiRequest<any>('/evaluators', body(optimistic)).then(x => setEvaluators(v => [...v, normalizeEvaluator(x)])).catch(console.error); return optimistic; };
  const updateEvaluator = (e: Evaluator) => { void apiRequest<any>(`/evaluators/${e.id}`, put(e)).then(x => setEvaluators(v => v.map(y => y.id === e.id ? normalizeEvaluator(x) : y))); };
  const deleteEvaluator = (eid: string) => { void apiRequest(`/evaluators/${eid}`, remove()).then(() => setEvaluators(v => v.filter(x => x.id !== eid))); };
  const addStudy = (s: Omit<Study, 'id' | 'mteIds' | 'evaluatorIds'>) => { void apiRequest<any>('/studies', body({ ...s, mteIds: [], evaluatorIds: [] })).then(x => setStudies(v => [...v, normalizeStudy(x)])); };
  const updateStudy = (s: Study) => { void apiRequest<any>(`/studies/${s.id}`, put(s)).then(x => setStudies(v => v.map(y => y.id === s.id ? normalizeStudy(x) : y))); };
  const deleteStudy = (sid: string) => { void apiRequest(`/studies/${sid}`, remove()).then(() => setStudies(v => v.filter(x => x.id !== sid))); };
  const addMte = (m: Omit<MTE, 'id' | 'refNumber'> & { refNumber?: string }): MTE => { const optimistic = { ...m, id: id(), refNumber: m.refNumber || '' }; void apiRequest<any>('/mtes', body(m)).then(x => setMtes(v => [...v, normalizeMte(x)])); return optimistic; };
  const updateMte = (m: MTE) => { void apiRequest<any>(`/mtes/${m.id}`, put(m)).then(x => setMtes(v => v.map(y => y.id === m.id ? normalizeMte(x) : y))); };
  const deleteMte = (mid: string) => { void apiRequest(`/mtes/${mid}`, remove()).then(() => setMtes(v => v.filter(x => x.id !== mid))); };
  const addMTEToStudy = (sid: string, mid: string) => { void apiRequest(`/studies/${sid}/mtes`, body({ mteId: mid })).then(() => setStudies(v => v.map(s => s.id === sid && !s.mteIds.includes(mid) ? { ...s, mteIds: [...s.mteIds, mid] } : s))); };
  const removeMTEFromStudy = (sid: string, mid: string) => { void apiRequest(`/studies/${sid}/mtes/${mid}`, remove()).then(() => setStudies(v => v.map(s => s.id === sid ? { ...s, mteIds: s.mteIds.filter(x => x !== mid) } : s))); };
  const addEvaluatorToStudy = (sid: string, eid: string) => { void apiRequest(`/studies/${sid}/evaluators`, body({ evaluatorId: eid })).then(() => setStudies(v => v.map(s => s.id === sid && !s.evaluatorIds.includes(eid) ? { ...s, evaluatorIds: [...s.evaluatorIds, eid] } : s))); };
  const removeEvaluatorFromStudy = (sid: string, eid: string) => { void apiRequest(`/studies/${sid}/evaluators/${eid}`, remove()).then(() => setStudies(v => v.map(s => s.id === sid ? { ...s, evaluatorIds: s.evaluatorIds.filter(x => x !== eid) } : s))); };
  const addRating = async (r: Omit<Rating, 'id' | 'timestamp'>) => { const x = normalizeRating(await apiRequest<any>('/ratings', body(r))); setRatings(v => [...v, x]); };
  const addPairwiseComparison = (p: PairwiseComparison) => { void apiRequest<any>('/pairwise-comparisons', body(p)).then(x => { const n = normalizePairwise(x); setPairwiseComparisons(v => v.some(y => y.evaluatorId === n.evaluatorId && y.studyId === n.studyId) ? v.map(y => y.evaluatorId === n.evaluatorId && y.studyId === n.studyId ? n : y) : [...v, n]); }); };
  const hasPreviousRatingInStudy = (evaluatorId: string, studyId: string) => ratings.some(r => r.evaluatorId === evaluatorId && r.studyId === studyId);
  return { projects, evaluators, studies, mtes, ratings, pairwiseComparisons, addProject, updateProject, deleteProject, addMemberToProject, removeMemberFromProject, addEvaluator, updateEvaluator, deleteEvaluator, addStudy, updateStudy, deleteStudy, addMte, updateMte, deleteMte, addMTEToStudy, removeMTEFromStudy, addEvaluatorToStudy, removeEvaluatorFromStudy, addRating, addPairwiseComparison, hasPreviousRatingInStudy };
};
export default useApiData;
