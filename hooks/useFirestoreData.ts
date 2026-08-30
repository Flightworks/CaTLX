import { useCallback, useEffect, useState } from 'react';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
  type Query,
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
  timestampToMillis,
} from '../src/firestore/converters';

export interface FirestoreDataState {
  loading: boolean;
  error: string | null;
}

export type FirestoreDataSource = IDataSource & FirestoreDataState;

type FirestoreDocument = { id: string; data: DocumentData };

const newId = (): string => crypto.randomUUID();
const errorMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'Firestore operation failed';

const mapDocuments = <T>(documents: FirestoreDocument[], mapper: (id: string, data: DocumentData) => T): T[] =>
  documents.map(({ id, data }) => mapper(id, data));

const uniqueDocuments = (documents: FirestoreDocument[]): FirestoreDocument[] => {
  const byId = new Map<string, FirestoreDocument>();
  documents.forEach((document) => byId.set(document.id, document));
  return [...byId.values()];
};

const readQuery = async (source: Query<DocumentData>): Promise<FirestoreDocument[]> => {
  const snapshot = await getDocs(source);
  return snapshot.docs.map((item) => ({ id: item.id, data: item.data() }));
};

const readSubcollection = async (
  db: Firestore,
  studyId: string,
  subcollection: 'mtes' | 'ratings' | 'pairwise',
  user: AppUser,
): Promise<FirestoreDocument[]> => {
  const source = collection(db, 'studies', studyId, subcollection);
  if (subcollection === 'ratings' && user.role === 'evaluator') {
    return readQuery(query(source, where('evaluatorUid', '==', user.uid)));
  }
  if (subcollection === 'pairwise' && user.role === 'evaluator') {
    return readQuery(query(source, where('evaluatorUid', '==', user.uid)));
  }
  return readQuery(source);
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
      const canReadCatalog = isAdmin || user.role === 'catalog_manager';

      const projectDocuments = isAdmin
        ? await readQuery(collection(db, 'projects'))
        : user.role === 'study_manager'
          ? uniqueDocuments([
            ...await readQuery(query(collection(db, 'projects'), where('ownerUid', '==', user.uid))),
            ...await readQuery(query(collection(db, 'projects'), where('memberUids', 'array-contains', user.uid))),
          ])
          : [];

      const studyDocuments = isAdmin
        ? await readQuery(collection(db, 'studies'))
        : user.role === 'study_manager'
          ? await readQuery(query(collection(db, 'studies'), where('managerUids', 'array-contains', user.uid)))
          : user.role === 'analyst'
            ? await readQuery(query(collection(db, 'studies'), where('analystUids', 'array-contains', user.uid)))
            : user.role === 'evaluator'
              ? await readQuery(query(collection(db, 'studies'), where('evaluatorUids', 'array-contains', user.uid)))
              : [];

      const evaluatorDocuments = isAdmin
        ? await readQuery(collection(db, 'evaluators'))
        : [];

      const catalogDocuments = canReadCatalog
        ? await readQuery(collection(db, 'mteCatalog'))
        : [];

      const studyList = mapDocuments(studyDocuments, studyFromDocument);
      const snapshotDocuments = (user.role === 'evaluator' || user.role === 'study_manager')
        ? uniqueDocuments((await Promise.all(studyList.map(async (study) => {
          const documents = await readSubcollection(db, study.id, 'mtes', user);
          return documents;
        }))).flat())
        : [];

      const ratingsDocuments = uniqueDocuments((await Promise.all(studyList.map((study) =>
        readSubcollection(db, study.id, 'ratings', user)))).flat());
      const pairwiseDocuments = uniqueDocuments((await Promise.all(studyList.map((study) =>
        readSubcollection(db, study.id, 'pairwise', user)))).flat());

      setProjects(mapDocuments(projectDocuments, projectFromDocument));
      setStudies(studyList);
      setEvaluators(user.role === 'evaluator'
        ? [{ id: user.uid, name: user.displayName || user.email, quality: '', company: '' }]
        : mapDocuments(evaluatorDocuments, evaluatorFromDocument));
      setMtes([
        ...mapDocuments(catalogDocuments.filter(({ data }) => data.active !== false), mteFromDocument),
        ...mapDocuments(snapshotDocuments, mteFromDocument).filter((snapshot) =>
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
      await setDoc(doc(initializeFirebase().db, 'projects', id), {
        ...project, ownerUid: ownerId, memberUids: memberIds, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setProjects((current) => [...current, { ...project, id, ownerId, memberIds }]);
    });
  };

  const updateProject = async (project: Project): Promise<void> => {
    await run(async () => {
      await updateDoc(doc(initializeFirebase().db, 'projects', project.id), {
        name: project.name, description: project.description, ownerUid: project.ownerId,
        memberUids: project.memberIds, updatedAt: serverTimestamp(),
      });
      setProjects((current) => current.map((item) => item.id === project.id ? project : item));
    });
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    await run(async () => {
      await deleteDoc(doc(initializeFirebase().db, 'projects', projectId));
      setProjects((current) => current.filter((item) => item.id !== projectId));
    });
  };

  const addMemberToProject = async (projectId: string, evaluatorId: string): Promise<void> => {
    await run(async () => {
      await updateDoc(doc(initializeFirebase().db, 'projects', projectId), {
        memberUids: arrayUnion(evaluatorId), updatedAt: serverTimestamp(),
      });
      setProjects((current) => current.map((project) => project.id === projectId && !project.memberIds.includes(evaluatorId)
        ? { ...project, memberIds: [...project.memberIds, evaluatorId] } : project));
    });
  };

  const removeMemberFromProject = async (projectId: string, evaluatorId: string): Promise<void> => {
    await run(async () => {
      await updateDoc(doc(initializeFirebase().db, 'projects', projectId), {
        memberUids: arrayRemove(evaluatorId), updatedAt: serverTimestamp(),
      });
      setProjects((current) => current.map((project) => project.id === projectId
        ? { ...project, memberIds: project.memberIds.filter((id) => id !== evaluatorId) } : project));
    });
  };

  const addEvaluator = (evaluator: Omit<Evaluator, 'id'>): Evaluator => {
    const created = { ...evaluator, id: newId() };
    void run(async () => {
      await setDoc(doc(initializeFirebase().db, 'evaluators', created.id), {
        ...evaluator, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setEvaluators((current) => [...current, created]);
    });
    return created;
  };

  const updateEvaluator = async (evaluator: Evaluator): Promise<void> => {
    await run(async () => {
      await updateDoc(doc(initializeFirebase().db, 'evaluators', evaluator.id), {
        name: evaluator.name, quality: evaluator.quality, company: evaluator.company, updatedAt: serverTimestamp(),
      });
      setEvaluators((current) => current.map((item) => item.id === evaluator.id ? evaluator : item));
    });
  };

  const deleteEvaluator = async (evaluatorId: string): Promise<void> => {
    await run(async () => {
      await deleteDoc(doc(initializeFirebase().db, 'evaluators', evaluatorId));
      setEvaluators((current) => current.filter((item) => item.id !== evaluatorId));
    });
  };

  const addStudy = async (study: Omit<Study, 'id' | 'mteIds' | 'evaluatorIds'>): Promise<void> => {
    const id = newId();
    const managerUids = user && (user.role === 'admin' || user.role === 'study_manager') ? [user.uid] : [];
    await run(async () => {
      await setDoc(doc(initializeFirebase().db, 'studies', id), {
        ...study, managerUids, analystUids: [], evaluatorUids: [], mteIds: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setStudies((current) => [...current, { ...study, id, mteIds: [], evaluatorIds: [] }]);
    });
  };

  const updateStudy = async (study: Study): Promise<void> => {
    await run(async () => {
      await updateDoc(doc(initializeFirebase().db, 'studies', study.id), {
        name: study.name, description: study.description, date: study.date, projectId: study.projectId,
        mteIds: study.mteIds, evaluatorIds: study.evaluatorIds, evaluatorUids: study.evaluatorIds, updatedAt: serverTimestamp(),
      });
      setStudies((current) => current.map((item) => item.id === study.id ? study : item));
    });
  };

  const deleteStudy = async (studyId: string): Promise<void> => {
    await run(async () => {
      await deleteDoc(doc(initializeFirebase().db, 'studies', studyId));
      setStudies((current) => current.filter((item) => item.id !== studyId));
    });
  };

  const addMte = (mte: Omit<MTE, 'id' | 'refNumber'> & { refNumber?: string }): MTE => {
    const created = { ...mte, id: newId(), refNumber: mte.refNumber || '' };
    void run(async () => {
      await setDoc(doc(initializeFirebase().db, 'mteCatalog', created.id), {
        ...created, revision: 1, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setMtes((current) => [...current, created]);
    });
    return created;
  };

  const updateMte = async (mte: MTE): Promise<void> => {
    await run(async () => {
      const reference = doc(initializeFirebase().db, 'mteCatalog', mte.id);
      const snapshot = await getDoc(reference);
      const revision = Number(snapshot.data()?.revision || 0) + 1;
      await updateDoc(reference, { ...mte, revision, active: true, updatedAt: serverTimestamp() });
      setMtes((current) => current.map((item) => item.id === mte.id ? mte : item));
    });
  };

  const deleteMte = async (mteId: string): Promise<void> => {
    await run(async () => {
      await updateDoc(doc(initializeFirebase().db, 'mteCatalog', mteId), { active: false, updatedAt: serverTimestamp() });
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
      batch.update(doc(db, 'studies', studyId), { mteIds: arrayUnion(mteId), updatedAt: serverTimestamp() });
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
      batch.update(doc(db, 'studies', studyId), { mteIds: arrayRemove(mteId), updatedAt: serverTimestamp() });
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
        role: 'evaluator', active: true, assignedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'studies', studyId), {
        evaluatorIds: arrayUnion(evaluatorId), evaluatorUids: arrayUnion(evaluatorId), updatedAt: serverTimestamp(),
      });
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
        evaluatorIds: arrayRemove(evaluatorId), evaluatorUids: arrayRemove(evaluatorId), updatedAt: serverTimestamp(),
      });
      await batch.commit();
      setStudies((current) => current.map((study) => study.id === studyId
        ? { ...study, evaluatorIds: study.evaluatorIds.filter((id) => id !== evaluatorId) } : study));
    });
  };

  const addRating = async (rating: Omit<Rating, 'id' | 'timestamp'>): Promise<void> => {
    await run(async () => {
      const id = `${rating.evaluatorId}_${rating.mteId}`;
      const timestamp = Date.now();
      await setDoc(doc(initializeFirebase().db, 'studies', rating.studyId, 'ratings', id), {
        evaluatorUid: rating.evaluatorId, mteId: rating.mteId, scores: rating.scores,
        comments: rating.comments || '', submittedAt: timestamp,
      });
      setRatings((current) => [...current, { ...rating, id, timestamp }]);
    });
  };

  const addPairwiseComparison = async (comparison: PairwiseComparison): Promise<void> => {
    await run(async () => {
      await setDoc(doc(initializeFirebase().db, 'studies', comparison.studyId, 'pairwise', comparison.evaluatorId), {
        evaluatorUid: comparison.evaluatorId, weights: comparison.weights, isWeighted: comparison.isWeighted,
        submittedAt: Date.now(),
      });
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
