import { useState } from 'react';
import {
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

const SubtaskItem = ({ subtask, onUpdate, onDelete, onToggle }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle.trim() !== subtask.title) {
      onUpdate(subtask._id, { title: editTitle.trim() });
    }
    setIsEditing(false);
    setEditTitle(subtask.title);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(subtask.title);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="flex items-center space-x-2 py-2 px-3 bg-gray-50 rounded-md">
      {/* Completion Checkbox */}
      <button
        onClick={() => onToggle(subtask._id)}
        className="flex-shrink-0"
      >
        {subtask.isCompleted ? (
          <CheckCircleIconSolid className="h-5 w-5 text-green-600" />
        ) : (
          <CheckCircleIcon className="h-5 w-5 text-gray-400 hover:text-green-600" />
        )}
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            onBlur={handleSaveEdit}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
        ) : (
          <span 
            className={`text-sm ${subtask.isCompleted ? 'line-through text-gray-500' : 'text-gray-700'}`}
            onDoubleClick={() => setIsEditing(true)}
          >
            {subtask.title}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1">
        {isEditing ? (
          <>
            <button
              onClick={handleSaveEdit}
              className="p-1 text-green-600 hover:text-green-800"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-blue-600"
            >
              <PencilIcon className="h-3 w-3" />
            </button>
            <button
              onClick={() => onDelete(subtask._id)}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SubtaskItem;
