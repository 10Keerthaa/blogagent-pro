'use client';

import React, { useState, useMemo } from 'react';
import { Check, Search, X, ChevronDown, Lock } from 'lucide-react';
import { CATEGORIES, LOCKED_CATEGORY_ID } from '@/lib/constants/categories';
import { FRAMER_CATEGORIES, FRAMER_LOCKED_CATEGORY_ID } from '@/lib/constants/framer-categories';
import { useDashboard } from '../context/DashboardContext';

interface CategorySelectorProps {
    selectedIds: any[];
    onChange: (ids: any[]) => void;
    readOnly?: boolean;
    hideLabel?: boolean;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
    selectedIds,
    onChange,
    readOnly = false,
    hideLabel = false
}) => {
    const { targetPlatform } = useDashboard();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const activeCategories = targetPlatform === 'framer' ? FRAMER_CATEGORIES : CATEGORIES;
    const lockedId = targetPlatform === 'framer' ? FRAMER_LOCKED_CATEGORY_ID : LOCKED_CATEGORY_ID;

    const filteredCategories = useMemo(() => {
        return activeCategories.filter(cat =>
            cat.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            cat.id !== lockedId
        );
    }, [searchTerm, activeCategories, lockedId]);

    const handleToggle = (id: any) => {
        if (id === lockedId || readOnly) return;
        
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const selectedNames = useMemo(() => {
        return activeCategories.filter(cat => selectedIds.includes(cat.id))
            .sort((a, b) => {
                if (a.id === lockedId) return -1;
                if (b.id === lockedId) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [selectedIds, activeCategories, lockedId]);

    const lockedCategory = activeCategories.find(c => c.id === lockedId);

    return (
        <div className="space-y-3">
            {!hideLabel && (
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400 px-1">
                    {targetPlatform === 'framer' ? 'Framer Category' : 'WordPress Categories'}
                </label>
            )}
            
            <div className="relative">
                {/* Trigger Button */}
                <div 
                    onClick={() => !readOnly && setIsOpen(!isOpen)}
                    className={`min-h-[44px] p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none transition-all shadow-sm flex flex-wrap gap-1.5 items-center cursor-pointer ${
                        readOnly ? 'opacity-80 cursor-default' : 'hover:border-slate-300 dark:hover:border-slate-700'
                    } ${isOpen ? 'ring-4 ring-violet-500/10 border-violet-500' : ''}`}
                >
                    {selectedNames.length > 0 ? (
                        selectedNames.map(cat => (
                            <span 
                                key={cat.id}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[10px] font-bold transition-all ${
                                    cat.id === lockedId 
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700' 
                                        : 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-800'
                                }`}
                            >
                                {cat.id === lockedId && <Lock className="w-2.5 h-2.5 opacity-60" />}
                                {cat.name}
                                {cat.id !== lockedId && !readOnly && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggle(cat.id);
                                        }}
                                        className="hover:text-violet-900 dark:hover:text-white transition-colors"
                                    >
                                        <X className="w-2.5 h-2.5" />
                                    </button>
                                )}
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-slate-400 px-2 font-medium italic">Select categories...</span>
                    )}
                    
                    <div className="ml-auto pr-1">
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                {/* Dropdown Menu */}
                {isOpen && !readOnly && (
                    <>
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 animate-fadeIn min-w-[240px]">
                            {/* Search Header */}
                            <div className="p-3 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                                <div className="flex items-center bg-slate-50 dark:bg-slate-950 ring-1 ring-slate-200 dark:ring-slate-800 focus-within:ring-2 focus-within:ring-violet-500 transition-all rounded-none">
                                    <div className="pl-3 py-2">
                                        <Search className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    <input 
                                        autoFocus
                                        type="text"
                                        placeholder="Search categories..."
                                        className="w-full pl-2 pr-3 py-2 bg-transparent border-none outline-none transition-all text-xs font-bold"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            {/* List of Categories */}
                            <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-1">
                                {/* Always show Locked Category at top if it matches search or search is empty */}
                                {(searchTerm === '' || lockedCategory?.name.toLowerCase().includes(searchTerm.toLowerCase())) && lockedCategory && (
                                    <div 
                                        className="flex items-center justify-between p-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800/30 opacity-60 cursor-not-allowed border-b border-slate-100 dark:border-slate-800"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-4 h-4 rounded-none border border-slate-300 dark:border-slate-600 flex items-center justify-center bg-white dark:bg-slate-700">
                                                <Check className="w-3 h-3 text-slate-400" />
                                            </div>
                                            <span className="text-slate-500 underline decoration-slate-300 underline-offset-4">{lockedCategory.name}</span>
                                        </div>
                                        <Lock className="w-3 h-3 text-slate-400" />
                                    </div>
                                )}

                                {filteredCategories.length > 0 ? (
                                    filteredCategories.map(cat => (
                                        <div 
                                            key={cat.id}
                                            onClick={() => handleToggle(cat.id)}
                                            className={`flex items-center justify-between p-2.5 text-xs font-bold cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                                                selectedIds.includes(cat.id) ? 'text-violet-600 dark:text-violet-400' : 'text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-4 h-4 rounded-none border transition-all flex items-center justify-center ${
                                                    selectedIds.includes(cat.id) 
                                                        ? 'bg-violet-600 border-violet-600 shadow-sm' 
                                                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                                                }`}>
                                                    {selectedIds.includes(cat.id) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className={selectedIds.includes(cat.id) ? 'underline decoration-violet-300 underline-offset-4' : ''}>
                                                    {cat.name}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : searchTerm !== '' && (
                                    <div className="p-8 text-center space-y-2">
                                        <p className="text-xs font-bold text-slate-400">No categories found</p>
                                        <p className="text-[10px] text-slate-300 italic">Try searching for something else</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

