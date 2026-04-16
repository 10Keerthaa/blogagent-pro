'use client';

import React from 'react';
import { DashboardProvider, useDashboard } from './components/context/DashboardContext';
import { SidebarForm } from './components/features/SidebarForm';
import { TabNavigation } from './components/features/TabNavigation';
import { PostPreview } from './components/features/PostPreview';
import { ReviewList } from './components/features/ReviewList';
import { HistoryList } from './components/features/HistoryList';
import { Login } from './components/features/Login';
import { X, XCircle } from 'lucide-react';

const DashboardContent = () => {
  const { activeTab, error, setError, user, selectedReviewDraft, isPreviewOpen } = useDashboard();

  // Sidebar visibility rule:
  // Show only on the 'create' tab (where the form is needed)
  // OR when a review draft is actively open
  // Hidden on bare review list & history tab (History is always full screen) — List-First experience
  const showSidebar = 
    activeTab === 'create' || 
    (activeTab === 'review' && !!selectedReviewDraft);

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060606] transition-colors duration-500 overflow-x-hidden">
      {/* ELITE LAYOUT SHELL: Centered Max-Width Container */}
      <div className="max-w-[1440px] mx-auto min-h-screen flex flex-col lg:flex-row shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-[#0a0a0a]">

        {/* LEFT PANEL: Sidebar Form — 40:60 asymmetrical Focus-Flow split with cinematic 500ms transition */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden shrink-0
            ${showSidebar ? 'w-full lg:w-[40%] opacity-100 pointer-events-auto' : 'w-0 opacity-0 pointer-events-none'}`}
        >
          <SidebarForm />
        </div>

        {/* RIGHT PANEL: Dynamic Workspace — 40:60 asymmetrical Focus-Flow split with cinematic 500ms transition */}
        <main className={`flex-1 flex flex-col min-w-0 overflow-hidden relative border-l border-slate-100 dark:border-slate-900 transition-all duration-500 ease-in-out !pl-0 !pr-8 !pb-8 !pt-0
          ${showSidebar ? 'lg:w-[60%]' : 'w-full'}`}>
          {/* Top Segmented Navigation (Elite) */}
          <TabNavigation />

          {/* Scrollable Workspace */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar scroll-smooth">
            {/* Elite Error Banner */}
            {error && (
              <div
                role="alert"
                className="mb-8 p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-none text-red-600 dark:text-red-500 text-xs font-semibold flex items-center justify-between animate-fadeIn shadow-sm hover:shadow-md transition-all"
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

export default function BlogAgentPro() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}