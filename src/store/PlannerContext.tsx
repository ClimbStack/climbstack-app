import { t } from '../utils/i18n';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { Category, BlockTemplate, ScheduledBlock, WeeklyPlan, DayOfWeek } from '../types';
import { generateId } from '../utils/id';
import {
  saveCategories,
  loadCategories,
  saveTemplates,
  loadTemplates,
  saveWeeklyPlan,
  loadWeeklyPlan,
} from './plannerStorage';
import { getCurrentWeekId, getPrevWeekId } from '../types/weekUtils';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEventDescription,
} from '../utils/calendar';

// ── Default Categories ──

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'sonno',
    name: t('categories.sleep'),
    color: '#6366F1',
    emoji: 'bed',
    targetHoursPerWeek: 56,
  },
  {
    id: 'uni',
    name: t('categories.uni'),
    color: '#0EA5E9',
    emoji: 'school',
    targetHoursPerWeek: 20,
  },
  {
    id: 'studio',
    name: t('categories.study'),
    color: '#3B82F6',
    emoji: 'bookshelf',
    targetHoursPerWeek: 20,
  },
  { id: 'cp', name: t('categories.cp'), color: '#8B5CF6', emoji: 'laptop', targetHoursPerWeek: 4 },
  {
    id: 'hobby',
    name: t('categories.hobby'),
    color: '#10B981',
    emoji: 'chess-pawn',
    targetHoursPerWeek: 3,
  },
  {
    id: 'lettura',
    name: t('categories.reading'),
    color: '#F59E0B',
    emoji: 'book-open-page-variant',
    targetHoursPerWeek: 3,
  },
  {
    id: 'progetto',
    name: t('categories.project'),
    color: '#EC4899',
    emoji: 'rocket-launch',
    targetHoursPerWeek: 2,
  },
  {
    id: 'libero',
    name: t('categories.freetime'),
    color: '#6B7280',
    emoji: 'controller-classic',
    targetHoursPerWeek: 0,
  },
];

// Helper to migrate legacy emoji to icon names
const migrateEmoji = (emoji: string) => {
  const map: Record<string, string> = {
    '😴': 'bed',
    '🎓': 'school',
    '📚': 'bookshelf',
    '💻': 'laptop',
    '♟️': 'chess-pawn',
    '📖': 'book-open-page-variant',
    '🚀': 'rocket-launch',
    '🎮': 'controller-classic',
  };
  return map[emoji] || (emoji.match(/[\w-]/) ? emoji : 'shape'); // default icon if it's an unrecognized emoji
};

interface PlannerState {
  categories: Category[];
  templates: BlockTemplate[];
  currentPlan: WeeklyPlan;
  todayPlan: WeeklyPlan;
  currentWeekId: string;
  hasPreviousWeekBlocks: boolean;
  isLoading: boolean;
}

interface PlannerActions {
  changeWeek: (weekId: string) => void;
  refreshData: () => Promise<void>;
  addCategory: (name: string, emoji: string, color: string, targetHours: number) => void;
  editCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  archiveCategory: (id: string) => void;
  addTemplate: (name: string, categoryId: string, durationHours: number, peakId?: string) => void;
  deleteTemplate: (id: string) => void;
  archiveTemplate: (id: string) => void;
  unarchiveCategory: (id: string) => void;
  unarchiveTemplate: (id: string) => void;
  scheduleBlock: (
    templateId: string,
    day: DayOfWeek,
    startTime: string,
    customDuration?: number
  ) => void;
  scheduleOneOffBlock: (
    name: string,
    categoryId: string,
    durationHours: number,
    day: DayOfWeek,
    startTime: string
  ) => void;
  unscheduleBlock: (blockId: string) => void;
  toggleBlockDone: (blockId: string) => void;
  updateBlockDescription: (blockId: string, desc: string) => void;
  copyPreviousWeek: () => void;
  clearCurrentWeek: () => Promise<void>;
  getTemplateById: (id: string) => BlockTemplate | undefined;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryHours: (categoryId: string) => {
    scheduled: number;
    completed: number;
    target: number;
  };
}

