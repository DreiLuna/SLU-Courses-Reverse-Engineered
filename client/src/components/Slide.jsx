import { useEffect, useState } from "react";

/**
 * Keeps a panel mounted while it slides out, so closing animates instead of vanishing.
 * `className` sizes the wrapper (it is the flex item in the panel row).
 */
export default function Slide({ show, className = "", children }) {
  const [mounted, setMounted] = useState(show);

  useEffect(() => {
    if (show) {
      setMounted(true);
      return;
    }
    // Fallback in case animationend never arrives (background tabs throttle animations).
    const id = setTimeout(() => setMounted(false), 400);
    return () => clearTimeout(id);
  }, [show]);

  // Render in the same commit that `show` turns on, so refs inside exist for focus right away.
  if (!show && !mounted) return null;
  return (
    <div
      className={`slide ${show ? "slide-in" : "slide-out"} ${className}`}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && !show) setMounted(false);
      }}
    >
      {children}
    </div>
  );
}
