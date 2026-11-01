import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  ChevronDown,
  LogOut,
  Menu,
  Plane,
  Printer,
  Search,
  Share2,
  Sparkles,
  User,
  X
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, useTransform } from "framer-motion";
import { useAuth } from "../context/useAuth";
import useNavbarBehavior, {
  NAV_SCROLL_OFFSET,
  getDocumentOffsetTop
} from "../hooks/useNavbarBehavior";
import ThemeToggle from "./ThemeToggle";

const MotionDiv = motion.div;
const MotionSpan = motion.span;
const MotionForm = motion.form;

const NAV_LINKS = [
  { name: "Home", id: "hero" },
  { name: "Trips", id: "planner" },
  { name: "Explore", id: "destinations" },
  { name: "About", id: "how" },
  { name: "Contact", id: "footer" }
];

const MOBILE_NAV_LINKS = [
  { name: "Home", id: "hero" },
  { name: "Trips & AI Planner", id: "planner" },
  { name: "Explore Destinations", id: "destinations" },
  { name: "About Horizons", id: "how" },
  { name: "Contact Concierge", id: "footer" }
];

export default function Navbar({ itinerary }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const navbarRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const {
    showNavbar,
    scrolled,
    menuOpen,
    setMenuOpen,
    active,
    setActive,
    revealNavbar,
    scrollProgress,
    viewportWidth
  } = useNavbarBehavior(navbarRef, NAV_LINKS);

  const progressWidth = useTransform(scrollProgress, (value) => `${value}%`);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const isHome = location.pathname === "/";
  const isMobile = viewportWidth < 768;

  // Spring physics used for every navbar transition.
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 140, damping: 22 };

  // Morphing targets (width is kept in px so it can be spring animated).
  const headerWidth = scrolled
    ? Math.min(viewportWidth * 0.94, 1240)
    : viewportWidth;
  const headerHeight = scrolled ? 64 : 80;
  const headerPadX = isMobile ? 16 : scrolled ? 32 : 20;

  // Close the account dropdown on outside click.
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus the search input when it is expanded.
  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  // Handle a deep link (/#section) once we are back on the home route.
  useEffect(() => {
    if (!isHome || !location.hash) return;

    const element = document.getElementById(location.hash.slice(1));
    if (!element) return;

    const top = Math.max(
      0,
      getDocumentOffsetTop(element) - NAV_SCROLL_OFFSET
    );
    window.scrollTo({ top, behavior: "auto" });
  }, [isHome, location.hash]);

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

  function scrollToId(id) {
    const element = document.getElementById(id);
    if (!element) return false;

    const top = Math.max(
      0,
      getDocumentOffsetTop(element) - NAV_SCROLL_OFFSET
    );
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    return true;
  }

  function handleNavClick(event, link) {
    event.preventDefault();

    // 1. Update the active item immediately.
    setActive(link.id);
    // 2. Close the mobile menu.
    setMenuOpen(false);
    // 3. Keep the navbar visible during the interaction.
    revealNavbar(900);

    // 4. Navigate to the right route / section.
    if (!isHome) {
      navigate(`/#${link.id}`);
      return;
    }

    // 5. Smooth scroll with the navbar offset (never to a missing id).
    scrollToId(link.id);
  }

  function handleBrandClick(event) {
    event.preventDefault();

    setMenuOpen(false);
    revealNavbar(900);

    if (!isHome) {
      navigate("/");
      return;
    }

    setActive("hero");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function handleMenuToggle(event) {
    // Never let the hamburger reach the outside click handler.
    event.stopPropagation();

    revealNavbar();
    setMenuOpen((prev) => !prev);
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

  return (
    <>
      <motion.header
        ref={navbarRef}
        id="navbar-shell"
        className={`fixed z-[100] ${scrolled ? "is-scrolled" : ""}`}
        style={{
          left: "50%",
          pointerEvents: showNavbar ? "auto" : "none"
        }}
        initial={false}
        animate={{
          x: "-50%",
          y: showNavbar ? 0 : -120,
          width: headerWidth,
          top: scrolled ? 10 : 0,
          height: headerHeight,
          borderRadius: scrolled ? 999 : 0,
          paddingLeft: headerPadX,
          paddingRight: headerPadX
        }}
        transition={spring}
        aria-hidden={!showNavbar}
      >
        <nav
          id="navbar"
          className="flex h-full w-full items-center justify-between gap-2"
          aria-label="Primary navigation"
        >
          {/* Scroll progress bar indicator at bottom of navbar */}
          <MotionDiv
            className="absolute bottom-0 left-6 right-6 h-[2px] bg-gradient-to-r from-amber-400 via-sky-400 to-amber-500 rounded-full opacity-60"
            style={{ width: progressWidth }}
          />

          {/* LEFT: BRANDING & LOGO */}
          <div className="flex items-center gap-3">
            <a
              href="#hero"
              onClick={handleBrandClick}
              className="group flex items-center gap-3 transition-transform duration-300 hover:scale-[1.02]"
              aria-label="Horizons AI home"
            >
              <MotionDiv
                className="flex items-center gap-3"
                animate={{ scale: scrolled ? 0.92 : 1 }}
                transition={spring}
                style={{ transformOrigin: "left center" }}
              >
                <div className="nav-brand-icon relative flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 shadow-md shadow-amber-400/25 transition-transform duration-300 group-hover:rotate-12">
                  <Plane className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
                  {!scrolled && (
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-tight transition-opacity duration-300">
                      Smart Travel Concierge
                    </span>
                  )}
                </div>
              </MotionDiv>
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
                onClick={(e) => handleNavClick(e, { id: "itinerary" })}
                className="px-3 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all"
              >
                Overview
              </a>
              <a
                href="#itinerary"
                onClick={(e) => handleNavClick(e, { id: "itinerary" })}
                className="px-3 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all"
              >
                Schedule
              </a>
              <a
                href="#planner"
                onClick={(e) => handleNavClick(e, { id: "planner" })}
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
              {NAV_LINKS.map((link) => {
                const isActive = isHome && active === link.id;
                return (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={(e) => handleNavClick(e, link)}
                    className={`nav-link ${isActive ? "is-active" : ""}`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    {isActive && (
                      <MotionSpan
                        layoutId="navActiveTint"
                        className="nav-link__tint"
                        transition={spring}
                      />
                    )}
                    <span className="relative z-10">{link.name}</span>
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
              onClick={handleMenuToggle}
              type="button"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all active:scale-95"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              aria-controls="navbar-mobile-nav"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* MOBILE ACCORDION DROPDOWN */}
        <MotionDiv
          id="navbar-mobile-nav"
          className="mobile-nav md:hidden"
          initial={false}
          animate={{
            maxHeight: menuOpen ? "22rem" : 0,
            opacity: menuOpen ? 1 : 0
          }}
          transition={spring}
          aria-hidden={!menuOpen}
        >
          <div className="mobile-nav__panel">
            {/* Mobile Search */}
            <form onSubmit={handleSearchSubmit}>
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
                  aria-label="Search destinations"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Mobile Nav Links */}
            <div className="flex flex-col gap-1 mt-3">
              {MOBILE_NAV_LINKS.map((link) => {
                const isActive = isHome && active === link.id;
                return (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={(e) => handleNavClick(e, link)}
                    className={`mobile-nav-link ${isActive ? "is-active" : ""}`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <span>{link.name}</span>
                    <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  </a>
                );
              })}
            </div>

            {/* Mobile Auth */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {user ? (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="w-full py-2.5 text-center text-xs font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl shadow-sm"
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
                    className="w-full py-2.5 text-center text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 rounded-xl"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold bg-amber-400 text-slate-950 rounded-xl shadow-sm shadow-amber-400/25"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </MotionDiv>
      </motion.header>
    </>
  );
}
