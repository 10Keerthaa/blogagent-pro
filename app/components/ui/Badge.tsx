'use client';

import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'pending' | 'success' | 'destructive' | 'outline' | 'indigo';
    className?: string;
}

export const Badge = ({
    children,
    variant = 'outline',
    className = ''
}: BadgeProps) => {
    const baseStyles = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-200';

    const variants = {
        pending: 'bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50',
        success: 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50',
        destructive: 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50',
        outline: 'bg-white text-slate-500 border border-slate-200 dark:bg-transparent dark:text-slate-400 dark:border-slate-800',
        indigo: 'bg-indigo-600 text-white shadow-sm'
    };

    return (
        <span className={`${baseStyles} ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};
