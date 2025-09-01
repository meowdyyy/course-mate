import { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import EditTodoModal from './EditTodoModal';
import SubtaskItem from './SubtaskItem';
import axios from 'axios';
import toast from 'react-hot-toast';

const TodoItem = ({ todo, onUpdate, onDelete, onToggle }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent': return 'text-red-600 bg-red-100';
      case 'High': return 'text-orange-600 bg-orange-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTaskTypeColor = (taskType) => {
    switch (taskType) {
      case 'Midterm': return 'text-purple-600 bg-purple-100';
      case 'Final': return 'text-red-600 bg-red-100';
      case 'Quiz': return 'text-blue-600 bg-blue-100';
      case 'Assignment': return 'text-indigo-600 bg-indigo-100';
      case 'Study': return 'text-green-600 bg-green-100';
      case 'Project': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.isCompleted;
  const completionPercentage = todo.subtasks.length > 0 
    ? Math.round((todo.subtasks.filter(st => st.isCompleted).length / todo.subtasks.length) * 100)
    : (todo.isCompleted ? 100 : 0);

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    try {
      setAddingSubtask(true);
      const response = await axios.post(`/api/todos/${todo._id}/subtasks`, {
        title: newSubtaskTitle.trim()
      });
      onUpdate(todo._id, response.data);
      setNewSubtaskTitle('');
      toast.success('Subtask added successfully');
    } catch (error) {
      console.error('Error adding subtask:', error);
      toast.error('Failed to add subtask');
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleUpdateSubtask = async (subtaskId, updates) => {
    try {
      const response = await axios.put(`/api/todos/${todo._id}/subtasks/${subtaskId}`, updates);
      onUpdate(todo._id, response.data);
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      const response = await axios.delete(`/api/todos/${todo._id}/subtasks/${subtaskId}`);
      onUpdate(todo._id, response.data);
      toast.success('Subtask deleted successfully');
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast.error('Failed to delete subtask');
    }
  };

  const handleToggleSubtask = async (subtaskId) => {
    try {
      const response = await axios.put(`/api/todos/${todo._id}/subtasks/${subtaskId}/toggle`);
      onUpdate(todo._id, response.data);
    } catch (error) {
      console.error('Error toggling subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${isOverdue ? 'border-red-200' : 'border-gray-200'} hover:shadow-md transition-shadow`}>
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Completion Checkbox */}
          <button
            onClick={() => onToggle(todo._id)}
            className="flex-shrink-0 mt-1"
          >
            {todo.isCompleted ? (
              <CheckCircleIconSolid className="h-6 w-6 text-green-600" />
            ) : (
              <CheckCircleIcon className="h-6 w-6 text-gray-400 hover:text-green-600" />
            )}
          </button>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className={`text-lg font-medium ${todo.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {todo.title}
                </h3>
                
                {todo.description && (
                  <p className={`mt-1 text-sm ${todo.isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                    {todo.description}
                  </p>
                )}

                {/* Tags and Metadata */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTaskTypeColor(todo.taskType)}`}>
                    {todo.taskType}
                  </span>
                  
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                    {todo.priority}
                  </span>

                  {todo.dueDate && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isOverdue ? 'text-red-600 bg-red-100' : 'text-blue-600 bg-blue-100'
                    }`}>
                      <ClockIcon className="h-3 w-3 mr-1" />
                      Due {format(new Date(todo.dueDate), 'MMM dd, yyyy')}
                    </span>
                  )}

                  {isOverdue && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-red-600 bg-red-100">
                      <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                      Overdue
                    </span>
                  )}

                  {todo.course && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-purple-600 bg-purple-100">
                      {todo.course.courseCode}
                    </span>
                  )}

                  {/* Tags */}
                  {todo.tags && todo.tags.length > 0 && todo.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
                      title={`Filter by tag: ${tag}`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Progress Bar for Subtasks */}
                {todo.subtasks.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => onDelete(todo._id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 pl-9 border-t border-gray-100 pt-4">
            {/* Notes */}
            {todo.notes && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{todo.notes}</p>
              </div>
            )}

            {/* Subtasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">
                  Subtasks ({todo.subtasks.filter(st => st.isCompleted).length}/{todo.subtasks.length})
                </h4>
                <button
                  onClick={() => setShowSubtasks(!showSubtasks)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showSubtasks ? 'Hide' : 'Show'} Subtasks
                </button>
              </div>

              {showSubtasks && (
                <div className="space-y-2">
                  {/* Add New Subtask */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Add a subtask..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleAddSubtask}
                      disabled={addingSubtask || !newSubtaskTitle.trim()}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Subtask List */}
                  {todo.subtasks.map(subtask => (
                    <SubtaskItem
                      key={subtask._id}
                      subtask={subtask}
                      onUpdate={handleUpdateSubtask}
                      onDelete={handleDeleteSubtask}
                      onToggle={handleToggleSubtask}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditTodoModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          todo={todo}
          onSubmit={(updates) => {
            onUpdate(todo._id, updates);
            setShowEditModal(false);
          }}
        />
      )}
    </div>
  );
};

export default TodoItem;
