import { useCallback, useEffect, useState } from 'react';
import {
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Query,
  type WriteBatch,
} from 'firebase/firestore';
import { initializeFirebase } from '../src/firebase/config';
import type { AppUser } from '../src/auth/types';
import { Evaluator, IDataSource, MTE, PairwiseComparison, Project, Rating, Study } from '../types';
import {
  evaluatorFromDocument,
  mteFromDocument,
  pairwiseFromDocument,
  projectFromDocument,
  ratingFromDocument,
  studyFromDocument,
} from '../src/firestore/converters';

export interface FirestoreDataState {
  loading: boolean;
  error: string | null;
}

export type FirestoreDataSource = IDataSource & FirestoreDataState;

type FirestoreDocument = { id: string; data: DocumentData };
type StudySubcollection = 'participants' | 'mtes' | 'ratings' | 'pairwise';

const newId = (): string => crypto.randomUUID();
const errorMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'Firestore operation failed';

const mapDocuments = <T>(documents: FirestoreDocument[], mapper: (id: string, data: DocumentData) => T): T[] =>
  documents.map(({ id, data }) => mapper(id, data));

const uniqueDocuments = (documents: FirestoreDocument[], includeStudyPath = false): FirestoreDocument[] => {
  const byId = new Map<string, FirestoreDocument>();
  documents.forEach((document) => {
    const studyPath = includeStudyPath && typeof document.data.studyId === 'string'
      ? `${document.data.studyId}/`
      : '';
    byId.set(`${studyPath}${document.id}`, document);
  });
  return [...byId.values()];
};

const readQuery = async (source: Query<DocumentData>): Promise<FirestoreDocument[]> => {
  const snapshot = await getDocs(source);
  return snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
};

const appendAuditEvent = (
  db: Firestore,
  batch: WriteBatch,
  user: AppUser | null,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
  studyId?: string,
): void => {
  if (!user) throw new Error('An authenticated Firebase user is required');
  batch.set(doc(db, 'auditEvents', newId()), {
    actorUid: user.uid,
    action,
    entityType,
    entityId,
    ...(studyId ? { studyId } : {}),
    timestamp: Date.now(),
    summary,
  });
};

const readDocument = async (source: DocumentReference<DocumentData>): Promise<FirestoreDocument | null> => {
  const snapshot = await getDoc(source);
  return snapshot.exists() ? { id: snapshot.id, data: snapshot.data() } : null;
};

const readSubcollection = async (
  db: Firestore,
  studyId: string,
  subcollection: StudySubcollection,
  user: AppUser,
): Promise<FirestoreDocument[]> => {
  const source = collection(db, 'studies', studyId, subcollection);
  const documents = subcollection === 'ratings' && user.role === 'evaluator'
    ? await readQuery(query(source, where('evaluatorUid', '==', user.uid)))
    : subcollection === 'pairwise' && user.role === 'evaluator'
      ? await readQuery(query(source, where('evaluatorUid', '==', user.uid)))
      : await readQuery(source);
  return documents.map((document) => subcollection === 'participants' || subcollection === 'mtes' || subcollection === 'ratings' || subcollection === 'pairwise'
    ? { ...document, data: { ...document.data, studyId } }
    : document);
};

