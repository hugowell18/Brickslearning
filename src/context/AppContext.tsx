import React, { createContext, useContext, useState, useEffect } from 'react';
import { USER_STATS, LEARNING_MODULES, QUESTIONS, POSTS } from '../data/mockData';

interface AppContextType {
  user: typeof USER_STATS | null;
  modules: typeof LEARNING_MODULES;
  questions: typeof QUESTIONS;
  posts: typeof POSTS;
  login: (email: string) => void;
  logout: () => void;
  updateProgress: (moduleId: string, status: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<typeof USER_STATS | null>(null);
  const [modules, setModules] = useState(LEARNING_MODULES);
  
  // Simulation of persistent login
  useEffect(() => {
    const savedUser = localStorage.getItem('db_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (email: string) => {
    // Mock login - just sets the default user
    const newUser = { ...USER_STATS, email };
    setUser(newUser);
    localStorage.setItem('db_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('db_user');
  };

  const updateProgress = (moduleId: string, status: string) => {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, status } : m));
  };

  return (
    <AppContext.Provider value={{ user, modules, questions: QUESTIONS, posts: POSTS, login, logout, updateProgress }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