type PlannerContextType = PlannerState & PlannerActions;

const PlannerContext = createContext<PlannerContextType | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [templates, setTemplates] = useState<BlockTemplate[]>([]);
  const [currentWeekId, setCurrentWeekId] = useState(getCurrentWeekId());
  const [realWeekId, setRealWeekId] = useState(getCurrentWeekId());
  const [plans, setPlans] = useState<Record<string, WeeklyPlan>>({});
  const [hasPreviousWeekBlocks, setHasPreviousWeekBlocks] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const savedPlansRef = useRef<Record<string, WeeklyPlan>>({});

  const currentPlan = plans[currentWeekId] || { weekId: currentWeekId, blocks: [] };
  const todayPlan = plans[realWeekId] || { weekId: realWeekId, blocks: [] };

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const currentReal = getCurrentWeekId();
        setRealWeekId((prev) => (prev !== currentReal ? currentReal : prev));
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentReal = getCurrentWeekId();
      setRealWeekId((prev) => (prev !== currentReal ? currentReal : prev));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!plans[realWeekId] && !isLoading) {
      loadWeeklyPlan(realWeekId)
        .then((plan) => {
          setPlans((prev) => ({
            ...prev,
            [realWeekId]: prev[realWeekId] ?? (plan || { weekId: realWeekId, blocks: [] }),
          }));
        })
        .catch(console.error);
    }
  }, [realWeekId, plans, isLoading]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const realWeek = getCurrentWeekId();
      setRealWeekId(realWeek);
      const [cats, tmpl, currentPlanLoaded, realPlanLoaded, previousPlan] = await Promise.all([
        loadCategories(),
        loadTemplates(),
        loadWeeklyPlan(currentWeekId),
        currentWeekId === realWeek ? Promise.resolve(null) : loadWeeklyPlan(realWeek),
        loadWeeklyPlan(getPrevWeekId(currentWeekId)),
      ]);
      if (cats.length > 0) {
        const legacyOtherNames = ['altro', 'other', 'sonstiges', 'autre', 'otro'];
        const merged = cats.map((c) => {
          let name = c.name;
          if (
            !c.isCustomName &&
            (c.id === 'lettura' || c.id === 'progetto') &&
            legacyOtherNames.includes(name.trim().toLowerCase())
          ) {
            name = c.id === 'lettura' ? t('categories.reading') : t('categories.project');
          }
          return {
            ...c,
            name,
            emoji: migrateEmoji(c.emoji),
          };
        });
        setCategories(merged);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
      setTemplates(tmpl);
      const newPlans: Record<string, WeeklyPlan> = {};
      newPlans[currentWeekId] = currentPlanLoaded || { weekId: currentWeekId, blocks: [] };
      if (realWeek !== currentWeekId) {
        newPlans[realWeek] = realPlanLoaded || { weekId: realWeek, blocks: [] };
      }
      setPlans((prev) => ({
        ...newPlans,
        ...prev,
      }));
      setHasPreviousWeekBlocks((previousPlan?.blocks.length ?? 0) > 0);
    } catch (e) {
      console.error('Errore caricamento planner:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
  }, [refreshData]);

  const changeWeek = useCallback(async (newWeekId: string) => {
    setIsLoading(true);
    try {
      const [plan, previousPlan] = await Promise.all([
        loadWeeklyPlan(newWeekId),
        loadWeeklyPlan(getPrevWeekId(newWeekId)),
      ]);
      setCurrentWeekId(newWeekId);
      setPlans((prev) => ({
        ...prev,
        [newWeekId]: prev[newWeekId] ?? (plan || { weekId: newWeekId, blocks: [] }),
      }));
      setHasPreviousWeekBlocks((previousPlan?.blocks.length ?? 0) > 0);
    } catch (e) {
      console.error('Errore cambio settimana:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-save
  useEffect(() => {
    if (!isLoading) {
      saveCategories(categories).catch(console.error);
    }
  }, [categories, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      saveTemplates(templates).catch(console.error);
    }
  }, [templates, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      Object.entries(plans).forEach(([weekId, plan]) => {
        if (savedPlansRef.current[weekId] !== plan) {
          saveWeeklyPlan(plan).catch(console.error);
          savedPlansRef.current[weekId] = plan;
        }
      });
    }
  }, [plans, isLoading]);

  // ── Actions ──

  const addCategory = useCallback(
    (name: string, emoji: string, color: string, targetHours: number) => {
      setCategories((prev) => [
        ...prev,
        {
          id: generateId(),
          name,
          emoji,
          color,
          targetHoursPerWeek: targetHours,
        },
      ]);
    },
    []
  );

  const archiveCategory = useCallback((id: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isArchived: true } : c)));
  }, []);

  const deleteCategory = useCallback(
    (id: string) => {
      const templatesToDelete = templates.filter((t) => t.categoryId === id).map((t) => t.id);

      setCategories((prev) => prev.filter((c) => c.id !== id));
      setTemplates((prev) => prev.filter((t) => t.categoryId !== id));

      setPlans((prev) => {
        const next: Record<string, WeeklyPlan> = {};
        for (const [wId, plan] of Object.entries(prev)) {
          next[wId] = {
            ...plan,
            blocks: plan.blocks.filter(
              (b) =>
                b.oneOffCategoryId !== id &&
                (b.templateId === undefined || !templatesToDelete.includes(b.templateId))
            ),
          };
        }
        return next;
      });
    },
    [templates]
  );

  const editCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const cleanedUpdates = Object.fromEntries(
          Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        return { ...c, ...cleanedUpdates };
      })
    );
  }, []);

  const addTemplate = useCallback(
    (name: string, categoryId: string, durationHours: number, peakId?: string) => {
      setTemplates((prev) => [
        ...prev,
        {
          id: generateId(),
          name,
          categoryId,
          durationHours,
          peakId,
        },
      ]);
    },
    []
  );

  const archiveTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isArchived: true } : t)));
  }, []);

  const unarchiveCategory = useCallback((id: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isArchived: false } : c)));
  }, []);

  const unarchiveTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isArchived: false } : t)));
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setPlans((prev) => {
      const next: Record<string, WeeklyPlan> = {};
      for (const [wId, plan] of Object.entries(prev)) {
        next[wId] = {
          ...plan,
          blocks: plan.blocks.filter((b) => b.templateId !== id),
        };
      }
      return next;
    });
  }, []);

  const scheduleBlock = useCallback(
    (templateId: string, day: DayOfWeek, startTime: string, customDuration?: number) => {
      const newId = generateId();
      setPlans((prev) => {
        const plan = prev[currentWeekId] || { weekId: currentWeekId, blocks: [] };
        const newBlock: ScheduledBlock = {
          id: newId,
          templateId,
          day,
          startTime,
          done: false,
          customDuration,
        };
        return {
          ...prev,
          [currentWeekId]: {
            ...plan,
            blocks: [...plan.blocks, newBlock],
          },
        };
      });

      // Sync with Google Calendar in background and save ID
      const template = templates.find((t) => t.id === templateId);
      const cat = categories.find((c) => c.id === template?.categoryId);
      if (template && cat) {
        createCalendarEvent(
          template.name,
          day,
          startTime,
          customDuration ?? template.durationHours,
          cat.name,
          cat.color,
          currentWeekId
        )
          .then((eventId) => {
            if (eventId) {
              setPlans((prev) => {
                const plan = prev[currentWeekId];
                if (!plan) return prev;
                return {
                  ...prev,
                  [currentWeekId]: {
                    ...plan,
                    blocks: plan.blocks.map((b) =>
                      b.id === newId ? { ...b, calendarEventId: eventId } : b
                    ),
                  },
                };
              });
            }
          })
          .catch(console.error);
      }
    },
    [currentWeekId, templates, categories]
  );

  const scheduleOneOffBlock = useCallback(
    (
      name: string,
      categoryId: string,
      durationHours: number,
      day: DayOfWeek,
      startTime: string
    ) => {
      const newId = generateId();
      setPlans((prev) => {
        const plan = prev[currentWeekId] || { weekId: currentWeekId, blocks: [] };
        const newBlock: ScheduledBlock = {
          id: newId,
          day,
          startTime,
          done: false,
          isOneOff: true,
          oneOffName: name,
          oneOffCategoryId: categoryId,
          oneOffDuration: durationHours,
        };
        return {
          ...prev,
          [currentWeekId]: {
            ...plan,
            blocks: [...plan.blocks, newBlock],
          },
        };
      });

      // Sync with Google Calendar in background
      const cat = categories.find((c) => c.id === categoryId);
      if (cat) {
        createCalendarEvent(name, day, startTime, durationHours, cat.name, cat.color, currentWeekId)
          .then((eventId) => {
            if (eventId) {
              setPlans((prev) => {
                const plan = prev[currentWeekId];
                if (!plan) return prev;
                return {
                  ...prev,
                  [currentWeekId]: {
                    ...plan,
                    blocks: plan.blocks.map((b) =>
                      b.id === newId ? { ...b, calendarEventId: eventId } : b
                    ),
                  },
                };
              });
            }
          })
          .catch(console.error);
      }
    },
    [currentWeekId, categories]
  );

  const unscheduleBlock = useCallback((blockId: string) => {
    setPlans((prev) => {
      let found = false;
      const next: Record<string, WeeklyPlan> = {};
      for (const [wId, plan] of Object.entries(prev)) {
        const block = plan.blocks.find((b) => b.id === blockId);
        if (block) {
          found = true;
          if (block.calendarEventId) {
            deleteCalendarEvent(block.calendarEventId).catch(console.error);
          }
          next[wId] = {
            ...plan,
            blocks: plan.blocks.filter((b) => b.id !== blockId),
          };
        } else {
          next[wId] = plan;
        }
      }
      return found ? next : prev;
    });
  }, []);

  const copyPreviousWeek = useCallback(async () => {
    try {
      const prevWeekId = getPrevWeekId(currentWeekId);
      const prevPlan = plans[prevWeekId] || (await loadWeeklyPlan(prevWeekId));
      if (!prevPlan || prevPlan.blocks.length === 0) return;

      const newBlocks: ScheduledBlock[] = [];
      for (const b of prevPlan.blocks) {
        if (b.isOneOff) continue; // Do not copy one-off events
        const template = templates.find((t) => t.id === b.templateId);
        const cat = categories.find((c) => c.id === template?.categoryId);
        if (!template || !cat) continue;

        const newId = generateId();
        let eventId = null;
        try {
          eventId = await createCalendarEvent(
            template.name,
            b.day,
            b.startTime,
            b.customDuration ?? template.durationHours,
            cat.name,
            cat.color,
            currentWeekId
          );
        } catch (e) {
          console.error('Errore creazione evento calendario bulk:', e);
        }

        const newBlock: ScheduledBlock = {
          id: newId,
          templateId: b.templateId,
          day: b.day,
          startTime: b.startTime,
          done: false,
          customDuration: b.customDuration,
          calendarEventId: eventId || undefined,
        };
        newBlocks.push(newBlock);
      }

      setPlans((prev) => {
        const plan = prev[currentWeekId] || { weekId: currentWeekId, blocks: [] };
        return {
          ...prev,
          [currentWeekId]: {
            ...plan,
            blocks: [...plan.blocks, ...newBlocks],
          },
        };
      });
    } catch (e) {
      console.error('Errore copia settimana precedente:', e);
    }
  }, [currentWeekId, plans, templates, categories]);

  const clearCurrentWeek = useCallback(async () => {
    const planToClear = plans[currentWeekId] || { weekId: currentWeekId, blocks: [] };
    const calendarEventIds = planToClear.blocks
      .map((b) => b.calendarEventId)
      .filter((id): id is string => Boolean(id));

    const emptyPlan: WeeklyPlan = { weekId: currentWeekId, blocks: [] };

    setPlans((prev) => ({
      ...prev,
      [currentWeekId]: emptyPlan,
    }));

    try {
      await saveWeeklyPlan(emptyPlan);
      savedPlansRef.current[currentWeekId] = emptyPlan;
    } catch (e) {
      console.error('Errore cancellazione settimana:', e);
    }

    if (calendarEventIds.length > 0) {
      await Promise.all(
        calendarEventIds.map((eventId) => deleteCalendarEvent(eventId).catch(console.error))
      );
    }
  }, [currentWeekId, plans]);

  const updateBlockDescription = useCallback((blockId: string, desc: string) => {
    setPlans((prev) => {
      let found = false;
      const next: Record<string, WeeklyPlan> = {};
      for (const [wId, plan] of Object.entries(prev)) {
        const block = plan.blocks.find((b) => b.id === blockId);
        if (block) {
          found = true;
          if (block.calendarEventId) {
            updateCalendarEventDescription(block.calendarEventId, desc);
          }
          next[wId] = {
            ...plan,
            blocks: plan.blocks.map((b) => (b.id === blockId ? { ...b, description: desc } : b)),
          };
        } else {
          next[wId] = plan;
        }
      }
      return found ? next : prev;
    });
  }, []);

  const toggleBlockDone = useCallback((blockId: string) => {
    setPlans((prev) => {
      let found = false;
      const next: Record<string, WeeklyPlan> = {};
      for (const [wId, plan] of Object.entries(prev)) {
        if (plan.blocks.some((b) => b.id === blockId)) {
          found = true;
          next[wId] = {
            ...plan,
            blocks: plan.blocks.map((b) => (b.id === blockId ? { ...b, done: !b.done } : b)),
          };
        } else {
          next[wId] = plan;
        }
      }
      return found ? next : prev;
    });
  }, []);

  const getTemplateById = useCallback(
    (id: string) => {
      return templates.find((t) => t.id === id);
    },
    [templates]
  );

  const getCategoryById = useCallback(
    (id: string) => {
      return categories.find((c) => c.id === id);
    },
    [categories]
  );

  const getCategoryHours = useCallback(
    (categoryId: string) => {
      const cat = categories.find((c) => c.id === categoryId);
      let scheduled = 0;
      let completed = 0;
      const plan = plans[currentWeekId] || { weekId: currentWeekId, blocks: [] };

      for (const block of plan.blocks) {
        const template = templates.find((t) => t.id === block.templateId);
        if (template?.categoryId === categoryId) {
          scheduled += block.customDuration ?? template.durationHours;
          if (block.done) completed += block.customDuration ?? template.durationHours;
        }
      }

      return {
        scheduled,
        completed,
        target: cat?.targetHoursPerWeek ?? 0,
      };
    },
    [categories, templates, plans, currentWeekId]
  );

  return (
    <PlannerContext.Provider
      value={{
        categories,
        templates,
        currentPlan,
        todayPlan,
        currentWeekId,
        hasPreviousWeekBlocks,
        isLoading,
        changeWeek,
        refreshData,
        addCategory,
        editCategory,
        deleteCategory,
        archiveCategory,
        addTemplate,
        deleteTemplate,
        archiveTemplate,
        unarchiveCategory,
        unarchiveTemplate,
        scheduleBlock,
        scheduleOneOffBlock,
        unscheduleBlock,
        toggleBlockDone,
        updateBlockDescription,
        copyPreviousWeek,
        clearCurrentWeek,
        getTemplateById,
        getCategoryById,
        getCategoryHours,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner(): PlannerContextType {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner must be used within PlannerProvider');
  return ctx;
}
