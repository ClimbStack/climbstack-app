import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import type { WeeklyPlan } from '../types';
import {
  updateAchievements,
  type AchievementId,
  type AchievementProgress,
  type AchievementSnapshot,
} from '../utils/achievements';
import { loadAchievements, saveAchievements } from './achievementStorage';
import { DEFAULT_CATEGORY_IDS, usePlanner } from './PlannerContext';
import { usePeaks } from './PeaksContext';
import { loadAllWeeklyPlans } from './plannerStorage';

interface State {
  progress: AchievementProgress | null;
  history: WeeklyPlan[];
  pending: AchievementId[];
  hasError: boolean;
}

type Action =
  | { type: 'load'; progress: AchievementProgress; history: WeeklyPlan[] }
  | { type: 'observe'; snapshot: AchievementSnapshot; date: string }
  | { type: 'dismiss' }
  | { type: 'suspend' }
  | { type: 'error' }
  | { type: 'saved' };

const initialState: State = { progress: null, history: [], pending: [], hasError: false };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load':
      return { ...initialState, progress: action.progress, history: action.history };
    case 'observe': {
      if (!state.progress) return state;
      const plans = new Map(state.history.map((plan) => [plan.weekId, plan]));
      action.snapshot.plans.forEach((plan) => plans.set(plan.weekId, plan));
      const result = updateAchievements(
        state.progress,
        { ...action.snapshot, plans: [...plans.values()] },
        DEFAULT_CATEGORY_IDS,
        action.date
      );
      if (result.progress === state.progress && state.history.length === 0) return state;
      return {
        ...state,
        progress: result.progress,
        history: [],
        pending: [...state.pending, ...result.newlyUnlocked],
      };
    }
    case 'dismiss':
      return { ...state, pending: state.pending.slice(1) };
    case 'suspend':
      return initialState;
    case 'error':
      return { ...state, hasError: true };
    case 'saved':
      return state.hasError ? { ...state, hasError: false } : state;
  }
}

interface AchievementsContextValue {
  progress: AchievementProgress | null;
  isLoading: boolean;
  hasError: boolean;
  pending: AchievementId[];
  dismissCelebration: () => void;
  retry: () => Promise<void>;
  restoreBackup: (restore: () => Promise<void>) => Promise<void>;
}

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const { peaks, streak, totalCompletedHours, isLoading: peaksLoading } = usePeaks();
  const { categories, plans, isLoading: plannerLoading } = usePlanner();
  const [state, dispatch] = useReducer(reducer, initialState);
  const generation = useRef(0);
  const restoring = useRef(false);
  const writes = useRef<Promise<void>>(Promise.resolve());

  const load = useCallback(async () => {
    const currentGeneration = ++generation.current;
    try {
      const [progress, history] = await Promise.all([loadAchievements(), loadAllWeeklyPlans()]);
      if (currentGeneration === generation.current) {
        dispatch({ type: 'load', progress, history });
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
      if (currentGeneration === generation.current) dispatch({ type: 'error' });
    }
  }, []);

  const cancelLoad = useCallback(() => {
    generation.current++;
  }, []);

  useEffect(() => {
    void load();
    return cancelLoad;
  }, [load, cancelLoad]);

  const snapshot = useMemo(
    () => ({ peaks, streak, totalCompletedHours, categories, plans: Object.values(plans) }),
    [peaks, streak, totalCompletedHours, categories, plans]
  );

  useEffect(() => {
    if (!peaksLoading && !plannerLoading && !restoring.current) {
      dispatch({ type: 'observe', snapshot, date: new Date().toISOString() });
    }
  }, [snapshot, peaksLoading, plannerLoading, state.progress]);

  const persist = useCallback((progress: AchievementProgress) => {
    const currentGeneration = generation.current;
    writes.current = writes.current
      .then(() => saveAchievements(progress))
      .then(() => {
        if (currentGeneration === generation.current) dispatch({ type: 'saved' });
      })
      .catch((error) => {
        console.error('Failed to save achievements:', error);
        if (currentGeneration === generation.current) dispatch({ type: 'error' });
      });
    return writes.current;
  }, []);

  useEffect(() => {
    if (state.progress && !restoring.current) void persist(state.progress);
  }, [state.progress, persist]);

  const dismissCelebration = useCallback(() => dispatch({ type: 'dismiss' }), []);

  const restoreBackup = useCallback(
    async (restore: () => Promise<void>) => {
      restoring.current = true;
      generation.current++;
      dispatch({ type: 'suspend' });
      await writes.current;
      try {
        await restore();
      } finally {
        await load();
        restoring.current = false;
      }
    },
    [load]
  );

  const retry = useCallback(async () => {
    if (state.progress) {
      await persist(state.progress);
    } else {
      dispatch({ type: 'suspend' });
      await load();
    }
  }, [state.progress, load, persist]);

  return (
    <AchievementsContext.Provider
      value={{
        progress: state.progress,
        isLoading: (!state.progress && !state.hasError) || peaksLoading || plannerLoading,
        hasError: state.hasError,
        pending: state.pending,
        dismissCelebration,
        retry,
        restoreBackup,
      }}
    >
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements(): AchievementsContextValue {
  const context = useContext(AchievementsContext);
  if (!context) throw new Error('useAchievements must be used within AchievementsProvider');
  return context;
}
