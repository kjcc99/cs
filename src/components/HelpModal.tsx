// src/components/HelpModal.tsx
import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I save a section?",
    answer: "Once you have entered your lecture/lab units and selected your days, click the 'Save Current Section' button in the action bar. It will appear in the sidebar on the left."
  },
  {
    question: "What is 'Session Context'?",
    answer: "This area defines the global parameters for your current section, such as which academic term you are scheduling for and the time you'd like the classes to start."
  },
  {
    question: "How can I schedule a separate time for the Lab?",
    answer: "In the 'Session Context' card, click the lock icon (🔒) to unlink the Lab time. This will allow you to set a different start time specifically for the lab portion of the course."
  },
  {
    question: "Can I export my entire list of saved sections?",
    answer: "Yes! Use the 'Export All' button in the action bar. This will copy a formatted text summary of every section in your sidebar to your clipboard, perfect for pasting into an email or document."
  },
  {
    question: "What's the difference between Simple and Advanced days?",
    answer: "Simple mode automatically selects the first few days of the week based on the number you choose. Advanced mode (enabled in Settings ⚙️) allows you to pick specific days like Tuesday/Thursday or weekends."
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Help & FAQ ❓❓</h2>
          <button onClick={onClose} className="delete-item-btn" style={{ fontSize: '1.5rem' }}>×</button>
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

        <div style={{ marginTop: '20px', fontSize: '0.85rem', opacity: 0.7, textAlign: 'center' }}>
          Need more help? Contact your department scheduler for specific policy questions.
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
