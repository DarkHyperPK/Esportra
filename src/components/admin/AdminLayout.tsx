import React from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { ProfileLoading } from '@/components/profile/ProfileLoading';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <ProfileLoading />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="border border-white/10 bg-[#0a0a0c]/90 p-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border border-red-500/30 bg-red-950/20">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="mb-2 font-heading text-2xl font-black uppercase tracking-tight text-white">Access Denied</h1>
          <p className="text-zinc-500">You don't have admin privileges.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-rose-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      </div>

      {/* Main content - no sidebar */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
