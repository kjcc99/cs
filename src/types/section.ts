// src/types/section.ts

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
