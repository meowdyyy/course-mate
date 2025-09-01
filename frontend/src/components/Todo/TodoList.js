import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import TodoItem from './TodoItem';
import CreateTodoModal from './CreateTodoModal';
import LoadingSpinner from '../Common/LoadingSpinner';
import { reward, showGifToast } from '../../utils/gamification';
import CompletedTimelineInline from './CompletedTimelineInline';

const TodoList = () => {
  const navigate = useNavigate();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0, overdue: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
  completed: 'false',
    taskType: 'all',
    priority: 'all',
    search: '',
    tags: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const pendingCompletionsRef = useRef(new Map()); // todoId -> { timerId, rewardInfo, prevTodo }

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all' && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      const response = await axios.get(`/api/todos?${params.toString()}`);
      const todosData = response.data.todos;
      setTodos(todosData);

      //Extract all unique tags from todos
      const allTags = new Set();
      todosData.forEach(todo => {
        if (todo.tags && Array.isArray(todo.tags)) {
          todo.tags.forEach(tag => allTags.add(tag));
        }
      });
      setAvailableTags(Array.from(allTags).sort());
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast.error('Failed to fetch todos');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTodos();
    fetchStats();
  }, [filters, fetchTodos]);

  // When timeline reverts a task, refresh list and stats so it shows up in pending
  useEffect(() => {
    const onReverted = () => {
      fetchTodos();
      fetchStats();
      toast('Task moved back to pending');
    };
    window.addEventListener('todo:reverted', onReverted);
    return () => window.removeEventListener('todo:reverted', onReverted);
  }, [fetchTodos]);

  // Daily completion reward is handled after finalize in handleToggleTodo to avoid reload/history triggers.

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/todos/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateTodo = async (todoData) => {
    try {
      const response = await axios.post('/api/todos', todoData);
      setTodos(prev => [response.data, ...prev]);
      setShowCreateModal(false);
      fetchStats();
      toast.success('Todo created successfully');
    } catch (error) {
      console.error('Error creating todo:', error);
      toast.error('Failed to create todo');
    }
  };

  const handleUpdateTodo = async (todoId, updates) => {
    try {
      const response = await axios.put(`/api/todos/${todoId}`, updates);
      setTodos(prev => prev.map(todo => 
        todo._id === todoId ? response.data : todo
      ));
      fetchStats();
      toast.success('Todo updated successfully');
    } catch (error) {
      console.error('Error updating todo:', error);
      toast.error('Failed to update todo');
    }
  };

  const handleDeleteTodo = async (todoId) => {
    try {
      await axios.delete(`/api/todos/${todoId}`);
      setTodos(prev => prev.filter(todo => todo._id !== todoId));
      fetchStats();
      toast.success('Todo deleted successfully');
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete todo');
    }
  };

  const handleToggleTodo = async (todoId) => {
    try {
      // Capture previous state to determine if we just completed it
      const prevTodo = todos.find(t => t._id === todoId);
      const response = await axios.put(`/api/todos/${todoId}/toggle`);
      setTodos(prev => {
        const updated = prev.map(todo => 
          todo._id === todoId ? { ...response.data, __justCompleted: !prevTodo?.isCompleted && response.data.isCompleted } : todo
        );
        // If now completed, remove from main list quickly after animation
        if (!prevTodo?.isCompleted && response.data.isCompleted) {
          setTimeout(() => {
            setTodos(p => p.filter(t => t._id !== todoId));
          }, 400);
        }
        return updated;
      });
      fetchStats();
      // If just completed, show Undo option and delay rewards for a short window
      if (prevTodo && !prevTodo.isCompleted && response.data.isCompleted) {
        const priority = (response.data.priority || 'Low');
        const priorityCoins = { Low: 1, Medium: 2, High: 3, Urgent: 5 }[priority] || 1;
        const priorityExp = { Low: 0.01, Medium: 0.02, High: 0.03, Urgent: 0.05 }[priority] || 0.01;

        // Emit for timeline immediately
        window.dispatchEvent(new CustomEvent('todo:completed', { detail: { todo: response.data } }));

        const finalize = async () => {
          await reward({ expPercent: priorityExp, coins: priorityCoins });
          toast.success(`Task completed! +${priorityCoins} coins, +${Math.round(priorityExp*100)}% EXP`);
          pendingCompletionsRef.current.delete(todoId);

          // Daily completion reward: check after the grace window to avoid false positives on Undo
          try {
            const statsRes = await axios.get('/api/todos/stats');
            const st = statsRes.data || {};
            const allCompletedNow = st.total > 0 && st.completed === st.total;
            const todayKey = new Date().toISOString().slice(0,10);
            const storeKey = `todos:dailyCompleteReward:${todayKey}`;
            const already = !!localStorage.getItem(storeKey);
            if (allCompletedNow && !already) {
              await reward({ expPercent: 0.10, coins: 10 });
              showGifToast('/assets/todolistsuccess.gif', 3000, 'Daily list complete! +10 coins, +10% EXP');
              toast.success('Daily list completed! +10 coins, +10% EXP');
              try { localStorage.setItem(storeKey, '1'); } catch {}
            }
          } catch {}
        };
        const timerId = setTimeout(finalize, 5000);
        pendingCompletionsRef.current.set(todoId, { timerId, rewardInfo: { priorityExp, priorityCoins }, prevTodo });

  toast.custom((t) => (
          <div className="bg-white shadow-lg border border-gray-200 rounded-md p-3 flex items-center gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <div className="text-sm text-gray-800">Marked complete. <span className="text-gray-500">Undo?</span></div>
            <button
              onClick={async () => {
                const pending = pendingCompletionsRef.current.get(todoId);
                if (pending) {
                  clearTimeout(pending.timerId);
                  pendingCompletionsRef.current.delete(todoId);
                }
                try {
                  // Toggle again to revert on server
                  await axios.put(`/api/todos/${todoId}/toggle`);
                  // Bring it back to the list at the top for visibility
                  setTodos(prev => [pending?.prevTodo || prevTodo, ...prev]);
                  fetchStats();
                  // Inform timeline to remove this entry
                  window.dispatchEvent(new CustomEvent('todo:uncompleted', { detail: { todoId } }));
                  toast.dismiss(t.id);
                  toast('Undone');
                } catch (e) {
                  toast.error('Failed to undo');
                }
              }}
              className="ml-2 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
            >Undo</button>
          </div>
        ), { duration: 5000 });
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
      toast.error('Failed to update todo');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getFilteredTodos = () => {
    let filteredTodos = todos;

    //Filter by tags if specified
    if (filters.tags && filters.tags !== 'all') {
      filteredTodos = filteredTodos.filter(todo =>
        todo.tags && todo.tags.includes(filters.tags)
      );
    }

    return filteredTodos;
  };

  const taskTypes = ['Midterm', 'Final', 'Quiz', 'Assignment', 'Personal', 'Study', 'Project', 'Other'];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Todo List</h1>
            <p className="text-gray-600">Manage your tasks and stay organized</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/focus')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <BoltIcon className="h-4 w-4 mr-2" />
              Focus Mode
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Todo
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total - stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Overdue</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.overdue}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
              </button>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search todos..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.completed}
                  onChange={(e) => handleFilterChange('completed', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">All</option>
                  <option value="false">Pending</option>
                  <option value="true">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                <select
                  value={filters.taskType}
                  onChange={(e) => handleFilterChange('taskType', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">All Types</option>
                  {taskTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">All Priorities</option>
                  {priorities.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <select
                  value={filters.tags}
                  onChange={(e) => handleFilterChange('tags', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="all">All Tags</option>
                  {availableTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="createdAt">Created Date</option>
                  <option value="dueDate">Due Date</option>
                  <option value="priority">Priority</option>
                  <option value="title">Title</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Todo List */}
      <div className="space-y-4">
        {getFilteredTodos().length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No todos found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.completed !== 'all' || filters.taskType !== 'all' || filters.priority !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by creating your first todo.'}
            </p>
            {!filters.search && filters.completed === 'all' && filters.taskType === 'all' && filters.priority === 'all' && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add your first todo
                </button>
              </div>
            )}
          </div>
        ) : (
          getFilteredTodos().map(todo => (
            <div key={todo._id} className={todo.__justCompleted ? 'transition-all duration-300 ease-out opacity-0 translate-x-4' : ''}>
              <TodoItem
                todo={todo}
                onUpdate={handleUpdateTodo}
                onDelete={handleDeleteTodo}
                onToggle={handleToggleTodo}
              />
            </div>
          ))
        )}
      </div>

      {/* Inline Completed Timeline */}
      <CompletedTimelineInline />

      {/* Create Todo Modal */}
      {showCreateModal && (
        <CreateTodoModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTodo}
        />
      )}
    </div>
  );
};

export default TodoList;
