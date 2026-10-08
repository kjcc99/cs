// src/hooks/useCatalog.ts
import { useMemo } from 'react';
import { catalogForTerm } from '../utils/catalogForTerm';

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
  // Catalog for the term's academic year; terms without one yet (AY27-28) fall back
  const catalog = useMemo(() => catalogForTerm(selectedTermId).catalog, [selectedTermId]);

  return {
    catalog,
    divisions: metadata.divisions,
    departments: metadata.departments
  };
}
