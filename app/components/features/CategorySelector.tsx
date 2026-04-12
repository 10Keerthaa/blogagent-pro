'use client';

import React, { useState, useMemo } from 'react';
import { Check, Search, X, ChevronDown, Lock } from 'lucide-react';
import { CATEGORIES, LOCKED_CATEGORY_ID } from '@/lib/constants/categories';

interface CategorySelectorProps {
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    readOnly?: boolean;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
    selectedIds,
    onChange,
    readOnly = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCategories = useMemo(() => {
        return CATEGORIES.filter(cat =>
            cat.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            cat.id !== LOCKED_CATEGORY_ID
        );
    }, [searchTerm]);

    const handleToggle = (id: number) => {
        if (id === LOCKED_CATEGORY_ID || readOnly) return;
        
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const selectedNames = useMemo(() => {
        return CATEGORIES.filter(cat => selectedIds.includes(cat.id))
            .sort((a, b) => {
                if (a.id === LOCKED_CATEGORY_ID) return -1;
                if (b.id === LOCKED_CATEGORY_ID) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [selectedIds]);

    return (
        <div className="space-y-3">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400 px-1">
                WordPress Categories
            </label>
            
            <div className="relative">
                {/* Trigger Button */}
                <div 
                    onClick={() => !readOnly && setIsOpen(!isOpen)}
                    className={`min-h-[44px] p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none transition-all shadow-sm flex flex-wrap gap-1.5 items-center cursor-pointer ${
                        readOnly ? 'opacity-80 cursor-default' : 'hover:border-slate-300 dark:hover:border-slate-700'
                    } ${isOpen ? 'ring-4 ring-indigo-500/10 border-indigo-500' : ''}`}
                >
                    {selectedNames.length > 0 ? (
                        selectedNames.map(cat => (
                            <span 
                                key={cat.id}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[10px] font-bold transition-all ${
                                    cat.id === LOCKED_CATEGORY_ID 
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700' 
                                        : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800'
                                }`}
                            >
                                {cat.id === LOCKED_CATEGORY_ID && <Lock className="w-2.5 h-2.5 opacity-60" />}
                                {cat.name}
                                {cat.id !== LOCKED_CATEGORY_ID && !readOnly && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggle(cat.id);
                                        }}
                                        className="hover:text-indigo-900 dark:hover:text-white transition-colors"
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
                            className="fixed inset-0 z-10" 
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-20 animate-fadeIn min-w-[240px]">
                            {/* Search Header */}
                            <div className="p-3 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                    <input 
                                        autoFocus
                                        type="text"
                                        placeholder="Search categories..."
                                        className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border-none outline-none ring-1 ring-slate-200 dark:ring-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-bold"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            {/* List of Categories */}
                            <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-1">
                                {/* Always show Blog at top if it matches search or search is empty */}
                                {(searchTerm === '' || "blog".includes(searchTerm.toLowerCase())) && (
                                    <div 
                                        className="flex items-center justify-between p-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800/30 opacity-60 cursor-not-allowed border-b border-slate-100 dark:border-slate-800"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-4 h-4 rounded-none border border-slate-300 dark:border-slate-600 flex items-center justify-center bg-white dark:bg-slate-700">
                                                <Check className="w-3 h-3 text-slate-400" />
                                            </div>
                                            <span className="text-slate-500 underline decoration-slate-300 underline-offset-4">Blog</span>
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
                                                selectedIds.includes(cat.id) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-4 h-4 rounded-none border transition-all flex items-center justify-center ${
                                                    selectedIds.includes(cat.id) 
                                                        ? 'bg-indigo-600 border-indigo-600 shadow-sm' 
                                                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                                                }`}>
                                                    {selectedIds.includes(cat.id) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className={selectedIds.includes(cat.id) ? 'underline decoration-indigo-300 underline-offset-4' : ''}>
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
