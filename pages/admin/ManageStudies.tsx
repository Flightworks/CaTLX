import React, { useState, useMemo, useId } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useData, useSession } from '../../contexts/AppContext';
import { mtePath } from '../../data/mte';
import { Study, MTE, Evaluator } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import RowAction from '../../components/ui/RowAction';
import { studyPath } from '../projectPaths';


const ManageStudyMTEsModal: React.FC<{
  study: Study;
  onClose: () => void;
}> = ({ study, onClose }) => {
  const { t } = useTranslation();
  const { mtes, ratings, scenarios = [], addMTEToStudy, removeMTEFromStudy } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  const catalog = useMemo(() => {
    const byId = new Map(mtes.map(mte => [mte.id, mte]));
    return mtes.map(mte => {
      const path = mtePath(mte, byId);
      return { ...mte, path: path.map(entry => entry.name).join(' › '), refs: path.map(entry => entry.refNumber).join(' ') };
    }).sort((a, b) => a.path.localeCompare(b.path));
  }, [mtes]);
  const assignedIds = new Set(study.mteIds);
  const mtesInStudy = catalog.filter(mte => assignedIds.has(mte.id));
  const query = searchQuery.trim().toLocaleLowerCase();
  const availableMtes = catalog.filter(mte => !assignedIds.has(mte.id) && `${mte.refs} ${mte.path}`.toLocaleLowerCase().includes(query));

  return (
    <Modal isOpen={true} onClose={onClose} title={t('study_settings.manage_mtes_for', { study: study.name })} size="4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Available MTEs */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('study_settings.available_mtes')}</h3>
          <input
            type="search"
            placeholder={t('projects.search_tasks')}
            aria-label={t('projects.search_tasks')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-nasa-gray-900 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-foreground placeholder-nasa-gray-400 mb-3"
          />
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {availableMtes.map(mte => (
              <div key={mte.id} className="flex justify-between items-center gap-2 p-2 bg-nasa-gray-700 rounded">
                <div className="min-w-0 break-words">
                  <p className="text-sm font-medium text-foreground">{mte.path}</p>
                  {mte.refNumber && <p className="text-xs text-nasa-gray-400 font-mono">[{mte.refNumber}]</p>}
                </div>
                <Button size="sm" onClick={() => addMTEToStudy(study.id, mte.id)}>{t('study_settings.add')}</Button>
              </div>
            ))}
            {availableMtes.length === 0 && <p className="text-sm text-nasa-gray-500 text-center py-4">{t('projects.no_matching_tasks')}</p>}
          </div>
        </div>
        {/* MTEs in Study */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('study_settings.assigned_mtes', { count: mtesInStudy.length })}</h3>
           <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {mtesInStudy.map(mte => (
              <div key={mte.id} className="flex justify-between items-center gap-2 p-2 bg-nasa-gray-700 rounded">
                <div className="min-w-0 break-words">
                  <p className="text-sm font-medium text-foreground">{mte.path}</p>
                  {mte.refNumber && <p className="text-xs text-nasa-gray-400 font-mono">[{mte.refNumber}]</p>}
                </div>
                <Button size="sm" variant="secondary" disabled={ratings.some(rating => rating.studyId === study.id && rating.mteId === mte.id) ||
                    scenarios.some(scenario => scenario.studyId === study.id && scenario.mteIds.includes(mte.id))}
                  onClick={() => removeMTEFromStudy(study.id, mte.id)}>{t('study_settings.remove')}</Button>
              </div>
            ))}
            {mtesInStudy.length === 0 && <p className="text-sm text-nasa-gray-500 text-center py-4">{t('study_settings.no_mtes')}</p>}
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
  const { t } = useTranslation();
  const { evaluators, passages, addEvaluatorToStudy, removeEvaluatorFromStudy } = useData();

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
    <Modal isOpen={true} onClose={onClose} title={t('study_settings.manage_evaluators_for', { study: study.name })} size="4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('study_settings.available_evaluators')}</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {availableEvaluators.map(evaluator => (
              <div key={evaluator.id} className="flex justify-between items-center p-2 bg-nasa-gray-700 rounded">
                <p className="text-sm font-medium text-foreground">{evaluator.name}</p>
                <Button size="sm" onClick={() => addEvaluatorToStudy(study.id, evaluator.id)}>{t('study_settings.add')}</Button>
              </div>
            ))}
            {availableEvaluators.length === 0 && <p className="text-sm text-nasa-gray-500 text-center py-4">{t('study_settings.no_available_evaluators')}</p>}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('study_settings.assigned_evaluators', { count: evaluatorsInStudy.length })}</h3>
           <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {evaluatorsInStudy.map(evaluator => (
              <div key={evaluator.id} className="flex justify-between items-center p-2 bg-nasa-gray-700 rounded">
                <p className="text-sm font-medium text-foreground">{evaluator.name}</p>
                <Button size="sm" variant="secondary" disabled={passages?.some(pass => pass.studyId === study.id && pass.evaluatorId === evaluator.id)} onClick={() => removeEvaluatorFromStudy(study.id, evaluator.id)}>{t('study_settings.remove')}</Button>
              </div>
            ))}
            {evaluatorsInStudy.length === 0 && <p className="text-sm text-nasa-gray-500 text-center py-4">{t('study_settings.no_evaluators')}</p>}
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
  const { t } = useTranslation();
  const formId = useId();
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
        <label htmlFor={`${formId}-name`} className="block text-sm font-medium text-nasa-gray-300">{t('study_settings.name')}</label>
        <input id={`${formId}-name`} type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-foreground" />
      </div>
       <div>
        <label htmlFor={`${formId}-date`} className="block text-sm font-medium text-nasa-gray-300">{t('study_settings.date')}</label>
        <input id={`${formId}-date`} type="date" value={date} onChange={e => setDate(e.target.value)} required className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-foreground" />
      </div>
      <div>
        <label htmlFor={`${formId}-description`} className="block text-sm font-medium text-nasa-gray-300">{t('evaluator.optional_description')}</label>
        <textarea id={`${formId}-description`} value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 block w-full bg-nasa-gray-700 border-nasa-gray-600 rounded-md shadow-sm focus:ring-nasa-blue focus:border-nasa-blue text-foreground" />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="secondary" onClick={onCancel}>{t('evaluator.cancel')}</Button>
        <Button type="submit">{t('study_settings.save')}</Button>
      </div>
    </form>
  );
};


