import { useEffect, useRef } from "react";

export default function Cursor() {
  const cursorRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorRing = ringRef.current;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;
    let rafId = null;

    function handleMouseMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (cursor) {
        cursor.style.left = mouseX + "px";
        cursor.style.top = mouseY + "px";
      }
    }

    function animateRing() {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;

      if (cursorRing) {
        cursorRing.style.left = ringX + "px";
        cursorRing.style.top = ringY + "px";
      }

      rafId = requestAnimationFrame(animateRing);
    }

    function handleHover(e) {
      if (!cursor || !cursorRing) return;

      if (e.type === "mouseenter") {
        cursor.classList.add("hovered");
        cursorRing.classList.add("hovered");
      } else {
        cursor.classList.remove("hovered");
        cursorRing.classList.remove("hovered");
      }
    }

    document.addEventListener("mousemove", handleMouseMove);

    // Attach hover listeners dynamically
    const interactiveEls = document.querySelectorAll("a, button, input");
    interactiveEls.forEach(el => {
      el.addEventListener("mouseenter", handleHover);
      el.addEventListener("mouseleave", handleHover);
    });

    animateRing();

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      interactiveEls.forEach(el => {
        el.removeEventListener("mouseenter", handleHover);
        el.removeEventListener("mouseleave", handleHover);
      });
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div className="cursor" ref={cursorRef}></div>
      <div className="cursor-ring" ref={ringRef}></div>
    </>
  );
}