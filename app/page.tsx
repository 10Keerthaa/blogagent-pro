'use client';

import React from 'react';
import { DashboardProvider, useDashboard } from './components/context/DashboardContext';
import { SidebarForm } from './components/features/SidebarForm';
import { TabNavigation } from './components/features/TabNavigation';
import { PostPreview } from './components/features/PostPreview';
import { ReviewList } from './components/features/ReviewList';
import { HistoryList } from './components/features/HistoryList';
import { X, XCircle } from 'lucide-react';

const DashboardContent = () => {
  const { activeTab, error, setError } = useDashboard();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060606] transition-colors duration-500 overflow-x-hidden">
      {/* ELITE LAYOUT SHELL: Centered Max-Width Container */}
      <div className="max-w-[1440px] mx-auto min-h-screen flex flex-col lg:flex-row shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-[#0a0a0a]">

        {/* LEFT PANEL: Sidebar Form (Refined) */}
        <SidebarForm />

        {/* RIGHT PANEL: Dynamic Workspace (Refined) */}
        <main className="flex-1 lg:w-1/2 flex flex-col min-w-0 overflow-hidden relative border-l border-slate-100 dark:border-slate-900">
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