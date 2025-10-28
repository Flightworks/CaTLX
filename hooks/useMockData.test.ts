import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import useMockData from './useMockData';
import { TLXDimension } from '../types';

describe('useMockData hook', () => {

  it('should initialize with default data', () => {
    const { result } = renderHook(() => useMockData());
    
    expect(result.current.evaluators.length).toBe(2);
    expect(result.current.studies.length).toBe(2);
    expect(result.current.mtes.length).toBe(5);
    expect(result.current.ratings.length).toBe(0);
    expect(result.current.pairwiseComparisons.length).toBe(0);
  });

  it('should add an evaluator', () => {
    const { result } = renderHook(() => useMockData());
    
    act(() => {
      result.current.addEvaluator({ name: 'Test Evaluator', email: 'test@nasa.gov' });
    });

    expect(result.current.evaluators.length).toBe(3);
    expect(result.current.evaluators[2].name).toBe('Test Evaluator');
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
        studyId: 'study1',
        mteId: 'mte1',
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

    expect(result.current.ratings.length).toBe(1);
    expect(result.current.ratings[0].evaluatorId).toBe('eval1');
  });
  
  it('should correctly report if an evaluator has a previous rating in a study', () => {
    const { result } = renderHook(() => useMockData());
    
    expect(result.current.hasPreviousRatingInStudy('eval1', 'study1')).toBe(false);

    act(() => {
      result.current.addRating({
        evaluatorId: 'eval1',
        studyId: 'study1',
        mteId: 'mte1',
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

    expect(result.current.hasPreviousRatingInStudy('eval1', 'study1')).toBe(true);
    expect(result.current.hasPreviousRatingInStudy('eval2', 'study1')).toBe(false);
    expect(result.current.hasPreviousRatingInStudy('eval1', 'study2')).toBe(false);
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
});
