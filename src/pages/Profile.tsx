import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { updateProfile, deleteUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { User, Shield, AlertTriangle, Save, X } from 'lucide-react';

export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await updateProfile(user, { displayName });
      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('');

  const handleDelete = async () => {
    if (!user) return;
    if (deleteEmailConfirm !== user.email) {
      setError("Email does not match. Please type your email correctly to confirm deletion.");
      return;
    }
    
    setIsDeleting(true);
    setError('');
    try {
      await deleteUser(user);
      navigate('/login');
    } catch (err: any) {
      setError('Requires recent authentication. Please log out and log back in to delete your account.');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-[#0a0a0a] p-6 lg:p-12 text-zinc-900 dark:text-zinc-300 transition-colors duration-200">
      <div className="max-w-2xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-4 leading-tight">User Profile</h1>
          <p className="text-sm font-sans text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Manage your account settings and preferences.
          </p>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500 text-sm font-mono flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-8 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-500 text-sm font-mono flex items-center gap-3">
            <Shield className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        <div className="space-y-8">
          <section className="p-8 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <h2 className="text-sm font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <User className="w-4 h-4" /> Personal Information
            </h2>
            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-zinc-500 dark:text-zinc-500 uppercase tracking-widest mb-2">Email Address</label>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500 px-4 py-3 font-mono text-sm cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-500 dark:text-zinc-500 uppercase tracking-widest mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-transparent border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-500 dark:focus:border-red-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 px-6 py-3 font-mono text-sm uppercase tracking-widest hover:bg-zinc-800 dark:hover:bg-white transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Update Profile'}
              </button>
            </form>
          </section>

          <section className="p-8 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/10">
            <h2 className="text-sm font-mono text-red-600 dark:text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Danger Zone
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-400 mb-6">
              Permanently remove your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500 text-sm font-mono uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              Delete Account
            </button>
          </section>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/80 dark:bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-[#0a0a0a] border border-red-200 dark:border-red-900/50 p-6 md:p-8 shadow-2xl relative">
            <button 
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteEmailConfirm('');
                setError('');
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-mono text-red-600 dark:text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Danger Zone
            </h2>
            <p className="text-sm text-zinc-700 dark:text-zinc-400 mb-6">
              Once you delete your account, there is no going back. Please be certain. To confirm, type your email address below.
            </p>
            <div className="flex flex-col gap-4">
              <input
                type="email"
                placeholder={user.email || ''}
                value={deleteEmailConfirm}
                onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                className="w-full bg-transparent border border-red-300 dark:border-red-900/50 text-zinc-900 dark:text-zinc-100 px-4 py-3 font-mono text-sm focus:outline-none focus:border-red-600 dark:focus:border-red-500 transition-colors placeholder:text-red-300 dark:placeholder:text-red-900/50"
              />
              <button
                onClick={handleDelete}
                disabled={isDeleting || deleteEmailConfirm !== user.email}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 dark:bg-red-500/20 border border-transparent dark:border-red-900/50 text-white dark:text-red-500 text-sm font-mono uppercase tracking-widest hover:bg-red-700 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deactivating...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
