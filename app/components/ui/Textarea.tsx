'use client';

import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    helperText?: string;
    error?: string;
}

export const Textarea = ({
    label,
    helperText,
    error,
    className = '',
    id,
    ...props
}: TextareaProps) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className="space-y-2 w-full">
            {label && (
                <label
                    htmlFor={inputId}
                    className="text-[11px] font-bold uppercase tracking-wide text-slate-400 select-none cursor-pointer px-1"
                >
                    {label}
                </label>
            )}
            <textarea
                id={inputId}
                className={`
          w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 
          rounded-xl px-4 py-3 text-sm transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500
          placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50
          dark:disabled:bg-slate-950 min-h-[120px] resize-none font-medium
          text-slate-900 dark:text-slate-100 shadow-sm
          ${error ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500' : ''}
          ${className}
        `}
                aria-describedby={helperText ? `${inputId}-helper` : undefined}
                aria-invalid={!!error}
                {...props}
            />
            {error ? (
                <p className="text-[10px] font-semibold text-red-500 animate-fadeIn ml-1">{error}</p>
            ) : helperText ? (
                <p id={`${inputId}-helper`} className="text-[10px] text-slate-400 font-medium ml-1">{helperText}</p>
            ) : null}
        </div>
    );
};
