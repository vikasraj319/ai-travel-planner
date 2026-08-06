import { useEffect, useState } from "react";

/**
 * Custom hook for smart scroll management:
 * - Detects if scrolled past top threshold (> 20px)
 * - Tracks scroll direction to auto-hide navbar on scroll down and reveal immediately on scroll up
 * - Returns current scroll position and progress percentage
 */
export default function useSmartScroll(threshold = 20) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateScroll() {
      const currentScrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;

      // 1. Threshold check
      setIsScrolled(currentScrollY > threshold);

      // 2. Hide/reveal logic (always visible at top)
      if (currentScrollY < threshold) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY + 5) {
        // Scrolling down -> hide navbar
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY - 5) {
        // Scrolling up -> reveal navbar
        setIsVisible(true);
      }

      // 3. Scroll progress percentage
      if (docHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (currentScrollY / docHeight) * 100)));
      }

      lastScrollY = currentScrollY;
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [threshold]);

  return { isScrolled, isVisible, scrollProgress };
}
