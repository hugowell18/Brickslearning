export type Role = 'student' | 'instructor' | 'admin';

export type Track = 'analyst' | 'engineer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  class_id?: string;
  created_at: string;
  last_active_at: string;
  daily_goal_minutes?: number;
  target_exam_date?: string;
  avatar_url?: string;
}

export interface LearningModule {
  id: string;
  track: Track;
  title: string;
  description: string;
  order: number;
  official_url: string;
  tags: string[];
  duration_minutes: number;
}

export interface Question {
  id: string;
  track: Track;
  section: string;
  tags: string[];
  stem: string; // The question text
  options: string[];
  correct_answer: number; // Index of the correct option
  explanation: string;
  reference_url?: string;
}

export interface UserModuleProgress {
  user_id: string;
  module_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at?: string;
  completed_at?: string;
  time_spent_minutes: number;
}

export interface ExamSession {
  id: string;
  user_id: string;
  track: Track;
  mode: 'practice' | 'mock';
  total_questions: number;
  score: number; // Percentage or raw score
  started_at: string;
  finished_at?: string;
  answers: Record<string, number>; // question_id -> selected_option_index
}

export interface Post {
  id: string;
  user_id: string;
  track?: Track; // null means general
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  likes: number;
  comments_count: number;
  is_pinned: boolean;
  is_resolved: boolean;
  author_name: string;
  author_avatar?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_avatar?: string;
  parent_id?: string; // For nested replies
}
