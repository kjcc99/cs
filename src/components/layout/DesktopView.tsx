// src/components/layout/DesktopView.tsx
import React, { useState, useRef, useCallback } from 'react';
import { useToast } from '../Toast';
import { AppViewProps } from './AppViewProps';
import { ScheduleRequest } from '../CourseInput';
import ScheduleDisplay, { OverlaidSchedule } from '../ScheduleDisplay';
import HelpModal from '../HelpModal';
import ConfirmModal from '../ConfirmModal';
import DashboardHeader from '../DashboardHeader';
import ConfigBar from '../ConfigBar';
import Sidebar from '../Sidebar';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import {
    SavedSection,
    AcademicTerm,
    GeneratedSchedule,
    ScheduleBlock,
    ExportType
} from '../../types';
import { generateSchedule } from '../../utils/scheduleGenerator';
import { formatScheduleSimple, formatScheduleDetailed, formatBulkExport, copyToClipboard } from '../../utils/copyUtils';

import { exportForSpreadsheet } from '../../utils/spreadsheetExport';
import './DesktopView.css';


export const DesktopView: React.FC<AppViewProps> = ({
    sectionsAPI,
    rulesAPI,
    settingsAPI,
    catalogAPI,
    workspaceAPI,
    calendar
}) => {
    const { showToast } = useToast();
    const {
        savedSections, currentSectionId, setCurrentSectionId, saveSection,
        deleteSection, renameSection, reorderSections, clearAllSections
    } = sectionsAPI;

    const { contactHourRules, attendanceRules } = rulesAPI;

    const {
        selectedTermId, setSelectedTermId, selectedSessionId, setSelectedSessionId,
        startTime, setStartTime, labStartTime, setLabStartTime, theme, setTheme,
        timeFormat, setTimeFormat
    } = settingsAPI;

    const { catalog, divisions, departments } = catalogAPI;

    const {
        lectureUnits, setLectureUnits, lectureDays, setLectureDays, labUnits, setLabUnits,
        labDays, setLabDays, isLecFixed, setIsLecFixed, isLabFixed, setIsLabFixed,
        lecRange, setLecRange, labRange, setLabRange, generatedSchedule, setGeneratedSchedule,
        lastRequest, setLastRequest, isCalculating, setIsCalculating,
        selectedCourseInfo, setSelectedCourseInfo, handleCourseSelect,
        getWorkspaceAsSection
    } = workspaceAPI;

    // --- Dashboard & UI State ---
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isConfirmNewOpen, setIsConfirmNewOpen] = useState(false);
    const [isCopyDropdownOpen, setIsCopyDropdownOpen] = useState(false);
    const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
    const [isConfigExpanded, setIsConfigExpanded] = useState(false);
    const [overlaySectionIds, setOverlaySectionIds] = useState<string[]>([]);

    const copyDropdownRef = useRef<HTMLDivElement>(null);
    const settingsDropdownRef = useRef<HTMLDivElement>(null);
    const statusPopoverRef = useRef<HTMLDivElement>(null);
    const resultsHeadingRef = useRef<HTMLHeadingElement>(null);

    // Close dropdowns when clicking outside
    useOutsideClick(copyDropdownRef, () => setIsCopyDropdownOpen(false));
    useOutsideClick(settingsDropdownRef, () => setIsSettingsOpen(false));
    useOutsideClick(statusPopoverRef, () => setIsStatusPopoverOpen(false));

    const toggleOverlay = useCallback((id: string) => {
        setOverlaySectionIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    }, []);

    // --- Logic Handlers ---
    const handleSaveSection = useCallback(() => {
        if (lectureUnits === 0 && labUnits === 0) {
            showToast("Please enter units before saving.", "error");
            return;
        }

        let sectionName = `Section ${savedSections.length + 1}`;
        if (selectedCourseInfo) {
            const { sub, no } = selectedCourseInfo;
            const existingCount = savedSections.filter(s => s.name.startsWith(`${sub} ${no}`)).length;
            const sectionNum = String(existingCount + 1).padStart(2, '0');
            sectionName = `${sub} ${no} ${sectionNum}`;
        }

        saveSection({
            lectureUnits, lectureDays, labUnits, labDays, startTime, labStartTime, selectedTermId, selectedSessionId,
            ...(currentSectionId ? {} : { name: sectionName })
        });
        showToast(currentSectionId ? "Section updated" : "Section saved");
    }, [saveSection, lectureUnits, lectureDays, labUnits, labDays, startTime, labStartTime, selectedTermId, selectedSessionId, selectedCourseInfo, savedSections, currentSectionId, showToast]);

    const handleLoadSection = useCallback((section: SavedSection) => {
        setCurrentSectionId(section.id);
        setLectureUnits(section.lectureUnits);
        setLectureDays(section.lectureDays);
        setLabUnits(section.labUnits);
        setLabDays(section.labDays);
        setStartTime(section.startTime);
        setLabStartTime(section.labStartTime);
        setSelectedTermId(section.selectedTermId);
        setSelectedSessionId(section.selectedSessionId);

        if (contactHourRules && attendanceRules) {
            const term = calendar.find(t => t.id === section.selectedTermId) || calendar[0];
            const session = term.sessions.find(s => s.id === section.selectedSessionId) || term.sessions[0];
            const context = { contactHourRules, attendanceRules, term, session };
            const request = {
                lectureUnits: section.lectureUnits,
                lectureDays: section.lectureDays,
                labUnits: section.labUnits,
                labDays: section.labDays
            };
            setGeneratedSchedule(generateSchedule(request, context, section.startTime, section.labStartTime));
            setLastRequest(request);
        }
    }, [contactHourRules, attendanceRules, calendar, setCurrentSectionId, setLectureUnits, setLectureDays, setLabUnits, setLabDays, setStartTime, setLabStartTime, setSelectedTermId, setSelectedSessionId, setGeneratedSchedule, setLastRequest]);

    const handleCopy = (summaryType: ExportType) => {
        if (!generatedSchedule) return;

        let text = "";
        let toastMsg = "Copied to clipboard!";

        if (summaryType === 'spreadsheet') {
            let name = "Current";
            if (selectedCourseInfo) name = `${selectedCourseInfo.sub} ${selectedCourseInfo.no} 01`;
            else if (currentSectionId) name = savedSections.find(s => s.id === currentSectionId)?.name || name;

            const temp = getWorkspaceAsSection('temp', name, { startTime, labStartTime, selectedTermId, selectedSessionId });
            text = exportForSpreadsheet([temp], calendar);
            toastMsg = "Section copied in spreadsheet format!";
        } else if (summaryType === 'simple') {
            text = formatScheduleSimple(generatedSchedule, timeFormat);
        } else {
            let name = currentSectionId ? savedSections.find(s => s.id === currentSectionId)?.name || 'Current' : 'Current';
            text = formatScheduleDetailed(generatedSchedule, name, timeFormat);
        }

        if (text) {
            copyToClipboard(text).then(success => {
                if (success) showToast(toastMsg);
                else showToast("Failed to copy", "error");
            });
        }
    };

    const clearWorkspace = () => {
        setCurrentSectionId(null);
        setLectureUnits(0);
        setLectureDays([]);
        setLabUnits(0);
        setLabDays([]);
        setGeneratedSchedule(null);
        setLastRequest(null);
        setIsConfirmNewOpen(false);
        showToast("Workspace cleared", "info");
    };

    const selectedTerm = calendar.find(t => t.id === selectedTermId) || calendar[0];
    const selectedSession = selectedTerm.sessions.find(s => s.id === selectedSessionId) || selectedTerm.sessions[0];

    const checkIsModified = useCallback((sectionId: string) => {
        if (sectionId !== currentSectionId) return false;
        const saved = savedSections.find(s => s.id === sectionId);
        if (!saved) return false;

        return (
            saved.lectureUnits !== lectureUnits ||
            saved.lectureDays.join(',') !== lectureDays.join(',') ||
            saved.labUnits !== labUnits ||
            saved.labDays.join(',') !== labDays.join(',') ||
            saved.startTime !== startTime ||
            saved.labStartTime !== labStartTime ||
            saved.selectedTermId !== selectedTermId ||
            saved.selectedSessionId !== selectedSessionId
        );
    }, [savedSections, currentSectionId, lectureUnits, lectureDays, labUnits, labDays, startTime, labStartTime, selectedTermId, selectedSessionId]);

    const handleScheduleNew = () => {
        const isModified = currentSectionId ? checkIsModified(currentSectionId) : (lectureUnits > 0 || labUnits > 0);
        if (isModified) setIsConfirmNewOpen(true);
        else clearWorkspace();
    };

    const handleConfirmSaveNew = () => {
        handleSaveSection();
        clearWorkspace();
    };

    const handleExportAll = () => {
        if (savedSections.length === 0) {
            showToast("No sections to export!", "error");
            return;
        }
        const text = formatBulkExport(savedSections, calendar);
        copyToClipboard(text).then(success => {
            if (success) showToast("All sections copied to clipboard!");
            else showToast("Failed to copy", "error");
        });
    };

    const handleExportSpreadsheet = () => {
        if (savedSections.length === 0) {
            showToast("No sections to export!", "error");
            return;
        }
        const tsv = exportForSpreadsheet(savedSections, calendar);
        copyToClipboard(tsv).then(success => {
            if (success) showToast("Copied in spreadsheet format!");
            else showToast("Failed to copy", "error");
        });
    };

    const handleLabLockToggle = () => {
        setLabStartTime(labStartTime === null ? '13:00' : null);
    };

    const getStatusInfo = () => {
        if (isCalculating) return { label: 'Auto-Solving...', class: 'warning' };
        if (!generatedSchedule) return { label: 'Idle', class: '' };
        const hasError = generatedSchedule.warnings.some((w: string) => w.startsWith('ERROR:'));
        if (hasError) return { label: 'Error', class: 'conflict' };
        if (generatedSchedule.warnings.length > 0) return { label: 'Adjusted', class: 'warning' };
        return { label: 'Valid', class: 'valid' };
    };

    const status = getStatusInfo();

    const overlaidSchedules = overlaySectionIds.map(id => {
        const section = savedSections.find(s => s.id === id);
        if (!section || !contactHourRules || !attendanceRules) return null;

        const term = calendar.find(t => t.id === section.selectedTermId) || calendar[0];
        const session = term.sessions.find(s => s.id === section.selectedSessionId) || term.sessions[0];
        const context = { contactHourRules, attendanceRules, term, session };
        const request = {
            lectureUnits: section.lectureUnits, lectureDays: section.lectureDays,
            labUnits: section.labUnits, labDays: section.labDays
        };
        return {
            id: section.id,
            name: section.name,
            schedule: generateSchedule(request, context, section.startTime, section.labStartTime)
        };
    }).filter(Boolean);

    return (
        <div className={`App ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <a href="#results-header" className="skip-link">Skip to results</a>

            {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}

            {isConfirmNewOpen && (
                <ConfirmModal
                    title="Save Changes?"
                    message="Would you like to save the current section before starting a new one?"
                    onConfirm={handleConfirmSaveNew}
                    onCancel={clearWorkspace}
                    confirmText="Save"
                    cancelText="Discard"
                />
            )}

            <div className="dashboard-container">
                <Sidebar
                    isSidebarCollapsed={isSidebarCollapsed}
                    setIsSidebarCollapsed={setIsSidebarCollapsed}
                    sectionsAPI={sectionsAPI}
                    settingsAPI={settingsAPI}
                    workspaceAPI={workspaceAPI}
                    calendar={calendar}
                    checkIsModified={checkIsModified}
                    handleLoadSection={handleLoadSection}
                    overlaySectionIds={overlaySectionIds}
                    toggleOverlay={toggleOverlay}
                    setIsHelpOpen={setIsHelpOpen}
                    isSettingsOpen={isSettingsOpen}
                    setIsSettingsOpen={setIsSettingsOpen}
                    settingsDropdownRef={settingsDropdownRef}
                    handleExportAll={handleExportAll}
                    handleExportSpreadsheet={handleExportSpreadsheet}
                />

                <main className="main-content">
                    <DashboardHeader
                        status={status}
                        isStatusPopoverOpen={isStatusPopoverOpen}
                        setIsStatusPopoverOpen={setIsStatusPopoverOpen}
                        workspaceAPI={workspaceAPI}
                        sectionsAPI={sectionsAPI}
                        statusPopoverRef={statusPopoverRef}
                        handleScheduleNew={handleScheduleNew}
                        handleSaveSection={handleSaveSection}
                        handleCopy={handleCopy}
                        isCopyDropdownOpen={isCopyDropdownOpen}
                        setIsCopyDropdownOpen={setIsCopyDropdownOpen}
                        copyDropdownRef={copyDropdownRef}
                    />

                    <ConfigBar
                        isConfigExpanded={isConfigExpanded}
                        setIsConfigExpanded={setIsConfigExpanded}
                        selectedTerm={selectedTerm}
                        selectedSession={selectedSession}
                        selectedTermId={selectedTermId}
                        setSelectedTermId={setSelectedTermId}
                        selectedSessionId={selectedSessionId}
                        setSelectedSessionId={setSelectedSessionId}
                        calendar={calendar}
                        startTime={startTime}
                        setStartTime={setStartTime}
                        labStartTime={labStartTime}
                        setLabStartTime={setLabStartTime}
                        handleLabLockToggle={handleLabLockToggle}
                        timeFormat={timeFormat}
                        catalog={catalog}
                        divisions={divisions}
                        departments={departments}
                        handleCourseSelect={handleCourseSelect}
                        selectedCourseInfo={selectedCourseInfo}
                        lectureUnits={lectureUnits}
                        setLectureUnits={setLectureUnits}
                        lectureDays={lectureDays}
                        setLectureDays={setLectureDays}
                        labUnits={labUnits}
                        setLabUnits={setLabUnits}
                        labDays={labDays}
                        setLabDays={setLabDays}
                        isLecFixed={isLecFixed}
                        isLabFixed={isLabFixed}
                        lecRange={lecRange}
                        labRange={labRange}
                    />

                    <div className="scrollable-content">
                        <div className="content-area">
                            <ScheduleDisplay
                                schedule={generatedSchedule}
                                request={lastRequest}
                                overlaidSchedules={overlaidSchedules as OverlaidSchedule[]}
                                timeFormat={timeFormat}
                                resultsHeadingRef={resultsHeadingRef}
                            />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