const ManageStudies: React.FC<{ projectId?: string; studyId?: string }> = ({ projectId, studyId }) => {
  const { t, i18n } = useTranslation();
  const { studies, mtes, ratings, evaluators, scenarios, passages, addStudy, updateStudy, deleteStudy } = useData();
  const session = useSession();
  const selectedProjectId = projectId ?? session.selectedProjectId;
  const showStudyList = Boolean(projectId && !studyId);
  const Panel = showStudyList ? 'section' : Card;
    
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [managingMtesForStudy, setManagingMtesForStudy] = useState<Study | null>(null);
  const [managingEvaluatorsForStudy, setManagingEvaluatorsForStudy] = useState<Study | null>(null);
  const [editingStudy, setEditingStudy] = useState<Study | null>(null);

  const studiesInProject = useMemo(() => {
    if (!selectedProjectId) return [];
    return studies
        .filter(s => s.projectId === selectedProjectId && (!studyId || s.id === studyId))
        .sort((a, b) => b.date - a.date);
  }, [studies, selectedProjectId, studyId]);

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
                <p>{t('study_settings.choose_project')}</p>
                <p className="text-sm text-nasa-gray-500">{t('projects.no_projects')}</p>
            </div>
        </Card>
      )
  }

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t(studyId ? 'projects.study_settings' : showStudyList ? 'projects.studies' : 'admin.manage_studies')}</h2>
        {!studyId && <Button size="sm" onClick={() => { setEditingStudy(null); setIsStudyModalOpen(true); }}>{t('projects.new_study')}</Button>}
      </div>
      <div className={showStudyList ? 'divide-y divide-separator overflow-hidden rounded-lg border border-separator bg-nasa-gray-800' : 'space-y-2'}>
        {studiesInProject.map((study) => {
          const studyMtes = study.mteIds.map(id => mtes.find(m => m.id === id)).filter((m): m is MTE => !!m);
          if (showStudyList) {
            const scenarioCount = (scenarios ?? []).filter(entry => entry.studyId === study.id && !entry.archived).length;
            return (
              <Link key={study.id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-hover-surface focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-ink sm:px-4"
                to={studyPath(study)}>
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-semibold sm:text-base">{study.name}</h3>
                  <p className="text-xs text-nasa-gray-300">
                    {t('projects.task_count', { count: studyMtes.length })}
                    {scenarioCount > 0 && ` · ${t('catalog.scenario_count', { count: scenarioCount })}`}
                  </p>
                </div>
                <span aria-hidden="true" className="text-xl leading-none text-nasa-gray-400">›</span>
              </Link>
            );
          }
          const studyEvaluators = study.evaluatorIds.map(id => evaluators.find(e => e.id === id)).filter((e): e is Evaluator => !!e);
          return (
            <div key={study.id} className="rounded-lg border border-separator px-3 py-3 sm:px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="break-words text-base font-semibold text-foreground">{study.name}</h3>
                  <p className="text-xs text-nasa-gray-400">{new Date(study.date).toLocaleDateString(i18n.resolvedLanguage)}</p>
                  {study.description && <p className="mt-1 break-words text-sm text-nasa-gray-300">{study.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <RowAction icon="edit" label={t('study_settings.edit')} onClick={() => { setEditingStudy(study); setIsStudyModalOpen(true); }} />
                  <RowAction icon="delete" label={t('study_settings.delete')} disabled={ratings.some(rating => rating.studyId === study.id) || passages?.some(pass => pass.studyId === study.id)}
                    onClick={() => deleteStudy(study.id)} />
                </div>
              </div>
              
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <section className="min-w-0 rounded-lg border border-separator p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold">{t('study_settings.assigned_mtes', { count: studyMtes.length })}</h4>
                    <Button size="sm" variant="secondary" onClick={() => setManagingMtesForStudy(study)}>
                      {t('study_settings.manage_mtes')}
                    </Button>
                  </div>
                  <ul className="divide-y divide-separator">
                    {studyMtes.map(mte => (
                      <li key={mte.id} className="break-words py-1.5 text-sm">
                        {mte.refNumber && `[${mte.refNumber}] `}{mte.name}
                      </li>
                    ))}
                    {studyMtes.length === 0 && <li className="text-sm text-nasa-gray-400">{t('study_settings.no_mtes')}</li>}
                  </ul>
                </section>
                <section className="min-w-0 rounded-lg border border-separator p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold">{t('study_settings.assigned_evaluators', { count: studyEvaluators.length })}</h4>
                    <Button size="sm" variant="secondary" onClick={() => setManagingEvaluatorsForStudy(study)}>
                      {t('admin.manage_evaluators')}
                    </Button>
                  </div>
                  <ul className="divide-y divide-separator">
                    {studyEvaluators.map(evaluator => (
                      <li key={evaluator.id} className="break-words py-1.5 text-sm">{evaluator.name}</li>
                    ))}
                    {studyEvaluators.length === 0 && <li className="text-sm text-nasa-gray-400">{t('study_settings.no_evaluators')}</li>}
                  </ul>
                </section>
              </div>
            </div>
          )
        })}
        {studiesInProject.length === 0 && (
            <div className="text-center py-10 text-nasa-gray-500">
                <h3 className="text-lg font-semibold">{t('study_settings.no_studies')}</h3>
            </div>
        )}
      </div>

      {/* Modals */}
      {isStudyModalOpen && (
         <Modal isOpen={true} onClose={() => setIsStudyModalOpen(false)} title={t(editingStudy ? 'study_settings.edit' : 'projects.new_study')}>
            <StudyForm study={editingStudy} projectId={selectedProjectId} onSave={handleSaveStudy} onCancel={() => setIsStudyModalOpen(false)} />
        </Modal>
      )}

      {managingMtesForStudy && (
        <ManageStudyMTEsModal 
            study={studies.find(s => s.id === managingMtesForStudy.id) ?? managingMtesForStudy}
            onClose={() => setManagingMtesForStudy(null)}
        />
      )}

      {managingEvaluatorsForStudy && (
        <ManageStudyEvaluatorsModal
            study={studies.find(s => s.id === managingEvaluatorsForStudy.id) ?? managingEvaluatorsForStudy}
            onClose={() => setManagingEvaluatorsForStudy(null)}
        />
      )}
    </Panel>
  );
};

export default ManageStudies;
