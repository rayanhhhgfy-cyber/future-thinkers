import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { Protected } from "@/components/Layout";
import InstallPWA from "@/components/InstallPWA";
import PushBanner from "@/components/PushBanner";
import { EASE } from "@/components/anim";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Library from "@/pages/Library";
import BookDetail from "@/pages/BookDetail";
import UploadBook from "@/pages/UploadBook";
import Clubs from "@/pages/Clubs";
import ClubDetail from "@/pages/ClubDetail";
import DiscussionDetail from "@/pages/DiscussionDetail";
import ChessGame from "@/pages/ChessGame";
import ChessPractice from "@/pages/ChessPractice";
import ChessRobot from "@/pages/ChessRobot";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import Competitions from "@/pages/Competitions";
import CompetitionDetail from "@/pages/CompetitionDetail";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import News from "@/pages/News";
import Studio from "@/pages/Studio";
import StudioWork from "@/pages/StudioWork";
import Ventures from "@/pages/Ventures";
import VentureDetail from "@/pages/VentureDetail";
import Points from "@/pages/Points";
import BookReviews from "@/pages/BookReviews";
import Admin from "@/pages/Admin";

function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 px-4 text-center" dir="rtl">
      <div>
        <p className="text-sm font-semibold text-emerald-700">404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">الصفحة غير موجودة</h1>
        <p className="mt-2 text-slate-600">الرابط الذي فتحته غير متاح.</p>
        <Link to="/" className="mt-6 inline-flex rounded-lg bg-emerald-700 px-5 py-2.5 font-medium text-white hover:bg-emerald-800">
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    </main>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const reduce = useReducedMotion();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [location.pathname]);
  const routes = (
    <Routes location={location}>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/library" element={<Library />} />
      <Route path="/books/:id" element={<BookDetail />} />
      <Route path="/upload-book" element={<Protected><UploadBook /></Protected>} />
      <Route path="/clubs" element={<Clubs />} />
      <Route path="/clubs/:slug" element={<ClubDetail />} />
      <Route path="/discussions/:id" element={<DiscussionDetail />} />
      <Route path="/chess/practice" element={<Protected><ChessPractice /></Protected>} />
      <Route path="/chess/robot" element={<Protected><ChessRobot /></Protected>} />
      <Route path="/chess/:id" element={<Protected><ChessGame /></Protected>} />
      <Route path="/events" element={<Events />} />
      <Route path="/events/:id" element={<EventDetail />} />
      <Route path="/competitions" element={<Competitions />} />
      <Route path="/competitions/:id" element={<CompetitionDetail />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/points" element={<Protected><Points /></Protected>} />
      <Route path="/news" element={<News />} />
      <Route path="/studio" element={<Studio />} />
      <Route path="/studio/:id" element={<StudioWork />} />
      <Route path="/ventures" element={<Ventures />} />
      <Route path="/ventures/:id" element={<VentureDetail />} />
      <Route path="/profile/:id" element={<Profile />} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/admin/*" element={<Protected staff><Admin /></Protected>} />
      <Route path="/admin/books/:bookId/reviews" element={<Protected staff><BookReviews /></Protected>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
  if (reduce) return routes;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        {routes}
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  }, []);
  return (
    <AuthProvider>
      <BrowserRouter>
        <AnimatedRoutes />
        <InstallPWA />
        <PushBanner />
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
