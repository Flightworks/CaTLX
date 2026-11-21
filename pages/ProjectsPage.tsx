import { useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/AppContext';
import type { Project, Scenario, Study } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import { ProjectForm } from './AdminDashboardPage';
import { AssessmentRunner } from './EvaluatorPage';
import ManageStudies from './admin/ManageStudies';
import ManageMTEs from './admin/ManageMTEs';
import ManageEvaluators from './admin/ManageEvaluators';
import ViewStats from './admin/ViewStats';

const inputClass = 'w-full rounded-md bg-nasa-gray-900 border border-nasa-gray-600 p-2 text-foreground';
const tabClass = ({ isActive }: { isActive: boolean }) => isActive
  ? 'border-b-2 border-indigo-300 px-2.5 py-2 text-sm font-semibold text-foreground'
  : 'border-b-2 border-transparent px-2.5 py-2 text-sm text-nasa-gray-300 hover:text-foreground';

function projectPath(id: string) {
  return `/projects/${encodeURIComponent(id)}`;
}

function studyPath(study: Study) {
  return `${projectPath(study.projectId)}/studies/${encodeURIComponent(study.id)}`;
}

function Breadcrumbs({ project, study }: { project?: Project; study?: Study }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('projects.path')} className="flex flex-wrap items-center gap-2 text-sm text-nasa-gray-300">
      <Link className="underline" to="/projects?all=1">{t('projects.title')}</Link>
      {project && <><span aria-hidden="true">/</span><Link className="underline" to={projectPath(project.id)}>{project.name}</Link></>}
      {study && <><span aria-hidden="true">/</span><Link className="underline" to={studyPath(study)}>{study.name}</Link></>}
    </nav>
  );
}

