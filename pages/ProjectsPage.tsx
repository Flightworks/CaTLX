import { useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useMatch, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/AppContext';
import { indexMtePaths } from '../data/mte';
import type { Project, Scenario, Study } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import RowAction from '../components/ui/RowAction';
import { ProjectForm } from './AdminDashboardPage';
import { AssessmentRunner } from './EvaluatorPage';
import ManageStudies from './admin/ManageStudies';
import ManageMTEs from './admin/ManageMTEs';
import ManageEvaluators from './admin/ManageEvaluators';
import ViewStats from './admin/ViewStats';
import StudyPassages, { PassageAssessment, PassageComparison } from './StudyPassages';
import { projectPath, scenarioPath, studyPath } from './projectPaths';

const inputClass = 'w-full rounded-md bg-nasa-gray-900 border border-nasa-gray-600 p-2 text-foreground';
const tabClass = ({ isActive }: { isActive: boolean }) => isActive
  ? 'border-b-2 border-indigo-300 px-2.5 py-2 text-sm font-semibold text-foreground'
  : 'border-b-2 border-transparent px-2.5 py-2 text-sm text-nasa-gray-300 hover:text-foreground';

function Breadcrumbs({ project, study }: { project?: Project; study?: Study }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('projects.path')} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-nasa-gray-300">
      <Link className="hover:underline" to="/projects?all=1">{t('projects.title')}</Link>
      {project && (
        <>
          <span aria-hidden="true" className="text-nasa-gray-400">›</span>
          <Link className="break-words hover:underline" to={projectPath(project.id)}>{project.name}</Link>
        </>
      )}
      {study && (
        <>
          <span aria-hidden="true" className="text-nasa-gray-400">›</span>
          <Link className="break-words hover:underline" to={studyPath(study)}>{study.name}</Link>
        </>
      )}
    </nav>
  );
}

