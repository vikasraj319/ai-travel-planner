import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue } from "framer-motion";

/** Distance kept above a section when it becomes the active one. */
export const NAV_SCROLL_OFFSET = 120;

/** The navbar is always visible while the page is at (or near) the top. */
const TOP_VISIBLE_THRESHOLD = 20;
/** Beyond this the navbar switches to the floating pill shape. */
const SCROLLED_THRESHOLD = 40;
/** Only hide the navbar while scrolling down past this point. */
const HIDE_THRESHOLD = 120;
/** Outside clicks are ignored while the page is this close to the top. */
const OUTSIDE_CLICK_THRESHOLD = 10;
/** Smallest movement (px) treated as an intentional scroll direction change. */
const DIRECTION_EPSILON = 2;

/**
 * Document relative offset of an element.
 * `offsetTop` is relative to the nearest positioned ancestor, so the
 * offsetParent chain is walked to get a stable page level value.
 */
export function getDocumentOffsetTop(element) {
  if (!element) return 0;

  let top = element.offsetTop;
  let parent = element.offsetParent;

  while (
    parent &&
    parent !== document.body &&
    parent !== document.documentElement
  ) {
    top += parent.offsetTop;
    parent = parent.offsetParent;
  }

  return top;
}

/**
 * Scrolls an element into view keeping `offset` px of breathing room
 * underneath the navbar. Returns false when the element does not exist.
 */
export function scrollToSectionElement(element, offset = NAV_SCROLL_OFFSET) {
  if (!element) return false;

  const top = Math.max(0, getDocumentOffsetTop(element) - offset);
  window.scrollTo({ top, behavior: "smooth" });
  return true;
}

/**
 * Width of the fixed positioning context (the viewport without the
 * scrollbar). Used to size the navbar exactly and keep it centred.
 */
function getViewportWidth() {
  if (typeof document === "undefined") return 1280;
  return document.documentElement.clientWidth;
}

/**
 * Single source of truth for the navbar behaviour:
 * - visibility (hide on scroll down, reveal on scroll up)
 * - floating pill morph state
 * - mobile menu open/close
 * - active section (scroll spy)
 * - click outside toggle
 */
export default function useNavbarBehavior(navbarRef, links = []) {
  const [showNavbar, setShowNavbar] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(links[0]?.id ?? "");
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);

  const scrollProgress = useMotionValue(0);

  const lastScrollYRef = useRef(0);
  const activeRef = useRef(active);
  const linksRef = useRef(links);
  const lockUntilRef = useRef(0);
  const viewportWidthRef = useRef(viewportWidth);

  // Keep the latest link list available to the scroll spy without making
  // the scroll handler depend on it.
  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  // The scrollbar can appear/disappear while the page grows, so the
  // viewport width is re-synced on every scroll frame and on resize.
  const syncViewportWidth = useCallback(() => {
    const next = getViewportWidth();
    if (next !== viewportWidthRef.current) {
      viewportWidthRef.current = next;
      setViewportWidth(next);
    }
  }, []);

  const setActiveSection = useCallback((id) => {
    if (!id || activeRef.current === id) return;
    activeRef.current = id;
    setActive(id);
  }, []);

  // Scroll spy: section.offsetTop - 120 .. + section.clientHeight
  const detectActiveSection = useCallback(
    (scrollY) => {
      for (const link of linksRef.current) {
        const element = document.getElementById(link.id);
        if (!element) continue;

        const start = getDocumentOffsetTop(element) - NAV_SCROLL_OFFSET;
        const end = start + element.clientHeight;

        if (scrollY >= start && scrollY < end) {
          setActiveSection(link.id);
          return;
        }
      }

      // No section matched. The final section can be shorter than the
      // viewport, which leaves the maximum scroll position outside of its
      // range, so the last link takes over at the very bottom of the page.
      const doc = document.documentElement;
      if (
        scrollY > 0 &&
        scrollY + window.innerHeight >= doc.scrollHeight - 2 &&
        linksRef.current.length
      ) {
        const last = linksRef.current[linksRef.current.length - 1];
        setActiveSection(last.id);
      }
    },
    [setActiveSection]
  );

  // Coordinated scroll handler: visibility + morph + menu + scroll spy.
  useEffect(() => {
    let ticking = false;

    function update() {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYRef.current;

      // A. Always visible at the top of the page.
      if (currentY <= TOP_VISIBLE_THRESHOLD) {
        setShowNavbar(true);
      } else if (delta > DIRECTION_EPSILON) {
        // B. Hide while scrolling down (only past the hide threshold).
        if (
          currentY > HIDE_THRESHOLD &&
          Date.now() >= lockUntilRef.current
        ) {
          setShowNavbar(false);
        }
      } else if (delta < -DIRECTION_EPSILON) {
        // C. Reveal immediately when the direction flips to up.
        setShowNavbar(true);
      }

      // D. Floating pill threshold (independent from visibility).
      setScrolled(currentY > SCROLLED_THRESHOLD);

      // E. The mobile menu always collapses while scrolling.
      setMenuOpen(false);

      // Scroll spy for the active navigation item.
      detectActiveSection(currentY);

      // Keep the navbar width in sync with the viewport.
      syncViewportWidth();

      // Scroll progress is written to a motion value so the page does not
      // re-render on every scroll frame.
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        scrollProgress.set(
          Math.min(100, Math.max(0, (currentY / docHeight) * 100))
        );
      }

      lastScrollYRef.current = currentY;
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [detectActiveSection, scrollProgress, syncViewportWidth]);

  // Re-sync the viewport width when the window is resized.
  useEffect(() => {
    window.addEventListener("resize", syncViewportWidth);
    return () => {
      window.removeEventListener("resize", syncViewportWidth);
    };
  }, [syncViewportWidth]);

  // Click outside toggles the navbar (ignored at the top of the page).
  useEffect(() => {
    function handleWindowClick(event) {
      if (window.scrollY <= OUTSIDE_CLICK_THRESHOLD) return;

      const node = navbarRef.current;
      if (node && node.contains(event.target)) return;

      setShowNavbar((prev) => {
        // The navbar is always visible at the top of the page, so an
        // outside click may never leave it hidden there.
        if (window.scrollY <= TOP_VISIBLE_THRESHOLD) return true;
        return !prev;
      });
      setMenuOpen(false);
    }

    window.addEventListener("click", handleWindowClick);
    return () => {
      window.removeEventListener("click", handleWindowClick);
    };
  }, [navbarRef]);

  /**
   * Forces the navbar visible. `lockMs` keeps it visible for a short
   * period (used right after a navigation click so the smooth scroll
   * does not immediately hide it again).
   */
  const revealNavbar = useCallback((lockMs = 0) => {
    if (lockMs > 0) lockUntilRef.current = Date.now() + lockMs;
    setShowNavbar(true);
  }, []);

  return {
    showNavbar,
    scrolled,
    menuOpen,
    setMenuOpen,
    active,
    setActive: setActiveSection,
    revealNavbar,
    scrollProgress,
    viewportWidth
  };
}
