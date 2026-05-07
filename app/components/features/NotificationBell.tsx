'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, UserPlus, CheckCircle, Info } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const NotificationBell = () => {
    const { user, role } = useDashboard();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!user || role !== 'admin') return;

        const q = query(
            collection(db, 'notifications'),
            where('recipientId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setNotifications(docs);
            setHasUnread(docs.some((n: any) => !n.read));
        });

        return () => unsubscribe();
    }, [user, role]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async () => {
        if (!hasUnread) return;
        
        try {
            const unreadDocs = notifications.filter(n => !n.read);
            await Promise.all(unreadDocs.map(n => 
                updateDoc(doc(db, 'notifications', n.id), { read: true })
            ));
            setHasUnread(false);
        } catch (e) {
            console.error('Error marking notifications as read:', e);
        }
    };

    const toggleOpen = () => {
        if (!isOpen) markAsRead();
        setIsOpen(!isOpen);
    };

    if (role !== 'admin') return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleOpen}
                className={`p-2.5 rounded-full transition-all duration-300 relative group ${
                    isOpen 
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-200/50' 
                    : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/10'
                }`}
            >
                <Bell className={`w-5 h-5 ${isOpen ? 'animate-none' : 'group-hover:animate-swing'}`} />
                {hasUnread && (
                    <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-600 border-2 border-white dark:border-slate-950"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 p-1.5 animate-fadeIn z-[100]">
                    <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800 mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Updates</span>
                        <span className="text-[9px] font-bold text-violet-500 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">Recent</span>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                            notifications.map((n, idx) => (
                                <div 
                                    key={n.id}
                                    className={`p-3.5 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all group/item mb-1 ${!n.read ? 'bg-violet-50/30 dark:bg-violet-900/5' : ''}`}
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                        n.type === 'invite_accepted' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 
                                        n.type === 'invite_sent' ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/20' : 
                                        'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                                    }`}>
                                        {n.type === 'invite_accepted' ? <UserPlus className="w-4.5 h-4.5" /> : 
                                         n.type === 'invite_sent' ? <CheckCircle className="w-4.5 h-4.5" /> : 
                                         <Info className="w-4.5 h-4.5" />}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">
                                            {n.title}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {n.message}
                                        </p>
                                        <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">
                                            {n.createdAt?.toDate ? new Date(n.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-10 text-center">
                                <Bell className="w-8 h-8 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">All caught up</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
