import { useApi } from './useApi';
import { IDataSource, Evaluator, Study, MTE, Rating, PairwiseComparison, Project } from '../types';

export const useApiData = (): Partial<IDataSource> => {
  const { data: evaluators } = useApi<Evaluator[]>('evaluators');
  const { data: studies } = useApi<Study[]>('studies');
  const { data: mtes } = useApi<MTE[]>('mtes');
  const { data: ratings } = useApi<Rating[]>('ratings');
  const { data: pairwiseComparisons } = useApi<PairwiseComparison[]>('pairwiseComparisons');
  const { data: projects } = useApi<Project[]>('projects');

  return {
    evaluators,
    studies,
    mtes,
    ratings,
    pairwiseComparisons,
    projects,
  };
};
