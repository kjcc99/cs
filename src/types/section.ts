// src/types/section.ts

export interface SavedSection {
    id: string;
    name: string;
    lectureUnits: number;
    lectureDays: string[];
    lecTbaHours?: number;
    labUnits: number;
    labDays: string[];
    labTbaHours?: number;
    startTime: string;
    labStartTime: string | null;
    selectedTermId: string;
    selectedSessionId: string;
    timestamp: number;
}
