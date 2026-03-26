import { useState, useCallback, useEffect, useRef } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(initial: T, onNavigate?: () => void) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const set = useCallback((value: T) => {
    setState((prev) => ({
      past: [...prev.past.slice(-50), prev.present],
      present: value,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      const newPast = [...prev.past];
      const previous = newPast.pop()!;
      onNavigateRef.current?.();
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;
      const newFuture = [...prev.future];
      const next = newFuture.shift()!;
      onNavigateRef.current?.();
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((value: T) => {
    setState({ past: [], present: value, future: [] });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  return { value: state.present, set, undo, redo, canUndo, canRedo, reset };
}
