'use client';

import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hoverable?: boolean;
    onClick?: () => void;
}

export const Card = ({ children, className = '', hoverable = false, onClick }: CardProps) => {
    return (
        <div 
            onClick={onClick}
            className={`
      bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 
      rounded-3xl shadow-sm transition-all duration-300 overflow-hidden
      ${hoverable ? 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 hover:scale-[1.005]' : ''}
      ${className}
    `}>
            {children}
        </div>
    );
};
