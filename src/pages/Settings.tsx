import { useAuth } from "../AuthContext";
import { useTheme } from "../ThemeContext";
import { useState } from "react";
import { User, Moon, Edit2, Check, X } from "lucide-react";
import { updateProfile, updateEmail } from "firebase/auth";
import { auth } from "../firebase";
import { clsx } from "clsx";

export function Settings() {

  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [nameLoading, setNameLoading] = useState(false);

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [email, setEmail] = useState(user?.email || "");
  const [emailLoading, setEmailLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Check if logged in via Google SSO
  const isGoogleUser = user?.providerData.some(p => p.providerId === 'google.com');

  const handleSaveName = async () => {
    if (!user) return;
    setNameLoading(true);
    try {
      await updateProfile(user, { displayName });
      setIsEditingName(false);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setNameLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!user) return;
    setEmailLoading(true);
    try {
      await updateEmail(user, email);
      setIsEditingEmail(false);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-[#0a0a0a] p-6 lg:p-12 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-widest mb-4 leading-tight">System Settings</h1>
          <p className="text-sm font-sans text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Manage your account and system preferences.
          </p>
        </header>

        <div className="space-y-8">
          {/* Profile Section */}
          <section className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-red-600 dark:text-red-500" />
              <h2 className="text-sm font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-widest font-bold">Account Profile</h2>
            </div>
            
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-mono">
                {errorMsg}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Display Name */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-2">Display Name</label>
                <div className="relative">
                  {isEditingName ? (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white dark:bg-[#0a0a0a] border border-zinc-300 dark:border-zinc-700 text-sm font-sans text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-red-500"
                      />
                      <button onClick={handleSaveName} disabled={nameLoading} className="p-2 bg-red-600 text-white hover:bg-red-700 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setIsEditingName(false); setDisplayName(user?.displayName || ""); }} className="p-2 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-sm font-sans text-zinc-900 dark:text-zinc-100">
                      <span>{user?.displayName || "Unknown User"}</span>
                      <button onClick={() => setIsEditingName(true)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Email Address */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mb-2">Email Address</label>
                <div className="relative">
                  {isGoogleUser ? (
                    <div className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-sans text-zinc-400 dark:text-zinc-600 italic">
                      {user?.email} (Google SSO)
                    </div>
                  ) : isEditingEmail ? (
                    <div className="flex gap-2">
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white dark:bg-[#0a0a0a] border border-zinc-300 dark:border-zinc-700 text-sm font-sans text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-red-500"
                      />
                      <button onClick={handleSaveEmail} disabled={emailLoading} className="p-2 bg-red-600 text-white hover:bg-red-700 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setIsEditingEmail(false); setEmail(user?.email || ""); }} className="p-2 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-sm font-sans text-zinc-900 dark:text-zinc-100">
                      <span>{user?.email}</span>
                      <button onClick={() => setIsEditingEmail(true)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Preferences Section */}
          <section className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Moon className="w-5 h-5 text-red-600 dark:text-red-500" />
              <h2 className="text-sm font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-widest font-bold">Preferences</h2>
            </div>
            
            <div className="flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800/50">
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">Dark Mode</h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">Toggle dark theme for the interface.</p>
              </div>
              <button 
                onClick={toggleTheme}
                className={clsx(
                  "w-12 h-6 rounded-full transition-colors relative",
                  theme === 'dark' ? "bg-red-600" : "bg-zinc-300 dark:bg-zinc-700"
                )}
              >
                <div className={clsx(
                  "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform",
                  theme === 'dark' ? "left-7" : "left-1"
                )} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
