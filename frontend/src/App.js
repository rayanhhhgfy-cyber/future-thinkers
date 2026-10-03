import React, { useEffect, Suspense, lazy } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { Protected } from "@/components/Layout";
import InstallPWA from "@/components/InstallPWA";
import { RouteProgress, BackToTop } from "@/components/ShellExtras";
import PushBanner from "@/components/PushBanner";
import { ThemeApplier } from "@/lib/theme";
import { EASE } from "@/components/anim";
import { ErrorBoundary, installErrorReporter } from "@/components/ErrorState";

import Landing from "@/pages/Landing";
import { LogoMark } from "@/components/Logo";

const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Library = lazy(() => import("@/pages/Library"));
const BookDetail = lazy(() => import("@/pages/BookDetail"));
const UploadBook = lazy(() => import("@/pages/UploadBook"));
const Clubs = lazy(() => import("@/pages/Clubs"));
const ClubDetail = lazy(() => import("@/pages/ClubDetail"));
const DiscussionDetail = lazy(() => import("@/pages/DiscussionDetail"));
const ChessGame = lazy(() => import("@/pages/ChessGame"));
const ChessPractice = lazy(() => import("@/pages/ChessPractice"));
const ChessRobot = lazy(() => import("@/pages/ChessRobot"));
const Paths = lazy(() => import("@/pages/Paths"));
const Community = lazy(() => import("@/pages/Community"));
const Calendar = lazy(() => import("@/pages/Calendar"));
const ReadingChallenges = lazy(() => import("@/pages/ReadingChallenges"));
const FocusRooms = lazy(() => import("@/pages/FocusRooms"));
const Events = lazy(() => import("@/pages/Events"));
const EventDetail = lazy(() => import("@/pages/EventDetail"));
const Competitions = lazy(() => import("@/pages/Competitions"));
const CompetitionDetail = lazy(() => import("@/pages/CompetitionDetail"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Profile = lazy(() => import("@/pages/Profile"));
const Settings = lazy(() => import("@/pages/Settings"));
const News = lazy(() => import("@/pages/News"));
const Flashcards = lazy(() => import("@/pages/Flashcards"));
const Buddies = lazy(() => import("@/pages/Buddies"));
const LiveSessions = lazy(() => import("@/pages/LiveSessions"));
const Wrapped = lazy(() => import("@/pages/Wrapped"));
const MiniBooks = lazy(() => import("@/pages/MiniBooks"));
const Swap = lazy(() => import("@/pages/Swap"));
const Studio = lazy(() => import("@/pages/Studio"));
const StudioWork = lazy(() => import("@/pages/StudioWork"));
const Ventures = lazy(() => import("@/pages/Ventures"));
const VentureDetail = lazy(() => import("@/pages/VentureDetail"));
const Points = lazy(() => import("@/pages/Points"));
const Stats = lazy(() => import("@/pages/Stats"));
const ChessPuzzle = lazy(() => import("@/pages/ChessPuzzle"));
const VerifyCertificate = lazy(() => import("@/pages/VerifyCertificate"));
const CertificatesWall = lazy(() => import("@/pages/CertificatesWall"));
const Messages = lazy(() => import("@/pages/Messages"));
const Circles = lazy(() => import("@/pages/Circles"));
const HelpBoard = lazy(() => import("@/pages/HelpBoard"));
const QuizLive = lazy(() => import("@/pages/QuizLive"));
const Portfolio = lazy(() => import("@/pages/Portfolio"));
const SeasonCup = lazy(() => import("@/pages/SeasonCup"));
const ClassReport = lazy(() => import("@/pages/ClassReport"));
const Members = lazy(() => import("@/pages/Members"));
const BookReviews = lazy(() => import("@/pages/BookReviews"));
const Saved = lazy(() => import("@/pages/Saved"));
const Admin = lazy(() => import("@/pages/Admin"));

function PageLoader() {
  return (
    <main className="min-h-[70vh] grid place-items-center px-4" dir="rtl">
      <div className="text-center">
        <LogoMark className="w-14 h-14 mx-auto animate-pulse" />
        <p className="mt-4 text-sm font-bold text-slate-500">جارٍ التحميل…</p>
      </div>
    </main>
  );
}

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
      <Route path="/library" element={<Protected><Library /></Protected>} />
      <Route path="/books/:id" element={<Protected><BookDetail /></Protected>} />
      <Route path="/upload-book" element={<Protected><UploadBook /></Protected>} />
      <Route path="/clubs" element={<Protected><Clubs /></Protected>} />
      <Route path="/clubs/:slug" element={<Protected><ClubDetail /></Protected>} />
      <Route path="/discussions/:id" element={<Protected><DiscussionDetail /></Protected>} />
      <Route path="/chess/practice" element={<Protected><ChessPractice /></Protected>} />
      <Route path="/chess/robot" element={<Protected><ChessRobot /></Protected>} />
      <Route path="/chess/:id" element={<Protected><ChessGame /></Protected>} />
      <Route path="/events" element={<Protected><Events /></Protected>} />
      <Route path="/events/:id" element={<Protected><EventDetail /></Protected>} />
      <Route path="/competitions" element={<Protected><Competitions /></Protected>} />
      <Route path="/competitions/:id" element={<Protected><CompetitionDetail /></Protected>} />
      <Route path="/leaderboard" element={<Protected><Leaderboard /></Protected>} />
      <Route path="/points" element={<Protected><Points /></Protected>} />
      <Route path="/stats" element={<Protected><Stats /></Protected>} />
      <Route path="/chess/puzzle" element={<Protected><ChessPuzzle /></Protected>} />
      <Route path="/verify/:code" element={<VerifyCertificate />} />
      <Route path="/certificates-wall" element={<CertificatesWall />} />
      <Route path="/messages" element={<Protected><Messages /></Protected>} />
      <Route path="/circles" element={<Protected><Circles /></Protected>} />
      <Route path="/help" element={<Protected><HelpBoard /></Protected>} />
      <Route path="/quiz-live" element={<Protected><QuizLive /></Protected>} />
      <Route path="/season-cup" element={<SeasonCup />} />
      <Route path="/class-report" element={<Protected><ClassReport /></Protected>} />
      <Route path="/members" element={<Protected><Members /></Protected>} />
      <Route path="/saved" element={<Protected><Saved /></Protected>} />
      <Route path="/portfolio/:id" element={<Portfolio />} />
      <Route path="/paths" element={<Protected><Paths /></Protected>} />
      <Route path="/community" element={<Protected><Community /></Protected>} />
      <Route path="/calendar" element={<Protected><Calendar /></Protected>} />
      <Route path="/reading-challenges" element={<Protected><ReadingChallenges /></Protected>} />
      <Route path="/focus" element={<Protected><FocusRooms /></Protected>} />
      <Route path="/flashcards" element={<Protected><Flashcards /></Protected>} />
      <Route path="/buddies" element={<Protected><Buddies /></Protected>} />
      <Route path="/live-sessions" element={<Protected><LiveSessions /></Protected>} />
      <Route path="/wrapped" element={<Protected><Wrapped /></Protected>} />
      <Route path="/mini-books" element={<Protected><MiniBooks /></Protected>} />
      <Route path="/swap" element={<Protected><Swap /></Protected>} />
      <Route path="/news" element={<Protected><News /></Protected>} />
      <Route path="/studio" element={<Protected><Studio /></Protected>} />
      <Route path="/studio/:id" element={<Protected><StudioWork /></Protected>} />
      <Route path="/ventures" element={<Protected><Ventures /></Protected>} />
      <Route path="/ventures/:id" element={<Protected><VentureDetail /></Protected>} />
      <Route path="/profile/:id" element={<Protected><Profile /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/admin/*" element={<Protected staff><Admin /></Protected>} />
      <Route path="/admin/books/:bookId/reviews" element={<Protected staff><BookReviews /></Protected>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
  if (reduce) return <Suspense fallback={<PageLoader />}>{routes}</Suspense>;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.28, ease: EASE }}
      >
        <Suspense fallback={<PageLoader />}>{routes}</Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
    installErrorReporter();
  }, []);
  return (
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <AnimatedRoutes />
        </ErrorBoundary>
        <RouteProgress />
        <BackToTop />
        <InstallPWA />
        <PushBanner />
        <ThemeApplier />
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