const useFirestoreData = (user: AppUser | null): FirestoreDataSource => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [mtes, setMtes] = useState<MTE[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [pairwiseComparisons, setPairwiseComparisons] = useState<PairwiseComparison[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    try {
      const result = await operation();
      setError(null);
      return result;
    } catch (operationError) {
      const message = errorMessage(operationError);
      setError(message);
      throw operationError;
    }
  }, []);

  const reload = useCallback(async () => {
    if (!user || user.status !== 'active' || user.role === 'pending' || user.role === 'disabled') {
      setProjects([]);
      setEvaluators([]);
      setStudies([]);
      setMtes([]);
      setRatings([]);
      setPairwiseComparisons([]);
      return;
    }

    setLoading(true);
    try {
      const { db } = initializeFirebase();
      const isAdmin = user.role === 'admin';

      const projectDocuments = isAdmin
        ? await readQuery(collection(db, 'projects'))
        : user.role === 'study_manager'
          ? uniqueDocuments([
            ...await readQuery(query(collection(db, 'projects'), where('ownerUid', '==', user.uid))),
            ...await readQuery(query(collection(db, 'projects'), where('memberUids', 'array-contains', user.uid))),
          ])
          : [];

      const evaluatorStudyIds = user.role === 'evaluator'
        ? (await getDocs(query(
          collectionGroup(db, 'participants'),
          where('uid', '==', user.uid),
          where('role', '==', 'evaluator'),
          where('active', '==', true),
        ))).docs
          .map((item) => item.ref.parent.parent?.id)
          .filter((id): id is string => Boolean(id))
        : [];

      const studyDocuments = isAdmin
        ? await readQuery(collection(db, 'studies'))
        : user.role === 'study_manager'
          ? uniqueDocuments([
            ...await readQuery(query(collection(db, 'studies'), where('managerUids', 'array-contains', user.uid))),
            ...(await Promise.all(projectDocuments.map((project) =>
              readQuery(query(collection(db, 'studies'), where('projectId', '==', project.id)))))).flat(),
          ])
          : user.role === 'analyst'
            ? await readQuery(query(collection(db, 'studies'), where('analystUids', 'array-contains', user.uid)))
            : user.role === 'evaluator'
              ? (await Promise.all(evaluatorStudyIds.map((studyId) => readDocument(doc(db, 'studies', studyId))))).filter((item): item is FirestoreDocument => item !== null)
              : [];

      const evaluatorDocuments = isAdmin || user.role === 'study_manager'
        ? await readQuery(collection(db, 'evaluators'))
        : [];

      const catalogDocuments = isAdmin || user.role === 'catalog_manager'
        ? await readQuery(collection(db, 'mteCatalog'))
        : user.role === 'study_manager'
          ? await readQuery(query(collection(db, 'mteCatalog'), where('active', '==', true)))
          : [];

      const rawStudyList = mapDocuments(studyDocuments, studyFromDocument);
      const participantDocuments = (isAdmin || user.role === 'study_manager')
        ? uniqueDocuments((await Promise.all(rawStudyList.map((study) =>
          readSubcollection(db, study.id, 'participants', user)))).flat(), true)
        : [];
      const studyListWithParticipants = rawStudyList.map((study) => {
        if (!isAdmin && user.role !== 'study_manager') return study;
        const assignedEvaluatorIds = participantDocuments
          .filter(({ data }) => data.studyId === study.id && data.active === true)
          .map(({ id, data }) => typeof data.uid === 'string' ? data.uid : id);
        return { ...study, evaluatorIds: assignedEvaluatorIds };
      });
      const snapshotDocuments = (isAdmin || user.role === 'evaluator' || user.role === 'study_manager' || user.role === 'analyst')
        ? uniqueDocuments((await Promise.all(studyListWithParticipants.map(async (study) => {
          const documents = await readSubcollection(db, study.id, 'mtes', user);
          return documents;
        }))).flat(), true)
        : [];
      const snapshotStudyIds = new Map<string, string[]>();
      snapshotDocuments.forEach(({ id, data }) => {
        const studyId = typeof data.studyId === 'string' ? data.studyId : '';
        if (!studyId) return;
        const current = snapshotStudyIds.get(studyId) || [];
        snapshotStudyIds.set(studyId, current.includes(id) ? current : [...current, id]);
      });
      const studyList = studyListWithParticipants.map((study) => ({
        ...study,
        mteIds: snapshotStudyIds.get(study.id) || [],
      }));
      const snapshotMteDocuments = uniqueDocuments(snapshotDocuments);

      const ratingsDocuments = uniqueDocuments((await Promise.all(studyList.map((study) =>
        readSubcollection(db, study.id, 'ratings', user)))).flat(), true);
      const pairwiseDocuments = uniqueDocuments((await Promise.all(studyList.map((study) =>
        readSubcollection(db, study.id, 'pairwise', user)))).flat(), true);

      setProjects(mapDocuments(projectDocuments, projectFromDocument));
      setStudies(studyList);
      setEvaluators(user.role === 'evaluator'
        ? [{ id: user.uid, name: user.displayName || user.email, quality: '', company: '' }]
        : mapDocuments(evaluatorDocuments, evaluatorFromDocument));
      setMtes([
        ...mapDocuments(catalogDocuments.filter(({ data }) => data.active !== false), mteFromDocument),
        ...mapDocuments(snapshotMteDocuments, mteFromDocument).filter((snapshot) =>
          !catalogDocuments.some((catalog) => catalog.data.active !== false && catalog.id === snapshot.id)),
      ]);
      setRatings(ratingsDocuments.map(({ id, data }) => {
        const studyId = studyList.find((study) =>
          data.studyId === study.id || data.study_id === study.id)?.id || String(data.studyId || '');
        return ratingFromDocument(id, studyId, data);
      }));
      setPairwiseComparisons(pairwiseDocuments.map(({ data }) => {
        const studyId = studyList.find((study) =>
          data.studyId === study.id || data.study_id === study.id)?.id || String(data.studyId || '');
        return pairwiseFromDocument(studyId, data);
      }));
    } catch (loadError) {
      setError(errorMessage(loadError));
      setProjects([]);
      setEvaluators([]);
      setStudies([]);
      setMtes([]);
      setRatings([]);
      setPairwiseComparisons([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addProject = async (project: Omit<Project, 'id' | 'ownerId' | 'memberIds'>, ownerId: string): Promise<void> => {
    const id = newId();
    const memberIds = [ownerId];
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.set(doc(db, 'projects', id), {
        ...project, ownerUid: ownerId, memberUids: memberIds, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      appendAuditEvent(db, batch, user, 'create', 'project', id, 'Project created');
      await batch.commit();
      setProjects((current) => [...current, { ...project, id, ownerId, memberIds }]);
    });
  };

  const updateProject = async (project: Project): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.update(doc(db, 'projects', project.id), {
        name: project.name, description: project.description, ownerUid: project.ownerId,
        memberUids: project.memberIds, updatedAt: serverTimestamp(),
      });
      appendAuditEvent(db, batch, user, 'update', 'project', project.id, 'Project updated');
      await batch.commit();
      setProjects((current) => current.map((item) => item.id === project.id ? project : item));
    });
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.delete(doc(db, 'projects', projectId));
      appendAuditEvent(db, batch, user, 'delete', 'project', projectId, 'Project deleted');
      await batch.commit();
      setProjects((current) => current.filter((item) => item.id !== projectId));
    });
  };

  const addMemberToProject = async (projectId: string, evaluatorId: string): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.update(doc(db, 'projects', projectId), {
        memberUids: arrayUnion(evaluatorId), updatedAt: serverTimestamp(),
      });
      appendAuditEvent(db, batch, user, 'add-member', 'project', projectId, 'Project member added');
      await batch.commit();
      setProjects((current) => current.map((project) => project.id === projectId && !project.memberIds.includes(evaluatorId)
        ? { ...project, memberIds: [...project.memberIds, evaluatorId] } : project));
    });
  };

  const removeMemberFromProject = async (projectId: string, evaluatorId: string): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.update(doc(db, 'projects', projectId), {
        memberUids: arrayRemove(evaluatorId), updatedAt: serverTimestamp(),
      });
      appendAuditEvent(db, batch, user, 'remove-member', 'project', projectId, 'Project member removed');
      await batch.commit();
      setProjects((current) => current.map((project) => project.id === projectId
        ? { ...project, memberIds: project.memberIds.filter((id) => id !== evaluatorId) } : project));
    });
  };

  const addEvaluator = async (evaluator: Omit<Evaluator, 'id'>): Promise<Evaluator> => {
    const created = { ...evaluator, id: newId() };
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.set(doc(db, 'evaluators', created.id), {
        ...evaluator, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      appendAuditEvent(db, batch, user, 'create', 'evaluator', created.id, 'Evaluator created');
      await batch.commit();
      setEvaluators((current) => [...current, created]);
    });
    return created;
  };

  const updateEvaluator = async (evaluator: Evaluator): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.update(doc(db, 'evaluators', evaluator.id), {
        name: evaluator.name, quality: evaluator.quality, company: evaluator.company, updatedAt: serverTimestamp(),
      });
      appendAuditEvent(db, batch, user, 'update', 'evaluator', evaluator.id, 'Evaluator updated');
      await batch.commit();
      setEvaluators((current) => current.map((item) => item.id === evaluator.id ? evaluator : item));
    });
  };

  const deleteEvaluator = async (evaluatorId: string): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.delete(doc(db, 'evaluators', evaluatorId));
      appendAuditEvent(db, batch, user, 'delete', 'evaluator', evaluatorId, 'Evaluator deleted');
      await batch.commit();
      setEvaluators((current) => current.filter((item) => item.id !== evaluatorId));
    });
  };

  const addStudy = async (study: Omit<Study, 'id' | 'mteIds' | 'evaluatorIds'>): Promise<void> => {
    const id = newId();
    const managerUids = user && (user.role === 'admin' || user.role === 'study_manager') ? [user.uid] : [];
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.set(doc(db, 'studies', id), {
        ...study, managerUids, analystUids: [], evaluatorUids: [], mteIds: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      appendAuditEvent(db, batch, user, 'create', 'study', id, 'Study created');
      await batch.commit();
      setStudies((current) => [...current, { ...study, id, mteIds: [], evaluatorIds: [] }]);
    });
  };

  const updateStudy = async (study: Study): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.update(doc(db, 'studies', study.id), {
        name: study.name, description: study.description, date: study.date, projectId: study.projectId,
        updatedAt: serverTimestamp(),
      });
      appendAuditEvent(db, batch, user, 'update', 'study', study.id, 'Study updated');
      await batch.commit();
      setStudies((current) => current.map((item) => item.id === study.id ? study : item));
    });
  };

  const deleteStudy = async (studyId: string): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.delete(doc(db, 'studies', studyId));
      appendAuditEvent(db, batch, user, 'delete', 'study', studyId, 'Study deleted');
      await batch.commit();
      setStudies((current) => current.filter((item) => item.id !== studyId));
    });
  };

  const addMte = async (mte: Omit<MTE, 'id' | 'refNumber'> & { refNumber?: string }): Promise<MTE> => {
    const created = { ...mte, id: newId(), refNumber: mte.refNumber || '' };
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.set(doc(db, 'mteCatalog', created.id), {
        ...created, revision: 1, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      appendAuditEvent(db, batch, user, 'create', 'mte', created.id, 'MTE created');
      await batch.commit();
      setMtes((current) => [...current, created]);
    });
    return created;
  };

  const updateMte = async (mte: MTE): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const reference = doc(db, 'mteCatalog', mte.id);
      const snapshot = await getDoc(reference);
      const revision = Number(snapshot.data()?.revision || 0) + 1;
      const batch = writeBatch(db);
      batch.update(reference, { ...mte, revision, active: true, updatedAt: serverTimestamp() });
      appendAuditEvent(db, batch, user, 'update', 'mte', mte.id, 'MTE updated');
      await batch.commit();
      setMtes((current) => current.map((item) => item.id === mte.id ? mte : item));
    });
  };

  const deleteMte = async (mteId: string): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const reference = doc(db, 'mteCatalog', mteId);
      const snapshot = await getDoc(reference);
      const revision = Number(snapshot.data()?.revision || 0) + 1;
      const batch = writeBatch(db);
      batch.update(reference, { active: false, revision, updatedAt: serverTimestamp() });
      appendAuditEvent(db, batch, user, 'archive', 'mte', mteId, 'MTE archived');
      await batch.commit();
      setMtes((current) => current.filter((item) => item.id !== mteId));
    });
  };

  const addMTEToStudy = async (studyId: string, mteId: string): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const source = await getDoc(doc(db, 'mteCatalog', mteId));
      const sourceData = source.data();
      if (!source.exists() || !sourceData) throw new Error('MTE not found in catalogue');
      const batch = writeBatch(db);
      batch.set(doc(db, 'studies', studyId, 'mtes', mteId), {
        sourceMteId: mteId, sourceRevision: sourceData.revision || 1, refNumber: sourceData.refNumber || '',
        name: sourceData.name, description: sourceData.description,
      });
      appendAuditEvent(db, batch, user, 'assign-mte', 'study', studyId, 'MTE assigned to study', studyId);
      await batch.commit();
      setStudies((current) => current.map((study) => study.id === studyId && !study.mteIds.includes(mteId)
        ? { ...study, mteIds: [...study.mteIds, mteId] } : study));
    });
  };

  const removeMTEFromStudy = async (studyId: string, mteId: string): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.delete(doc(db, 'studies', studyId, 'mtes', mteId));
      appendAuditEvent(db, batch, user, 'unassign-mte', 'study', studyId, 'MTE removed from study', studyId);
      await batch.commit();
      setStudies((current) => current.map((study) => study.id === studyId
        ? { ...study, mteIds: study.mteIds.filter((id) => id !== mteId) } : study));
    });
  };

  const addEvaluatorToStudy = async (studyId: string, evaluatorId: string): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.set(doc(db, 'studies', studyId, 'participants', evaluatorId), {
        uid: evaluatorId, role: 'evaluator', active: true, assignedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'studies', studyId), {
        updatedAt: serverTimestamp(),
      });
      appendAuditEvent(db, batch, user, 'assign-evaluator', 'study', studyId, 'Evaluator assigned to study', studyId);
      await batch.commit();
      setStudies((current) => current.map((study) => study.id === studyId && !study.evaluatorIds.includes(evaluatorId)
        ? { ...study, evaluatorIds: [...study.evaluatorIds, evaluatorId] } : study));
    });
  };

  const removeEvaluatorFromStudy = async (studyId: string, evaluatorId: string): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.delete(doc(db, 'studies', studyId, 'participants', evaluatorId));
      batch.update(doc(db, 'studies', studyId), {
        updatedAt: serverTimestamp(),
      });
      appendAuditEvent(db, batch, user, 'unassign-evaluator', 'study', studyId, 'Evaluator removed from study', studyId);
      await batch.commit();
      setStudies((current) => current.map((study) => study.id === studyId
        ? { ...study, evaluatorIds: study.evaluatorIds.filter((id) => id !== evaluatorId) } : study));
    });
  };

  const addRating = async (rating: Omit<Rating, 'id' | 'timestamp'>): Promise<void> => {
    await run(async () => {
      const id = `${rating.evaluatorId}_${rating.mteId}`;
      const timestamp = Date.now();
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.set(doc(db, 'studies', rating.studyId, 'ratings', id), {
        evaluatorUid: rating.evaluatorId, mteId: rating.mteId, scores: rating.scores,
        comments: rating.comments || '', submittedAt: timestamp,
      });
      appendAuditEvent(db, batch, user, 'submit-rating', 'rating', id, 'Rating submitted', rating.studyId);
      await batch.commit();
      setRatings((current) => current.some((item) => item.id === id && item.studyId === rating.studyId)
        ? current.map((item) => item.id === id && item.studyId === rating.studyId ? { ...rating, id, timestamp } : item)
        : [...current, { ...rating, id, timestamp }]);
    });
  };

  const addPairwiseComparison = async (comparison: PairwiseComparison): Promise<void> => {
    await run(async () => {
      const db = initializeFirebase().db;
      const batch = writeBatch(db);
      batch.set(doc(db, 'studies', comparison.studyId, 'pairwise', comparison.evaluatorId), {
        evaluatorUid: comparison.evaluatorId, weights: comparison.weights, isWeighted: comparison.isWeighted,
        submittedAt: Date.now(),
      });
      appendAuditEvent(db, batch, user, 'submit-pairwise', 'pairwise', comparison.evaluatorId, 'Pairwise comparison submitted', comparison.studyId);
      await batch.commit();
      setPairwiseComparisons((current) => {
        const existing = current.some((item) => item.evaluatorId === comparison.evaluatorId && item.studyId === comparison.studyId);
        return existing
          ? current.map((item) => item.evaluatorId === comparison.evaluatorId && item.studyId === comparison.studyId ? comparison : item)
          : [...current, comparison];
      });
    });
  };

  return {
    projects,
    evaluators,
    studies,
    mtes,
    ratings,
    pairwiseComparisons,
    loading,
    error,
    addProject,
    updateProject,
    deleteProject,
    addMemberToProject,
    removeMemberFromProject,
    addEvaluator,
    updateEvaluator,
    deleteEvaluator,
    addStudy,
    updateStudy,
    deleteStudy,
    addMte,
    updateMte,
    deleteMte,
    addMTEToStudy,
    removeMTEFromStudy,
    addEvaluatorToStudy,
    removeEvaluatorFromStudy,
    addRating,
    addPairwiseComparison,
    hasPreviousRatingInStudy: (evaluatorId: string, studyId: string): boolean =>
      ratings.some((rating) => rating.evaluatorId === evaluatorId && rating.studyId === studyId),
  };
};

export default useFirestoreData;
