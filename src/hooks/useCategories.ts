import { useState } from 'react';
import type { Category } from '../features/transactions/types';

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  // Placeholder for category management

  return { categories, setCategories };
};