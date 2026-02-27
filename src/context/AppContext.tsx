import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CURRENT_USER, MODULES as INITIAL_MODULES, QUESTIONS, POSTS } from '../data/mockData';
import {
  checkCloudHealth,
  getCompletedQuestions,
  getJson,
  getProgress,
  getUserProfile,
  setCompletedQuestions as saveCompletedQuestions,
  setJson,
  setProgress,
  setUserProfile,
} from '../lib/supabaseClient';

type UserRole = 'student' | 'instructor' | 'admin';
type ModuleStatus = 'not-started' | 'in-progress' | 'completed';

interface CloudState {
  strict: true;
  checking: boolean;
  blocked: boolean;
  message: string;
}

interface AppContextType {
  user: typeof CURRENT_USER | null;
  modules: typeof INITIAL_MODULES;
  completedQuestions: string[];
  questionStatus: Record<string, 'correct' | 'incorrect'>;
  questions: typeof QUESTIONS;
  posts: typeof POSTS;
  cloudState: CloudState;
  login: (
    email: string,
    options?: {
      role?: UserRole;
      name?: string;
    },
  ) => void;
  logout: () => void;
  refreshCloudState: () => Promise<void>;
  updateProfile: (patch: { name?: string }) => Promise<void>;
  updateProgress: (moduleId: string, status: ModuleStatus) => void;
  markQuestionCompleted: (uid: string) => void;
  setQuestionResult: (uid: string, correct: boolean) => void;
  clearPracticeProgress: (uids: string[], category?: string) => void;
  recordQuestionReview: (uid: string) => void;
  recordQuestionAttempt: (uid: string, correct: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const PROGRESS_KEY_PREFIX = 'db_progress:';
const COMPLETED_META_KEY_PREFIX = `${PROGRESS_KEY_PREFIX}completed_meta:`;
const MODULE_COMPLETE_META_KEY_PREFIX = `${PROGRESS_KEY_PREFIX}module_complete_meta:`;
const REVIEW_EVENTS_KEY_PREFIX = `${PROGRESS_KEY_PREFIX}review_events:`;
const ATTEMPT_EVENTS_KEY_PREFIX = `${PROGRESS_KEY_PREFIX}attempt_events:`;
const PROFILE_KEY_PREFIX = 'db_profile:';
const QUESTION_STATUS_KEY_PREFIX = `${PROGRESS_KEY_PREFIX}question_status:`;

function buildUserIdFromEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return `u_${normalized.replace(/[^a-z0-9]/g, '_')}`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<typeof CURRENT_USER | null>(null);
  const [modules, setModules] = useState<typeof INITIAL_MODULES>(
    INITIAL_MODULES.map((m) => ({ ...m, status: m.status ?? 'not-started' })),
  );
  const [completedQuestions, setCompletedQuestions] = useState<string[]>([]);
  const [questionStatus, setQuestionStatus] = useState<Record<string, 'correct' | 'incorrect'>>({});
  const [cloudState, setCloudState] = useState<CloudState>({
    strict: true,
    checking: true,
    blocked: true,
    message: '正在检查云端状态...',
  });

  const handleCloudFailure = (message: string) => {
    setCloudState({
      strict: true,
      checking: false,
      blocked: true,
      message: message || '云端同步失败，系统已进入只读阻断模式。',
    });
  };

  const refreshCloudState = async () => {
    setCloudState((prev) => ({ ...prev, checking: true }));
    const result = await checkCloudHealth(true);
    if (!result.ok) {
      handleCloudFailure(result.message);
      return;
    }
    setCloudState({
      strict: true,
      checking: false,
      blocked: false,
      message: '',
    });
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('db_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('db_user');
      }
    }
    void refreshCloudState();
  }, []);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadUserData = async () => {
      const health = await checkCloudHealth();
      if (!health.ok) {
        if (!cancelled) handleCloudFailure(health.message);
        return;
      }

      if (!cancelled) {
        setCloudState({
          strict: true,
          checking: false,
          blocked: false,
          message: '',
        });
      }

      try {
        const [progressMap, qs, remoteProfile, statusMap, moduleCompleteMeta] = await Promise.all([
          getProgress(user.id),
          getCompletedQuestions(user.id),
          getUserProfile(user.id),
          getJson<Record<string, 'correct' | 'incorrect'>>(`${QUESTION_STATUS_KEY_PREFIX}${user.id}`, {}),
          getJson<Record<string, string>>(`${MODULE_COMPLETE_META_KEY_PREFIX}${user.id}`, {}),
        ]);

        if (cancelled) return;

        setModules(
          INITIAL_MODULES.map((m) => {
            const s = progressMap[m.id] as ModuleStatus | undefined;
            const completedAt = moduleCompleteMeta[m.id];
            return {
              ...m,
              status: s || 'not-started',
              completedAt: completedAt || m.completedAt,
            };
          }),
        );
        setCompletedQuestions(Array.isArray(qs) ? qs : []);
        setQuestionStatus(statusMap || {});

        if (remoteProfile && remoteProfile.name && remoteProfile.name !== user.name) {
          const mergedUser = { ...user, name: remoteProfile.name, role: remoteProfile.role };
          setUser(mergedUser);
          localStorage.setItem('db_user', JSON.stringify(mergedUser));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!cancelled) handleCloudFailure(message);
      }
    };

    void loadUserData();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const login = (
    email: string,
    options?: {
      role?: UserRole;
      name?: string;
    },
  ) => {
    const normalizedEmail = email.trim().toLowerCase();
    const nextId = buildUserIdFromEmail(normalizedEmail);
    const fallbackName = normalizedEmail.split('@')[0] || '同学';

    const newUser = {
      ...CURRENT_USER,
      id: nextId,
      email: normalizedEmail,
      role: options?.role ?? 'student',
      name: options?.name?.trim() ? options.name.trim() : fallbackName,
      progress: {
        analyst: 0,
        engineer: 0,
      },
    };

    setUser(newUser);
    localStorage.setItem('db_user', JSON.stringify(newUser));
    localStorage.setItem(
      `${PROFILE_KEY_PREFIX}${newUser.id}`,
      JSON.stringify({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      }),
    );

    void setUserProfile(newUser.id, {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      handleCloudFailure(message);
    });
  };

  const logout = () => {
    setUser(null);
    setModules(INITIAL_MODULES.map((m) => ({ ...m, status: m.status ?? 'not-started' })));
    setCompletedQuestions([]);
    localStorage.removeItem('db_user');
  };

  const updateProfile = async (patch: { name?: string }) => {
    if (!user) return;
    if (cloudState.blocked) {
      throw new Error(cloudState.message || '云端已阻断，无法更新资料。');
    }

    const nextName = patch.name?.trim() || user.name;
    const nextUser = { ...user, name: nextName };
    setUser(nextUser);
    localStorage.setItem('db_user', JSON.stringify(nextUser));
    localStorage.setItem(
      `${PROFILE_KEY_PREFIX}${nextUser.id}`,
      JSON.stringify({
        id: nextUser.id,
        email: nextUser.email,
        name: nextUser.name,
        role: nextUser.role,
      }),
    );
    try {
      await setUserProfile(nextUser.id, {
        id: nextUser.id,
        email: nextUser.email,
        name: nextUser.name,
        role: nextUser.role,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      handleCloudFailure(message);
      throw error;
    }
  };

  const updateProgress = (moduleId: string, status: ModuleStatus) => {
    if (!user || cloudState.blocked) return;
    setModules((prev) => {
      const updated = prev.map((m) => {
        if (m.id !== moduleId) return m;
        const next = { ...m, status };
        if (status === 'completed' && !next.completedAt) {
          (next as { completedAt?: string }).completedAt = new Date().toISOString();
        }
        return next;
      });
      const map: Record<string, string> = {};
      const completeMeta: Record<string, string> = {};
      updated.forEach((m) => {
        map[m.id] = m.status || 'not-started';
        if ((m as { completedAt?: string }).completedAt) {
          completeMeta[m.id] = (m as { completedAt?: string }).completedAt as string;
        }
      });
      void setProgress(user.id, map).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
      });
      void setJson(`${MODULE_COMPLETE_META_KEY_PREFIX}${user.id}`, completeMeta).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
      });
      return updated;
    });
  };

  const markQuestionCompleted = (uid: string) => {
    if (!user || cloudState.blocked) return;
    setCompletedQuestions((prev) => {
      if (prev.includes(uid)) return prev;
      const next = [...prev, uid];
      void saveCompletedQuestions(user.id, next).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
      });
      return next;
    });
  };

  const setQuestionResult = (uid: string, correct: boolean) => {
    if (!user || cloudState.blocked) return;
    setQuestionStatus((prev) => {
      const next: Record<string, 'correct' | 'incorrect'> = {
        ...prev,
        [uid]: correct ? 'correct' : 'incorrect',
      };
      void setJson(`${QUESTION_STATUS_KEY_PREFIX}${user.id}`, next).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
      });
      return next;
    });
  };

  const clearPracticeProgress = (uids: string[], category?: string) => {
    if (!user || cloudState.blocked || uids.length === 0) return;
    const target = new Set(uids);

    setCompletedQuestions((prev) => {
      const next = prev.filter((uid) => !target.has(uid));
      void saveCompletedQuestions(user.id, next).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
      });
      return next;
    });

    setQuestionStatus((prev) => {
      const next: Record<string, 'correct' | 'incorrect'> = {};
      Object.keys(prev).forEach((uid) => {
        if (!target.has(uid)) next[uid] = prev[uid];
      });
      void setJson(`${QUESTION_STATUS_KEY_PREFIX}${user.id}`, next).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
      });
      return next;
    });

    // Also reset learning modules for the selected practice category.
    if (category) {
      const normalized = category.toLowerCase();
      const track = normalized.includes('engineer') ? 'engineer' : normalized.includes('analyst') ? 'analyst' : null;
      if (track) {
        setModules((prev) => {
          const updated = prev.map((m) => {
            const moduleTrack = (m as { track?: string; trackId?: string }).trackId ?? (m as { track?: string; trackId?: string }).track;
            if (moduleTrack !== track) return m;
            const next = { ...m, status: 'not-started' as ModuleStatus };
            if ('completedAt' in next) {
              delete (next as { completedAt?: string }).completedAt;
            }
            return next;
          });

          const map: Record<string, string> = {};
          const completeMeta: Record<string, string> = {};
          updated.forEach((m) => {
            map[m.id] = m.status || 'not-started';
            if ((m as { completedAt?: string }).completedAt) {
              completeMeta[m.id] = (m as { completedAt?: string }).completedAt as string;
            }
          });
          void setProgress(user.id, map).catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            handleCloudFailure(message);
          });
          void setJson(`${MODULE_COMPLETE_META_KEY_PREFIX}${user.id}`, completeMeta).catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            handleCloudFailure(message);
          });
          return updated;
        });
      }
    }
  };

  const recordQuestionReview = (uid: string) => {
    if (!user || cloudState.blocked) return;
    const key = `${REVIEW_EVENTS_KEY_PREFIX}${user.id}`;
    void getJson<Array<{ uid: string; at: string }>>(key, [])
      .then((events) => {
        const next = [...events, { uid, at: new Date().toISOString() }];
        const trimmed = next.length > 5000 ? next.slice(next.length - 5000) : next;
        return setJson(key, trimmed);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
      });
  };

  const recordQuestionAttempt = (uid: string, correct: boolean) => {
    if (!user || cloudState.blocked) return;
    const key = `${ATTEMPT_EVENTS_KEY_PREFIX}${user.id}`;
    void getJson<Array<{ uid: string; correct: boolean; at: string }>>(key, [])
      .then((events) => {
        const next = [...events, { uid, correct, at: new Date().toISOString() }];
        const trimmed = next.length > 10000 ? next.slice(next.length - 10000) : next;
        return setJson(key, trimmed);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
      });
  };

  const contextValue = useMemo<AppContextType>(
    () => ({
      user,
      modules,
      completedQuestions,
      questionStatus,
      questions: QUESTIONS,
      posts: POSTS,
      cloudState,
      login,
      logout,
      refreshCloudState,
      updateProfile,
      updateProgress,
      markQuestionCompleted,
      setQuestionResult,
      clearPracticeProgress,
      recordQuestionReview,
      recordQuestionAttempt,
    }),
    [user, modules, completedQuestions, questionStatus, cloudState],
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
