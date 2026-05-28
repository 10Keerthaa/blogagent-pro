'use client';

import React from 'react';
import { DashboardProvider, useDashboard } from './components/context/DashboardContext';
import { SidebarForm } from './components/features/SidebarForm';
import { TabNavigation } from './components/features/TabNavigation';
import { PostPreview } from './components/features/PostPreview';
import { ReviewList } from './components/features/ReviewList';
import { HistoryList } from './components/features/HistoryList';
import { Login } from './components/features/Login';
import { X, XCircle, Loader2, CheckCircle, Sparkles } from 'lucide-react';

const DashboardContent = () => {
  const { 
    activeTab, error, setError, user, selectedReviewDraft, isPreviewOpen,
    isInfographicRefining, isApplyingFeedback
  } = useDashboard();

  const [showSuccessToast, setShowSuccessToast] = React.useState(false);
  const [successType, setSuccessType] = React.useState<'text' | 'image'>('text');
  
  const prevIsApplyingFeedback = React.useRef(isApplyingFeedback);
  const prevIsInfographicRefining = React.useRef(isInfographicRefining);

  React.useEffect(() => {
    if (prevIsApplyingFeedback.current && !isApplyingFeedback) {
      setSuccessType('text');
      setShowSuccessToast(true);
      const timer = setTimeout(() => setShowSuccessToast(false), 4000);
      return () => clearTimeout(timer);
    }
    prevIsApplyingFeedback.current = isApplyingFeedback;
  }, [isApplyingFeedback]);

  React.useEffect(() => {
    if (prevIsInfographicRefining.current && !isInfographicRefining) {
      setSuccessType('image');
      setShowSuccessToast(true);
      const timer = setTimeout(() => setShowSuccessToast(false), 4000);
      return () => clearTimeout(timer);
    }
    prevIsInfographicRefining.current = isInfographicRefining;
  }, [isInfographicRefining]);

  // Sidebar visibility rule:
  // Show on 'create' tab always (split screen preserved)
  // Also show when a review draft is actively open
  // Hidden on bare review list & history tab — List-First experience
  const showSidebar =
    activeTab === 'create' ||
    (activeTab === 'review' && !!selectedReviewDraft);

  if (!user) {
    return <Login />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-[#060606] overflow-hidden relative">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-slideIn {
          animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />



      {/* Floating Success Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-6 right-6 z-[9999] pointer-events-auto animate-slideIn">
          <div className="bg-emerald-500 text-white border border-emerald-600 rounded-xl px-5 py-4 shadow-2xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-white shrink-0 animate-scaleIn" />
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest leading-none">
                {successType === 'text' ? 'Refinement Complete!' : 'Visual Updated!'}
              </span>
              <span className="text-[10px] opacity-90 mt-1.5 font-medium leading-none">
                {successType === 'text' ? 'Post updated and auto-saved.' : 'New custom infographic generated.'}
              </span>
            </div>
            <button 
              onClick={() => setShowSuccessToast(false)}
              className="p-1 hover:bg-emerald-600 rounded transition-colors ml-2"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ELITE GLOBAL HEADER (Part 1 - App Name, Tabs, Admin Console, User Profile) */}
      <TabNavigation />

      <div className="flex-1 flex overflow-hidden md:flex-row flex-col bg-slate-50 dark:bg-[#0a0a0a]">
        {/* LEFT PANEL: Sidebar Form (Part 2 - Topic, Keywords, Description) */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden shrink-0 border-r border-slate-200 dark:border-slate-800
            ${showSidebar 
              ? `w-full md:w-[32%] ${activeTab === 'review' ? 'lg:w-[30%] xl:w-[30%]' : 'lg:w-[28%] xl:w-[25%]'}` 
              : 'w-0 opacity-0 pointer-events-none'}`}
        >
          <SidebarForm />
        </div>

        {/* RIGHT PANEL: Dynamic Workspace (Part 3 - Editor Area) */}
        <main className={`flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-500 ease-in-out
          ${showSidebar 
            ? `md:w-[68%] ${activeTab === 'review' ? 'lg:w-[70%] xl:w-[70%]' : 'lg:w-[72%] xl:w-[75%]'}` 
            : 'w-full'}`}>

          {/* Frosted Glass Workspace Overlay for AI Text Refinement */}
          {isApplyingFeedback && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[3px] z-[40] flex flex-col items-center justify-center pointer-events-auto transition-all animate-fadeIn">
              <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-2xl rounded-2xl max-w-sm text-center animate-scaleIn">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-violet-100 dark:border-violet-950 animate-ping absolute inset-0" />
                  <div className="w-12 h-12 rounded-full border-2 border-violet-500 dark:border-violet-600 flex items-center justify-center bg-violet-50 dark:bg-violet-950/50">
                    <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">AI Refining Content</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Surgically updating headers, keywords, and tone constraints in real-time. Please wait...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Frosted Glass Workspace Overlay for AI Infographic Refinement */}
          {isInfographicRefining && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[3px] z-[40] flex flex-col items-center justify-center pointer-events-auto transition-all animate-fadeIn">
              <div className="flex flex-col items-center gap-4 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-2xl rounded-2xl max-w-sm text-center animate-scaleIn">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-violet-100 dark:border-violet-950 animate-ping absolute inset-0" />
                  <div className="w-12 h-12 rounded-full border-2 border-violet-500 dark:border-violet-600 flex items-center justify-center bg-violet-50 dark:bg-violet-950/50">
                    <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Visual Refining</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Regenerating custom glassmorphic canvas overlay on Google Cloud. Please wait...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Scrollable Workspace */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar scroll-smooth">
            {/* Elite Error Banner */}
            {error && (
              <div
                role="alert"
                className="mb-8 p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-none text-red-600 dark:text-red-500 text-xs font-semibold flex items-center justify-between animate-fadeIn shadow-sm hover:shadow-md transition-all animate-scaleIn"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="leading-relaxed">{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-colors"
                  aria-label="Dismiss error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Dynamic Views with Elite Motion */}
            <div className="h-full flex flex-col w-full">
              {activeTab === 'create' && <PostPreview />}
              {activeTab === 'review' && <ReviewList />}
              {activeTab === 'history' && <HistoryList />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default function TenXBlogagent() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}