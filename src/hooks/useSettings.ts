import { useState, useEffect } from 'react';
import { LOCAL_STORAGE_KEY, academicCalendar } from '../types/calendar';

export function useSettings() {
    const [selectedTermId, setSelectedTermId] = useState<string>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved).selectedTermId : academicCalendar[0].id;
    });
    const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved).selectedSessionId : academicCalendar[0].sessions[0].id;
    });
    const [startTime, setStartTime] = useState<string>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved).startTime : '08:00';
    });
    const [labStartTime, setLabStartTime] = useState<string | null>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved).labStartTime : null;
    });

    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved).theme : 'light';
    });
    const [daySelectionMode, setDaySelectionMode] = useState<'simple' | 'advanced'>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved).daySelectionMode : 'simple';
    });
    const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(() => {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        return saved ? JSON.parse(saved).timeFormat : '12h';
    });

    useEffect(() => {
        const settings = { selectedTermId, selectedSessionId, startTime, labStartTime, theme, daySelectionMode, timeFormat };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
    }, [selectedTermId, selectedSessionId, startTime, labStartTime, theme, daySelectionMode, timeFormat]);

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        const term = academicCalendar.find(t => t.id === selectedTermId);
        if (term && !term.sessions.find(s => s.id === selectedSessionId)) {
            setSelectedSessionId(term.sessions[0].id);
        }
    }, [selectedTermId, selectedSessionId]);

    return {
        selectedTermId, setSelectedTermId,
        selectedSessionId, setSelectedSessionId,
        startTime, setStartTime,
        labStartTime, setLabStartTime,
        theme, setTheme,
        timeFormat, setTimeFormat
    };
}
