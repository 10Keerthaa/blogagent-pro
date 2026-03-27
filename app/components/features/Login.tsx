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
        <div className="min-h-screen bg-slate-50 dark:bg-[#060606] flex items-center justify-center p-6 lg:p-10 transition-colors duration-500">
            <div className="w-full max-w-[1200px] flex flex-col lg:flex-row bg-white dark:bg-[#0a0a0a] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] dark:shadow-none overflow-hidden rounded-[2.5rem] border border-slate-100 dark:border-slate-900 ring-1 ring-slate-100 dark:ring-slate-900">

                {/* Visual Branding Section */}
                <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 dark:bg-indigo-950 p-20 flex-col justify-between relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-600/30 blur-3xl" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-12">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                <Zap className="w-7 h-7 text-white fill-current" />
                            </div>
                            <span className="text-2xl font-black text-white tracking-tighter uppercase">BlogAgent<span className="text-indigo-200">Pro</span></span>
                        </div>
                        <h1 className="text-5xl font-extrabold text-white leading-[1.1] tracking-tight mb-8 font-serif">
                            Elevate Your <br />Content Engine.
                        </h1>
                        <p className="text-xl text-indigo-100/80 leading-relaxed font-medium max-w-sm">
                            The elite editorial platform for high-intent SaaS teams and creators.
                        </p>
                    </div>

                    <div className="relative z-10 flex flex-col gap-8">
                        <div className="flex items-center gap-4 py-4 px-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
                            <div className="w-10 h-10 rounded-xl bg-emerald-400/20 flex items-center justify-center text-emerald-400">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white uppercase tracking-widest">Enterprise Ready</span>
                                <span className="text-sm text-indigo-100/60">Multi-user RBAC system active.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Auth Form Section */}
                <div className="w-full lg:w-1/2 p-8 lg:p-24 flex flex-col justify-center bg-white dark:bg-slate-950">
                    <div className="max-w-md mx-auto w-full">
                        <div className="mb-12">
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Welcome Back</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Please enter your credentials to access the platform.</p>
                        </div>

                        {error && (
                            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-500 text-sm font-semibold rounded-xl flex items-center gap-3 animate-shake">
                                <Lock className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleEmailLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5" />
                                    Work Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Lock className="w-3.5 h-3.5" />
                                    Access Code
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium"
                                />
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={loading}
                                className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/10 uppercase tracking-widest text-[11px] font-bold mt-4"
                            >
                                Authenticate Profile
                            </Button>
                        </form>

                        <div className="relative my-10 flex items-center justify-center">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-100 dark:border-slate-900" />
                            </div>
                            <span className="relative px-4 bg-white dark:bg-slate-950 text-[10px] font-bold uppercase tracking-widest text-slate-400">Enterprise SSO</span>
                        </div>

                        <Button
                            variant="secondary"
                            onClick={handleGoogleLogin}
                            className="w-full h-14 rounded-2xl border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                        >
                            <Github className="w-5 h-5 text-slate-900 dark:text-white" />
                            Continue with Single Sign-On
                        </Button>

                        <p className="mt-12 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                            Secured by <span className="text-emerald-500">Supabase Auth Layer</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
