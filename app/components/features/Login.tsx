'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Zap, Sparkles } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

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
        <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50 relative overflow-hidden font-sans">
            
            {/* --- LEFT COLUMN: Brand Panel --- */}
            <div className="relative flex flex-col bg-[#8424FF] text-white p-12 lg:p-24 overflow-hidden order-2 lg:order-1">
                {/* Minimalist Aurora/Mesh Background + High-End Tech Sweep */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute inset-0 opacity-[0.05] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_100%)]">
                        <div 
                            className="absolute inset-0"
                            style={{ 
                                backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', 
                                backgroundSize: '4rem 4rem' 
                            }}
                        />
                    </div>

                    <motion.div 
                        animate={{ x: [0, 30, 0, -30, 0], y: [0, -30, 30, 0, 0], scale: [1, 1.1, 1, 1.1, 1] }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-fuchsia-500/20 rounded-full blur-[120px]"
                    />
                    
                    <motion.div 
                        animate={{ x: [0, -30, 30, 0, 0], y: [0, 30, 0, -30, 0], scale: [1, 1.1, 1, 1.1, 1] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-indigo-500/20 rounded-full blur-[140px]"
                    />

                    <motion.div
                        animate={{ y: ['-10%', '110%'] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent opacity-50 backdrop-blur-[1px]"
                    />
                    
                    {[...Array(5)].map((_, i) => (
                        <motion.div
                            key={`stream-${i}`}
                            className="absolute w-[1px] bg-gradient-to-b from-transparent via-white/30 to-transparent"
                            style={{ left: `${15 + i * 20}%`, height: '40%', top: '-40%' }}
                            animate={{ top: ['100%', '-50%'], opacity: [0, 1, 0] }}
                            transition={{ duration: 6 + (i % 4), repeat: Infinity, ease: "linear", delay: i * 1.5 }}
                        />
                    ))}
                </div>
                
                {/* Logo Section */}
                <div className="absolute z-10 top-12 left-12 flex items-center gap-3">
                    <motion.div 
                        animate={{ boxShadow: ['0 0 10px rgba(255,255,255,0.1)', '0 0 25px rgba(255,255,255,0.4)', '0 0 10px rgba(255,255,255,0.1)'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="bg-white/20 p-2.5 rounded-full backdrop-blur-sm border border-white/30 shadow-lg relative"
                    >
                        <Zap className="w-5 h-5 text-white fill-white relative z-10" />
                        <motion.div 
                            animate={{ opacity: [0, 1, 0], scale: [1, 1.5, 2] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                            className="absolute inset-0 bg-white/30 rounded-full"
                        />
                    </motion.div>
                    <span className="font-extrabold text-xl tracking-wider uppercase drop-shadow-md">10XBlogAgent</span>
                </div>
                
                {/* Main Content */}
                <div className="relative z-10 mt-auto mb-auto">
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="font-serif text-[4rem] md:text-[5.5rem] lg:text-[6rem] font-bold leading-[1.05] tracking-tight mb-8 relative"
                    >
                        <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 [background-size:200%_100%] z-20 pointer-events-none"
                            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
                        />
                        <span className="relative z-10">Elevate Your <br />Content Engine.</span>
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-xl md:text-2xl text-white/90 max-w-xl leading-relaxed font-medium drop-shadow-sm"
                    >
                        The elite editorial platform for high-intent SaaS teams and creators.
                    </motion.p>
                </div>
            </div>

            {/* --- RIGHT COLUMN: Login Form --- */}
            <div className="relative flex items-center justify-center p-8 lg:p-12 min-h-screen order-1 lg:order-2 bg-[#F8F9FB] overflow-hidden">
                {/* Professional Ambient Animations on Right */}
                <div className="absolute inset-0 pointer-events-none z-0">
                    <motion.div 
                        animate={{ rotate: [0, 10, 0], scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-[100px]"
                    />
                    <motion.div 
                        animate={{ rotate: [0, -10, 0], scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -bottom-[20%] -left-[10%] w-[700px] h-[700px] bg-indigo-200/30 rounded-full blur-[100px]"
                    />
                </div>

                {/* Login Form Container */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.97, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-[440px] bg-white rounded-[2rem] p-10 shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-gray-100/80 relative z-10 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="mb-8"
                    >
                        <h2 className="text-[2rem] font-bold text-gray-900 tracking-tight leading-tight mb-2">
                            {isSignUp ? 'Create Profile' : 'Welcome Back'}
                        </h2>
                        <p className="text-gray-500 font-medium">
                            {isSignUp ? 'Join the elite editorial platform today.' : 'Please enter your credentials to access the platform.'}
                        </p>
                    </motion.div>

                    {error && (
                        <div className="mb-8 p-5 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl flex items-center gap-3 uppercase tracking-wider">
                            <Lock className="w-4 h-4 shrink-0 text-red-500" />
                            {error}
                        </div>
                    )}

                    {signUpSuccess && (
                        <div className="mb-8 p-5 bg-green-50 border border-green-100 text-green-600 text-xs font-bold rounded-2xl flex items-center gap-3 uppercase tracking-wider">
                            <Sparkles className="w-4 h-4 shrink-0 text-green-500" />
                            Profile Created Successfully.
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleAuthAction}>
                        {isSignUp && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.25, duration: 0.5 }}
                                className="space-y-2 group"
                            >
                                <label className="text-xs font-bold text-gray-400 tracking-wider uppercase flex items-center gap-2 mb-1 group-focus-within:text-[#8424FF] transition-colors">
                                    <Sparkles className="w-4 h-4" strokeWidth={2.5} /> FULL NAME
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Your Full Name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#8424FF]/10 focus:border-[#8424FF] focus:bg-white outline-none transition-all placeholder:text-gray-400 text-gray-900 font-medium"
                                />
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3, duration: 0.5 }}
                            className="space-y-2 group"
                        >
                            <label className="text-xs font-bold text-gray-400 tracking-wider uppercase flex items-center gap-2 mb-1 group-focus-within:text-[#8424FF] transition-colors">
                                <Mail className="w-4 h-4" strokeWidth={2.5} /> WORK EMAIL
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#8424FF]/10 focus:border-[#8424FF] focus:bg-white outline-none transition-all placeholder:text-gray-400 text-gray-900 font-medium"
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                            className="space-y-2 group"
                        >
                            <label className="text-xs font-bold text-gray-400 tracking-wider uppercase flex items-center gap-2 mb-1 group-focus-within:text-[#8424FF] transition-colors">
                                <Lock className="w-4 h-4" strokeWidth={2.5} /> ACCESS CODE
                            </label>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-[#8424FF]/10 focus:border-[#8424FF] focus:bg-white outline-none transition-all placeholder:text-gray-400 text-gray-900 font-serif text-lg tracking-widest"
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            className="relative mt-8"
                        >
                            <motion.div 
                                animate={{ opacity: [0.4, 0.7, 0.4], scale: [0.98, 1.02, 0.98] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 bg-[#8424FF] rounded-2xl blur-md"
                            />
                            <motion.button
                                type="submit"
                                disabled={loading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="relative w-full bg-[#8424FF] hover:bg-[#7215e8] text-white text-sm font-bold tracking-wide py-4 rounded-2xl transition-all shadow-lg overflow-hidden group disabled:opacity-80 disabled:cursor-not-allowed"
                            >
                                {!loading && (
                                    <motion.div 
                                        animate={{ x: ['-200%', '300%'] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                                        className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                                    />
                                )}
                                <span className="relative z-10">
                                    {loading ? 'PROCESSING...' : (isSignUp ? 'REGISTER PROFILE' : 'AUTHENTICATE PROFILE')}
                                </span>
                            </motion.button>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6, duration: 0.5 }}
                            className="pt-6 pb-2 text-center"
                        >
                            <span className="text-xs font-bold text-gray-300 tracking-[0.2em] uppercase">
                                {isSignUp ? 'Already Joined?' : 'New User?'}
                            </span>
                        </motion.div>

                        <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7, duration: 0.5 }}
                            whileHover={{ scale: 1.02, backgroundColor: "#f8fafc" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                setSignUpSuccess(false);
                                setError(null);
                                setEmail('');
                                setPassword('');
                                setFullName('');
                            }}
                            className="w-full bg-white border-2 border-gray-100 text-gray-700 hover:text-gray-900 text-sm font-bold tracking-wide py-4 rounded-2xl transition-all shadow-sm"
                        >
                            {isSignUp ? 'BACK TO SIGN IN' : 'CREATE ACCOUNT'}
                        </motion.button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};
