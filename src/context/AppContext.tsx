import React, { createContext, useContext, useState, useEffect } from 'react';
import { CURRENT_USER, MODULES as INITIAL_MODULES, QUESTIONS, POSTS } from '../data/mockData';
import { getProgress, setProgress, getCompletedQuestions, setCompletedQuestions as saveCompletedQuestions } from '../lib/supabaseClient';

interface AppContextType {
  user: typeof CURRENT_USER | null;
  modules: typeof INITIAL_MODULES;
  completedQuestions: string[];
  questions: typeof QUESTIONS;
  posts: typeof POSTS;
  login: (
    email: string,
    options?: {
      role?: 'student' | 'instructor' | 'admin';
      name?: string;
    }
  ) => void;
  logout: () => void;
  updateProgress: (moduleId: string, status: 'not-started' | 'in-progress' | 'completed') => void;
  markQuestionCompleted: (uid: string) => void;
  recordQuestionReview: (uid: string) => void;
  recordQuestionAttempt: (uid: string, correct: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const PROGRESS_KEY_PREFIX = 'db_progress:';
const COMPLETED_META_KEY_PREFIX = `${PROGRESS_KEY_PREFIX}completed_meta:`;
const REVIEW_EVENTS_KEY_PREFIX = `${PROGRESS_KEY_PREFIX}review_events:`;
const ATTEMPT_EVENTS_KEY_PREFIX = `${PROGRESS_KEY_PREFIX}attempt_events:`;
const PROFILE_KEY_PREFIX = 'db_profile:';

function buildUserIdFromEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return `u_${normalized.replace(/[^a-z0-9]/g, '_')}`;
}

function migrateLegacyLocalData(userId: string) {
  if (userId === 'u1') return;
  const legacyId = 'u1';
  const keyPairs = [
    [`${PROGRESS_KEY_PREFIX}${legacyId}`, `${PROGRESS_KEY_PREFIX}${userId}`],
    [`${PROGRESS_KEY_PREFIX}completed:${legacyId}`, `${PROGRESS_KEY_PREFIX}completed:${userId}`],
    [`${COMPLETED_META_KEY_PREFIX}${legacyId}`, `${COMPLETED_META_KEY_PREFIX}${userId}`],
    [`${REVIEW_EVENTS_KEY_PREFIX}${legacyId}`, `${REVIEW_EVENTS_KEY_PREFIX}${userId}`],
    [`${ATTEMPT_EVENTS_KEY_PREFIX}${legacyId}`, `${ATTEMPT_EVENTS_KEY_PREFIX}${userId}`],
    [`db_mock_exam_history:${legacyId}`, `db_mock_exam_history:${userId}`],
  ] as const;

  keyPairs.forEach(([oldKey, newKey]) => {
    const current = localStorage.getItem(newKey);
    if (current) return;
    const legacy = localStorage.getItem(oldKey);
    if (!legacy) return;
    localStorage.setItem(newKey, legacy);
  });
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<typeof CURRENT_USER | null>(null);
  const [modules, setModules] = useState<typeof INITIAL_MODULES>(
    INITIAL_MODULES.map((m) => ({ ...m, status: m.status ?? 'not-started' }))
  );
  const [completedQuestions, setCompletedQuestions] = useState<string[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('db_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const localProgressKey = `${PROGRESS_KEY_PREFIX}${user.id}`;
    const localCompletedKey = `${PROGRESS_KEY_PREFIX}completed:${user.id}`;

    const readLocalProgress = () => {
      try {
        const raw = localStorage.getItem(localProgressKey);
        if (!raw) return {} as Record<string, 'completed' | 'in-progress' | 'not-started'>;
        return JSON.parse(raw) as Record<string, 'completed' | 'in-progress' | 'not-started'>;
      } catch {
        return {} as Record<string, 'completed' | 'in-progress' | 'not-started'>;
      }
    };

    const readLocalCompleted = () => {
      try {
        const raw = localStorage.getItem(localCompletedKey);
        if (!raw) return [] as string[];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        return [] as string[];
      }
    };

    // load progress from supabase and merge with local cache.
    getProgress(user.id)
      .then(progressMap => {
        const localProgress = readLocalProgress();
        const remoteProgress = (progressMap || {}) as Record<string, 'completed' | 'in-progress' | 'not-started'>;
        const hasRemote = Object.keys(remoteProgress).length > 0;
        const merged = hasRemote ? { ...localProgress, ...remoteProgress } : localProgress;
        setModules(
          INITIAL_MODULES.map(m => {
            const s = merged[m.id] as 'completed' | 'in-progress' | 'not-started' | undefined;
            return { ...m, status: s || 'not-started' };
          })
        );
      })
      .catch(err => {
        console.warn('progress fetch failed, using localStorage', err);
        const progressMap = readLocalProgress();
        setModules(
          INITIAL_MODULES.map(m => {
            const s = progressMap[m.id];
            return { ...m, status: s || 'not-started' };
          })
        );
      });

    getCompletedQuestions(user.id)
      .then(qs => {
        const localCompleted = readLocalCompleted();
        const remoteCompleted = Array.isArray(qs) ? qs : [];
        const hasRemote = remoteCompleted.length > 0;
        const merged = hasRemote
          ? Array.from(new Set([...localCompleted, ...remoteCompleted]))
          : localCompleted;
        setCompletedQuestions(merged);
      })
      .catch(err => {
        console.warn('completed questions fetch failed, using localStorage', err);
        setCompletedQuestions(readLocalCompleted());
      });
  }, [user]);

  const login = (
    email: string,
    options?: { role?: 'student' | 'instructor' | 'admin'; name?: string }
  ) => {
    const normalizedEmail = email.trim().toLowerCase();
    const nextId = buildUserIdFromEmail(normalizedEmail);
    let savedProfile: Partial<typeof CURRENT_USER> = {};
    try {
      const raw = localStorage.getItem(`${PROFILE_KEY_PREFIX}${nextId}`);
      if (raw) savedProfile = JSON.parse(raw) as Partial<typeof CURRENT_USER>;
    } catch {
      savedProfile = {};
    }

    const baseUser = user?.id === nextId ? { ...user } : { ...CURRENT_USER };
    const fallbackName =
      typeof savedProfile.name === 'string' && savedProfile.name.trim()
        ? savedProfile.name.trim()
        : normalizedEmail.split('@')[0] || '同学';
    const fallbackRole =
      savedProfile.role === 'student' || savedProfile.role === 'instructor' || savedProfile.role === 'admin'
        ? savedProfile.role
        : baseUser.role;

    const newUser = {
      ...baseUser,
      id: nextId,
      email: normalizedEmail,
      role: options?.role ?? fallbackRole,
      name: options?.name?.trim() ? options.name.trim() : fallbackName,
    };
    migrateLegacyLocalData(newUser.id);
    setUser(newUser);
    localStorage.setItem('db_user', JSON.stringify(newUser));
    localStorage.setItem(
      `${PROFILE_KEY_PREFIX}${newUser.id}`,
      JSON.stringify({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      })
    );
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('db_user');
  };

  const updateProgress = (moduleId: string, status: 'not-started' | 'in-progress' | 'completed') => {
    setModules((prev) => {
      const updated = prev.map((m) => {
        if (m.id === moduleId) {
          const updated_m = { ...m, status };
          if (status === 'completed' && !m.completedAt) {
            (updated_m as any).completedAt = new Date().toISOString();
          }
          return updated_m;
        }
        return m;
      });

      if (user) {
        const map: Record<string, string> = {};
        updated.forEach((m) => {
          map[m.id] = m.status || 'not-started';
        });
        localStorage.setItem(`${PROGRESS_KEY_PREFIX}${user.id}`, JSON.stringify(map));
        
        // 记录模块完成时间
        const metaKey = `${PROGRESS_KEY_PREFIX}module_complete_meta:${user.id}`;
        let completeMeta: Record<string, string> = {};
        try {
          const raw = localStorage.getItem(metaKey);
          if (raw) completeMeta = JSON.parse(raw);
        } catch {
          completeMeta = {};
        }
        const module = updated.find(m => m.id === moduleId);
        if (module?.completedAt && !completeMeta[moduleId]) {
          completeMeta[moduleId] = module.completedAt;
          localStorage.setItem(metaKey, JSON.stringify(completeMeta));
        }
        
        setProgress(user.id, map).catch(console.error);
      }

      return updated;
    });
  };

  const markQuestionCompleted = (uid: string) => {
    setCompletedQuestions(prev => {
      if (prev.includes(uid)) return prev;
      const next = [...prev, uid];
      if (user) {
        localStorage.setItem(`${PROGRESS_KEY_PREFIX}completed:${user.id}`, JSON.stringify(next));
        const metaKey = `${COMPLETED_META_KEY_PREFIX}${user.id}`;
        let completedMeta: Record<string, string> = {};
        try {
          const raw = localStorage.getItem(metaKey);
          if (raw) completedMeta = JSON.parse(raw);
        } catch {
          completedMeta = {};
        }
        if (!completedMeta[uid]) {
          completedMeta[uid] = new Date().toISOString();
          localStorage.setItem(metaKey, JSON.stringify(completedMeta));
        }
        saveCompletedQuestions(user.id, next).catch(console.error);
      }
      return next;
    });
  };

  const recordQuestionReview = (uid: string) => {
    if (!user) return;
    const key = `${REVIEW_EVENTS_KEY_PREFIX}${user.id}`;
    let events: Array<{ uid: string; at: string }> = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) events = JSON.parse(raw);
    } catch {
      events = [];
    }
    events.push({ uid, at: new Date().toISOString() });
    // Keep only recent history to avoid unbounded growth.
    if (events.length > 5000) {
      events = events.slice(events.length - 5000);
    }
    localStorage.setItem(key, JSON.stringify(events));
  };

  const recordQuestionAttempt = (uid: string, correct: boolean) => {
    if (!user) return;
    const key = `${ATTEMPT_EVENTS_KEY_PREFIX}${user.id}`;
    let events: Array<{ uid: string; correct: boolean; at: string }> = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) events = JSON.parse(raw);
    } catch {
      events = [];
    }
    events.push({ uid, correct, at: new Date().toISOString() });
    if (events.length > 10000) {
      events = events.slice(events.length - 10000);
    }
    localStorage.setItem(key, JSON.stringify(events));
  };

  return (
    <AppContext.Provider value={{ user, modules, completedQuestions, questions: QUESTIONS, posts: POSTS, login, logout, updateProgress, markQuestionCompleted, recordQuestionReview, recordQuestionAttempt }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
