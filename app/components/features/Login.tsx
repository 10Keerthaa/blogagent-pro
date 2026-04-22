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
        <>
            <style>{`
        .login-input {
          border: 1px solid #E2E8F0 !important;
          border-radius: 12px !important;
          background-color: #F8FAFC !important;
          padding-left: 20px !important;
          height: 56px !important;
        }
        .login-input:focus {
          outline: none !important;
          border-color: #8b5cf6 !important;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1) !important;
        }
      `}</style>
            <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-[#060606] transition-colors duration-500 overflow-hidden font-sans">
                {/* LEFT SECTION: BRAND PANEL (50%) */}
                <div className="hidden lg:flex lg:w-1/2 min-h-screen bg-[#8424FF] p-[48px] flex-col relative overflow-hidden shrink-0">
                    {/* Brand Identity: Natural flow with 48px alignment */}
                    <div className="relative z-10 mb-20">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl overflow-hidden shrink-0">
                                <Zap className="w-5 h-5 text-white fill-current" />
                            </div>
                            <span className="text-xl font-black text-white tracking-tighter uppercase">10x<span className="text-violet-200">Blogagent</span></span>
                        </div>
                    </div>

                    {/* Main Headline Block: Responsive & Fluid */}
                    <div className="relative z-10">
                        <div className="max-w-3xl">
                            <h1 className="text-[4rem] md:text-[5.5rem] lg:text-[6rem] font-bold text-white leading-[1.05] tracking-tight mb-32 italic font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>
                                Elevate Your Content Engine.
                            </h1>
                            <p className="text-xl text-white/90 leading-relaxed font-medium max-w-lg">
                                The elite editorial platform for high-intent SaaS teams and creators.
                            </p>
                        </div>
                    </div>

                    {/* Bottom Anchor */}
                    <div className="mt-auto relative z-10 h-10" />
                </div>

                {/* RIGHT SECTION: LOGIN FORM (50%) */}
                <div 
                    className="w-full lg:w-1/2 min-h-screen flex flex-col items-center justify-center p-12 lg:p-20 overflow-hidden shrink-0 transition-all duration-700"
                    style={{ background: 'radial-gradient(circle at 70% 50%, #FFFFFF 0%, #F5F7FA 100%)' }}
                >
                    
                    {/* Centered Wrapper for Title + Card Alignment */}
                    <div className="w-full max-w-[520px] flex flex-col items-center">
                        
                        {/* Floating Portrait Card - Ultra-Slender & Tall */}
                        <div className="w-full rounded-[32px] pt-[120px] pb-[120px] px-[80px] bg-white dark:bg-slate-900 shadow-[0px_40px_120px_rgba(0,0,0,0.03)] border border-[#F8FAFC]/50 dark:border-slate-800 flex flex-col relative z-10 transition-all">

                            {/* HEADER: Centered and airy */}
                            <div className="text-center w-full">
                                <h2 className="text-[32px] font-bold text-[#0F172A] dark:text-white mb-[12px] tracking-tight leading-tight">
                                    {isSignUp ? 'Create Profile' : 'Welcome Back'}
                                </h2>
                                <p className="text-[14px] text-[#64748B] dark:text-slate-400 font-medium leading-relaxed">
                                    {isSignUp
                                        ? 'Join the elite editorial platform today.'
                                        : 'Please enter your credentials to access the platform.'}
                                </p>
                            </div>

                            {/* Internal Container - Spaced and Slim */}
                            <div className="w-full flex flex-col mt-[48px]">
                                
                                {error && (
                                    <div className="w-full mb-10 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-500 text-[11px] font-bold rounded-xl flex items-center justify-center gap-3 animate-shake uppercase tracking-[1.5px]">
                                        <Lock className="w-4 h-4 shrink-0 text-red-500" />
                                        {error}
                                    </div>
                                    )}

                                <form onSubmit={handleAuthAction} className="w-full">
                                    {isSignUp && (
                                        <div className="gap-2 flex flex-col mb-[32px]">
                                            <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[1.5px] flex items-center gap-2 mb-2">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Your Full Name"
                                                className="w-full h-[56px] bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] px-[20px] text-[14px] font-medium placeholder:text-[#94A3B8] focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all login-input"
                                            />
                                        </div>
                                    )}
                                    <div className="gap-2 flex flex-col mb-[32px]">
                                        <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[1.5px] flex items-center gap-2 mb-2">
                                            <Mail className="w-3.5 h-3.5" />
                                            Work Email
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@company.com"
                                            className="w-full h-[56px] bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] px-[20px] text-[14px] font-medium placeholder:text-[#94A3B8] focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all login-input"
                                        />
                                    </div>

                                    <div className="gap-2 flex flex-col mb-[32px]">
                                        <label className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-[1.5px] flex items-center gap-2 mb-2">
                                            <Lock className="w-3.5 h-3.5" />
                                            Access Code
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full h-[56px] bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] px-[20px] text-[18px] font-medium placeholder:text-[#94A3B8] focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all login-input"
                                        />
                                    </div>

                                    <div className="mt-8">
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            isLoading={loading}
                                            className="w-full h-[56px] rounded-[12px] bg-[#8424FF] hover:bg-[#7215e8] text-[14px] font-bold tracking-[0.5px] uppercase text-white shadow-xl shadow-violet-500/10 transition-all active:scale-[0.98]"
                                        >
                                            {isSignUp ? 'Register Profile' : 'Authenticate Profile'}
                                        </Button>

                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-[4px] mt-12 mb-8">
                                                {isSignUp ? 'Already Joined?' : 'New User?'}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsSignUp(!isSignUp);
                                                    setSignUpSuccess(false);
                                                    setError(null);
                                                }}
                                                className="w-full h-[56px] rounded-[12px] bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 text-[#475569] dark:text-slate-300 text-[14px] font-bold uppercase transition-all hover:bg-[#F8FAFC] dark:hover:bg-slate-800"
                                            >
                                                {isSignUp ? 'Back to Sign In' : 'Create Account'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};