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
    const [fullName, setFullName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [signUpSuccess, setSignUpSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSignUpSuccess(false);

        try {
            if (isSignUp) {
                // SIGN UP FLOW
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        }
                    }
                });
                if (signUpError) {
                    setError(signUpError.message);
                } else {
                    setSignUpSuccess(true);
                }
            } else {
                // LOGIN FLOW
                const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
                if (loginError) setError(loginError.message);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTestSignUp = async () => {
        setLoading(true);
        setError(null);
        try {
            const randomId = Math.floor(Math.random() * 10000);
            const testEmail = `test.user.${randomId}@blogagent.pro`;
            const testPass = 'BlogAgentTest123';
            const { error: signUpError } = await supabase.auth.signUp({
                email: testEmail,
                password: testPass,
                options: {
                    data: {
                        full_name: `Test User ${randomId}`,
                    }
                }
            });
            if (signUpError) {
                setError(signUpError.message);
            } else {
                setSignUpSuccess(true);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
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
            <div className="w-full lg:w-1/2 min-h-screen bg-[#F9FAFB] dark:bg-slate-950 flex shadow-[inset_1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[inset_1px_0_0_0_rgba(255,255,255,0.05)] items-center justify-center p-6 lg:p-12 overflow-y-auto shrink-0 transition-all duration-700">
                <div className="w-full max-w-[420px] bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 lg:p-10 animate-fadeIn relative z-10 transition-all">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3 transition-all duration-300">
                            {isSignUp ? 'Create Profile' : 'Welcome Back'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-[13px] leading-relaxed">
                            {isSignUp 
                                ? 'Join the elite editorial platform today.' 
                                : 'Please enter your credentials to access the platform.'}
                        </p>
                    </div>

                    {signUpSuccess && (
                        <div className="mb-10 p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-3 animate-fadeIn uppercase tracking-wider leading-relaxed">
                            <Zap className="w-5 h-5 shrink-0 text-emerald-500" />
                            Success! Please check your email to confirm your account before logging in.
                        </div>
                    )}

                    {error && (
                        <div className="mb-10 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-500 text-xs font-bold rounded-xl flex items-center gap-3 animate-shake uppercase tracking-wider">
                            <Lock className="w-4 h-4 shrink-0 text-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleAuthAction} className="space-y-8">
                        {isSignUp && (
                            <div className="space-y-3 animate-fadeIn">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-2">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Your Full Name"
                                    className="w-full h-16 bg-slate-50 dark:bg-slate-900 rounded-xl px-6 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium placeholder:text-slate-400"
                                />
                            </div>
                        )}
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

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2 mb-1">
                                <Lock className="w-3.5 h-3.5" />
                                Access Code
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-14 bg-slate-50 dark:bg-slate-900 rounded-xl px-6 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium placeholder:text-slate-400"
                            />
                        </div>

                        <div className="mt-8 space-y-8">
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={loading}
                                className="w-full h-14 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/10 uppercase tracking-[0.2em] text-[10px] font-black transition-all hover:scale-[1.01]"
                            >
                                {isSignUp ? 'Register Profile' : 'Authenticate Profile'}
                            </Button>

                            <div className="space-y-4">
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600 inline-block mb-3">
                                        {isSignUp ? 'Already Joined?' : 'New User?'}
                                    </span>
                                    
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setIsSignUp(!isSignUp);
                                            setSignUpSuccess(false);
                                            setError(null);
                                        }}
                                        className="w-full h-14 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                                    >
                                        {isSignUp ? 'Back to Sign In' : 'Create Account'}
                                    </Button>
                                </div>

                                {!isSignUp && (
                                    <button
                                        type="button"
                                        onClick={handleTestSignUp}
                                        disabled={loading}
                                        className="w-full py-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-indigo-400 dark:text-slate-700 dark:hover:text-indigo-500 transition-all duration-300"
                                    >
                                        Login with Test Credentials
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
