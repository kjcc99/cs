import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardPaste, ArrowRight, AlertTriangle } from 'lucide-react';

interface PasteStageProps {
    rawInput: string;
    setRawInput: (v: string) => void;
    onParse: () => void;
    parseWarnings: string[];
}

export const PasteStage: React.FC<PasteStageProps> = ({
    rawInput, setRawInput, onParse, parseWarnings
}) => {
    const lineCount = rawInput.trim() ? rawInput.trim().split('\n').length : 0;

    return (
        <div className="splitter-stage paste-stage">
            <div className="stage-header">
                <ClipboardPaste size={20} />
                <h2>Paste Schedule Data</h2>
            </div>

            <div className="info-banner">
                Paste your registrar spreadsheet data (TSV) below. The 26-column format is expected.
                Columns Y and Z (formula-based) will not round-trip cleanly.
            </div>

            <textarea
                className="splitter-textarea"
                placeholder="Paste tab-separated data here..."
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                spellCheck={false}
            />

            <div className="paste-footer">
                <span className="row-count">
                    {lineCount > 0 ? `${lineCount} row${lineCount !== 1 ? 's' : ''} detected` : 'No data'}
                </span>

                <motion.button
                    className="primary-button"
                    onClick={onParse}
                    disabled={!rawInput.trim()}
                    whileTap={{ scale: 0.95 }}
                >
                    Parse <ArrowRight size={16} />
                </motion.button>
            </div>

            {parseWarnings.length > 0 && (
                <div className="parse-warnings">
                    {parseWarnings.map((w, i) => (
                        <div key={i} className="warning-item">
                            <AlertTriangle size={14} /> {w}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
