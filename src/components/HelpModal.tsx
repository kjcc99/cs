import React, { useState } from 'react';
import { X, Save, Edit2, Copy, ExternalLink, Table } from 'lucide-react';

import './HelpModal.css';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

const faqs: FAQItem[] = [
  {
    question: "How do I start scheduling?",
    answer: "Use the Course Catalog to pick a course, or enter units manually in the Configuration panel above. The calendar will update instantly as you make changes to units, days, or times."
  },
  {
    question: "How do I save my work?",
    answer: (
      <>
        Once you’re happy with a schedule, click the <strong><Save size={14} style={{ display: 'inline', verticalAlign: '-2px', margin: '0 2px' }} /> Save Section</strong> button in the top toolbar to stash it in the sidebar. It will automatically be assigned an intelligent name based on the subject and course number.
      </>
    )
  },
  {
    question: "Can I see multiple sections at once?",
    answer: "Yes! Use the check circles on the left side of your saved sections in the sidebar. Selected sections will appear as semi-transparent 'ghost' blocks on the calendar, allowing you to visually detect overlaps and conflicts."
  },
  {
    question: "What does the dot next to a section name mean?",
    answer: "A small dot next to the section name indicates unsaved changes. It means you’ve loaded a section and tweaked its configuration, but haven't clicked 'Update Section' to push your changes to the saved copy."
  },
  {
    question: "How do I reorder or rename my sections?",
    answer: (
      <>
        Hover over a section in the sidebar to see the <strong><Edit2 size={12} style={{ display: 'inline', verticalAlign: '-1px', margin: '0 2px' }} /></strong> icon for renaming. To reorder, use the <strong>⠿</strong> drag handle on the left of the section pill and slide it to a new position.
      </>
    )
  },
  {
    question: "How do I export my data?",
    answer: (
      <>
        To export a single section, use the <strong><Copy size={14} style={{ display: 'inline', verticalAlign: '-2px', margin: '0 2px' }} /> Copy</strong> split-button in the toolbar. To export every section in your sidebar at once, click the <strong><ExternalLink size={14} style={{ display: 'inline', verticalAlign: '-2px', margin: '0 2px' }} /></strong> (Details) or <strong><Table size={14} style={{ display: 'inline', verticalAlign: '-2px', margin: '0 2px' }} /></strong> (Spreadsheet) icons at the very top of the sidebar header.
      </>
    )
  }
];

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content help-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Help & FAQ</h2>
          <button onClick={onClose} className="settings-close-btn" aria-label="Close">
            <X size={20} />
          </button>
        </div>


        <div className="faq-container">
          {faqs.map((faq, index) => (
            <div key={index} className="faq-item">
              <button
                className="faq-question"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <span>{faq.question}</span>
                <span>{expandedIndex === index ? '−' : '+'}</span>
              </button>
              {expandedIndex === index && (
                <div className="faq-answer">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="modal-footer">
          Need more help? Contact the Academic Affairs office.
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
