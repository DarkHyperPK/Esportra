'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Crosshair, Shield, Zap, Globe, Trophy, Users } from 'lucide-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
    variant?: 'signin' | 'signup';
}

const FloatingIcon = ({ icon: Icon, delay, x, y }: { icon: any; delay: number; x: string; y: string }) => (
    <motion.div
        className="absolute text-rose-500/10"
        style={{ left: x, top: y }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
            opacity: [0.1, 0.2, 0.1],
            scale: [1, 1.1, 1],
            y: [0, -15, 0],
        }}
        transition={{
            duration: 5,
            delay,
            repeat: Infinity,
            ease: "easeInOut"
        }}
    >
        <Icon className="w-10 h-10" />
    </motion.div>
);

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle, variant = 'signin' }) => {
    return (
        <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden font-sans selection:bg-rose-500/30">
            {/* Dynamic Background - Matching About Page */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
                {/* Noise Texture */}
                <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 min-h-screen flex">
                {/* Left Panel - Visual */}
                <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
                    {/* Floating Icons */}
                    <FloatingIcon icon={Crosshair} delay={0} x="15%" y="20%" />
                    <FloatingIcon icon={Trophy} delay={0.5} x="75%" y="15%" />
                    <FloatingIcon icon={Users} delay={1} x="25%" y="70%" />
                    <FloatingIcon icon={Zap} delay={1.5} x="80%" y="60%" />
                    <FloatingIcon icon={Shield} delay={2} x="10%" y="45%" />
                    <FloatingIcon icon={Globe} delay={2.5} x="65%" y="80%" />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col justify-between p-12 w-full">
                        {/* Logo */}
                        <Link to="/" className="flex items-center gap-3 group">
                            <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-rose-400 font-mono tracking-widest uppercase">
                                ESPORTRA_SYSTEM
                            </span>
                        </Link>

                        {/* Center Content */}
                        <div className="max-w-lg">
                            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 leading-none">
                                {variant === 'signin'
                                    ? <>WELCOME<br /><span className="text-rose-500">BACK</span></>
                                    : <>JOIN<br /><span className="text-rose-500">THE ARENA</span></>
                                }
                            </h1>
                            <p className="text-lg text-gray-400 font-light leading-relaxed mt-6">
                                {variant === 'signin'
                                    ? 'Your tournaments await. Sign in to continue your competitive journey and dominate the leaderboards.'
                                    : 'Create your account and step into the world of competitive esports. Organize, compete, and rise to glory.'}
                            </p>

                            {/* Features - Different for each variant */}
                            <div className="mt-10 space-y-4">
                                {(variant === 'signin' ? [
                                    { icon: Trophy, text: 'Your tournaments are waiting' },
                                    { icon: Users, text: 'Reconnect with your teams' },
                                    { icon: Zap, text: 'Continue tracking your stats' },
                                ] : [
                                    { icon: Trophy, text: 'Host your first tournament' },
                                    { icon: Users, text: 'Build and manage teams' },
                                    { icon: Globe, text: 'Join the global community' },
                                ]).map((feature, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-3 text-gray-500 group"
                                    >
                                        <div className="p-2 rounded-lg bg-zinc-900/50 group-hover:bg-rose-500/10 transition-colors">
                                            <feature.icon className="w-4 h-4 text-rose-500" />
                                        </div>
                                        <span className="text-sm font-light">{feature.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer Quote */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-[1px] bg-rose-500" />
                            <span className="text-rose-500 font-mono text-xs tracking-widest">RISE ABOVE LEGENDS</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Form */}
                <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
                    <div className="w-full max-w-md">
                        {/* Mobile Logo */}
                        <div className="lg:hidden mb-8 text-center">
                            <Link to="/" className="inline-flex">
                                <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-rose-400 font-mono tracking-widest uppercase">
                                    ESPORTRA
                                </span>
                            </Link>
                        </div>

                        {/* Header */}
                        <div className="text-center lg:text-left mb-8">
                            <h1 className="text-3xl font-black text-white tracking-tight mb-2">{title}</h1>
                            <p className="text-gray-500 font-light">{subtitle}</p>
                        </div>

                        {/* Form Card */}
                        <div className="p-8 rounded-2xl bg-[#121214] border border-zinc-800/50 hover:border-rose-500/30 transition-all duration-500">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
