// src/hooks/useSections.ts
import { useState, useEffect, useCallback } from 'react';

const SAVED_SECTIONS_KEY = 'cs-app-saved-sections';

export interface SavedSection {
  id: string;
  name: string;
  lectureUnits: number;
  lectureDays: string[];
  labUnits: number;
  labDays: string[];
  startTime: string;
  labStartTime: string | null;
  selectedTermId: string;
  selectedSessionId: string;
  timestamp: number;
}

export function useSections() {
  const [savedSections, setSavedSections] = useState<SavedSection[]>(() => {
    const saved = localStorage.getItem(SAVED_SECTIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(SAVED_SECTIONS_KEY, JSON.stringify(savedSections));
  }, [savedSections]);

  const saveSection = useCallback((data: Omit<SavedSection, 'id' | 'name' | 'timestamp'>) => {
    const newSection: SavedSection = {
      ...data,
      id: currentSectionId || Date.now().toString(),
      name: currentSectionId 
        ? (savedSections.find(s => s.id === currentSectionId)?.name || 'New Section')
        : `Section ${savedSections.length + 1}`,
      timestamp: Date.now()
    };

    if (currentSectionId) {
      setSavedSections(prev => prev.map(s => s.id === currentSectionId ? newSection : s));
    } else {
      setSavedSections(prev => [newSection, ...prev]);
      setCurrentSectionId(newSection.id);
    }
  }, [currentSectionId, savedSections]);

  const deleteSection = useCallback((id: string) => {
    setSavedSections(prev => prev.filter(s => s.id !== id));
    if (currentSectionId === id) setCurrentSectionId(null);
  }, [currentSectionId]);

  const renameSection = useCallback((id: string, newName: string) => {
    setSavedSections(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  }, []);

  const reorderSections = useCallback((newOrder: SavedSection[]) => {
    setSavedSections(newOrder);
  }, []);

  const clearAllSections = useCallback(() => {
    setSavedSections([]);
    setCurrentSectionId(null);
  }, []);

  return {
    savedSections,
    currentSectionId,
    setCurrentSectionId,
    saveSection,
    deleteSection,
    renameSection,
    reorderSections,
    clearAllSections
  };
}
