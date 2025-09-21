import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCategories } from './useCategories';
import type { Category } from '../features/transactions/types';

describe('useCategories', () => {
  it('initializes with empty categories array', () => {
    const { result } = renderHook(() => useCategories());

    expect(result.current.categories).toEqual([]);
  });

  it('allows setting categories', () => {
    const { result } = renderHook(() => useCategories());

    const newCategories: Category[] = [
      { id: '1', name: 'Food', color: 'red-500' },
      { id: '2', name: 'Transport', color: 'blue-500' },
    ];

    act(() => {
      result.current.setCategories(newCategories);
    });

    expect(result.current.categories).toEqual(newCategories);
  });
});