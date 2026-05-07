'use client';

import React, { useState } from 'react';
import { auth, db, microsoftProvider } from '../../lib/firebase';
import { 
    signInWithEmailAndPassword, 
    signInWithPopup,
    getAdditionalUserInfo,
    OAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '../ui/Button';
import { Lock, Mail, Zap } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';

export const Login = () => {
    const { setMicrosoftAccessToken } = useDashboard();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleMicrosoftLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await signInWithPopup(auth, microsoftProvider);
            const credential = OAuthProvider.credentialFromResult(result);
            const accessToken = credential?.accessToken;
            
            if (accessToken) {
                console.log("Microsoft Token Captured!");
                setMicrosoftAccessToken(accessToken);
            }
            
            const user = result.user;

            // Get the Microsoft Access Token to send emails later
            const credential = OAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
                setMicrosoftAccessToken(credential.accessToken);
            }

            // Check if user exists in our authorized profiles
            const userDoc = await getDoc(doc(db, 'user_profiles', user.uid));
            
            if (!userDoc.exists()) {
                // 1. Check if they were explicitly invited
                const inviteRef = doc(db, 'invited_users', user.email?.toLowerCase() || '');
                const inviteSnap = await getDoc(inviteRef);

                if (inviteSnap.exists()) {
                    const inviteData = inviteSnap.data();
                    await setDoc(doc(db, 'user_profiles', user.uid), {
                        full_name: user.displayName || 'Team Member',
                        email: user.email,
                        role: inviteData.role || 'editor',
                        created_at: new Date().toISOString()
                    });
                    // Cleanup invitation
                    await deleteDoc(inviteRef);
                } else {
                    // 2. If not invited, check if this is the very first system user (Admin)
                    const isFirstUser = (await getDoc(doc(db, 'system_config', 'init'))).exists() === false;
                    
                    if (isFirstUser) {
                        await setDoc(doc(db, 'user_profiles', user.uid), {
                            full_name: user.displayName || 'Admin',
                            email: user.email,
                            role: 'admin',
                            created_at: new Date().toISOString()
                        });
                        await setDoc(doc(db, 'system_config', 'init'), { initialized: true });
                    } else {
                        await auth.signOut();
                        setError("Access Denied. You must be invited by an administrator to join this platform.");
                    }
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // LOGIN FLOW: Firebase
            await signInWithEmailAndPassword(auth, email, password);
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
                <div className="hidden lg:flex lg:w-1/2 h-screen bg-[#8424FF] flex-col justify-center relative overflow-hidden shrink-0" style={{ paddingTop: '10%', paddingBottom: '10%' }}>

                    {/* Block 1: Logo + App Name — Absolute positioned to the top */}
                    <div className="absolute z-20 shrink-0" style={{ top: '6%', left: '8%' }}>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl overflow-hidden shrink-0">
                                <Zap className="w-7 h-7 text-white fill-current" />
                            </div>
                            <span className="text-xl font-black text-white tracking-tighter uppercase">10x<span className="text-violet-200">Blogagent</span></span>
                        </div>
                    </div>

                    {/* Grouped Headline and Subtitle — Vertically centered */}
                    <div className="flex flex-col gap-6">
                        {/* Block 2: Headline — 10% from left, very large font */}
                        <div className="relative z-10 shrink-0" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
                            <h1 className="font-bold text-white leading-[1.05] tracking-tight italic font-serif" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(3.5rem, 7vw, 6.5rem)' }}>
                                Elevate Your Content Engine.
                            </h1>
                        </div>

                        {/* Block 3: Subtitle — 10% from left */}
                        <div className="relative z-10 shrink-0" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
                            <p className="text-xl text-white/90 leading-relaxed font-medium max-w-xl">
                                The elite editorial platform for high-intent SaaS teams and creators.
                            </p>
                        </div>
                    </div>

                </div>

                {/* RIGHT SECTION: LOGIN FORM (50%) */}
                <div 
                    className="w-full lg:w-1/2 min-h-screen flex flex-col items-center justify-center p-6 lg:p-10 overflow-hidden shrink-0 transition-all duration-700"
                    style={{ background: 'radial-gradient(circle at 70% 50%, #FFFFFF 0%, #F5F7FA 100%)' }}
                >
                    
                    {/* Centered Wrapper for Title + Card Alignment */}
                    <div className="w-full max-w-[480px] flex flex-col items-center">
                        
                        {/* Floating Portrait Card - The 'Monolithic Tall Pill' Look */}
                        <div className="w-full min-h-[85vh] rounded-[48px] bg-white dark:bg-slate-900 shadow-[0px_40px_120px_rgba(0,0,0,0.03)] border border-[#F8FAFC]/50 dark:border-slate-800 flex flex-col items-center relative z-10 transition-all" style={{ paddingTop: '10%', paddingBottom: '10%' }}>

                            {/* ALL inner content — constrained to 80% width, centered, with space from both card edges */}
                            <div style={{ width: '80%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>

                            {/* HEADER: Centered and floating in the middle family */}
                            <div className="text-center w-full">
                                <h2 className="text-[26px] font-bold text-[#0F172A] dark:text-white mb-[14px] tracking-tight leading-tight">
                                    Welcome Back
                                </h2>
                                <p className="text-[12px] text-[#64748B] dark:text-slate-400 font-medium leading-relaxed">
                                    Please enter your credentials to access the platform.
                                </p>
                            </div>

                            {/* Internal Container */}
                            <div className="w-full flex flex-col" style={{ marginTop: '14px' }}>
                                
                                <div className="w-full flex flex-col" style={{ gap: '20px' }}>
                                    <Button
                                        onClick={handleMicrosoftLogin}
                                        isLoading={loading}
                                        className="w-full h-[56px] rounded-[16px] bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-slate-900 dark:text-white text-[13px] font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
                                    >
                                        {!loading && (
                                            <svg className="w-5 h-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                                                <path fill="#f35325" d="M1 1h10v10H1z"/>
                                                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                                                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                                                <path fill="#ffba08" d="M12 12h10v10H12z"/>
                                            </svg>
                                        )}
                                        <span className="text-slate-900 dark:text-white">
                                            {loading ? 'Connecting...' : 'Sign in with Microsoft'}
                                        </span>
                                    </Button>

                                    <div className="flex items-center gap-4 w-full">
                                        <div className="h-[1px] flex-1 bg-[#F1F5F9] dark:bg-slate-800"></div>
                                        <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[2px]">or continue with email</span>
                                        <div className="h-[1px] flex-1 bg-[#F1F5F9] dark:bg-slate-800"></div>
                                    </div>

                                    {error && (
                                        <div className="w-full mb-2 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-500 text-[11px] font-bold rounded-xl flex items-center justify-center gap-3 animate-shake uppercase tracking-[1.5px] text-center">
                                            <Lock className="w-4 h-4 shrink-0 text-red-500" />
                                            {error}
                                        </div>
                                    )}
                                </div>

                                <form onSubmit={handleAuthAction} className="w-full flex flex-col" style={{ gap: '20px' }}>

                                    <div className="gap-1.5 flex flex-col">
                                        <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[1.5px] flex items-center gap-2 mb-1">
                                            <Mail className="w-3 h-3" />
                                            Work Email
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@company.com"
                                            className="w-full h-[48px] bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] px-[16px] text-[13px] font-medium placeholder:text-[#94A3B8] focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all login-input"
                                        />
                                    </div>

                                    <div className="gap-1.5 flex flex-col">
                                        <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[1.5px] flex items-center gap-2 mb-1">
                                            <Lock className="w-3 h-3" />
                                            Access Code
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full h-[48px] bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-700 rounded-[12px] px-[16px] text-[16px] font-medium placeholder:text-[#94A3B8] focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 outline-none transition-all login-input"
                                        />
                                    </div>

                                    <div className="flex flex-col" style={{ gap: '16px' }}>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            isLoading={loading}
                                            className="w-full h-[48px] rounded-[12px] bg-[#8424FF] hover:bg-[#7215e8] text-[12px] font-bold tracking-[0.5px] uppercase text-white shadow-xl shadow-violet-500/10 transition-all active:scale-[0.98]"
                                        >
                                            Authenticate Profile
                                        </Button>
                                    </div>
                                </form>
                            </div>
                            </div>{/* end 80% inner wrapper */}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};