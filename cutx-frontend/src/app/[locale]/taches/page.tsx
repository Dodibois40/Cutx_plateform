'use client';

import { useState, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Circle,
  CheckCircle2,
  Clock,
  User as UserIcon,
  Calendar,
  MoreVertical,
  Trash2,
  Edit,
} from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  assignedTo?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export default function TachesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium' as const,
  });

  // Mock users
  const users: User[] = [
    { id: '1', name: 'Moi', role: 'Chef' },
    { id: '2', name: 'Jean Dupont', role: 'Ouvrier' },
    { id: '3', name: 'Marie Martin', role: 'Secrétaire' },
    { id: '4', name: 'Pierre Durand', role: 'Collègue' },
  ];

  // Mock tasks
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Finaliser le devis pour le client Dupont',
      description: 'Vérifier les mesures et envoyer le devis',
      status: 'in-progress',
      assignedTo: '3',
      dueDate: '2026-01-15',
      priority: 'high',
      createdAt: '2026-01-10',
    },
    {
      id: '2',
      title: 'Commander les planches de chêne',
      description: '10 planches 2440x1220x18mm',
      status: 'todo',
      assignedTo: '1',
      dueDate: '2026-01-13',
      priority: 'medium',
      createdAt: '2026-01-11',
    },
    {
      id: '3',
      title: 'Découpe des panneaux cuisine',
      status: 'done',
      assignedTo: '2',
      priority: 'medium',
      createdAt: '2026-01-09',
    },
  ]);

  const handleAddTask = useCallback(() => {
    if (!newTask.title) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description || undefined,
      status: 'todo',
      assignedTo: newTask.assignedTo || undefined,
      dueDate: newTask.dueDate || undefined,
      priority: newTask.priority,
      createdAt: new Date().toISOString(),
    };

    setTasks([task, ...tasks]);
    setNewTask({
      title: '',
      description: '',
      assignedTo: '',
      dueDate: '',
      priority: 'medium',
    });
    setShowAddTask(false);
  }, [newTask, tasks]);

  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  }, [tasks]);

  const handleToggleStatus = useCallback((taskId: string) => {
    setTasks(tasks.map(t => {
      if (t.id === taskId) {
        const nextStatus =
          t.status === 'todo' ? 'in-progress' :
          t.status === 'in-progress' ? 'done' :
          'todo';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  }, [tasks]);

  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (assigneeFilter !== 'all' && task.assignedTo !== assigneeFilter) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return <Circle className="w-5 h-5 text-gray-400" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'done':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-500/20 text-gray-400';
      case 'in-progress':
        return 'bg-amber-500/20 text-amber-400';
      case 'done':
        return 'bg-green-500/20 text-green-400';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low':
        return 'bg-blue-500/20 text-blue-400';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400';
      case 'high':
        return 'bg-red-500/20 text-red-400';
    }
  };

  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo').length,
    inProgress: filteredTasks.filter(t => t.status === 'in-progress').length,
    done: filteredTasks.filter(t => t.status === 'done').length,
  };

  return (
    <div className="min-h-screen bg-[var(--cx-background)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--cx-border)] bg-[var(--cx-surface-1)]/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="text-2xl font-black tracking-tighter hover:opacity-80 transition-opacity"
          >
            <span className="text-white">Cut</span>
            <span className="text-amber-500">X</span>
          </button>
          <div className="flex items-center gap-3">
            <CheckSquare className="w-6 h-6 text-orange-500" />
            <h1 className="text-xl font-bold text-white">Gestion des Tâches</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[var(--cx-surface-1)] rounded-xl border border-[var(--cx-border)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--cx-text-muted)]">À faire</p>
                <p className="text-3xl font-bold text-white mt-1">{tasksByStatus.todo}</p>
              </div>
              <Circle className="w-10 h-10 text-gray-400 opacity-50" />
            </div>
          </div>
          <div className="bg-[var(--cx-surface-1)] rounded-xl border border-[var(--cx-border)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--cx-text-muted)]">En cours</p>
                <p className="text-3xl font-bold text-white mt-1">{tasksByStatus.inProgress}</p>
              </div>
              <Clock className="w-10 h-10 text-amber-500 opacity-50" />
            </div>
          </div>
          <div className="bg-[var(--cx-surface-1)] rounded-xl border border-[var(--cx-border)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--cx-text-muted)]">Terminé</p>
                <p className="text-3xl font-bold text-white mt-1">{tasksByStatus.done}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-[var(--cx-surface-1)] rounded-xl border border-[var(--cx-border)] p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--cx-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une tâche..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--cx-background)] border border-[var(--cx-border)] text-white placeholder:text-[var(--cx-text-muted)] focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 rounded-lg bg-[var(--cx-background)] border border-[var(--cx-border)] text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="todo">À faire</option>
              <option value="in-progress">En cours</option>
              <option value="done">Terminé</option>
            </select>

            {/* Assignee filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-4 py-2 rounded-lg bg-[var(--cx-background)] border border-[var(--cx-border)] text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="all">Toutes les personnes</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>

            {/* Add task button */}
            <Button
              onClick={() => setShowAddTask(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nouvelle tâche
            </Button>
          </div>
        </div>

        {/* Add task form */}
        {showAddTask && (
          <div className="bg-[var(--cx-surface-1)] rounded-xl border border-[var(--cx-border)] p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Nouvelle tâche</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--cx-text)] mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Ex: Finaliser le projet X"
                  className="w-full px-4 py-2 rounded-lg bg-[var(--cx-background)] border border-[var(--cx-border)] text-white placeholder:text-[var(--cx-text-muted)] focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--cx-text)] mb-2">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Détails de la tâche..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--cx-background)] border border-[var(--cx-border)] text-white placeholder:text-[var(--cx-text-muted)] focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--cx-text)] mb-2">
                    Affecter à
                  </label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-[var(--cx-background)] border border-[var(--cx-border)] text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Non assigné</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--cx-text)] mb-2">
                    Date limite
                  </label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-[var(--cx-background)] border border-[var(--cx-border)] text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--cx-text)] mb-2">
                    Priorité
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-lg bg-[var(--cx-background)] border border-[var(--cx-border)] text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleAddTask}
                  disabled={!newTask.title}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2 rounded-lg disabled:opacity-50"
                >
                  Créer la tâche
                </Button>
                <Button
                  onClick={() => setShowAddTask(false)}
                  className="bg-[var(--cx-background)] hover:bg-[var(--cx-surface-1)] text-white border border-[var(--cx-border)] px-6 py-2 rounded-lg"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tasks list */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="bg-[var(--cx-surface-1)] rounded-xl border border-[var(--cx-border)] p-12 text-center">
              <CheckSquare className="w-16 h-16 text-[var(--cx-text-muted)] mx-auto mb-4 opacity-50" />
              <p className="text-[var(--cx-text-muted)]">Aucune tâche trouvée</p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const assignee = users.find(u => u.id === task.assignedTo);
              return (
                <div
                  key={task.id}
                  className="bg-[var(--cx-surface-1)] rounded-xl border border-[var(--cx-border)] p-4 hover:border-amber-500/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Status icon */}
                    <button
                      onClick={() => handleToggleStatus(task.id)}
                      className="flex-shrink-0 mt-1 hover:scale-110 transition-transform"
                    >
                      {getStatusIcon(task.status)}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className={`font-semibold text-white mb-1 ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-[var(--cx-text-muted)] mb-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Status badge */}
                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(task.status)}`}>
                              {task.status === 'todo' && 'À faire'}
                              {task.status === 'in-progress' && 'En cours'}
                              {task.status === 'done' && 'Terminé'}
                            </span>
                            {/* Priority badge */}
                            <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                              {task.priority === 'low' && 'Basse'}
                              {task.priority === 'medium' && 'Moyenne'}
                              {task.priority === 'high' && 'Haute'}
                            </span>
                            {/* Assignee */}
                            {assignee && (
                              <span className="text-xs text-[var(--cx-text-muted)] flex items-center gap-1">
                                <UserIcon className="w-3 h-3" />
                                {assignee.name}
                              </span>
                            )}
                            {/* Due date */}
                            {task.dueDate && (
                              <span className="text-xs text-[var(--cx-text-muted)] flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Actions */}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-[var(--cx-text-muted)] hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
