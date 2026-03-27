'use client';

import React from 'react';
import { DashboardProvider, useDashboard } from './components/context/DashboardContext';
import { SidebarForm } from './components/features/SidebarForm';
import { TabNavigation } from './components/features/TabNavigation';
import { PostPreview } from './components/features/PostPreview';
import { ReviewList } from './components/features/ReviewList';
import { HistoryList } from './components/features/HistoryList';
import { X, XCircle, Settings } from 'lucide-react';

import { Sidebar } from './components/features/Sidebar';

const DashboardContent = () => {
  const { activeTab, error, setError } = useDashboard();

  return (
    <div className="min-h-screen bg-white dark:bg-[#060606] flex overflow-hidden">
      {/* LEFT SIDEBAR: Professional SaaS Navigation */}
      <Sidebar />

      {/* MAIN CONTENT AREA: Dynamic Workspace */}
      <main className="flex-1 ml-[280px] h-screen flex flex-col relative overflow-hidden bg-slate-50/50 dark:bg-[#080808]">
        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
          {/* Global Error Banner */}
          {error && (
            <div className="max-w-4xl mx-auto mt-8 px-8">
              <div
                role="alert"
                className="p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl text-red-600 dark:text-red-500 text-xs font-semibold flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="leading-relaxed">{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Views */}
          <div className="min-h-full">
            {activeTab === 'create' && (
              <div className="max-w-4xl mx-auto py-12 px-8">
                <SidebarForm />
              </div>
            )}
            {activeTab === 'review' && (
              <div className="max-w-5xl mx-auto py-12 px-8">
                <ReviewList />
              </div>
            )}
            {activeTab === 'editor' && (
              <PostPreview />
            )}
            {activeTab === 'history' && (
              <div className="max-w-5xl mx-auto py-12 px-8">
                <HistoryList />
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="max-w-4xl mx-auto py-24 px-8 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Settings className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">System Settings</h2>
                <p className="text-slate-500 text-sm">Drafting multi-user and workspace configurations...</p>
              </div>
            )}
          </div>
        </div>
      </main>
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