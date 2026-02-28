// src/components/layout/MobileView.tsx
import React, { useState, useCallback } from 'react';
import { useToast } from '../Toast';
import { AppViewProps } from './AppViewProps';
import { MobileHeader } from './mobile/MobileHeader';
import { MobileSidebar } from './mobile/MobileSidebar';
import { MobileConfig } from './mobile/MobileConfig';
import ScheduleDisplay from '../ScheduleDisplay';
import HelpModal from '../HelpModal';
import ConfirmModal from '../ConfirmModal';
import {
    SavedSection,
    ExportType
} from '../../types';
import { generateSchedule } from '../../utils/scheduleGenerator';
import { formatScheduleSimple, formatScheduleDetailed, formatBulkExport, copyToClipboard } from '../../utils/copyUtils';

import { exportForSpreadsheet } from '../../utils/spreadsheetExport';
import './MobileView.css';

export const MobileView: React.FC<AppViewProps> = ({
    sectionsAPI,
    rulesAPI,
    settingsAPI,
    catalogAPI,
    workspaceAPI,
    calendar
}) => {
    const { showToast } = useToast();
    const {
        savedSections, currentSectionId, setCurrentSectionId, saveSection
    } = sectionsAPI;

    const { contactHourRules, attendanceRules } = rulesAPI;

    const {
        selectedTermId, setSelectedTermId, selectedSessionId, setSelectedSessionId,
        startTime, setStartTime, labStartTime, setLabStartTime, theme,
        timeFormat
    } = settingsAPI;

    const { catalog, divisions, departments } = catalogAPI;

    const {
        lectureUnits, setLectureUnits, lectureDays, setLectureDays, labUnits, setLabUnits,
        labDays, setLabDays, isLecFixed, isLabFixed,
        lecRange, labRange,
        generatedSchedule, setGeneratedSchedule,
        lastRequest, setLastRequest,
        selectedCourseInfo, handleCourseSelect,
        getWorkspaceAsSection, isCalculating, clearCourseSelection
    } = workspaceAPI;

    // UI States
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isConfirmNewOpen, setIsConfirmNewOpen] = useState(false);
    const [isConfigExpanded, setIsConfigExpanded] = useState(true);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [overlaySectionIds, setOverlaySectionIds] = useState<string[]>([]);

    const handleSaveSection = useCallback(() => {
        if (lectureUnits === 0 && labUnits === 0) {
            showToast("Enter units first", "error");
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
        showToast(currentSectionId ? "Updated" : "Saved");
    }, [saveSection, lectureUnits, lectureDays, labUnits, labDays, startTime, labStartTime, selectedTermId, selectedSessionId, selectedCourseInfo, savedSections, currentSectionId, showToast]);

    const handleSaveAsNew = useCallback(() => {
        if (lectureUnits === 0 && labUnits === 0) {
            showToast("Enter units first", "error");
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
            name: sectionName
        }, true);
        showToast("Saved as new copy");
    }, [saveSection, lectureUnits, lectureDays, labUnits, labDays, startTime, labStartTime, selectedTermId, selectedSessionId, selectedCourseInfo, savedSections, showToast]);


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
                lectureUnits: section.lectureUnits, lectureDays: section.lectureDays,
                labUnits: section.labUnits, labDays: section.labDays
            };
            setGeneratedSchedule(generateSchedule(request, context, section.startTime, section.labStartTime));
            setLastRequest(request);
        }
        setIsSidebarOpen(false);
        setIsConfigExpanded(false);
    }, [contactHourRules, attendanceRules, calendar, setCurrentSectionId, setLectureUnits, setLectureDays, setLabUnits, setLabDays, setStartTime, setLabStartTime, setSelectedTermId, setSelectedSessionId, setGeneratedSchedule, setLastRequest]);

    const toggleOverlay = (id: string) => {
        setOverlaySectionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleCopy = (summaryType: ExportType) => {
        if (!generatedSchedule) return;

        let text = "";
        let toastMsg = "Copied!";

        if (summaryType === 'spreadsheet') {
            let name = "Current";
            if (selectedCourseInfo) name = `${selectedCourseInfo.sub} ${selectedCourseInfo.no} 01`;
            else if (currentSectionId) name = savedSections.find(s => s.id === currentSectionId)?.name || name;

            const temp = getWorkspaceAsSection('temp', name, { startTime, labStartTime, selectedTermId, selectedSessionId });
            text = exportForSpreadsheet([temp], calendar);
            toastMsg = "Section copied (Spreadsheet)!";
        } else if (summaryType === 'simple') {
            text = formatScheduleSimple(generatedSchedule, timeFormat);
            toastMsg = "Simple summary copied!";
        } else {
            let name = currentSectionId ? savedSections.find(s => s.id === currentSectionId)?.name || 'Current' : 'Current';
            text = formatScheduleDetailed(generatedSchedule, name, timeFormat);
            toastMsg = "Detailed summary copied!";
        }

        if (text) {
            copyToClipboard(text).then(success => {
                if (success) showToast(toastMsg);
                else showToast("Failed to copy", "error");
            });
        }
    };

    const handleExportAll = () => {
        if (savedSections.length === 0) {
            showToast("No sections to export", "error");
            return;
        }
        const text = formatBulkExport(savedSections, calendar);
        copyToClipboard(text).then(success => {
            if (success) showToast("All sections copied (Detailed)!");
            else showToast("Failed to copy", "error");
        });
        setIsSidebarOpen(false);
    };

    const handleExportSpreadsheet = () => {
        if (savedSections.length === 0) {
            showToast("No sections to export", "error");
            return;
        }
        const text = exportForSpreadsheet(savedSections, calendar);
        copyToClipboard(text).then(success => {
            if (success) showToast("All sections copied (Spreadsheet)!");
            else showToast("Failed to copy", "error");
        });
        setIsSidebarOpen(false);
    };


    const clearWorkspace = () => {
        setCurrentSectionId(null);
        if (!selectedCourseInfo) {
            setLectureUnits(0);
            setLabUnits(0);
        }
        setLectureDays([]);
        setLabDays([]);
        setGeneratedSchedule(null);
        setLastRequest(null);
        setIsConfirmNewOpen(false);
        showToast("Ready for new section", "info");
    };

    const handleNewRequest = () => {
        const isModified = currentSectionId || lectureUnits > 0 || labUnits > 0;
        if (isModified) setIsConfirmNewOpen(true);
        else clearWorkspace();
    };

    const handleConfirmSaveNew = () => {
        handleSaveSection();
        clearWorkspace();
    };

    const selectedTerm = calendar.find(t => t.id === selectedTermId) || calendar[0];
    const selectedSession = selectedTerm.sessions.find(s => s.id === selectedSessionId) || selectedTerm.sessions[0];

    const checkIsModified = (id: string) => {
        if (id !== currentSectionId) return false;
        return true;
    };

    return (
        <div className="mobile-view">
            <MobileHeader
                onOpenSidebar={() => setIsSidebarOpen(true)}
                onSave={handleSaveSection}
                onSaveAsNew={handleSaveAsNew}
                onNew={handleNewRequest}
                onCopySimple={() => handleCopy('simple')}
                onCopyDetailed={() => handleCopy('detailed')}
                onCopySpreadsheet={() => handleCopy('spreadsheet')}
                workspaceAPI={workspaceAPI}
                sectionsAPI={sectionsAPI}
            />

            <main className="mv-content">
                <MobileConfig
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
                    handleLabLockToggle={() => setLabStartTime(labStartTime === null ? '13:00' : null)}
                    timeFormat={timeFormat}
                    catalog={catalog}
                    divisions={divisions}
                    departments={departments}
                    handleCourseSelect={handleCourseSelect}
                    onClearCourse={clearCourseSelection}
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

                <ScheduleDisplay
                    schedule={generatedSchedule}
                    request={lastRequest}
                    timeFormat={timeFormat}
                    resultsHeadingRef={{ current: null }}
                    isCalculating={isCalculating}
                    overlaidSchedules={savedSections.filter(s => overlaySectionIds.includes(s.id)).map(s => {
                        // This is a bit expensive but necessary if we want overlays on mobile
                        // In the real app we'd probably cache generated schedules for overlays
                        const term = calendar.find(t => t.id === s.selectedTermId) || calendar[0];
                        const session = term.sessions.find(sn => sn.id === s.selectedSessionId) || term.sessions[0];
                        const context = { contactHourRules: rulesAPI.contactHourRules!, attendanceRules: rulesAPI.attendanceRules!, term, session };
                        const request = { lectureUnits: s.lectureUnits, lectureDays: s.lectureDays, labUnits: s.labUnits, labDays: s.labDays };
                        return {
                            id: s.id,
                            name: s.name,
                            schedule: generateSchedule(request, context, s.startTime, s.labStartTime)
                        };
                    })}
                />
            </main>

            {isSidebarOpen && (
                <MobileSidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
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
                    handleExportAll={handleExportAll}
                    handleExportSpreadsheet={handleExportSpreadsheet}
                />
            )}

            {isHelpOpen && (
                <HelpModal onClose={() => setIsHelpOpen(false)} />
            )}

            {isConfirmNewOpen && (
                <ConfirmModal
                    title="Save?"
                    message="Save current work first?"
                    onConfirm={handleConfirmSaveNew}
                    onCancel={clearWorkspace}
                    confirmText="Save"
                    cancelText="Discard"
                />
            )}
        </div>
    );
};
