import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/AppContext';
import type { Condition, Passage, Rating, Study } from '../types';
import { orderedPassages } from '../data/workspace';
import { downloadCsv } from '../data/csv';
import { TLX_DIMENSIONS_INFO } from '../constants';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import RowAction from '../components/ui/RowAction';
import Select from '../components/ui/Select';
import { AssessmentRunner } from './EvaluatorPage';
import { studyPath } from './projectPaths';

const field = 'block w-full rounded-md border border-separator bg-nasa-gray-900 px-2.5 py-2 text-sm';
const panel = 'rounded-lg border border-separator bg-nasa-gray-800';

function conditionLabel(condition?: Condition) {
  return condition ? [condition.name, condition.version].filter(Boolean).join(' · ') : '—';
}

export function rawScore(rating: Rating) {
  return TLX_DIMENSIONS_INFO.reduce((sum, dimension) => sum + rating.scores[dimension.id], 0) / TLX_DIMENSIONS_INFO.length;
}

function PassageEditor({ study, repeat, onClose }: { study: Study; repeat?: Passage; onClose: () => void }) {
  const { t } = useTranslation();
  const { conditions = [], scenarios = [], evaluators, addPassage } = useData();
  const pilots = evaluators.filter(entry => study.evaluatorIds.includes(entry.id));
  const scripts = scenarios.filter(entry => entry.studyId === study.id && !entry.archived && entry.mteIds.length);
  const options = conditions.filter(entry => entry.studyId === study.id);
  const [evaluatorId, setEvaluator] = useState(repeat?.evaluatorId ?? (pilots.length === 1 ? pilots[0].id : ''));
  const [scenarioId, setScenario] = useState(repeat?.scenarioId ?? (scripts.length === 1 ? scripts[0].id : ''));
  const [conditionId, setCondition] = useState(repeat?.conditionId ?? (options.length === 1 ? options[0].id : ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    try {
      await addPassage({ studyId: study.id, evaluatorId, conditionId, scenarioId }, repeat?.id);
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return <Modal isOpen title={t(repeat ? 'passages.repeat' : 'passages.add')} onClose={() => { if (!busy) onClose(); }}>
    <form className="space-y-4" onSubmit={submit}>
      {repeat ? <p className="text-sm">{pilots.find(pilot => pilot.id === evaluatorId)?.name} · {scenarios.find(entry => entry.id === scenarioId)?.name}</p> : <>
        <Select id="passage-evaluator" label={t('passages.pilot')} required value={evaluatorId} onChange={e => setEvaluator(e.target.value)}>
          <option value="">{t('evaluator.choose_evaluator')}</option>
          {pilots.map(pilot => <option key={pilot.id} value={pilot.id}>{pilot.name}</option>)}
        </Select>
        <Select id="passage-scenario" label={t('projects.scenario')} required value={scenarioId} onChange={e => setScenario(e.target.value)}>
          <option value="">{t('passages.choose')}</option>
          {scripts.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </Select>
      </>}
      <Select id="passage-condition" label={t('passages.condition')} required value={conditionId} onChange={e => setCondition(e.target.value)}>
        <option value="">{t('passages.choose')}</option>
        {options.map(entry => <option key={entry.id} value={entry.id}>{conditionLabel(entry)}</option>)}
      </Select>
      {error && <p role="alert" className="text-danger-ink">{t('evaluator.error_submitting')}</p>}
      <Button type="submit" disabled={busy || !scenarioId || !conditionId || !evaluatorId}>{t('common.save')}</Button>
    </form>
  </Modal>;
}

function ConditionEditor({ study, onClose }: { study: Study; onClose: () => void }) {
  const { t } = useTranslation();
  const { addCondition } = useData();
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    try {
      await addCondition({ studyId: study.id, name, version });
      onClose();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return <Modal isOpen title={t('passages.add_condition')} onClose={() => { if (!busy) onClose(); }}>
    <form className="space-y-4" onSubmit={submit}>
      <label className="block space-y-1 text-sm"><span>{t('passages.condition')}</span>
        <input className={field} required autoFocus value={name} onChange={e => setName(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm"><span>{t('passages.version_optional')}</span>
        <input className={field} value={version} onChange={e => setVersion(e.target.value)} />
      </label>
      {error && <p role="alert" className="text-danger-ink">{t('passages.condition_error')}</p>}
      <Button type="submit" disabled={busy || !name.trim()}>{t('common.save')}</Button>
    </form>
  </Modal>;
}

export default function StudyPassages({ study }: { study: Study }) {
  const { t } = useTranslation();
  const { conditions = [], passages = [], scenarios = [], evaluators, ratings, mtes, startPassage, movePassage, deletePassage } = useData();
  const navigate = useNavigate();
  const path = studyPath(study);
  const queue = orderedPassages(passages, study.id);
  const options = conditions.filter(entry => entry.studyId === study.id);
  const studyRatings = ratings.filter(rating => rating.passageId && rating.studyId === study.id);
  const next = queue.find(pass => pass.completedAt === undefined);
  const canAdd = options.length > 0 && study.evaluatorIds.length > 0 &&
    scenarios.some(entry => entry.studyId === study.id && !entry.archived && entry.mteIds.length);
  const [editing, setEditing] = useState<'passage' | 'condition' | null>(null);
  const [repeat, setRepeat] = useState<Passage>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function act(action: () => Promise<void>) {
    setBusy(true);
    setError(false);
    try { await action(); } catch { setError(true); } finally { setBusy(false); }
  }

  function open(pass: Passage) {
    void act(async () => {
      if (pass.startedAt === undefined) await startPassage(pass.id);
      navigate(path + '/passages/' + encodeURIComponent(pass.id));
    });
  }

  function exportPassages() {
    const headers = [t('passages.id'), t('passages.pilot'), t('passages.condition'), t('passages.version'), t('projects.scenario'),
      t('stats.csv_headers.mte_ref'), t('stats.csv_headers.mte_name'), t('stats.csv_headers.timestamp'),
      ...TLX_DIMENSIONS_INFO.map(({ id }) => t(`tlx_dimensions.${id.toLowerCase().replaceAll(' ', '_')}.title`)),
      t('evaluator.total_score'), t('evaluator.comments')];
    const rows = queue.flatMap(pass => pass.mteIds.flatMap(id => {
      const rating = studyRatings.find(entry => entry.passageId === pass.id && entry.mteId === id);
      if (!rating) return [];
      const condition = options.find(entry => entry.id === pass.conditionId);
      const task = mtes.find(entry => entry.id === id);
      return [[pass.id, evaluators.find(entry => entry.id === pass.evaluatorId)?.name ?? pass.evaluatorId,
        condition?.name ?? '', condition?.version ?? '', scenarios.find(entry => entry.id === pass.scenarioId)?.name ?? '',
        task?.refNumber ?? '', task?.name ?? id, new Date(rating.timestamp).toISOString(),
        ...TLX_DIMENSIONS_INFO.map(({ id: dimension }) => rating.scores[dimension]),
        rawScore(rating).toFixed(2), rating.comments ?? '']];
    }));
    downloadCsv('catlx-passages.csv', [headers, ...rows]);
  }

  return <section className="space-y-3">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">{t('passages.title')}</h2>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setEditing('condition')}>{t('passages.add_condition')}</Button>
        <Button size="sm" disabled={!canAdd} onClick={() => { setRepeat(undefined); setEditing('passage'); }}>{t('passages.add')}</Button>
      </div>
    </header>
    {!canAdd && <p className="text-sm text-nasa-gray-300">{t('passages.prerequisites')}</p>}
    {options.length > 0 && <p className="text-xs text-nasa-gray-300">{t('passages.conditions')} · {options.map(conditionLabel).join(' / ')}</p>}
    {error && <p role="alert" className="text-sm text-danger-ink">{t('passages.action_error')}</p>}
    {queue.length > 0 ? <ol className={`${panel} divide-y divide-separator`}>
      {queue.map((pass, index) => {
        const scenario = scenarios.find(entry => entry.id === pass.scenarioId);
        const total = pass.mteIds.length || scenario?.mteIds.length || 0;
        const completed = studyRatings.filter(entry => entry.passageId === pass.id).length;
        const status = pass.completedAt !== undefined ? 'done' : pass.startedAt !== undefined ? 'running' : 'planned';
        return <li key={pass.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <span aria-hidden="true" className="w-6 text-xs tabular-nums text-nasa-gray-400">{index + 1}</span>
          <div className="min-w-0 flex-1 basis-40">
            <p className="break-words font-medium">{evaluators.find(entry => entry.id === pass.evaluatorId)?.name} · {conditionLabel(options.find(entry => entry.id === pass.conditionId))}</p>
            <p className="text-xs text-nasa-gray-300">
              {scenario?.name} · {t(`passages.${status}`)} · {t('projects.progress', { completed, total })}
              {next?.id === pass.id && ` · ${t('passages.next')}`}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <Button size="sm" variant={next?.id === pass.id ? 'primary' : 'secondary'} disabled={busy} onClick={() => open(pass)}>
              {t(status === 'done' ? 'passages.open' : status === 'running' ? 'passages.resume' : 'passages.start')}
            </Button>
            <RowAction icon="up" label={t('projects.move_up')} disabled={busy || index === 0} onClick={() => void act(() => movePassage(pass.id, -1))} />
            <RowAction icon="down" label={t('projects.move_down')} disabled={busy || index === queue.length - 1} onClick={() => void act(() => movePassage(pass.id, 1))} />
            {status === 'planned' && <RowAction icon="delete" label={t('common.delete')} disabled={busy} onClick={() => void act(() => deletePassage(pass.id))} />}
            {status === 'done' && <Button variant="secondary" size="sm" disabled={busy} onClick={() => { setRepeat(pass); setEditing('passage'); }}>{t('passages.repeat')}</Button>}
          </div>
        </li>;
      })}
    </ol> : <p className={`${panel} p-3 text-sm text-nasa-gray-300`}>{t('passages.empty')}</p>}
    {studyRatings.length > 0 && <Button variant="secondary" size="sm" onClick={exportPassages}>{t('passages.export')}</Button>}
    {editing === 'passage' && <PassageEditor study={study} repeat={repeat} onClose={() => setEditing(null)} />}
    {editing === 'condition' && <ConditionEditor study={study} onClose={() => setEditing(null)} />}
  </section>;
}

export function PassageAssessment({ study }: { study: Study }) {
  const { t } = useTranslation();
  const { passageId } = useParams();
  const { passages = [], scenarios = [], conditions = [], evaluators } = useData();
  const pass = passages.find(entry => entry.id === passageId && entry.studyId === study.id);
  const scenario = scenarios.find(entry => entry.id === pass?.scenarioId && entry.studyId === study.id);
  const condition = conditions.find(entry => entry.id === pass?.conditionId && entry.studyId === study.id);
  const pilot = evaluators.find(entry => entry.id === pass?.evaluatorId);
  if (!pass || !scenario || !condition || !pilot || pass.startedAt === undefined) {
    return <p className="text-sm">{t('projects.not_found')}</p>;
  }
  const label = `${pilot.name} · ${conditionLabel(condition)}`;
  return <div className="space-y-3">
    <Link to={studyPath(study) + '/passages'} className="text-sm text-accent-ink underline">{t('passages.back')}</Link>
    <div>
      <h2 className="font-semibold">{label}</h2>
      <p className="text-sm text-nasa-gray-300">{scenario.name} · {t('evaluator.unweighted')}</p>
    </div>
    <AssessmentRunner key={pass.id} study={study} scenario={{ ...scenario, mteIds: pass.mteIds, archived: false }}
      evaluatorId={pilot.id} passageId={pass.id} passageLabel={label} />
  </div>;
}

export function PassageComparison({ study }: { study: Study }) {
  const { t, i18n } = useTranslation();
  const { conditions = [], passages = [], scenarios = [], evaluators, mtes, ratings } = useData();
  const scripts = scenarios.filter(entry => entry.studyId === study.id && passages.some(pass => pass.scenarioId === entry.id));
  const options = conditions.filter(entry => entry.studyId === study.id);
  const [scenarioId, setScenario] = useState('');
  const [conditionA, setA] = useState('');
  const [conditionB, setB] = useState('');
  const [mteId, setTask] = useState('');
  const [choices, setChoices] = useState<Record<string, string>>({});
  const scriptPasses = passages.filter(entry => entry.studyId === study.id && entry.scenarioId === scenarioId);
  const tasks = mtes.filter(task => scriptPasses.some(pass => pass.mteIds.includes(task.id)));
  const fmt = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'short', timeStyle: 'short' });

  return <section className="space-y-3">
    <h2 className="text-lg font-semibold">{t('passages.compare')}</h2>
    <p className="text-sm text-nasa-gray-300">{t('passages.reference_hint')}</p>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <Select id="compare-scenario" label={t('projects.scenario')} value={scenarioId} onChange={e => { setScenario(e.target.value); setTask(''); setChoices({}); }}>
        <option value="">{t('passages.choose')}</option>
        {scripts.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
      </Select>
      <Select id="compare-a" label={t('passages.condition_a')} value={conditionA} onChange={e => { setA(e.target.value); setChoices({}); }}>
        <option value="">{t('passages.choose')}</option>
        {options.filter(entry => entry.id !== conditionB).map(entry => <option key={entry.id} value={entry.id}>{conditionLabel(entry)}</option>)}
      </Select>
      <Select id="compare-b" label={t('passages.condition_b')} value={conditionB} onChange={e => { setB(e.target.value); setChoices({}); }}>
        <option value="">{t('passages.choose')}</option>
        {options.filter(entry => entry.id !== conditionA).map(entry => <option key={entry.id} value={entry.id}>{conditionLabel(entry)}</option>)}
      </Select>
      <Select id="compare-mte" label="MTE" value={mteId} onChange={e => setTask(e.target.value)}>
        <option value="">{t('passages.choose')}</option>
        {tasks.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
      </Select>
    </div>
    {scenarioId && conditionA && conditionB && mteId && (
      <div className={`${panel} overflow-x-auto`}>
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead><tr className="border-b border-separator">
            {[t('passages.pilot'), t('passages.condition_a'), t('passages.condition_b'), 'B − A'].map(label => <th className="px-3 py-2" key={label}>{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-separator">
            {evaluators.filter(entry => study.evaluatorIds.includes(entry.id)).map(pilot => {
              const sides = [conditionA, conditionB].map((conditionId, side) => {
                const key = `${pilot.id}/${side}`;
                const completed = scriptPasses.filter(entry => entry.evaluatorId === pilot.id && entry.conditionId === conditionId && entry.completedAt !== undefined)
                  .sort((a, b) => a.completedAt! - b.completedAt! || a.id.localeCompare(b.id));
                const pass = completed.find(entry => entry.id === choices[key]) ?? completed[0];
                const rating = pass && ratings.find(entry => entry.passageId === pass.id && entry.mteId === mteId);
                return { key, completed, pass, rating };
              });
              const [a, b] = sides;
              const incompatible = a.pass && b.pass && JSON.stringify(a.pass.mteIds) !== JSON.stringify(b.pass.mteIds);
              const delta = a.rating && b.rating && !incompatible ? rawScore(b.rating) - rawScore(a.rating) : undefined;
              return <tr className="align-top" key={pilot.id}>
                <th scope="row" className="px-3 py-2">{pilot.name}</th>
                {sides.map(({ key, completed, pass, rating }, side) => <td key={key} className="space-y-1 px-3 py-2">
                  {completed.length > 1 && <select className={field} value={pass?.id} aria-label={`${pilot.name} · ${side === 0 ? 'A' : 'B'}`}
                    onChange={e => setChoices(previous => ({ ...previous, [key]: e.target.value }))}>
                    {completed.map((entry, index) => <option key={entry.id} value={entry.id}>
                      {t('passages.attempt', { number: index + 1 })} · {date.format(entry.completedAt)}
                    </option>)}
                  </select>}
                  <p>{rating ? fmt.format(rawScore(rating)) : '—'}</p>
                  {rating?.comments && <p className="whitespace-pre-wrap text-xs text-nasa-gray-300">{rating.comments}</p>}
                </td>)}
                <td className="px-3 py-2">{delta !== undefined ? fmt.format(delta) : t(incompatible ? 'passages.incompatible' : 'passages.incomplete')}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>;
}
