import { useState, useCallback } from 'react';
import { ScheduleRequest } from '../components/CourseInput';
import { GeneratedSchedule } from '../types';
import { Course } from './useCatalog';


export function useWorkspace() {
    const [lectureUnits, setLectureUnits] = useState(0);
    const [lectureDays, setLectureDays] = useState<string[]>([]);
    const [labUnits, setLabUnits] = useState(0);
    const [labDays, setLabDays] = useState<string[]>([]);

    const [isLecFixed, setIsLecFixed] = useState(false);
    const [isLabFixed, setIsLabFixed] = useState(false);

    const [lecRange, setLecRange] = useState({ min: 0, max: 10 });
    const [labRange, setLabRange] = useState({ min: 0, max: 10 });

    const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null);
    const [lastRequest, setLastRequest] = useState<ScheduleRequest | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const [selectedCourseInfo, setSelectedCourseInfo] = useState<{ sub: string, no: string, title?: string } | null>(null);

    const handleCourseSelect = useCallback((sub: string, course: Course) => {
        setSelectedCourseInfo({ sub, no: course.no, title: course.title });

        // Auto-populate units (handle fixed number or {min, max} object)
        const lecVal = course.lec;
        const labVal = course.lab;

        const newLecUnits = typeof lecVal === 'number' ? lecVal : lecVal.min;
        const newLabUnits = typeof labVal === 'number' ? labVal : labVal.min;

        // Determine locks: Locked if it's a fixed number, Unlocked if it's a range object
        setIsLecFixed(typeof lecVal === 'number');
        setIsLabFixed(typeof labVal === 'number');

        // Set Ranges
        setLecRange(typeof lecVal === 'number' ? { min: lecVal, max: lecVal } : { min: lecVal.min, max: lecVal.max });
        setLabRange(typeof labVal === 'number' ? { min: labVal, max: labVal } : { min: labVal.min, max: labVal.max });

        setLectureUnits(newLecUnits);
        setLabUnits(newLabUnits);
    }, []);

    const clearCourseSelection = useCallback(() => {
        setSelectedCourseInfo(null);
        setIsLecFixed(false);
        setIsLabFixed(false);
        setLecRange({ min: 0, max: 10 });
        setLabRange({ min: 0, max: 10 });
        setLectureUnits(0);
        setLabUnits(0);
    }, []);

    const getWorkspaceAsSection = useCallback((id: string, name: string, settings: any) => {
        return {
            id,
            name,
            lectureUnits, lectureDays,
            labUnits, labDays,
            startTime: settings.startTime,
            labStartTime: settings.labStartTime,
            selectedTermId: settings.selectedTermId,
            selectedSessionId: settings.selectedSessionId,
            timestamp: Date.now()
        };
    }, [lectureUnits, lectureDays, labUnits, labDays]);

    return {
        lectureUnits, setLectureUnits,
        lectureDays, setLectureDays,
        labUnits, setLabUnits,
        labDays, setLabDays,
        isLecFixed, setIsLecFixed,
        isLabFixed, setIsLabFixed,
        lecRange, setLecRange,
        labRange, setLabRange,
        generatedSchedule, setGeneratedSchedule,
        lastRequest, setLastRequest,
        isCalculating, setIsCalculating,
        selectedCourseInfo, setSelectedCourseInfo,
        handleCourseSelect, clearCourseSelection,
        getWorkspaceAsSection
    };
}