function ActiveProjectHeader({ project, action }: { project: Project; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-separator pb-2 sm:pb-4">
      <div className="min-w-0 space-y-1">
        <Breadcrumbs />
        <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h1>
      </div>
      {action}
    </header>
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
        <Button onClick={() => setCreating(true)}>{t('projects.new_project')}</Button>
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
      <ActiveProjectHeader project={project}
        action={<Button variant="secondary" onClick={() => setEditing(true)}>{t('projects.edit_project')}</Button>} />
      {project.description && <p>{project.description}</p>}
      <nav className="flex flex-wrap gap-x-2 border-b border-separator md:hidden">
        <NavLink end className={tabClass} to={path}>{t('projects.studies')}</NavLink>
        <NavLink className={tabClass} to={`${path}/catalog`}>{t('admin.mte_catalog')}</NavLink>
        <NavLink className={tabClass} to={`${path}/evaluators`}>{t('header.evaluators')}</NavLink>
        <NavLink className={tabClass} to={`${path}/scenarios`}>{t('projects.scenarios_by_study')}</NavLink>
        <NavLink className={tabClass} to={`${path}/results`}>{t('projects.results')}</NavLink>
      </nav>
      <Routes>
        <Route index element={<ManageStudies projectId={project.id} />} />
        <Route path="catalog" element={<ManageMTEs projectId={project.id} />} />
        <Route path="evaluators" element={<ManageEvaluators projectId={project.id} />} />
        <Route path="scenarios" element={<ProjectScenarios projectId={project.id} />} />
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

type ScenarioDraft = { studyId?: string; scenario?: Scenario };

function ScenarioForm({ studies, draft, onClose }: { studies: Study[]; draft: ScenarioDraft; onClose: () => void }) {
  const { t } = useTranslation();
  const { mtes, ratings, saveScenario } = useData();
  const { scenario } = draft;
  const [studyId, setStudyId] = useState(draft.studyId ?? (studies.length === 1 ? studies[0].id : ''));
  const [name, setName] = useState(scenario?.name ?? '');
  const [ids, setIds] = useState(scenario?.mteIds ?? []);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const study = studies.find(entry => entry.id === studyId);
  const used = new Set(scenario ? ratings.filter(rating => !rating.passageId && rating.scenarioId === scenario.id).map(rating => rating.mteId) : []);
  const allowedIds = new Set([...(study?.mteIds ?? []), ...(scenario?.mteIds ?? [])]);
  const paths = indexMtePaths(mtes);
  const availableTasks = mtes.filter(task => allowedIds.has(task.id)).map(task => {
    const path = paths.get(task.id) ?? [task];
    return { ...task, path: path.map(entry => entry.name).join(' › '), refs: path.map(entry => entry.refNumber).join(' ') };
  }).sort((a, b) => a.path.localeCompare(b.path));
  const tasksById = new Map(availableTasks.map(task => [task.id, task]));
  const query = search.trim().toLocaleLowerCase();
  const visibleTasks = availableTasks.filter(task => `${task.refs} ${task.path}`.toLocaleLowerCase().includes(query));

  function changeStudy(id: string) {
    setStudyId(id);
    setIds([]);
    setSearch('');
    setError(false);
  }

  function moveTask(index: number, offset: number) {
    setIds(current => {
      const ordered = [...current];
      [ordered[index], ordered[index + offset]] = [ordered[index + offset], ordered[index]];
      return ordered;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !study || !name.trim()) return;
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
    <Modal isOpen size="2xl" title={t(scenario ? 'projects.edit_scenario' : 'projects.new_scenario')}
      onClose={() => { if (!saving) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        {study && (scenario || studies.length === 1) && (
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="text-nasa-gray-400">{t('evaluator.study_label')}</span>
            <span className="font-medium">{study.name}</span>
          </p>
        )}
        {!scenario && studies.length > 1 && (
          <Select id="scenario-study" label={t('evaluator.study_label')} value={studyId} required autoFocus disabled={saving}
            onChange={event => changeStudy(event.target.value)}>
            <option value="">{t('evaluator.choose_study')}</option>
            {studies.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </Select>
        )}
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{t('projects.scenario_name')}</span>
          <input className={inputClass} value={name} required autoFocus={Boolean(scenario) || studies.length === 1}
            disabled={saving} onChange={event => setName(event.target.value)} />
        </label>
        {study && (availableTasks.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <fieldset className="min-w-0 rounded-lg border border-separator px-3 pb-2 pt-1.5" disabled={saving}>
              <legend className="px-1 text-sm font-semibold">{t('projects.study_tasks')}</legend>
              <input type="search" aria-label={t('projects.search_tasks')} value={search}
                placeholder={t('projects.search_tasks')} className={`${inputClass} text-sm`}
                onChange={event => setSearch(event.target.value)} />
              <div className="mt-1.5 max-h-48 divide-y divide-separator overflow-y-auto">
                {visibleTasks.map(task => (
                  <label className="flex items-center gap-2 py-2 text-sm" key={task.id}>
                    <input type="checkbox" checked={ids.includes(task.id)} disabled={used.has(task.id)}
                      onChange={event => setIds(event.target.checked ? [...ids, task.id] : ids.filter(id => id !== task.id))} />
                    <span className="min-w-0 break-words">{task.refNumber && `[${task.refNumber}] `}{task.path}</span>
                  </label>
                ))}
              </div>
              {visibleTasks.length === 0 && <p className="py-2 text-sm text-nasa-gray-400">{t('projects.no_matching_tasks')}</p>}
            </fieldset>
            <fieldset className="min-w-0 rounded-lg border border-separator px-3 pb-2 pt-1.5" disabled={saving}>
              <legend className="px-1 text-sm font-semibold">{t('projects.scenario_order')}</legend>
              {ids.length > 0 ? (
                <ol className="max-h-56 list-decimal divide-y divide-separator overflow-y-auto pl-5 text-sm">
                  {ids.map((id, index) => (
                    <li key={id}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="min-w-0 break-words">{tasksById.get(id)?.path ?? id}</span>
                        <div className="flex shrink-0">
                          <RowAction icon="up" label={t('projects.move_up')} disabled={index === 0} onClick={() => moveTask(index, -1)} />
                          <RowAction icon="down" label={t('projects.move_down')} disabled={index === ids.length - 1} onClick={() => moveTask(index, 1)} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <p className="py-2 text-sm text-nasa-gray-400">{t('projects.select_scenario_tasks')}</p>}
            </fieldset>
          </div>
        ) : <Link className="text-sm text-accent-ink underline" to={`${studyPath(study)}/settings`}>{t('projects.prepare_tasks')}</Link>)}
        {error && <p role="alert" className="text-sm text-danger-ink">{t('evaluator.error_submitting')}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-separator pt-3">
          <Button type="button" size="sm" variant="secondary" onClick={onClose} disabled={saving}>{t('evaluator.cancel')}</Button>
          <Button type="submit" size="sm" disabled={saving || !study || !name.trim()}>
            {t(saving ? 'evaluator.submitting' : scenario ? 'evaluator.save_changes' : 'projects.create_scenario')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectScenarios({ projectId }: { projectId: string }) {
  const { studies } = useData();
  const projectStudies = studies.filter(study => study.projectId === projectId).sort((a, b) => b.date - a.date);
  return <ScenarioDirectory studies={projectStudies} grouped />;
}

function ScenarioDirectory({ studies, grouped = false }: { studies: Study[]; grouped?: boolean }) {
  const { t } = useTranslation();
  const { scenarios = [], archiveScenario } = useData();
  const [draft, setDraft] = useState<ScenarioDraft | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState(false);

  async function toggleArchive(scenario: Scenario) {
    setArchiving(true);
    setError(false);
    try {
      await archiveScenario(scenario.id, !scenario.archived);
    } catch {
      setError(true);
    } finally {
      setArchiving(false);
    }
  }

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t(grouped ? 'projects.scenarios_by_study' : 'header.study_scenarios')}</h2>
          {grouped && <p className="text-sm text-nasa-gray-300">{t('projects.scenario_scope')}</p>}
        </div>
        {studies.length > 0 && <Button size="sm" onClick={() => setDraft({})}>{t('projects.new_scenario')}</Button>}
      </header>
      {error && <p role="alert" className="text-sm text-danger-ink">{t('evaluator.error_submitting')}</p>}
      {studies.length ? (
        <div data-workspace-surface className="divide-y divide-separator overflow-hidden rounded-xl bg-nasa-gray-800">
          {studies.map(study => {
            const entries = scenarios.filter(scenario => scenario.studyId === study.id);
            return (
              <section key={study.id}>
                {grouped && (
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 bg-nasa-gray-900/45 px-3 py-2 sm:px-4">
                    <span className="text-xs text-nasa-gray-400">{t('evaluator.study_label')}</span>
                    <h3 className="min-w-0 break-words text-sm font-semibold">
                      <Link className="hover:underline" to={studyPath(study)}>{study.name}</Link>
                    </h3>
                  </div>
                )}
                {entries.length ? (
                  <ul className={`divide-y divide-separator ${grouped ? 'border-t border-separator' : ''}`}>
                    {entries.map(scenario => (
                      <li key={scenario.id} className="flex min-w-0 items-center gap-1 px-2 py-1 transition-colors hover:bg-hover-surface/50 sm:px-3">
                        <Link className="group flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-ink"
                          to={scenarioPath(study, scenario.id)}>
                          {grouped && <span aria-hidden="true" className="size-2.5 shrink-0 rounded-bl border-b border-l border-nasa-gray-600" />}
                          <div className="min-w-0 flex-1">
                            <p className={`break-words text-sm font-medium group-hover:underline ${scenario.archived ? 'text-nasa-gray-300' : 'text-foreground'}`}>{scenario.name}</p>
                            <p className="text-xs text-nasa-gray-400">
                              {t('projects.task_count', { count: scenario.mteIds.length })}
                              {scenario.archived && ` · ${t('projects.archived')}`}
                            </p>
                          </div>
                        </Link>
                        <div className="flex shrink-0 gap-0.5">
                          {!scenario.archived && (
                            <RowAction icon="edit" label={t('projects.edit_scenario')} onClick={() => setDraft({ studyId: study.id, scenario })} />
                          )}
                          <RowAction icon={scenario.archived ? 'restore' : 'archive'}
                            label={t(scenario.archived ? 'projects.restore_scenario' : 'projects.archive_scenario')}
                            disabled={archiving} onClick={() => void toggleArchive(scenario)} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`px-4 py-2.5 text-sm text-nasa-gray-400 ${grouped ? 'border-t border-separator' : ''}`}>
                    {t('projects.no_scenarios')}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      ) : <p className="rounded-lg border border-separator px-4 py-3 text-sm text-nasa-gray-300">{t('study_settings.no_studies')}</p>}
      {draft && <ScenarioForm studies={studies} draft={draft} onClose={() => setDraft(null)} />}
    </section>
  );
}

function StudyOverview({ project, study }: { project: Project; study: Study }) {
  const { t } = useTranslation();
  const { evaluators, scenarios = [] } = useData();
  const activeScenarios = scenarios.filter(scenario => scenario.studyId === study.id && !scenario.archived);
  const scenarioMatch = useMatch('/projects/:projectId/studies/:studyId/scenarios/:scenarioId');
  const scenario = scenarios.find(entry => entry.studyId === study.id && entry.id === scenarioMatch?.params.scenarioId);
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
      <AssessmentRunner key={`${scenario?.id ?? ''}/${evaluatorId}`} study={study} scenario={scenario} evaluatorId={evaluatorId} />
    </div>
  );
  return (
    <div className="space-y-3 sm:space-y-4">
      <header className="space-y-1.5 border-b border-separator pb-2.5">
        <Breadcrumbs project={project} study={scenario ? study : undefined} />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${scenario
            ? 'border-indigo-400/30 bg-indigo-500/10 text-accent-ink'
            : 'border-separator bg-nasa-gray-800 text-nasa-gray-300'}`}>
            {t(scenario ? 'projects.scenario' : 'evaluator.study_label')}
          </span>
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{scenario?.name ?? study.name}</h1>
        </div>
      </header>
      <nav className="flex flex-wrap gap-x-2 border-b border-separator md:hidden">
        <NavLink end className={tabClass} to={path}>{t('projects.study_tasks')}</NavLink>
        <NavLink className={tabClass} to={`${path}/scenarios`}>{t('header.study_scenarios')}</NavLink>
        <NavLink className={tabClass} to={`${path}/results`}>{t('projects.results')}</NavLink>
        <NavLink className={tabClass} to={`${path}/passages`}>{t('passages.title')}</NavLink>
        <NavLink className={tabClass} to={`${path}/settings`}>{t('projects.study_settings')}</NavLink>
      </nav>
      <Routes>
        <Route path="results" element={<div className="space-y-3">
          <Link className="text-sm font-medium text-accent-ink underline" to={`${path}/results/compare`}>{t('passages.compare')}</Link>
          <ViewStats projectId={project.id} studyId={study.id} />
        </div>} />
        <Route path="results/compare" element={<PassageComparison study={study} />} />
        <Route path="passages" element={<StudyPassages study={study} />} />
        <Route path="passages/:passageId" element={<PassageAssessment study={study} />} />
        <Route path="settings" element={<ManageStudies projectId={project.id} studyId={study.id} />} />
        <Route path="scenarios" element={<ScenarioDirectory studies={[study]} />} />
        <Route index element={(
          <div className="space-y-4">
            {activeScenarios.length > 0 && (
              <section className="flex flex-wrap items-center gap-1.5 border-b border-separator pb-2">
                <h2 className="mr-1 text-xs font-semibold text-nasa-gray-300">{t('header.study_scenarios')}</h2>
                  {activeScenarios.map(scenario => (
                    <Link key={scenario.id} className="rounded-md border border-separator px-2 py-1 text-sm text-accent-ink hover:bg-hover-surface"
                      to={scenarioPath(study, scenario.id)}>
                      {scenario.name} · {t('projects.task_count', { count: scenario.mteIds.length })}
                    </Link>
                  ))}
              </section>
            )}
            {assessment}
          </div>
        )} />
        <Route path="scenarios/:scenarioId" element={scenario ? assessment : <Card><p>{t('projects.not_found')}</p></Card>} />
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
      <Route path="catalog" element={<Navigate to="/catalog" replace />} />
      <Route path=":projectId/studies/:studyId/*" element={<ProjectRoute />} />
      <Route path=":projectId/*" element={<ProjectRoute />} />
    </Routes>
  );
}
