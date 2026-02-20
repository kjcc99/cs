// src/components/SidebarItem.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Edit2, Trash2 } from 'lucide-react';
import { SavedSection } from '../hooks/useSections';

interface SidebarItemProps {
  section: SavedSection;
  isActive: boolean;
  isCollapsed: boolean;
  onLoad: (section: SavedSection) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  lecStart: string;
  lecEnd: string;
  labStart: string;
  labEnd: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  section, isActive, isCollapsed, onLoad, onDelete, onRename, 
  lecStart, lecEnd, labStart, labEnd 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(section.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() && editValue !== section.name) {
      onRename(section.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditValue(section.name);
      setIsEditing(false);
    }
  };

  return (
    <Reorder.Item
      value={section}
      id={section.id}
      dragListener={isCollapsed}
      dragControls={dragControls}
      className={`sidebar-item ${isActive ? 'active' : ''}`}
      onClick={() => !isEditing && onLoad(section)}
      layout="position" // Only animate position changes, ignore internal content changes
      whileDrag={{ scale: 1.05, boxShadow: "0 8px 20px rgba(0,0,0,0.2)" }}
      transition={{ duration: 0.2 }}
    >
      {/* Drag Handle - Only visible in expanded mode */}
      {!isEditing && !isCollapsed && (
        <div 
          className="drag-handle" 
          onPointerDown={(e) => dragControls.start(e)}
        >
          ⠿
        </div>
      )}

      <div className="sidebar-item-info">
        <div className="sidebar-item-top">
          {isEditing ? (
            <input
              ref={inputRef}
              className="rename-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="name-wrapper">
              <span className="section-name">
                {isCollapsed ? section.name.replace('Section', 'Sec') : section.name}
              </span>
              {!isCollapsed && (
                <button 
                  className="rename-btn" 
                  onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  title="Rename"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>
          )}
          
          {!isCollapsed && !isEditing && (
            <span className="section-units">
              {(section.lectureUnits + section.labUnits).toFixed(1)}u
            </span>
          )}
        </div>

        {!isCollapsed && !isEditing && (
          <div className="section-meta">
            {section.lectureUnits > 0 && (
              <div className="meta-row">
                <strong>Lec:</strong> {section.lectureDays.join('')} {lecStart}-{lecEnd}
              </div>
            )}
            {section.labUnits > 0 && (
              <div className="meta-row">
                <strong>Lab:</strong> {section.labDays.join('')} {labStart}-{labEnd}
              </div>
            )}
          </div>
        )}
      </div>

      {!isEditing && (
        <button 
          className="delete-item-btn" 
          onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
        >
          <Trash2 size={16} />
        </button>
      )}
    </Reorder.Item>
  );
};

export default React.memo(SidebarItem);
