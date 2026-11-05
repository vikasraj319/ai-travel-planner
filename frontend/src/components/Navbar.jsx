import { useCallback, useEffect, useRef, useState } from "react";
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
  X,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAuth } from "../context/useAuth";
import useNavbarBehavior, {
  NAV_SCROLL_OFFSET,
  getDocumentOffsetTop,
} from "../hooks/useNavbarBehavior";
import ThemeToggle from "./ThemeToggle";

const MotionDiv = motion.div;
const MotionSpan = motion.span;
const MotionForm = motion.form;

const NAV_LINKS = [
  { name: "Home", id: "hero" },
  { name: "How it Works", id: "how" },
  { name: "Trips", id: "planner" },
  { name: "Explore", id: "destinations" },
  { name: "About", id: "footer" },
];

const MOBILE_NAV_LINKS = [
  { name: "Home", id: "hero" },
  { name: "Trips", id: "planner" },
  { name: "Explore", id: "destinations" },
  { name: "About", id: "footer" },
];

export default function Navbar({ itinerary }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const navbarRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchButtonRef = useRef(null);
  const previousPathRef = useRef(location.pathname);

  const {
    showNavbar,
    scrolled,
    menuOpen,
    setMenuOpen,
    active,
    setActive,
    revealNavbar,
    viewportWidth,
  } = useNavbarBehavior(navbarRef, NAV_LINKS);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const isHome = location.pathname === "/";
  const isMobile = viewportWidth < 768;

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 140, damping: 22 };

  const headerWidth = Math.min(
    viewportWidth * (isMobile ? 0.94 : 0.97),
    1240
  );
  const headerHeight = scrolled ? 58 : 64;
  const headerPadX = isMobile ? 12 : scrolled ? 20 : 24;

  const closeTransientUI = useCallback(() => {
    setUserDropdownOpen(false);
    setSearchOpen(false);
    setMenuOpen(false);
  }, [setMenuOpen]);

  // Close transient menus when the route changes.
  useEffect(() => {
    const routeChanged = previousPathRef.current !== location.pathname;
    previousPathRef.current = location.pathname;

    closeTransientUI();

    if (routeChanged) {
      setSearchQuery("");
      setActive("");
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location.pathname, closeTransientUI, setActive]);

  // Outside click closes profile dropdown and mobile navigation.
  useEffect(() => {
    function handlePointerDown(event) {
      const target = event.target;

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }

      if (navbarRef.current && !navbarRef.current.contains(target)) {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [setMenuOpen]);

  // Escape closes every open navbar surface.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key !== "Escape") return;

      const hadOpenSurface =
        menuOpen || userDropdownOpen || searchOpen;

      closeTransientUI();

      if (hadOpenSurface) {
        searchButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    menuOpen,
    userDropdownOpen,
    searchOpen,
    closeTransientUI,
  ]);

  // Focus the desktop search field after it opens.
  useEffect(() => {
    if (searchOpen && !isMobile) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen, isMobile]);

  // Lock background scrolling while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen || !isMobile) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen, isMobile]);

  // Close mobile navigation when switching to desktop width.
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile, setMenuOpen]);

  // Handle a deep link such as /#destinations after returning home.
  useEffect(() => {
    if (!isHome || !location.hash) return;

    const id = location.hash.slice(1);
    const element = document.getElementById(id);
    if (!element) return;

    const top = Math.max(
      0,
      getDocumentOffsetTop(element) - NAV_SCROLL_OFFSET
    );

    window.scrollTo({ top, behavior: "auto" });
    setActive(id);
  }, [isHome, location.hash, setActive]);

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email
      ? user.email[0].toUpperCase()
      : "U";

  const handleSearchSubmit = useCallback(
    (event) => {
      event.preventDefault();

      const query = searchQuery.trim();
      if (!query) {
        searchInputRef.current?.focus();
        return;
      }

      window.dispatchEvent(
        new CustomEvent("horizons:search", {
          detail: query,
        })
      );

      setSearchOpen(false);
      setMenuOpen(false);
      setUserDropdownOpen(false);
      revealNavbar(900);
    },
    [searchQuery, setMenuOpen, revealNavbar]
  );

  const handleShare = useCallback(async () => {
    setShareError(false);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      window.setTimeout(() => setCopiedToast(false), 2500);
    } catch {
      setShareError(true);
      window.setTimeout(() => setShareError(false), 2500);
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const scrollToId = useCallback(
    (id) => {
      const element = document.getElementById(id);
      if (!element) return false;

      const top = Math.max(
        0,
        getDocumentOffsetTop(element) - NAV_SCROLL_OFFSET
      );

      window.scrollTo({
        top,
        behavior: reduceMotion ? "auto" : "smooth",
      });

      return true;
    },
    [reduceMotion]
  );

  const handleNavClick = (event, link) => {
    event.preventDefault();

    setActive(link.id);
    closeTransientUI();
    revealNavbar(900);

    if (!isHome) {
      navigate(`/#${link.id}`);
      return;
    }

    scrollToId(link.id);
  };

  const handleBrandClick = (event) => {
    event.preventDefault();

    closeTransientUI();
    revealNavbar(900);
    setActive("hero");

    if (!isHome) {
      navigate("/");
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const handleMenuToggle = () => {
    revealNavbar();
    setSearchOpen(false);
    setUserDropdownOpen(false);
    setMenuOpen((previous) => !previous);
  };

  const handleProfileToggle = () => {
    setMenuOpen(false);
    setSearchOpen(false);
    setUserDropdownOpen((previous) => !previous);
  };

  const handleSearchToggle = () => {
    setMenuOpen(false);
    setUserDropdownOpen(false);
    setSearchOpen((previous) => !previous);
    revealNavbar();
  };

  const handleLogout = async () => {
    if (logoutLoading) return;

    setLogoutLoading(true);
    closeTransientUI();

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Unable to sign out:", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  const renderNavLink = (link, mobile = false) => {
    const isActive = isHome && active === link.id;

    return (
      <a
        key={link.id}
        href={`/#${link.id}`}
        onClick={(event) => handleNavClick(event, link)}
        className={
          mobile
            ? `mobile-nav-link ${isActive ? "is-active" : ""}`
            : `nav-link ${isActive ? "is-active" : ""}`
        }
        aria-current={isActive ? "location" : undefined}
      >
        {!mobile && isActive && (
          <MotionSpan
            layoutId="navActiveTint"
            className="nav-link__tint"
            transition={transition}
          />
        )}
        <span className={mobile ? "" : "relative z-10"}>
          {link.name}
        </span>
      </a>
    );
  };

  return (
    <motion.header
      ref={navbarRef}
      id="navbar-shell"
      className={`navbar-glass-bg fixed z-[100] ${
        scrolled ? "is-scrolled" : ""
      }`}
      style={{
        left: "50%",
        pointerEvents: showNavbar ? "auto" : "none",
      }}
      initial={false}
      animate={{
        x: "-50%",
        y: showNavbar ? 0 : -120,
        width: headerWidth,
        top: scrolled ? 10 : 12,
        height: headerHeight,
        borderRadius: 999,
        paddingLeft: headerPadX,
        paddingRight: headerPadX,
      }}
      transition={transition}
      aria-hidden={!showNavbar}
    >
      <nav
        id="navbar"
        className="flex h-full w-full items-center justify-between gap-2"
        aria-label="Primary navigation"
      >
        {/* BRAND */}
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="/#hero"
            onClick={handleBrandClick}
            className="group flex items-center gap-3 transition-transform duration-300 hover:scale-[1.02]"
            aria-label="Horizons AI home"
          >
            <MotionDiv
              className="flex items-center gap-3"
              animate={{ scale: scrolled ? 0.92 : 1 }}
              transition={transition}
              style={{ transformOrigin: "left center" }}
            >
              <div className="nav-brand-icon relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-12">
                <Plane className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>

              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-2">
                  <span className="nav-brand-name whitespace-nowrap text-lg font-extrabold leading-none tracking-tight">
                    Horizons <span>AI</span>
                  </span>
                  <span className="nav-ai-badge hidden items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-xs sm:inline-flex">
                    <Sparkles className="h-3 w-3" />
                    AI Powered
                  </span>
                </div>
              </div>
            </MotionDiv>
          </a>
          <span
            className="nav-mobile-brand-divider md:hidden"
            aria-hidden="true"
          />
        </div>

        {/* DESKTOP NAVIGATION / TRIP CONTEXT */}
        {itinerary && isHome ? (
          <div className="nav-trip-bar hidden items-center gap-1.5 rounded-full p-1.5 shadow-xs lg:flex">
            <span className="nav-trip-bar__destination flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-xs">
              🏝 {itinerary.destination || itinerary.title || "Your Trip"}
            </span>

            <a
              href="/#itinerary"
              onClick={(event) =>
                handleNavClick(event, { id: "itinerary" })
              }
              className="nav-trip-bar__link rounded-full px-3 py-1 text-xs font-bold transition-all"
            >
              Overview
            </a>

            <a
              href="/#itinerary"
              onClick={(event) =>
                handleNavClick(event, { id: "itinerary" })
              }
              className="nav-trip-bar__link rounded-full px-3 py-1 text-xs font-bold transition-all"
            >
              Schedule
            </a>

            <a
              href="/#planner"
              onClick={(event) =>
                handleNavClick(event, { id: "planner" })
              }
              className="nav-trip-bar__link rounded-full px-3 py-1 text-xs font-bold transition-all"
            >
              Map
            </a>

            <div className="nav-trip-bar__divider mx-1 h-4 w-px" />

            <button
              onClick={handleShare}
              type="button"
              className="nav-trip-bar__link relative flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all"
              aria-label="Copy itinerary link"
              title={shareError ? "Unable to copy link" : "Copy itinerary link"}
            >
              <Share2 className="nav-trip-bar__icon h-3.5 w-3.5" />
              <span>
                {shareError ? "Unable to copy" : copiedToast ? "Copied!" : "Share"}
              </span>
            </button>

            <button
              onClick={handlePrint}
              type="button"
              className="nav-trip-bar__link flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all"
              aria-label="Print or save itinerary as PDF"
            >
              <Printer className="nav-trip-bar__icon h-3.5 w-3.5" />
              <span>PDF</span>
            </button>
          </div>
        ) : (
          <div className="hidden items-center gap-1 md:flex lg:gap-2">
            {NAV_LINKS.map((link) => renderNavLink(link))}
          </div>
        )}

        {/* RIGHT CONTROLS */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="nav-desktop-divider hidden md:block" aria-hidden="true" />

          <ThemeToggle className="nav-theme-control" />

          {/* DESKTOP SEARCH */}
          <div className="nav-search-wrap relative hidden items-center md:flex">
            <AnimatePresence initial={false} mode="wait">
              {searchOpen ? (
                <MotionForm
                  key="desktop-search"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 220, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                  onSubmit={handleSearchSubmit}
                  className="relative overflow-hidden"
                  role="search"
                >
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search destinations..."
                    aria-label="Search destinations"
                    className="nav-search-input h-9 w-full rounded-full pl-3 pr-8 text-xs font-medium focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="nav-search-submit absolute right-2 top-1/2 -translate-y-1/2"
                    aria-label="Submit destination search"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </MotionForm>
              ) : (
                <MotionDiv
                  key="desktop-search-button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    ref={searchButtonRef}
                    onClick={handleSearchToggle}
                    type="button"
                    className="nav-control flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95"
                    aria-label="Open destination search"
                    aria-expanded={searchOpen}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>

          {/* DESKTOP AUTH */}
          <div className="hidden md:flex">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={handleProfileToggle}
                  type="button"
                  className="nav-profile-trigger flex items-center gap-2 rounded-full p-1 pr-3 transition-all hover:scale-[1.03] active:scale-95"
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="menu"
                  aria-label="Open user account menu"
                >
                  <div className="nav-avatar flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-xs">
                    {userInitials}
                  </div>
                  <span className="hidden max-w-[90px] truncate text-xs font-semibold sm:inline">
                    {user.user_metadata?.full_name || "Account"}
                  </span>
                  <ChevronDown
                    className={`nav-profile-chevron h-3.5 w-3.5 ${
                      userDropdownOpen ? "is-open" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <MotionDiv
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: reduceMotion ? 0 : 0.16 }}
                      className="nav-profile-menu absolute right-0 z-[110] mt-3 w-56 rounded-2xl p-2"
                      role="menu"
                    >
                      <div className="nav-profile-menu__identity mb-1 px-3 py-2">
                        <p className="truncate text-xs font-bold">
                          {user.user_metadata?.full_name || "Traveler"}
                        </p>
                        <p className="truncate text-[11px]">{user.email}</p>
                      </div>

                      <Link
                        to="/dashboard"
                        onClick={closeTransientUI}
                        className="nav-profile-menu__link flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
                        role="menuitem"
                      >
                        <User className="h-4 w-4" />
                        <span>Workspace Dashboard</span>
                      </Link>

                      <Link
                        to="/saved-trips"
                        onClick={closeTransientUI}
                        className="nav-profile-menu__link flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
                        role="menuitem"
                      >
                        <Bookmark className="h-4 w-4" />
                        <span>Saved Trips Collection</span>
                      </Link>

                      <div className="nav-profile-menu__divider my-1" />

                      <button
                        onClick={handleLogout}
                        disabled={logoutLoading}
                        type="button"
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition-all hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{logoutLoading ? "Signing out..." : "Sign Out"}</span>
                      </button>
                    </MotionDiv>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={closeTransientUI}
                className="nav-sign-in group relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-all duration-200 hover:scale-[1.05] active:scale-95"
              >
                <span>Sign In</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            )}
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            onClick={handleMenuToggle}
            type="button"
            className="nav-control nav-menu-toggle flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 md:hidden"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="navbar-mobile-nav"
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {/* MOBILE NAVIGATION */}
      <AnimatePresence initial={false}>
        {menuOpen && (
          <MotionDiv
            id="navbar-mobile-nav"
            className="mobile-nav md:hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            aria-label="Mobile navigation"
          >
            <div className="mobile-nav__panel">
              <form onSubmit={handleSearchSubmit} role="search">
                <div className="relative">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search destinations..."
                    aria-label="Search destinations"
                    className="nav-mobile-search h-10 w-full rounded-xl pl-3 pr-9 text-xs font-medium focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="nav-search-submit absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label="Submit destination search"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>

              <div className="mt-3 flex flex-col gap-1">
                {MOBILE_NAV_LINKS.map((link) => renderNavLink(link, true))}
              </div>

              <div className="nav-mobile-auth mt-3 pt-3">
                {user ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/dashboard"
                      onClick={closeTransientUI}
                      className="nav-mobile-dashboard w-full rounded-xl py-2.5 text-center text-xs font-bold shadow-sm"
                    >
                      Workspace Dashboard
                    </Link>

                    <Link
                      to="/saved-trips"
                      onClick={closeTransientUI}
                      className="nav-mobile-saved w-full rounded-xl py-2.5 text-center text-xs font-bold"
                    >
                      Saved Trips Collection
                    </Link>

                    <button
                      onClick={handleLogout}
                      disabled={logoutLoading}
                      type="button"
                      className="w-full rounded-xl bg-rose-50 py-2.5 text-center text-xs font-bold text-rose-600 disabled:opacity-60"
                    >
                      {logoutLoading ? "Signing out..." : "Sign Out"}
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={closeTransientUI}
                    className="nav-mobile-dashboard flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold shadow-sm"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
