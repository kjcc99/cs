import React, { useState, useCallback } from 'react';
import { SplitterStage, CRNGroup, ReviewSummary, SplitterResults } from './types';
import { parseAndGroup, classifyGroups, processGroups, outputToTsv } from './pipeline';
import { PasteStage } from './PasteStage';
import { ReviewStage } from './ReviewStage';
import { ResultsStage } from './ResultsStage';
import { useToast } from '../components/Toast';
import { copyToClipboard } from '../utils/copyUtils';
import './SplitterView.css';

interface SplitterViewProps {
    appMode: 'scheduler' | 'splitter';
    setAppMode: (mode: 'scheduler' | 'splitter') => void;
}

const SplitterView: React.FC<SplitterViewProps> = ({ appMode, setAppMode }) => {
    const { showToast } = useToast();

    const [stage, setStage] = useState<SplitterStage>('paste');
    const [rawInput, setRawInput] = useState('');
    const [groups, setGroups] = useState<CRNGroup[]>([]);
    const [parseWarnings, setParseWarnings] = useState<string[]>([]);
    const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
    const [results, setResults] = useState<SplitterResults | null>(null);
    const [tsvOutput, setTsvOutput] = useState('');

    const handleParse = useCallback(() => {
        try {
            const { groups: parsed, parseWarnings: warnings } = parseAndGroup(rawInput);
            if (parsed.length === 0) {
                showToast('No valid data rows found.', 'error');
                setParseWarnings(warnings);
                return;
            }
            setGroups(parsed);
            setParseWarnings(warnings);

            const summary = classifyGroups(parsed);
            setReviewSummary(summary);
            setStage('review');
        } catch (err: any) {
            showToast(`Parse error: ${err.message || 'Unknown error'}`, 'error');
        }
    }, [rawInput, showToast]);

    const handleProcess = useCallback(() => {
        if (!reviewSummary) return;
        try {
            const result = processGroups(groups, reviewSummary);
            setResults(result);
            setTsvOutput(outputToTsv(result));
            setStage('results');
        } catch (err: any) {
            showToast(`Processing error: ${err.message || 'Unknown error'}`, 'error');
        }
    }, [groups, reviewSummary, showToast]);

    const handleCopy = useCallback(async () => {
        const success = await copyToClipboard(tsvOutput);
        if (success) {
            showToast(`Copied ${results?.outputRows.length || 0} rows to clipboard.`);
        } else {
            showToast('Failed to copy to clipboard.', 'error');
        }
    }, [tsvOutput, results, showToast]);

    const handleReset = useCallback(() => {
        setStage('paste');
        setRawInput('');
        setGroups([]);
        setParseWarnings([]);
        setReviewSummary(null);
        setResults(null);
        setTsvOutput('');
    }, []);

    return (
        <div className="splitter-layout">
            <header className="splitter-header">
                <div className="header-left">
                    <img src={process.env.PUBLIC_URL + '/logo.svg'} className="app-logo" alt="logo" />
                    <h1>Course Scheduler</h1>
                    <div className="mode-tabs">
                        <button
                            className={`mode-tab ${appMode === 'scheduler' ? 'active' : ''}`}
                            onClick={() => setAppMode('scheduler')}
                        >
                            Scheduler
                        </button>
                        <button
                            className={`mode-tab ${appMode === 'splitter' ? 'active' : ''}`}
                            onClick={() => setAppMode('splitter')}
                        >
                            Splitter
                        </button>
                    </div>
                </div>
            </header>

            <main className="splitter-content">
                {stage === 'paste' && (
                    <PasteStage
                        rawInput={rawInput}
                        setRawInput={setRawInput}
                        onParse={handleParse}
                        parseWarnings={parseWarnings}
                    />
                )}
                {stage === 'review' && reviewSummary && (
                    <ReviewStage
                        summary={reviewSummary}
                        groups={groups}
                        onProcess={handleProcess}
                        onBack={() => setStage('paste')}
                    />
                )}
                {stage === 'results' && results && (
                    <ResultsStage
                        results={results}
                        tsvOutput={tsvOutput}
                        onReset={handleReset}
                        onCopy={handleCopy}
                    />
                )}
            </main>
        </div>
    );
};

export default SplitterView;
