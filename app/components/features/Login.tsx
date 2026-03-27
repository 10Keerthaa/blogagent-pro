'use client';

import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Sparkles, Lock, Mail, Github, Zap } from 'lucide-react';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setError(error.message);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await supabase.auth.signInWithOAuth({ provider: 'google' });
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-[#060606] transition-colors duration-500 overflow-hidden">

            {/* LEFT SECTION: BRAND PANEL (50%) */}
            <div className="hidden lg:flex lg:w-1/2 min-h-screen bg-indigo-600 dark:bg-indigo-950 p-20 flex-col justify-between relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-600/30 blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                            <Zap className="w-7 h-7 text-white fill-current" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tighter uppercase">BlogAgent<span className="text-indigo-200">Pro</span></span>
                    </div>

                    <div className="max-w-md">
                        <h1 className="text-6xl font-extrabold text-white leading-[1.05] tracking-tight mb-8 font-serif">
                            Elevate Your <br />Content Engine.
                        </h1>
                        <p className="text-xl text-indigo-100/70 leading-relaxed font-medium">
                            The elite editorial platform for high-intent SaaS teams and creators.
                        </p>
                    </div>
                </div>

                <div className="relative z-10" />
            </div>

            {/* RIGHT SECTION: LOGIN FORM (50%) */}
            <div className="w-full lg:w-1/2 min-h-screen bg-[#F9FAFB] dark:bg-slate-950 flex items-center justify-center p-6 lg:p-20 overflow-y-auto shrink-0">
                <div className="w-full max-w-[540px] bg-white dark:bg-[#0a0a0a] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-12 lg:p-14 animate-fadeIn relative z-10 transition-all">
                    <div className="mb-14 text-center lg:text-left">
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">Welcome Back</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Please enter your credentials to access the platform.</p>
                    </div>

                    {error && (
                        <div className="mb-10 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-500 text-xs font-bold rounded-xl flex items-center gap-3 animate-shake uppercase tracking-wider">
                            <Lock className="w-4 h-4 shrink-0 text-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailLogin} className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-2">
                                <Mail className="w-3.5 h-3.5" />
                                Work Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="w-full h-16 bg-slate-50 dark:bg-slate-900 rounded-xl px-6 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium placeholder:text-slate-400"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-2">
                                <Lock className="w-3.5 h-3.5" />
                                Access Code
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-16 bg-slate-50 dark:bg-slate-900 rounded-xl px-6 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium placeholder:text-slate-400"
                            />
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                            className="w-full h-16 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/10 uppercase tracking-[0.2em] text-[11px] font-black mt-6 transition-all hover:scale-[1.01]"
                        >
                            Authenticate Profile
                        </Button>
                    </form>

                    <div className="relative my-14 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-100 dark:border-slate-900" />
                        </div>
                        <span className="relative px-6 bg-white dark:bg-[#0a0a0a] text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">or</span>
                    </div>

                    <Button
                        variant="secondary"
                        onClick={handleGoogleLogin}
                        className="w-full h-16 rounded-xl border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all hover:scale-[1.01]"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Single Sign-On
                    </Button>
                </div>
            </div>
        </div>
    );
};