function ProjectList() {
  const { t } = useTranslation();
  const { projects, studies, addProject } = useData();
  const [creating, setCreating] = useState(false);
  const [params] = useSearchParams();
  if (projects.length === 1 && !params.has('all')) {
    return <Navigate to={projectPath(projects[0].id)} replace />;
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('projects.title')}</h1>
        <div className="flex gap-3 items-center">
          <Link className="underline" to="/projects/catalog">{t('admin.mte_catalog')}</Link>
          <Button onClick={() => setCreating(true)}>{t('projects.new_project')}</Button>
        </div>
      </div>
      {projects.length ? (
        <ul className="divide-y divide-separator rounded-lg border border-separator">
          {projects.map(project => (
            <li key={project.id}>
              <Link className="block px-4 py-3 transition-colors hover:bg-hover-surface" to={projectPath(project.id)}>
                <h2 className="font-semibold text-lg">{project.name}</h2>
                <p className="text-sm text-nasa-gray-300">
                  {t('projects.study_count', { count: studies.filter(study => study.projectId === project.id).length })}
                </p>
                {project.description && <p className="mt-1 text-sm text-nasa-gray-300">{project.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      ) : <Card><p>{t('projects.no_projects')}</p></Card>}
      {creating && <Modal isOpen onClose={() => setCreating(false)} title={t('projects.new_project')}>
        <ProjectForm onCancel={() => setCreating(false)} onSave={values => {
          addProject(values, 'local-admin');
          setCreating(false);
        }} />
      </Modal>}
    </div>
  );
}

function ProjectOverview({ project }: { project: Project }) {
  const { t } = useTranslation();
  const { updateProject } = useData();
  const [editing, setEditing] = useState(false);
  const path = projectPath(project.id);
  return (
    <div className="space-y-5">
      <Breadcrumbs project={project} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h1>
        <Button variant="secondary" onClick={() => setEditing(true)}>{t('projects.edit_project')}</Button>
      </div>
      {project.description && <p>{project.description}</p>}
      <nav className="flex flex-wrap gap-x-2 border-b border-separator">
        <NavLink end className={tabClass} to={path}>{t('projects.studies')}</NavLink>
        <Link className="rounded-md px-3 py-2 hover:bg-nasa-gray-700" to="/projects/catalog">{t('admin.mte_catalog')}</Link>
        <NavLink className={tabClass} to={`${path}/evaluators`}>{t('admin.manage_evaluators')}</NavLink>
        <NavLink className={tabClass} to={`${path}/results`}>{t('projects.results')}</NavLink>
      </nav>
      <Routes>
        <Route index element={<ManageStudies projectId={project.id} />} />
        <Route path="evaluators" element={<ManageEvaluators projectId={project.id} />} />
        <Route path="results" element={<ViewStats projectId={project.id} />} />
      </Routes>
      {editing && <Modal isOpen onClose={() => setEditing(false)} title={t('projects.edit_project')}>
        <ProjectForm project={project} onCancel={() => setEditing(false)} onSave={values => {
          updateProject({ ...project, ...values });
          setEditing(false);
        }} />
      </Modal>}
    </div>
  );
}

function ScenarioForm({ study, scenario, onClose }: { study: Study; scenario?: Scenario; onClose: () => void }) {
  const { t } = useTranslation();
  const { mtes, ratings, saveScenario } = useData();
  const [name, setName] = useState(scenario?.name ?? '');
  const [ids, setIds] = useState(scenario?.mteIds ?? []);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const used = new Set(scenario ? ratings.filter(rating => rating.scenarioId === scenario.id).map(rating => rating.mteId) : []);

  const allowedIds = new Set([...study.mteIds, ...(scenario?.mteIds ?? [])]);
  const tasksById = new Map(mtes.map(task => [task.id, task]));
  const availableTasks = mtes.filter(task => allowedIds.has(task.id));
  function moveTask(index: number, offset: number) {
    setIds(current => {
      const ordered = [...current];
      [ordered[index], ordered[index + offset]] = [ordered[index + offset], ordered[index]];
      return ordered;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !name.trim()) return;
    setSaving(true);
    setError(false);
    try {
      await saveScenario({ id: scenario?.id, name: name.trim(), studyId: study.id, mteIds: ids });
      onClose();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={t(scenario ? 'projects.edit_scenario' : 'projects.new_scenario')}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block space-y-1">
          <span>{t('projects.scenario_name')}</span>
          <input className={inputClass} value={name} required onChange={e => setName(e.target.value)} />
        </label>
        <input type="search" aria-label={t('projects.search_tasks')} value={search}
          placeholder={t('projects.search_tasks')} className={inputClass} onChange={e => setSearch(e.target.value)} />
        <fieldset className="max-h-64 overflow-y-auto space-y-2">
          <legend className="sr-only">{t('admin.mte_catalog')}</legend>
          {availableTasks.filter(task => `${task.refNumber} ${task.name}`.toLowerCase().includes(search.trim().toLowerCase()))
            .map(task => (
              <label className="flex gap-3 items-center rounded-md bg-nasa-gray-900 p-2" key={task.id}>
                <input type="checkbox" checked={ids.includes(task.id)} disabled={used.has(task.id)}
                  onChange={e => setIds(e.target.checked ? [...ids, task.id] : ids.filter(id => id !== task.id))} />
                <span>{task.refNumber && `[${task.refNumber}] `}{task.name}</span>
              </label>
            ))}
        </fieldset>
        {!availableTasks.length && <Link className="underline" to={`${studyPath(study)}/settings`}>{t('projects.prepare_tasks')}</Link>}
        {ids.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">{t('projects.scenario_order')}</h3>
            <ol className="list-decimal pl-6 space-y-2">
              {ids.map((id, index) => (
                <li key={id} className="pl-1">
                  <span>{tasksById.get(id)?.name ?? id}</span>
                  <span className="ml-2 inline-flex gap-1">
                    <Button type="button" size="sm" variant="secondary" disabled={index === 0}
                      onClick={() => moveTask(index, -1)}>{t('projects.move_up')}</Button>
                    <Button type="button" size="sm" variant="secondary" disabled={index === ids.length - 1}
                      onClick={() => moveTask(index, 1)}>{t('projects.move_down')}</Button>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {error && <p role="alert" className="text-danger-ink">{t('evaluator.error_submitting')}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>{t('evaluator.cancel')}</Button>
          <Button type="submit" disabled={saving || !name.trim()}>{t(saving ? 'evaluator.submitting' : 'evaluator.save_changes')}</Button>
        </div>
      </form>
    </Card>
  );
}

function Scenarios({ study }: { study: Study }) {
  const { t } = useTranslation();
  const { scenarios = [], archiveScenario } = useData();
  const [editor, setEditor] = useState<{ scenario?: Scenario } | null>(null);
  const [error, setError] = useState(false);
  const entries = scenarios.filter(scenario => scenario.studyId === study.id);
  if (editor) return <ScenarioForm study={study} scenario={editor.scenario} onClose={() => setEditor(null)} />;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
        <h2 className="text-xl font-bold">{t('projects.scenarios')}</h2>
        <Button onClick={() => setEditor({})}>{t('projects.new_scenario')}</Button>
      </div>
      {error && <p role="alert" className="text-danger-ink">{t('evaluator.error_submitting')}</p>}
      {entries.length ? (
        <ul className="space-y-3">
          {entries.map(scenario => (
            <li key={scenario.id} className="rounded-md bg-nasa-gray-900 p-3 flex flex-wrap justify-between items-center gap-3">
              <div>
                <Link className="font-semibold underline" to={`${studyPath(study)}/scenarios/${encodeURIComponent(scenario.id)}`}>{scenario.name}</Link>
                <p className="text-sm text-nasa-gray-300">
                  {t('projects.task_count', { count: scenario.mteIds.length })}
                  {scenario.archived && ` · ${t('projects.archived')}`}
                </p>
              </div>
              <div className="flex gap-2">
                {!scenario.archived && <Button size="sm" variant="secondary" onClick={() => setEditor({ scenario })}>
                  {t('projects.edit_scenario')}
                </Button>}
                <Button size="sm" variant="secondary" onClick={() => {
                  setError(false);
                  void archiveScenario(scenario.id, !scenario.archived).catch(() => setError(true));
                }}>{t(scenario.archived ? 'projects.restore_scenario' : 'projects.archive_scenario')}</Button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p>{t('projects.no_scenarios')}</p>}
    </Card>
  );
}

function StudyTasks({ study, evaluatorId }: { study: Study; evaluatorId: string }) {
  const { t } = useTranslation();
  const { scenarios = [] } = useData();
  const { scenarioId } = useParams();
  const scenario = scenarioId ? scenarios.find(entry => entry.id === scenarioId && entry.studyId === study.id) : undefined;

  if (scenarioId && !scenario) return <Card><p>{t('projects.not_found')}</p></Card>;
  return <AssessmentRunner key={`${scenario?.id ?? ''}/${evaluatorId}`} study={study} scenario={scenario} evaluatorId={evaluatorId} />;
}

function StudyOverview({ project, study }: { project: Project; study: Study }) {
  const { t } = useTranslation();
  const { evaluators, scenarios = [] } = useData();
  const activeScenarios = scenarios.filter(scenario => scenario.studyId === study.id && !scenario.archived);
  const [pickedEvaluator, setPickedEvaluator] = useState('');
  const available = evaluators.filter(evaluator => study.evaluatorIds.includes(evaluator.id));
  const evaluatorId = available.find(evaluator => evaluator.id === pickedEvaluator)?.id ??
    (available.length === 1 ? available[0].id : '');
  const path = studyPath(study);
  const assessment = (
    <div className="space-y-4">
      {available.length === 1 ? (
        <dl className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <dt className="text-nasa-gray-300">{t('evaluator.evaluator_label')}</dt>
          <dd className="font-medium">{available[0].name}</dd>
        </dl>
      ) : available.length > 1 ? (
        <div className="max-w-xs"><Select id="study-evaluator" label={t('evaluator.evaluator_label')} value={evaluatorId}
          onChange={e => setPickedEvaluator(e.target.value)}>
          <option value="">{t('evaluator.choose_evaluator')}</option>
          {available.map(evaluator => <option key={evaluator.id} value={evaluator.id}>{evaluator.name}</option>)}
        </Select></div>
      ) : <Link className="underline" to={`${path}/settings`}>{t('projects.assign_evaluators')}</Link>}
      <StudyTasks study={study} evaluatorId={evaluatorId} />
    </div>
  );
  return (
    <div className="space-y-5">
      <Breadcrumbs project={project} study={study} />
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{study.name}</h1>
      <nav className="flex flex-wrap gap-x-2 border-b border-separator">
        <NavLink end className={tabClass} to={path}>{t('projects.study_tasks')}</NavLink>
        <NavLink className={tabClass} to={`${path}/scenarios`}>{t('projects.scenarios')}</NavLink>
        <NavLink className={tabClass} to={`${path}/results`}>{t('projects.results')}</NavLink>
        <NavLink className={tabClass} to={`${path}/settings`}>{t('projects.study_settings')}</NavLink>
      </nav>
      <Routes>
        <Route path="results" element={<ViewStats projectId={project.id} studyId={study.id} />} />
        <Route path="settings" element={<ManageStudies projectId={project.id} studyId={study.id} />} />
        <Route path="scenarios" element={<Scenarios study={study} />} />
        <Route index element={(
          <div className="space-y-4">
            {activeScenarios.length > 0 && (
              <section className="flex flex-wrap items-center gap-2 border-b border-separator pb-3">
                <h2 className="mr-2 text-sm font-medium text-nasa-gray-300">{t('projects.scenarios')}</h2>
                  {activeScenarios.map(scenario => (
                    <Link key={scenario.id} className="rounded border border-separator px-2.5 py-1.5 text-sm text-accent-ink hover:bg-hover-surface"
                      to={`${path}/scenarios/${encodeURIComponent(scenario.id)}`}>
                      {scenario.name} · {t('projects.task_count', { count: scenario.mteIds.length })}
                    </Link>
                  ))}
              </section>
            )}
            {assessment}
          </div>
        )} />
        <Route path="scenarios/:scenarioId" element={assessment} />
        <Route path="*" element={<Card><p>{t('projects.not_found')}</p></Card>} />
      </Routes>
    </div>
  );
}

function ProjectRoute() {
  const { t } = useTranslation();
  const { projects, studies } = useData();
  const { projectId, studyId } = useParams();
  const project = projects.find(entry => entry.id === projectId);
  const study = studies.find(entry => entry.projectId === projectId && entry.id === studyId);
  if (!project || (studyId && !study)) return (
    <Card><p className="mb-3">{t('projects.not_found')}</p><Link className="underline" to="/projects">{t('projects.title')}</Link></Card>
  );
  return study ? <StudyOverview key={study.id} project={project} study={study} /> : <ProjectOverview key={project.id} project={project} />;
}

export default function ProjectsPage() {
  return (
    <Routes>
      <Route index element={<ProjectList />} />
      <Route path="catalog" element={<div className="space-y-5"><Breadcrumbs /><ManageMTEs /></div>} />
      <Route path=":projectId/studies/:studyId/*" element={<ProjectRoute />} />
      <Route path=":projectId/*" element={<ProjectRoute />} />
    </Routes>
  );
}
