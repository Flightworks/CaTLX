
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import useMockData from './useMockData';
import { TLXDimension } from '../types';

describe('useMockData hook', () => {

  it('should initialize with default data', () => {
    const { result } = renderHook(() => useMockData());
    
    expect(result.current.evaluators.length).toBe(5);
    expect(result.current.studies.length).toBe(3);
    expect(result.current.mtes.length).toBe(8);
    expect(result.current.ratings.length).toBe(10);
    expect(result.current.pairwiseComparisons.length).toBe(6);
  });

  it('should add an evaluator', () => {
    const { result } = renderHook(() => useMockData());
    
    act(() => {
      result.current.addEvaluator({ name: 'Test Evaluator', email: 'test@nasa.gov' });
    });

    expect(result.current.evaluators.length).toBe(6);
    expect(result.current.evaluators[5].name).toBe('Test Evaluator');
  });

  it('should delete an evaluator', () => {
    const { result } = renderHook(() => useMockData());
    const initialEvaluators = result.current.evaluators;
    const evaluatorToDelete = initialEvaluators[0];

    act(() => {
      result.current.deleteEvaluator(evaluatorToDelete.id);
    });

    expect(result.current.evaluators.length).toBe(initialEvaluators.length - 1);
    expect(result.current.evaluators.find(e => e.id === evaluatorToDelete.id)).toBeUndefined();
  });

  it('should add a rating', () => {
    const { result } = renderHook(() => useMockData());

    act(() => {
      result.current.addRating({
        evaluatorId: 'eval1',
        studyId: 'study2',
        mteId: 'mte4',
        scores: {
          [TLXDimension.MENTAL_DEMAND]: 50,
          [TLXDimension.PHYSICAL_DEMAND]: 50,
          [TLXDimension.TEMPORAL_DEMAND]: 50,
          [TLXDimension.PERFORMANCE]: 50,
          [TLXDimension.EFFORT]: 50,
          [TLXDimension.FRUSTRATION]: 50,
        }
      });
    });

    expect(result.current.ratings.length).toBe(11);
    expect(result.current.ratings[10].evaluatorId).toBe('eval1');
    expect(result.current.ratings[10].studyId).toBe('study2');
  });
  
  it('should correctly report if an evaluator has a previous rating in a study', () => {
    const { result } = renderHook(() => useMockData());
    
    expect(result.current.hasPreviousRatingInStudy('eval1', 'study1')).toBe(true);
    expect(result.current.hasPreviousRatingInStudy('eval1', 'study2')).toBe(false);

    act(() => {
      result.current.addRating({
        evaluatorId: 'eval1',
        studyId: 'study2',
        mteId: 'mte4',
        scores: {
          [TLXDimension.MENTAL_DEMAND]: 50,
          [TLXDimension.PHYSICAL_DEMAND]: 50,
          [TLXDimension.TEMPORAL_DEMAND]: 50,
          [TLXDimension.PERFORMANCE]: 50,
          [TLXDimension.EFFORT]: 50,
          [TLXDimension.FRUSTRATION]: 50,
        }
      });
    });

    expect(result.current.hasPreviousRatingInStudy('eval1', 'study2')).toBe(true);
    expect(result.current.hasPreviousRatingInStudy('eval2', 'study1')).toBe(true);
    expect(result.current.hasPreviousRatingInStudy('eval2', 'study2')).toBe(true);
  });
  
  it('should add a new MTE to a study', () => {
    const { result } = renderHook(() => useMockData());
    const studyId = 'study1';
    const initialMteCount = result.current.studies.find(s => s.id === studyId)?.mteIds.length || 0;
    
    act(() => {
        result.current.addMTEToStudy(studyId, 'mte4');
    });
    
    const updatedStudy = result.current.studies.find(s => s.id === studyId);
    expect(updatedStudy?.mteIds.length).toBe(initialMteCount + 1);
    expect(updatedStudy?.mteIds).toContain('mte4');
  });
  
  it('should remove an MTE from a study', () => {
    const { result } = renderHook(() => useMockData());
    const studyId = 'study1';
    const mteIdToRemove = 'mte1';
    const initialMteCount = result.current.studies.find(s => s.id === studyId)?.mteIds.length || 0;
    
    act(() => {
        result.current.removeMTEFromStudy(studyId, mteIdToRemove);
    });
    
    const updatedStudy = result.current.studies.find(s => s.id === studyId);
    expect(updatedStudy?.mteIds.length).toBe(initialMteCount - 1);
    expect(updatedStudy?.mteIds).not.toContain(mteIdToRemove);
  });

  it('should delete an MTE and remove it from all studies', () => {
    const { result } = renderHook(() => useMockData());
    const mteIdToDelete = 'mte1'; // This MTE is in study1

    act(() => {
      result.current.deleteMte(mteIdToDelete);
    });

    // Check if MTE is deleted from catalog
    expect(result.current.mtes.find(m => m.id === mteIdToDelete)).toBeUndefined();

    // Check if MTE is removed from study1
    const study1 = result.current.studies.find(s => s.id === 'study1');
    expect(study1?.mteIds).not.toContain(mteIdToDelete);
  });

  it('should avoid duplicating project members when the same evaluator is added twice', () => {
    const { result } = renderHook(() => useMockData());
    const projectId = 'proj1';

    act(() => {
      result.current.addMemberToProject(projectId, 'eval4');
    });

    const afterFirstAdd = result.current.projects.find(p => p.id === projectId)?.memberIds ?? [];
    expect(afterFirstAdd).toContain('eval4');

    act(() => {
      result.current.addMemberToProject(projectId, 'eval4');
    });

    const afterSecondAdd = result.current.projects.find(p => p.id === projectId)?.memberIds ?? [];
    expect(afterSecondAdd.filter(id => id === 'eval4').length).toBe(1);
  });

  it('should remove project and associated studies when deleting a project', () => {
    const { result } = renderHook(() => useMockData());

    act(() => {
      result.current.deleteProject('proj1');
    });

    expect(result.current.projects.find(p => p.id === 'proj1')).toBeUndefined();
    expect(result.current.studies.every(s => s.projectId !== 'proj1')).toBe(true);
    // Only the project2 study should remain
    expect(result.current.studies.length).toBe(1);
    expect(result.current.studies[0].id).toBe('study2');
  });

  it('should purge evaluator memberships and study assignments when deleting an evaluator', () => {
    const { result } = renderHook(() => useMockData());

    act(() => {
      result.current.deleteEvaluator('eval1');
    });

    expect(result.current.evaluators.find(e => e.id === 'eval1')).toBeUndefined();
    expect(result.current.projects.every(p => !p.memberIds.includes('eval1'))).toBe(true);
    expect(result.current.studies.every(s => !s.evaluatorIds.includes('eval1'))).toBe(true);
  });

  it('should add a new MTE to a study only once', () => {
    const { result } = renderHook(() => useMockData());
    const studyId = 'study1';
    const mteId = 'mte4';

    act(() => {
      result.current.addMTEToStudy(studyId, mteId);
    });

    const afterFirstAdd = result.current.studies.find(s => s.id === studyId)?.mteIds ?? [];
    expect(afterFirstAdd).toContain(mteId);

    act(() => {
      result.current.addMTEToStudy(studyId, mteId);
    });

    const afterSecondAdd = result.current.studies.find(s => s.id === studyId)?.mteIds ?? [];
    expect(afterSecondAdd.filter(id => id === mteId).length).toBe(1);
  });

  it('should replace an existing pairwise comparison instead of duplicating it', () => {
    const { result } = renderHook(() => useMockData());
    const comparison = {
      evaluatorId: 'eval1',
      studyId: 'study1',
      weights: {
        [TLXDimension.MENTAL_DEMAND]: 0,
        [TLXDimension.PHYSICAL_DEMAND]: 0,
        [TLXDimension.TEMPORAL_DEMAND]: 0,
        [TLXDimension.PERFORMANCE]: 0,
        [TLXDimension.EFFORT]: 0,
        [TLXDimension.FRUSTRATION]: 0,
      },
      isWeighted: false,
    };

    act(() => {
      result.current.addPairwiseComparison(comparison);
    });

    const matches = result.current.pairwiseComparisons.filter(
      pc => pc.evaluatorId === 'eval1' && pc.studyId === 'study1'
    );

    expect(matches.length).toBe(1);
    expect(matches[0].isWeighted).toBe(false);
    expect(matches[0].weights[TLXDimension.MENTAL_DEMAND]).toBe(0);
  });
});
