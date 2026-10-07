import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Calendar,
  Check,
  ChevronDown,
  Compass,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Plane,
  Printer,
  Search,
  Share2,
  Sparkles,
  User,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/useAuth";
import useSmartScroll from "../hooks/useSmartScroll";
import ThemeToggle from "./ThemeToggle";

const MotionAside = motion.aside;
const MotionDiv = motion.div;
const MotionForm = motion.form;

export default function Navbar({ itinerary }) {
  const { isScrolled, isVisible, scrollProgress } = useSmartScroll(25);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const sections = ["hero", "planner", "destinations", "how", "footer"];
    function spyScroll() {
      const scrollPos = window.scrollY + 200;
      for (const sec of sections) {
        const el = document.getElementById(sec);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sec);
            break;
          }
        }
      }
    }
    window.addEventListener("scroll", spyScroll, { passive: true });
    return () => window.removeEventListener("scroll", spyScroll);
  }, []);

  // Focus search input when expanded
  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Dispatch so the app can filter destinations and scroll to the section
    window.dispatchEvent(
      new CustomEvent("horizons:search", { detail: searchQuery.trim() })
    );
    setSearchOpen(false);
  }

  function handleShare() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  }

  function handlePrint() {
    window.print();
  }

  const userInitials =
    user?.user_metadata?.full_name
      ? user.user_metadata.full_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : user?.email
      ? user.email[0].toUpperCase()
      : "U";

  const isHome = location.pathname === "/";

  return (
    <>
      <header
        id="navbar-shell"
        className={`fixed left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-out ${
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-[140%] opacity-0"
        }`}
        style={{
          top: isScrolled ? "0.75rem" : "1.25rem",
          width: "min(92vw, 1200px)"
        }}
      >
        <nav
          id="navbar"
          className={`relative flex items-center justify-between px-4 sm:px-6 transition-all duration-300 ease-out ${
            isScrolled
              ? "h-[68px] bg-white/92 border-slate-200/80 shadow-xl shadow-slate-900/10 backdrop-blur-xl rounded-[28px]"
              : "h-[86px] bg-white/80 border-white/60 shadow-lg shadow-slate-900/5 backdrop-blur-md rounded-[32px]"
          } border`}
          aria-label="Primary navigation"
        >
          {/* Scroll progress bar indicator at bottom of navbar */}
          <div
            className="absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r from-amber-400 via-sky-400 to-amber-500 rounded-full transition-all duration-150 opacity-60"
            style={{ width: `${scrollProgress}%` }}
          />

          {/* LEFT: BRANDING & LOGO */}
          <div className="flex items-center gap-3">
            <a
              href="#hero"
              className="group flex items-center gap-3 transition-transform duration-300 hover:scale-[1.02]"
              aria-label="Horizons AI home"
            >
              <div className="nav-brand-icon relative flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 shadow-md shadow-amber-400/25 transition-transform duration-300 group-hover:rotate-12">
                <Plane className="w-5.5 h-5.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 dark:text-slate-50 text-lg tracking-tight leading-none">
                    Horizons <span className="text-amber-500">AI</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100/80 text-amber-900 border border-amber-300/60 shadow-xs">
                    <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
                    AI Powered
                  </span>
                </div>
                {!isScrolled && (
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-tight transition-opacity duration-300">
                    Smart Travel Concierge
                  </span>
                )}
              </div>
            </a>
          </div>

          {/* CENTER: STANDARD NAVIGATION OR CONTEXTUAL SMART TRIP BAR */}
          {itinerary && isHome ? (
            /* CONTEXTUAL SMART TRIP BAR */
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-full border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow-xs">
                🏝 {itinerary.destination || itinerary.title || "Goa Trip"}
              </span>

              <a
                href="#itinerary"
                className="px-3 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all"
              >
                Overview
              </a>
              <a
                href="#itinerary"
                className="px-3 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all"
              >
                Schedule
              </a>
              <a
                href="#planner"
                className="px-3 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all"
              >
                Map
              </a>

              <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600 mx-1" />

              <button
                onClick={handleShare}
                type="button"
                className="relative px-3 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all flex items-center gap-1"
                aria-label="Share itinerary"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>{copiedToast ? "Copied!" : "Share"}</span>
              </button>

              <button
                onClick={handlePrint}
                type="button"
                className="px-3 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all flex items-center gap-1"
                aria-label="Download or print PDF"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>PDF</span>
              </button>
            </div>
          ) : (
            /* STANDARD NAVIGATION LINKS */
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              {[
                { name: "Home", href: "#hero", id: "hero" },
                { name: "Trips", href: "#planner", id: "planner" },
                { name: "Explore", href: "#destinations", id: "destinations" },
                { name: "About", href: "#how", id: "how" },
                { name: "Contact", href: "#footer", id: "footer" }
              ].map((link) => {
                const isActive = activeSection === link.id && isHome;
                return (
                  <a
                    key={link.name}
                    href={link.href}
                    className={`relative px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                      isActive
                        ? "text-amber-950 font-bold bg-amber-400/90 shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                    }`}
                  >
                    {link.name}
                    {isActive && (
                      <MotionDiv
                        layoutId="navPill"
                        className="absolute inset-0 bg-amber-400 rounded-full -z-10 shadow-xs"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </a>
                );
              })}
            </div>
          )}

          {/* RIGHT: SEARCH, THEME, AUTH / USER DROPDOWN, MOBILE HAMBURGER */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            {/* SEARCH EXPANDABLE INPUT */}
            <div className="relative flex items-center">
              <AnimatePresence>
                {searchOpen ? (
                  <MotionForm
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 220, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleSearchSubmit}
                    className="relative overflow-hidden"
                  >
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search destinations..."
                      className="w-full h-9 pl-3 pr-8 text-xs font-medium text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-600/80 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                      onBlur={() => !searchQuery && setSearchOpen(false)}
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </MotionForm>
                ) : (
                  <button
                    onClick={() => setSearchOpen(true)}
                    type="button"
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-all hover:scale-105 active:scale-95"
                    aria-label="Search destinations"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}
              </AnimatePresence>
            </div>

            {/* AUTH / USER PROFILE DROPDOWN */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  type="button"
                  className="flex items-center gap-2 p-1 pl-1 pr-3 rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all hover:scale-[1.03] active:scale-95 shadow-md"
                  aria-expanded={userDropdownOpen}
                  aria-label="User account menu"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center shadow-xs">
                    {userInitials}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold max-w-[90px] truncate">
                    {user.user_metadata?.full_name || "Account"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* USER DROPDOWN MENU */}
                <AnimatePresence>
                  {userDropdownOpen && (
                    <MotionDiv
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 mt-3 w-56 p-2 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/90 rounded-2xl shadow-2xl shadow-slate-900/15 backdrop-blur-xl z-[110]"
                    >
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {user.user_metadata?.full_name || "Traveler"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>

                      <Link
                        to="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                      >
                        <User className="w-4 h-4 text-amber-500" />
                        <span>Workspace Dashboard</span>
                      </Link>

                      <Link
                        to="/saved-trips"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                      >
                        <Bookmark className="w-4 h-4 text-amber-500" />
                        <span>Saved Trips Collection</span>
                      </Link>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                      <button
                        onClick={async () => {
                          setUserDropdownOpen(false);
                          await logout();
                          navigate("/login");
                        }}
                        type="button"
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </MotionDiv>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/login"
                className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-400/25 transition-all duration-200 hover:scale-[1.05] active:scale-95"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            )}

            {/* MOBILE HAMBURGER BUTTON */}
            <button
              onClick={() => setMenuOpen(true)}
              type="button"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all active:scale-95"
              aria-label="Open navigation drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </nav>
      </header>

      {/* MOBILE SLIDE-OUT GLASS DRAWER */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[150] md:hidden"
            />

            {/* Slide-out drawer */}
            <MotionAside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 32 }}
              className="fixed top-0 right-0 bottom-0 w-[82vw] max-w-sm bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-white/80 dark:border-slate-800 p-6 z-[160] shadow-2xl flex flex-col justify-between rounded-l-3xl md:hidden"
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                      <Plane className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-50 text-base">Horizons AI</span>
                      <span className="block text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                        ✨ AI Powered Planner
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button
                      onClick={() => setMenuOpen(false)}
                      type="button"
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700"
                      aria-label="Close menu"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile Search */}
                <form onSubmit={handleSearchSubmit} className="mt-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search destinations..."
                      className="w-full h-10 pl-3 pr-9 text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button
                      type="submit"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Mobile Nav Links */}
                <div className="flex flex-col gap-2 mt-6">
                  {[
                    { name: "Home", href: "#hero" },
                    { name: "Trips & AI Planner", href: "#planner" },
                    { name: "Explore Destinations", href: "#destinations" },
                    { name: "About Horizons", href: "#how" },
                    { name: "Contact Concierge", href: "#footer" }
                  ].map((link) => (
                    <a
                      key={link.name}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="px-4 py-3 rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-950 dark:hover:text-amber-300 transition-all flex items-center justify-between"
                    >
                      <span>{link.name}</span>
                      <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Mobile Footer Auth */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                {user ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="w-full py-3 text-center text-xs font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-2xl shadow-md"
                    >
                      Workspace Dashboard
                    </Link>
                    <button
                      onClick={async () => {
                        setMenuOpen(false);
                        await logout();
                        navigate("/login");
                      }}
                      type="button"
                      className="w-full py-3 text-center text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 rounded-2xl"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMenuOpen(false)}
                    className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold bg-amber-400 text-slate-950 rounded-2xl shadow-md shadow-amber-400/25"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </MotionAside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
