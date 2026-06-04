import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Focus management for a modal dialog. While `active` is true it:
 * - remembers the element that had focus when the dialog opened,
 * - moves focus into the dialog (first focusable element, falling back to the
 *   container itself),
 * - traps Tab / Shift+Tab so focus cannot leave the dialog,
 * - on close, restores focus to the element that opened it.
 *
 * Escape-to-close is intentionally left to the caller, which already handles it
 * (in the capture phase) to coexist with the app-wide Escape behaviour.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
) {
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // Remember who opened us so we can restore focus on close.
    openerRef.current = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Move focus into the dialog.
    const first = focusables()[0];
    (first ?? container).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey) {
        if (activeEl === firstItem || activeEl === container) {
          e.preventDefault();
          lastItem.focus();
        }
      } else if (activeEl === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      // Restore focus to the opener on close (if it is still in the document).
      const opener = openerRef.current;
      if (opener && document.contains(opener)) {
        opener.focus();
      }
    };
  }, [active, containerRef]);
}
