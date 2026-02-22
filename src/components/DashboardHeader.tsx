// src/components/DashboardHeader.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Save, Copy, ChevronDown } from 'lucide-react';
import { GeneratedSchedule, SavedSection } from '../types';
import { useWorkspace } from '../hooks/useWorkspace';
import { useSections } from '../hooks/useSections';
import './DashboardHeader.css';

interface DashboardHeaderProps {
    status: { label: string; class: string };
    isStatusPopoverOpen: boolean;
    setIsStatusPopoverOpen: (open: boolean) => void;
    statusPopoverRef: React.RefObject<HTMLDivElement | null>;
    workspaceAPI: ReturnType<typeof useWorkspace>;
    sectionsAPI: ReturnType<typeof useSections>;
    handleScheduleNew: () => void;
    handleSaveSection: () => void;
    handleCopy: (type: 'simple' | 'detailed' | 'spreadsheet') => void;
    isCopyDropdownOpen: boolean;
    setIsCopyDropdownOpen: (open: boolean) => void;
    copyDropdownRef: React.RefObject<HTMLDivElement | null>;
}


const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    status,
    isStatusPopoverOpen,
    setIsStatusPopoverOpen,
    workspaceAPI,
    sectionsAPI,
    statusPopoverRef,
    handleScheduleNew,
    handleSaveSection,
    handleCopy,
    isCopyDropdownOpen,
    setIsCopyDropdownOpen,
    copyDropdownRef
}) => {
    const { generatedSchedule } = workspaceAPI;

    return (
        <header className="dashboard-header">
            <div className="header-left">
                <img src={process.env.PUBLIC_URL + '/logo.svg'} className="app-logo" alt="logo" />
                <h1>Course Scheduler</h1>
                <div className="status-container" ref={statusPopoverRef}>
                    <span
                        className={`status-badge ${status.class} clickable`}
                        onClick={() => generatedSchedule && setIsStatusPopoverOpen(!isStatusPopoverOpen)}
                    >
                        {status.label}
                    </span>
                    {isStatusPopoverOpen && generatedSchedule && (
                        <div className="status-popover">
                            <h4>Schedule Details</h4>
                            <ul>
                                {generatedSchedule.warnings.length > 0 ? (
                                    generatedSchedule.warnings.map((w, i) => (
                                        <li key={i} className={w.startsWith('ERROR:') ? 'error' : ''}>
                                            {w.replace('ERROR: ', '')}
                                        </li>
                                    ))
                                ) : (
                                    <li>This schedule is fully rule-compliant.</li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="header-right">
                <motion.button
                    className="secondary-button compact"
                    onClick={handleScheduleNew}
                    whileTap={{ scale: 0.95 }}
                >
                    <Plus size={16} /> Schedule New Section
                </motion.button>
                <motion.button
                    className="primary-button compact"
                    onClick={handleSaveSection}
                    whileTap={{ scale: 0.95 }}
                >
                    <Save size={16} /> Save Current Section
                </motion.button>
                {generatedSchedule && (
                    <div className="split-button-container" ref={copyDropdownRef}>
                        <motion.button
                            className="secondary-button split-left compact"
                            onClick={() => handleCopy('simple')}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Copy size={16} /> Copy
                        </motion.button>
                        <motion.button
                            className={`secondary-button split-right compact ${isCopyDropdownOpen ? 'active' : ''}`}
                            onClick={() => setIsCopyDropdownOpen(!isCopyDropdownOpen)}
                            whileTap={{ scale: 0.95 }}
                        >
                            <ChevronDown size={14} />
                        </motion.button>
                        {isCopyDropdownOpen && (
                            <div className="dropdown-menu">
                                <button
                                    className="dropdown-item"
                                    onClick={() => { handleCopy('detailed'); setIsCopyDropdownOpen(false); }}
                                >
                                    <Copy size={14} /> Copy Detailed
                                </button>
                                <button
                                    className="dropdown-item"
                                    onClick={() => { handleCopy('spreadsheet'); setIsCopyDropdownOpen(false); }}
                                >
                                    <Copy size={14} /> Spreadsheet Format
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};

export default DashboardHeader;
