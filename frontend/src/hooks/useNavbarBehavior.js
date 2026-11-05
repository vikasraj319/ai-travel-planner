
import { useCallback, useEffect, useRef, useState } from "react";


export const NAV_SCROLL_OFFSET = 120;


// Navbar behavior thresholds
const TOP_VISIBLE_THRESHOLD = 20;
const SCROLLED_THRESHOLD = 40;
const HIDE_THRESHOLD = 120;
const DIRECTION_EPSILON = 2;

// Prevent scroll events from immediately overriding manual visibility changes.
const VISIBILITY_LOCK_DURATION = 350;

// Elements that should never trigger navbar visibility toggling.
const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "textarea",
  "select",
  "option",
  "label",
  "summary",
  "details",
  "[role='button']",
  "[role='link']",
  "[role='menuitem']",
  "[role='menuitemcheckbox']",
  "[role='menuitemradio']",
  "[role='switch']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='tab']",
  "[role='dialog']",
  "[role='listbox']",
  "[role='combobox']",
  "[role='slider']",
  "[aria-haspopup]",
  "[contenteditable='true']",
  "[data-navbar-ignore]",
  "[data-navbar-interactive]",
].join(",");


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
// Extract a section ID from a navbar link.
function getSectionId(link) {
  if (typeof link === "string") {
    return link.startsWith("#") ? link.slice(1) : link;
  }

  if (!link || typeof link !== "object") {
    return null;
  }

  const href = link.href || link.to || link.url;

  if (typeof href === "string" && href.includes("#")) {
    return href.split("#").pop() || null;
  }

  return link.id || link.sectionId || link.section || null;
}

export default function useNavbarBehavior(navbarRef, links = []) {
  const [showNavbar, setShowNavbar] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  const lastScrollYRef = useRef(0);
  const lockUntilRef = useRef(0);
  const animationFrameRef = useRef(null);

  // Manually reveal the navbar and temporarily protect it
  // from being hidden by an immediate scroll event.
  const revealNavbar = useCallback(() => {
    setShowNavbar(true);
    lockUntilRef.current = Date.now() + VISIBILITY_LOCK_DURATION;
  }, []);

  // Handle page scrolling.
  useEffect(() => {
    let ticking = false;

    function updateScroll() {
      const currentY = Math.max(0, window.scrollY);
      const previousY = lastScrollYRef.current;
      const delta = currentY - previousY;

      // Update scroll-related states.
      setScrolled(currentY > SCROLLED_THRESHOLD);

      const documentHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      const progress =
        documentHeight > 0 ? (currentY / documentHeight) * 100 : 0;

      setScrollProgress(Math.min(100, Math.max(0, progress)));

      // Always show navbar at the top of the page.
      if (currentY <= TOP_VISIBLE_THRESHOLD) {
        setShowNavbar(true);
      }
      // Scrolling down hides the navbar after the threshold.
      else if (delta > DIRECTION_EPSILON) {
        if (
          currentY > HIDE_THRESHOLD &&
          Date.now() >= lockUntilRef.current
        ) {
          setShowNavbar(false);
          setMenuOpen(false);
        }
      }
      // Scrolling up reveals the navbar immediately.
      else if (delta < -DIRECTION_EPSILON) {
        setShowNavbar(true);
      }

      lastScrollYRef.current = currentY;
      ticking = false;
    }

    function handleScroll() {
      if (!ticking) {
        animationFrameRef.current = window.requestAnimationFrame(
          updateScroll
        );
        ticking = true;
      }
    }

    lastScrollYRef.current = window.scrollY;

    updateScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Toggle navbar visibility when clicking non-interactive areas.
  useEffect(() => {
    function handleDocumentClick(event) {
      if (event.defaultPrevented) return;

      const target = event.target;

      if (!(target instanceof Element)) return;

      // Ignore all standard and explicitly marked interactive elements.
      if (target.closest(INTERACTIVE_SELECTOR)) return;

      // Ignore interactions inside the navbar's mobile menu when
      // the menu container has been explicitly marked interactive.
      // Navbar controls are already excluded by the selector above.

      if (window.scrollY <= TOP_VISIBLE_THRESHOLD) {
        setShowNavbar(true);
        return;
      }

      // Toggle visibility for ordinary screen areas.
      setShowNavbar((previous) => !previous);

      // Close an open mobile menu when the user taps empty space.
      setMenuOpen(false);

      // Avoid an immediate scroll event overriding the manual toggle.
      lockUntilRef.current = Date.now() + VISIBILITY_LOCK_DURATION;
    }

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  // Update viewport width and close mobile menu when resizing.
  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);

      if (window.innerWidth > 768) {
        setMenuOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Detect the currently visible page section.
  useEffect(() => {
    if (!links.length) return;

    function updateActiveSection() {
      const sections = links
        .map((link) => {
          const id = getSectionId(link);
          const element = id ? document.getElementById(id) : null;

          return element ? { id, element } : null;
        })
        .filter(Boolean);

      if (!sections.length) return;

      let currentSection = sections[0].id;

      for (const section of sections) {
        const top = section.element.getBoundingClientRect().top;

        if (top <= 120) {
          currentSection = section.id;
        }
      }

      setActive(currentSection);
    }

    updateActiveSection();

    window.addEventListener("scroll", updateActiveSection, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
    };
  }, [links]);

  return {
    showNavbar,
    scrolled,
    menuOpen,
    setMenuOpen,
    active,
    setActive,
    revealNavbar,
    scrollProgress,
    viewportWidth,
  };
}
