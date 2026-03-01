import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CURRENT_USER, MODULES as INITIAL_MODULES, QUESTIONS, POSTS } from '../data/mockData';
import {
  checkCloudHealth,
  getCompletedQuestions,
  getCurrentAuthUser,
  getJson,
  getProgress,
  getUserProfile,
  signInWithPassword,
  signOutAuth,
  signUpWithPassword,
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
      password?: string;
      name?: string;
      isSignup?: boolean;
    },
  ) => Promise<void>;
  logout: () => void;
  refreshCloudState: () => Promise<void>;
  updateProfile: (patch: { name?: string; avatar?: string }) => Promise<void>;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<typeof CURRENT_USER | null>(null);
  const [modules, setModules] = useState<typeof INITIAL_MODULES>(
    INITIAL_MODULES.map((m) => ({ ...m, status: m.status ?? 'not-started' })),
  );
  const [completedQuestions, setCompletedQuestions] = useState<string[]>([]);
  const [completedQuestionMeta, setCompletedQuestionMeta] = useState<Record<string, string>>({});
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
    void (async () => {
      try {
        const authUser = await getCurrentAuthUser();
        if (!authUser) {
          setUser(null);
          localStorage.removeItem('db_user');
          return;
        }
        setUser((prev) => {
          if (prev && prev.id === authUser.id) return prev;
          const nextUser = {
            ...CURRENT_USER,
            id: authUser.id,
            email: (authUser.email || '').toLowerCase(),
            role: 'student' as UserRole,
            name: (authUser.email || '').split('@')[0] || '同学',
            progress: {
              analyst: 0,
              engineer: 0,
            },
          };
          localStorage.setItem('db_user', JSON.stringify(nextUser));
          return nextUser;
        });
      } catch {
        // keep existing behavior; auth check failure should not crash app
      }
    })();
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
        const [progressMap, qs, remoteProfile, statusMap, moduleCompleteMeta, completedMeta] = await Promise.all([
          getProgress(user.id),
          getCompletedQuestions(user.id),
          getUserProfile(user.id),
          getJson<Record<string, 'correct' | 'incorrect'>>(`${QUESTION_STATUS_KEY_PREFIX}${user.id}`, {}),
          getJson<Record<string, string>>(`${MODULE_COMPLETE_META_KEY_PREFIX}${user.id}`, {}),
          getJson<Record<string, string>>(`${COMPLETED_META_KEY_PREFIX}${user.id}`, {}),
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
        const nowIso = new Date().toISOString();
        const mergedMeta: Record<string, string> = { ...(completedMeta || {}) };
        if (Array.isArray(qs)) {
          for (const uid of qs) {
            if (!mergedMeta[uid]) mergedMeta[uid] = nowIso;
          }
        }
        const mergedCompleted = Array.from(new Set([...(Array.isArray(qs) ? qs : []), ...Object.keys(mergedMeta)]));
        setCompletedQuestionMeta(mergedMeta);
        setCompletedQuestions(mergedCompleted);
        setQuestionStatus(statusMap || {});

        // Backfill legacy users: keep completed list and meta in sync in cloud.
        if (mergedCompleted.length !== (Array.isArray(qs) ? qs.length : 0)) {
          void saveCompletedQuestions(user.id, mergedCompleted).catch(() => {});
        }
        if (Object.keys(mergedMeta).length !== Object.keys(completedMeta || {}).length) {
          void setJson(`${COMPLETED_META_KEY_PREFIX}${user.id}`, mergedMeta).catch(() => {});
        }

        if (remoteProfile) {
          const shouldUpdateName = !!remoteProfile.name && remoteProfile.name !== user.name;
          const shouldUpdateRole = !!remoteProfile.role && remoteProfile.role !== user.role;
          const incomingAvatar =
            (remoteProfile as { avatar_url?: string; avatar?: string }).avatar_url ??
            (remoteProfile as { avatar_url?: string; avatar?: string }).avatar;
          const currentAvatar =
            (user as { avatar_url?: string; avatar?: string }).avatar_url ??
            (user as { avatar_url?: string; avatar?: string }).avatar;
          const shouldUpdateAvatar =
            Object.prototype.hasOwnProperty.call(remoteProfile, 'avatar_url') ||
            Object.prototype.hasOwnProperty.call(remoteProfile, 'avatar')
              ? incomingAvatar !== currentAvatar
              : false;
          if (shouldUpdateName || shouldUpdateRole || shouldUpdateAvatar) {
            const mergedUser = {
              ...user,
              name: remoteProfile.name || user.name,
              role: (remoteProfile.role || user.role) as typeof user.role,
              avatar: incomingAvatar ?? currentAvatar,
              avatar_url: incomingAvatar ?? currentAvatar,
              avatar_thumb_url:
                (remoteProfile as { avatar_thumb_url?: string }).avatar_thumb_url ??
                (user as { avatar_thumb_url?: string; avatar_url?: string; avatar?: string }).avatar_thumb_url ??
                incomingAvatar ??
                currentAvatar,
            };
            setUser(mergedUser);
            localStorage.setItem('db_user', JSON.stringify(mergedUser));
          }
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

  const login = async (
    email: string,
    options?: {
      password?: string;
      name?: string;
      isSignup?: boolean;
    },
  ) => {
    const normalizedEmail = email.trim().toLowerCase();
    const password = options?.password || '';
    const isSignup = !!options?.isSignup;
    if (!password) {
      throw new Error('请输入密码。');
    }

    let authUser;
    try {
      authUser = isSignup
        ? await signUpWithPassword(normalizedEmail, password)
        : await signInWithPassword(normalizedEmail, password);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (/email not confirmed/i.test(msg)) {
        throw new Error('该账号尚未完成邮箱验证，请先到邮箱确认。');
      }
      if (/invalid login credentials/i.test(msg)) {
        throw new Error('邮箱或密码错误。');
      }
      throw error;
    }

    const nextId = authUser.id;
    const localProfileKey = `${PROFILE_KEY_PREFIX}${nextId}`;

    let resolvedRole: UserRole = 'student';
    let resolvedName = options?.name?.trim() || '';
    let resolvedAvatar = '';

    const localProfileRaw = localStorage.getItem(localProfileKey);
    if (localProfileRaw) {
      try {
        const localProfile = JSON.parse(localProfileRaw) as {
          role?: UserRole;
          name?: string;
          avatar?: string;
          avatar_url?: string;
          avatar_thumb_url?: string;
        };
        if (localProfile.role) resolvedRole = localProfile.role;
        if (!resolvedName && localProfile.name) resolvedName = localProfile.name;
        if (!resolvedAvatar) {
          resolvedAvatar = localProfile.avatar_url || localProfile.avatar || '';
        }
      } catch {
        // ignore malformed local profile
      }
    }

    let remoteProfile: Awaited<ReturnType<typeof getUserProfile>> = null;
    try {
      remoteProfile = await getUserProfile(nextId);
      if (remoteProfile?.role) resolvedRole = remoteProfile.role as UserRole;
      if (!resolvedName && remoteProfile?.name) resolvedName = remoteProfile.name;
      if (!resolvedAvatar) {
        resolvedAvatar =
          (remoteProfile as { avatar_url?: string; avatar?: string }).avatar_url ||
          (remoteProfile as { avatar_url?: string; avatar?: string }).avatar ||
          '';
      }
    } catch {
      // cloud unavailable; fallback to defaults
    }
    const fallbackName = normalizedEmail.split('@')[0] || '同学';

    const newUser = {
      ...CURRENT_USER,
      id: nextId,
      email: authUser.email || normalizedEmail,
      role: resolvedRole,
      name: resolvedName || fallbackName,
      progress: {
        analyst: 0,
        engineer: 0,
      },
      avatar: resolvedAvatar || CURRENT_USER.avatar,
      avatar_url: resolvedAvatar || CURRENT_USER.avatar,
      avatar_thumb_url: resolvedAvatar || CURRENT_USER.avatar,
    };

    setUser(newUser);
    localStorage.setItem('db_user', JSON.stringify(newUser));
    localStorage.setItem(
      localProfileKey,
      JSON.stringify({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        avatar: newUser.avatar,
        avatar_url: (newUser as { avatar_url?: string }).avatar_url || newUser.avatar,
        avatar_thumb_url: (newUser as { avatar_thumb_url?: string }).avatar_thumb_url || newUser.avatar,
      }),
    );

    // Avoid role clobbering on login: only initialize cloud profile on signup
    // (or if there is no remote profile record yet).
    const shouldInitProfile = isSignup || !remoteProfile;
    if (shouldInitProfile) {
      try {
        await setUserProfile(newUser.id, {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          avatar: newUser.avatar,
          avatar_url: (newUser as { avatar_url?: string }).avatar_url || newUser.avatar,
          avatar_thumb_url: (newUser as { avatar_thumb_url?: string }).avatar_thumb_url || newUser.avatar,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
      }
    }
  };

  const logout = () => {
    void signOutAuth().catch(() => {});
    setUser(null);
    setModules(INITIAL_MODULES.map((m) => ({ ...m, status: m.status ?? 'not-started' })));
    setCompletedQuestions([]);
    setCompletedQuestionMeta({});
    localStorage.removeItem('db_user');
  };

  const updateProfile = async (
    patch: {
      name?: string;
      avatar?: string;
      avatar_url?: string;
      avatar_thumb_url?: string;
      avatar_updated_at?: string;
    },
  ) => {
    if (!user) return;
    if (cloudState.blocked) {
      throw new Error(cloudState.message || '云端已阻断，无法更新资料。');
    }

    const nextName = patch.name?.trim() || user.name;
    const nextAvatar =
      patch.avatar_url ||
      patch.avatar ||
      ((user as { avatar_url?: string; avatar?: string }).avatar_url ??
        (user as { avatar_url?: string; avatar?: string }).avatar ??
        '');
    const nextAvatarThumb =
      patch.avatar_thumb_url ||
      ((user as { avatar_thumb_url?: string; avatar_url?: string; avatar?: string }).avatar_thumb_url ??
        (user as { avatar_thumb_url?: string; avatar_url?: string; avatar?: string }).avatar_url ??
        (user as { avatar_thumb_url?: string; avatar_url?: string; avatar?: string }).avatar ??
        '');

    const nextUser = { ...user, name: nextName, avatar: nextAvatar, avatar_url: nextAvatar, avatar_thumb_url: nextAvatarThumb };
    setUser(nextUser);
    localStorage.setItem('db_user', JSON.stringify(nextUser));
    localStorage.setItem(
      `${PROFILE_KEY_PREFIX}${nextUser.id}`,
      JSON.stringify({
        id: nextUser.id,
        email: nextUser.email,
        name: nextUser.name,
        role: nextUser.role,
        avatar: nextUser.avatar,
        avatar_url: (nextUser as { avatar_url?: string }).avatar_url || nextUser.avatar,
        avatar_thumb_url: (nextUser as { avatar_thumb_url?: string }).avatar_thumb_url || nextUser.avatar,
      }),
    );
    try {
      await setUserProfile(nextUser.id, {
        id: nextUser.id,
        email: nextUser.email,
        name: nextUser.name,
        role: nextUser.role,
        avatar: nextUser.avatar,
        avatar_url: (nextUser as { avatar_url?: string }).avatar_url || nextUser.avatar,
        avatar_thumb_url: (nextUser as { avatar_thumb_url?: string }).avatar_thumb_url || nextUser.avatar,
        avatar_updated_at: patch.avatar_updated_at,
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
    const metaKey = `${COMPLETED_META_KEY_PREFIX}${user.id}`;
    const nowIso = new Date().toISOString();

    setCompletedQuestionMeta((prev) => {
      if (prev[uid]) return prev;
      const next = { ...prev, [uid]: nowIso };
      void setJson(metaKey, next).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
      });
      return next;
    });

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
    const completedMetaKey = `${COMPLETED_META_KEY_PREFIX}${user.id}`;
    const reviewKey = `${REVIEW_EVENTS_KEY_PREFIX}${user.id}`;
    const attemptKey = `${ATTEMPT_EVENTS_KEY_PREFIX}${user.id}`;

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

    setCompletedQuestionMeta((prev) => {
      const next: Record<string, string> = {};
      Object.keys(prev).forEach((uid) => {
        if (!target.has(uid)) next[uid] = prev[uid];
      });
      void setJson(completedMetaKey, next).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
      });
      return next;
    });

    // Also clear review / attempt event streams for these questions,
    // so dashboard learning and accuracy trends are consistent with reset state.
    void getJson<Array<{ uid: string; at: string }>>(reviewKey, [])
      .then((events) => {
        const next = (Array.isArray(events) ? events : []).filter((e) => !target.has(e.uid));
        return setJson(reviewKey, next);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
      });

    void getJson<Array<{ uid: string; correct: boolean; at: string }>>(attemptKey, [])
      .then((events) => {
        const next = (Array.isArray(events) ? events : []).filter((e) => !target.has(e.uid));
        return setJson(attemptKey, next);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        handleCloudFailure(message);
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
