// src/components/ConfirmModal.tsx
import React from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  title, message, onConfirm, onCancel, 
  confirmText = "Save", cancelText = "Discard" 
}) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>{title}</h3>
        <p style={{ margin: '20px 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            className="secondary-button" 
            onClick={onCancel}
            style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
          >
            {cancelText}
          </button>
          <button className="primary-button" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
