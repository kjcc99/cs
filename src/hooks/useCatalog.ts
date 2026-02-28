// src/hooks/useCatalog.ts
import { useMemo } from 'react';

// Import local data
import courses2526 from '../data/courses_2526.json';
import courses2627 from '../data/courses_2627.json';
import metadata from '../data/catalog-metadata.json';

export interface Course {
  no: string;
  title?: string;
  lec: number | { min: number; max: number };
  lab: number | { min: number; max: number };
}

export type SubjectMap = Record<string, Course[]>;
export type DeptMap = Record<string, SubjectMap>;
export type CatalogHierarchy = Record<string, DeptMap>;

export function useCatalog(selectedTermId: string) {
  // Determine which Academic Year to use based on the term ID
  // Logic: 2025 terms use 2526, 2026 terms (except Summer) use 2627
  // Adjusting based on your rule: Summer 2025 -> 2526, Fall 2026+ -> 2627
  const catalog = useMemo(() => {
    // Specific override: Summer 2026 uses AY25-26
    if (selectedTermId === 'su2026') {
      return courses2526 as CatalogHierarchy;
    }

    // 2025 terms use 2526
    if (selectedTermId.includes('2025')) {
      return courses2526 as CatalogHierarchy;
    }

    // Default to 2627 for other 2026+ terms
    return courses2627 as CatalogHierarchy;
  }, [selectedTermId]);

  return {
    catalog,
    divisions: metadata.divisions,
    departments: metadata.departments
  };
}
