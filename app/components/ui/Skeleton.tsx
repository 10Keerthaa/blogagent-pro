'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
    return (
        <div className={`bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl ${className}`} />
    );
};
