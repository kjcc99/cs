// src/components/layout/AppViewProps.ts
import { useSections } from '../../hooks/useSections';
import { useRules } from '../../hooks/useRules';
import { useSettings } from '../../hooks/useSettings';
import { useCatalog } from '../../hooks/useCatalog';
import { useWorkspace } from '../../hooks/useWorkspace';
import { AcademicTerm } from '../../types/calendar';

export interface AppViewProps {
    sectionsAPI: ReturnType<typeof useSections>;
    rulesAPI: ReturnType<typeof useRules>;
    settingsAPI: ReturnType<typeof useSettings>;
    catalogAPI: ReturnType<typeof useCatalog>;
    workspaceAPI: ReturnType<typeof useWorkspace>;
    calendar: AcademicTerm[];
}
