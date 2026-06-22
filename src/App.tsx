/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider } from './store';
import { AuthProvider, useAuth } from './components/AuthContext';
import Home from './pages/Home';
import LightWorkshop from './pages/LightWorkshop';
import TouchWorkshop from './pages/TouchWorkshop';
import GatherWorkshop from './pages/GatherWorkshop';
import MyWorks from './pages/MyWorks';
import Favorites from './pages/Favorites';
import Login from './pages/Login';
import Survey from './pages/Survey';
import AdminDashboard from './pages/AdminDashboard';
import { cn } from './lib/utils';
import { ArrowLeft, LogOut } from 'lucide-react';
import { auth, signOut } from './lib/tcb';
import { initCloudBase } from './cloudbase';

function Navigation() {
  const location = useLocation();
  const { user } = useAuth();
  const isHome = location.pathname === '/';
  
  if (location.pathname === '/login' || location.pathname === '/survey' || user?.email === '1754756691@qq.com') return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-12 py-8 flex justify-between items-center border-b border-black/5 bg-[#F7F7F5]/80 backdrop-blur-md">
      <div className="flex items-center">
        {!isHome && (
          <Link to="/" className="text-black/40 hover:text-black transition-colors mr-4 flex items-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        )}
        <Link to="/" className="flex items-baseline space-x-2">
          <span className="text-xl font-bold tracking-tighter text-black flex items-center">
            有点艺思 点育万家<span className="w-2 h-2 rounded-full bg-[#FF4500] ml-1.5 translate-y-[2px]"></span>
          </span>
        </Link>
      </div>
      <div className="flex items-center space-x-10">
        <div className="flex space-x-10 text-[11px] uppercase tracking-[0.2em] font-medium text-black/40">
          <Link to="/" className={cn("hover:text-black transition-colors", location.pathname === '/' && "text-black")}>首页</Link>
          <Link to="/light" className={cn("hover:text-black transition-colors", location.pathname === '/light' && "text-black")}>点亮坊</Link>
          <Link to="/touch" className={cn("hover:text-black transition-colors", location.pathname === '/touch' && "text-black")}>触点坊</Link>
          <Link to="/gather" className={cn("hover:text-black transition-colors", location.pathname === '/gather' && "text-black")}>聚点坊</Link>
          <Link to="/works" className={cn("hover:text-black transition-colors", location.pathname === '/works' && "text-black")}>我的作品</Link>
          <Link to="/favorites" className={cn("hover:text-black transition-colors", location.pathname === '/favorites' && "text-black")}>收藏夹</Link>
        </div>
        {user && (
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 text-black/40 hover:text-black transition-colors text-[11px] font-bold"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </nav>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5]"><div className="w-4 h-4 bg-black animate-ping" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdmin = user?.email === '1754756691@qq.com';
  
  if (isAdmin && location.pathname !== '/admin') {
     return <Navigate to="/admin" replace />;
  }

  if (!isAdmin && location.pathname === '/admin') {
     return <Navigate to="/" replace />;
  }

  if (userData && !userData.surveyCompleted && location.pathname !== '/survey' && !isAdmin) {
    return <Navigate to="/survey" replace />;
  }

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} className="h-full w-full">
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/survey" element={<ProtectedRoute><Survey /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/light" element={<ProtectedRoute><LightWorkshop /></ProtectedRoute>} />
          <Route path="/touch" element={<ProtectedRoute><TouchWorkshop /></ProtectedRoute>} />
          <Route path="/gather" element={<ProtectedRoute><GatherWorkshop /></ProtectedRoute>} />
          <Route path="/works" element={<ProtectedRoute><MyWorks /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  useEffect(() => {
    initCloudBase().catch(console.error);
  }, []);

  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-[#F7F7F5] text-[#1A1A1A] font-sans flex flex-col">
            <Navigation />
            <AnimatedRoutes />
          </div>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
