import { create } from 'zustand';

interface LoadingState {
  activeMutations: number;
  start: () => void;
  finish: () => void;
}

/**
 * Tracks in-flight write requests (POST/PUT/PATCH/DELETE) across the whole
 * app so a single global overlay can show "working…" feedback and block
 * double-clicks, without every page needing its own saving/loading state.
 */
export const useLoadingStore = create<LoadingState>((set) => ({
  activeMutations: 0,
  start: () => set((s) => ({ activeMutations: s.activeMutations + 1 })),
  finish: () => set((s) => ({ activeMutations: Math.max(0, s.activeMutations - 1) })),
}));
