'use client';

import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';
import { Skeleton } from '../ui/Skeleton';
import {
    FileText, Calendar, ArrowRight, X, CheckCircle, XCircle, BarChart2, Zap
} from 'lucide-react';

export const ReviewList = () => {
    const {
        reviewDrafts, isFetchingDrafts,
        selectedReviewDraft, setSelectedReviewDraft,
        isRejecting, handleRejectDraft,
        isSavingManual, handleSaveManualEdits,
        isPublished, handleApproveDraft,
        feedback, setFeedback,
        isApplyingFeedback, handleApplyReviewFeedback,
        isGeneratingInfographic, handleGenerateInfographic,
        infographicUrl
    } = useDashboard();

    if (selectedReviewDraft) {
        return (
            <div className="animate-fadeIn max-w-4xl mx-auto w-full space-y-12 pb-24 transition-all duration-300">
                {/* Header Actions */}
                <div className="flex items-center justify-between sticky top-[-1px] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl z-20 py-8 border-b border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-6">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedReviewDraft(null)} className="h-10">
                            <X className="w-4 h-4 mr-3" />
                            Return
                        </Button>
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                        <Badge variant="pending" className="px-4 py-1">Editorial Review</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRejectDraft(selectedReviewDraft.id)}
                            isLoading={isRejecting}
                            className="whitespace-nowrap px-5 py-2.5"
                        >
                            Reject
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApproveDraft(selectedReviewDraft)}
                            isLoading={isPublished}
                            className="whitespace-nowrap px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 dark:shadow-none"
                        >
                            <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                            Approve & Publish
                        </Button>
                    </div>
                </div>

                {/* content Section */}
                <section className="space-y-10">
                    <Input
                        label="Editorial Title"
                        value={selectedReviewDraft.title}
                        onChange={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, title: e.target.value })}
                        className="text-3xl font-extrabold py-8 px-0 border-none bg-transparent focus:ring-0 focus:border-indigo-500 rounded-none border-b border-slate-100 dark:border-slate-800 tracking-tight"
                    />

                    {selectedReviewDraft.imageUrl && (
                        <Card className="rounded-[2.5rem] shadow-sm hover:shadow-md border-slate-200">
                            <img src={selectedReviewDraft.imageUrl} alt="Featured" className="w-full h-auto object-cover max-h-[460px]" />
                        </Card>
                    )}

                    <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => setSelectedReviewDraft({ ...selectedReviewDraft, content: e.currentTarget.innerHTML })}
                        dangerouslySetInnerHTML={{ __html: selectedReviewDraft.content }}
                        className="text-slate-600 dark:text-slate-300 text-base leading-relaxed prose prose-indigo dark:prose-invert max-w-none focus:outline-none min-h-[500px]"
                    />
                </section>

                {/* Action Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-16 border-t border-slate-100 dark:border-slate-800/50">
                    <Card className="p-8 rounded-3xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-6">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Contextual Refinement</h4>
                        <Textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Inject directives..."
                            className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 min-h-[120px] shadow-sm"
                        />
                        <Button variant="secondary" onClick={handleApplyReviewFeedback} isLoading={isApplyingFeedback} disabled={!feedback} className="w-full h-14">
                            Apply AI Feedback
                        </Button>
                    </Card>

                    <Card className="p-8 rounded-3xl border-slate-200 dark:border-slate-800 space-y-6">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Structural Actions</h4>
                        <div className="flex flex-col gap-4">
                            <Button variant="secondary" onClick={handleSaveManualEdits} isLoading={isSavingManual} className="w-full h-14">
                                Commit Edits
                            </Button>
                        </div>
                    </Card>
                </section>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn max-w-4xl mx-auto w-full space-y-8 pb-20 transition-all duration-300">
            <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Editorial Buffer ({reviewDrafts.length})</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {isFetchingDrafts ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-6 items-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
                            <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
                            <div className="flex-1 space-y-3">
                                <Skeleton className="h-5 w-2/3" />
                                <Skeleton className="h-3 w-1/4" />
                            </div>
                        </div>
                    ))
                ) : reviewDrafts.length > 0 ? (
                    reviewDrafts.map((draft) => (
                        <Card
                            key={draft.id}
                            hoverable
                            className="p-8 cursor-pointer group border-slate-200 dark:border-slate-800"
                        >
                            <div className="flex items-center justify-between" onClick={() => setSelectedReviewDraft(draft)}>
                                <div className="flex items-center gap-7">
                                    <div className="w-16 h-16 rounded-[1.25rem] bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all duration-300 shadow-sm">
                                        <FileText className="w-8 h-8 text-indigo-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight">
                                            {draft.title}
                                        </h3>
                                        <div className="flex items-center gap-6">
                                            <span className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(draft.createdAt).toLocaleDateString()}
                                            </span>
                                            <Badge variant="outline" className="px-3">Draft</Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-500">Launch Review</span>
                                    <ArrowRight className="w-5 h-5 text-indigo-500" />
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center p-24 text-center bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/10 dark:to-purple-950/10 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800/50 shadow-sm">
                        <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 flex items-center justify-center mb-8 shadow-xl shadow-indigo-100 dark:shadow-none">
                            <Zap className="w-9 h-9 text-indigo-600 dark:text-indigo-400 fill-current opacity-40" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Editorial Buffer Empty</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[320px] font-medium leading-relaxed">System is ready for new high-intent content generations.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
