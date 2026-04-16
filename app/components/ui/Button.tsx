'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    children,
    className = '',
    disabled,
    ...props
}: ButtonProps) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-none font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-50:ring-offset-2 dark:focus-visible:ring-offset-slate-950 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none active:shadow-inner select-none uppercase tracking-wider text-[11px]';

    const variants = {
        primary: 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm hover:shadow-md dark:bg-violet-500 dark:hover:bg-violet-600 dark:shadow-none',
        secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700',
        ghost: 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors',
        danger: 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-500 dark:border-red-900/20'
    };

    const sizes = {
        sm: 'px-4 py-2 h-9',
        md: 'px-5 py-2.5 h-11',
        lg: 'px-8 py-4 h-14'
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Processing...</span>
                </>
            ) : (
                children
            )}
        </button>
    );
};
