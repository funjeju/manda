"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectsStore } from '@/store/useProjectsStore'; import { useProjectNodesStore } from '@/store/useProjectNodesStore';
import Link from 'next/link';
import { Plus, Users, User as UserIcon, Calendar, ArrowRight, MoreVertical, Pencil, Trash2, X, AlertTriangle, Building2, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { Project, ProjectMode } from '@/lib/types';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { projects, loading, subscribeProjects, updateProject, deleteProject } = useProjectsStore();
  const router = useRouter();

  // Modal States
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  // Edit Form State
  const [editTitle, setEditTitle] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editMode, setEditMode] = useState<ProjectMode>('SOLO');
  const [editInstitution, setEditInstitution] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      const unsub = subscribeProjects(user.uid, user.isAnonymous);
      return () => unsub();
    }
  }, [user, subscribeProjects]);

  // Handlers
  const handleEditClick = (e: React.MouseEvent, project: Project) => {
    e.preventDefault(); // Stop Link
    e.stopPropagation();
    setEditingProject(project);
    setEditTitle(project.title);
    setEditStartDate(project.startDate);
    setEditEndDate(project.endDate);
    setEditMode(project.mode);
    setEditInstitution(project.institutionName || "");
  };

  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingProjectId(projectId);
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !editTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await updateProject(editingProject.id, {
        title: editTitle,
        startDate: editStartDate,
        endDate: editEndDate,
        mode: editMode,
        institutionName: editInstitution
      });
      setEditingProject(null);
    } catch (error) {
      console.error(error);
      alert("Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProjectId) return;
    setIsSubmitting(true);
    try {
      await deleteProject(deletingProjectId);
      setDeletingProjectId(null);
    } catch (error) {
      console.error(error);
      alert("Failed to delete project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative">
      <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">My Projects</h1>
          <p className="text-zinc-400 text-sm">Manage your goals and tasks with Mandalart structure.</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg font-medium transition"
        >
          <Plus size={18} />
          New Project
        </Link>
      </header>

      {loading && projects.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}/mandalart`}
              className="group block bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/50 hover:bg-zinc-800 transition relative overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"
                style={{ backgroundColor: project.colorTag ? `${project.colorTag}10` : undefined }}
              />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div
                    className="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                    style={{ backgroundColor: project.colorTag ? `${project.colorTag}20` : '#333', color: project.colorTag || '#ccc' }}
                  >
                    {project.mode === 'TEAM' ? <Users size={12} /> : <UserIcon size={12} />}
                    {project.mode}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleEditClick(e, project)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition"
                      title="Edit Project"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, project.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                      title="Delete Project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs text-zinc-500">
                    {project.updatedAt ? format(new Date(project.updatedAt), 'MMM d, yyyy') : '-'}
                  </span>
                  {/* Dashboard Link */}
                  <Link
                    href={`/projects/${project.id}/dashboard`}
                    className="flex items-center gap-1 text-sm text-orange-400 hover:underline"
                  >
                    <BarChart2 size={14} /> Dashboard
                  </Link>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 truncate group-hover:text-orange-400 transition-colors">
                  {project.title}
                </h3>

                {/* Progress Bar */}
                <div className="w-full bg-zinc-800 rounded-full h-2 mb-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${useProjectNodesStore.getState().getOverallProgress(project.id)}%` }}
                  />
                </div>
                <div className="text-xs text-zinc-400 mb-2">
                  전체 진행률: {useProjectNodesStore.getState().getOverallProgress(project.id)}%
                </div>

                {project.institutionName && (
                  <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                    <Building2 size={12} /> {project.institutionName}
                  </div>
                )}

                <div className="flex items-center text-sm text-zinc-400 gap-4 mb-6">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {project.startDate} ~ {project.endDate}
                  </div>
                </div>

                <div className="flex items-center text-sm font-medium text-zinc-500 group-hover:text-white transition-colors">
                  Go to Board <ArrowRight size={16} className="ml-1" />
                </div>
              </div>
            </Link>
          ))}

          {/* Empty State / Create Placeholder */}
          {projects.length === 0 && !loading && (
            <Link
              href="/projects/new"
              className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 transition"
            >
              <Plus size={32} className="mb-2" />
              <span className="font-medium">Create your first project</span>
            </Link>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Edit Project</h3>
              <button onClick={() => setEditingProject(null)} className="text-zinc-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Project Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  placeholder="Project Title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Institution / School</label>
                  <input
                    type="text"
                    value={editInstitution}
                    onChange={(e) => setEditInstitution(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Project Mode</label>
                  <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-700">
                    <button
                      type="button"
                      onClick={() => setEditMode('SOLO')}
                      className={clsx(
                        "px-2 py-1.5 rounded text-sm font-medium transition flex items-center justify-center gap-1",
                        editMode === 'SOLO' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <UserIcon size={14} /> Solo
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMode('TEAM')}
                      className={clsx(
                        "px-2 py-1.5 rounded text-sm font-medium transition flex items-center justify-center gap-1",
                        editMode === 'TEAM' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      <Users size={14} /> Team
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setEditingProject(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProject}
                disabled={!editTitle.trim() || isSubmitting}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-red-500/30 rounded-xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">Delete Project?</h3>
            </div>
            <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
              Are you sure you want to delete this project? <br />
              All associated Mandelart nodes and tasks will be <strong>permanently removed</strong>.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingProjectId(null)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
