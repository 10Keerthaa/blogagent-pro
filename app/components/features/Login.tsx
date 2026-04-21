'use client';

import React, { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '../ui/Button';
import { Sparkles, Lock, Mail, Zap } from 'lucide-react';

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
                // SIGN UP FLOW: Firebase
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                // Set Profile Data
                await updateProfile(user, { displayName: fullName });
                
                // Create user profile in Firestore
                await setDoc(doc(db, 'user_profiles', user.uid), {
                    full_name: fullName,
                    email: email,
                    role: 'editor', // Default role for new signups
                    created_at: new Date().toISOString()
                });

                setSignUpSuccess(true);
            } else {
                // LOGIN FLOW: Firebase
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-[#060606] transition-colors duration-500 overflow-hidden font-sans">
            {/* LEFT SECTION: BRAND PANEL (50%) */}
            <div className="hidden lg:flex lg:w-1/2 min-h-screen bg-violet-600 dark:bg-violet-950 p-24 flex-col justify-between relative overflow-hidden shrink-0">
                {/* Visual Grid & Glow */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-purple-800/40 blur-3xl pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-400/20 rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-24">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                            <Zap className="w-7 h-7 text-white fill-current" />
                        </div>
                        <span className="text-2xl font-black text-white tracking-tighter uppercase">10x<span className="text-violet-200">Blogagent</span></span>
                    </div>

                    <div className="max-w-xl">
                        <h1 className="text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-10">
                            Elevate Your <br />Content Engine.
                        </h1>
                        <p className="text-xl text-violet-100/80 leading-relaxed font-medium max-w-md">
                            The elite editorial platform for high-intent SaaS teams and creators.
                        </p>
                    </div>
                </div>
                <div className="relative z-10" />
            </div>

            {/* RIGHT SECTION: LOGIN FORM (50%) */}
            <div className="w-full lg:w-1/2 min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 lg:p-12 overflow-y-auto shrink-0 transition-all duration-700">
                <div className="w-full max-w-[480px] bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 p-10 lg:p-16 animate-fadeIn relative z-10">
                    <div className="mb-14">
                        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
                            {isSignUp ? 'Create Profile' : 'Welcome Back'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-[15px] leading-relaxed max-w-[320px]">
                            {isSignUp 
                                ? 'Join the elite editorial platform today.' 
                                : 'Please enter your credentials to access the platform.'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-10 p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-500 text-xs font-bold rounded-2xl flex items-center gap-3 animate-shake uppercase tracking-wider">
                            <Lock className="w-4 h-4 shrink-0 text-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleAuthAction} className="space-y-10">
                        {isSignUp && (
                            <div className="space-y-4">
                                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Your Full Name"
                                    className="w-full h-15 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 border border-slate-100 dark:border-slate-800 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all outline-none font-medium placeholder:text-slate-300"
                                />
                            </div>
                        )}
                        <div className="space-y-4">
                            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Work Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="w-full h-15 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 border border-slate-100 dark:border-slate-800 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all outline-none font-medium placeholder:text-slate-300"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                Access Code
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full h-15 bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 border border-slate-100 dark:border-slate-800 focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all outline-none font-medium placeholder:text-slate-300"
                            />
                        </div>

                        <div className="mt-14 space-y-12">
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={loading}
                                className="w-full h-16 rounded-2xl bg-violet-600 hover:bg-violet-700 shadow-2xl shadow-violet-600/30 uppercase tracking-[0.2em] text-[11px] font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isSignUp ? 'Register Profile' : 'Authenticate Profile'}
                            </Button>

                            <div className="relative py-4 flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 dark:text-slate-600 mb-6">
                                    {isSignUp ? 'Already Joined?' : 'New User?'}
                                </span>
                                
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSignUp(!isSignUp);
                                        setSignUpSuccess(false);
                                        setError(null);
                                    }}
                                    className="w-full h-16 rounded-2xl bg-white dark:bg-transparent border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white uppercase tracking-[0.2em] text-[11px] font-black transition-all hover:border-violet-500 hover:text-violet-600"
                                >
                                    {isSignUp ? 'Back to Sign In' : 'Create Account'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
