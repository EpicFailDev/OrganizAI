import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';

interface ExitingPane {
  view: string;
  dir: 'forward' | 'back';
  node: React.ReactNode;
}

interface ViewStackProps {
  view: string;
  direction: 'forward' | 'back';
  children: React.ReactNode;
}

const EXIT_DURATION_MS = 400;

/**
 * iOS-style directional screen transition (push/pop).
 * - 'forward': new screen slides in from the right, old screen slides out to the left.
 * - 'back':    new screen slides in from the left, old screen slides out to the right.
 *
 * The exiting pane reuses the *previously rendered* React node (no fresh mount,
 * no duplicate data fetches) and is removed after EXIT_DURATION_MS. The first
 * paint renders statically; only real navigations animate.
 */
export const ViewStack: React.FC<ViewStackProps> = ({ view, direction, children }) => {
  const [exiting, setExiting] = useState<ExitingPane | null>(null);
  const [hasNavigated, setHasNavigated] = useState(false);
  const prevViewRef = useRef(view);
  const prevNodeRef = useRef<React.ReactNode>(children);

  // Detect navigation synchronously (before paint) so the exit snapshot and the
  // entering animation land in the same frame — no flash of the new screen.
  useLayoutEffect(() => {
    if (view === prevViewRef.current) return;
    const oldView = prevViewRef.current;
    prevViewRef.current = view;
    setHasNavigated(true);
    setExiting({ view: oldView, dir: direction, node: prevNodeRef.current });
    const t = window.setTimeout(() => setExiting(null), EXIT_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [view, direction]);

  // Remember the latest rendered node so the exit snapshot matches what was on
  // screen. Declared AFTER the navigation effect so it never clobbers the old
  // node before the exit pane captures it.
  useEffect(() => {
    prevNodeRef.current = children;
  }, [children]);

  return (
    <div className="ios-view-stack">
      {exiting && (
        <div
          key={`exit-${exiting.view}`}
          className={`ios-content-inner ios-view-pane ios-view-exit ios-exit-${exiting.dir}`}
          aria-hidden="true"
        >
          {exiting.node}
        </div>
      )}
      <div
        key={`enter-${view}`}
        className={`ios-content-inner ios-view-pane ios-view-enter ${hasNavigated ? `ios-enter-${direction}` : ''}`}
      >
        {children}
      </div>
    </div>
  );
};
