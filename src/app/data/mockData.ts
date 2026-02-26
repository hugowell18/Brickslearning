import { LucideIcon, Brain, Database, CheckCircle, Clock, BookOpen, User, Target, BarChart2, MessageSquare, AlertCircle } from 'lucide-react';
import questionsData from './questions.json';

// --- Types ---

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'student' | 'instructor' | 'admin';
  targetExams: ('analyst' | 'engineer')[];
}

export interface Stat {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  status: 'not-started' | 'in-progress' | 'completed';
  track: 'analyst' | 'engineer';
  officialUrl?: string;
  tags: string[];
}

export interface Question {
  uid: string;
  category: string;
  q: string; // English
  opts: string[];
  ans: string; // A, B, C, D
  q_zh: string; // Chinese
  exp_zh: string; // Chinese explanation
  exp_link: string;
  // optional illustration(s) for the question; may be a single data URL or an array
  img?: string | string[];
}

export interface ExamResult {
  id: string;
  date: string;
  score: number;
  totalQuestions: number;
  track: 'analyst' | 'engineer';
  duration: string;
}

export interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  title: string;
  content: string;
  tags: string[];
  likes: number;
  comments: number;
  createdAt: string;
  track: 'analyst' | 'engineer' | 'general';
}

// --- Mock Data ---

export const currentUser: User = {
  id: 'u1',
  name: 'Alex Chen',
  email: 'alex.chen@example.com',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  role: 'student',
  targetExams: ['analyst', 'engineer'],
};

export const modules: LearningModule[] = [
  // Analyst Track
  {
    id: 'm1',
    title: 'Databricks Lakehouse Platform Overview',
    description: 'Understand the core components of the Lakehouse architecture and how it unifies data warehousing and AI.',
    duration: '45 min',
    status: 'completed',
    track: 'analyst',
    tags: ['Lakehouse', 'Architecture'],
  },
  {
    id: 'm2',
    title: 'Data Management with Delta Lake',
    description: 'Learn how to manage data reliability and performance using Delta Lake features like ACID transactions.',
    duration: '60 min',
    status: 'in-progress',
    track: 'analyst',
    tags: ['Delta Lake', 'ACID'],
  },
  {
    id: 'm3',
    title: 'SQL Warehouses & Query Optimization',
    description: 'Optimizing SQL queries and understanding Serverless SQL Warehouses.',
    duration: '90 min',
    status: 'not-started',
    track: 'analyst',
    tags: ['SQL', 'Optimization'],
  },
  {
    id: 'm10',
    title: 'Data Visualization with Databricks',
    description: 'Create interactive dashboards and visualizations using Databricks SQL.',
    duration: '60 min',
    status: 'completed',
    track: 'analyst',
    tags: ['Visualization', 'Dashboards'],
  },
  {
    id: 'm11',
    title: 'Advanced SQL Analytics',
    description: 'Master window functions, CTEs, and advanced analytical queries.',
    duration: '75 min',
    status: 'completed',
    track: 'analyst',
    tags: ['SQL', 'Analytics'],
  },
  // Engineer Track
  {
    id: 'm4',
    title: 'Data Engineering with Databricks',
    description: 'Building ETL pipelines using Delta Live Tables and Auto Loader.',
    duration: '120 min',
    status: 'in-progress',
    track: 'engineer',
    tags: ['ETL', 'DLT'],
  },
  {
    id: 'm5',
    title: 'Unity Catalog Governance',
    description: 'Implementing data governance and security using Unity Catalog.',
    duration: '75 min',
    status: 'not-started',
    track: 'engineer',
    tags: ['Unity Catalog', 'Governance'],
  },
  {
    id: 'm6',
    title: 'Apache Spark Fundamentals',
    description: 'Master the fundamentals of distributed data processing with Apache Spark.',
    duration: '100 min',
    status: 'completed',
    track: 'engineer',
    tags: ['Spark', 'Processing'],
  },
  {
    id: 'm7',
    title: 'Streaming Data Processing',
    description: 'Build real-time data pipelines with Structured Streaming.',
    duration: '90 min',
    status: 'in-progress',
    track: 'engineer',
    tags: ['Streaming', 'Real-time'],
  },
  {
    id: 'm8',
    title: 'Performance Optimization',
    description: 'Optimize Spark jobs and improve data processing performance.',
    duration: '80 min',
    status: 'completed',
    track: 'engineer',
    tags: ['Optimization', 'Performance'],
  },
];

export const questions: Question[] = questionsData as Question[];

export const examHistory: ExamResult[] = [
  { id: 'e1', date: '2023-10-15', score: 72, totalQuestions: 45, track: 'analyst', duration: '55 min' },
  { id: 'e2', date: '2023-10-20', score: 85, totalQuestions: 45, track: 'analyst', duration: '50 min' },
  { id: 'e3', date: '2023-10-25', score: 68, totalQuestions: 60, track: 'engineer', duration: '85 min' },
];

export const posts: Post[] = [
  {
    id: 'p1',
    author: { name: 'Sarah Jin', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
    title: 'How to optimize Delta Lake merge operations?',
    content: 'I am struggling with slow merge performance on a large dataset. Has anyone tried Z-Ordering?',
    tags: ['Delta Lake', 'Optimization'],
    likes: 12,
    comments: 4,
    createdAt: '2 hours ago',
    track: 'engineer',
  },
  {
    id: 'p2',
    author: { name: 'David Lee', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
    title: 'Tips for the Data Analyst certification exam?',
    content: 'Taking the exam next week. Any specific areas I should focus on regarding visualizations?',
    tags: ['Certification', 'Exam Prep'],
    likes: 25,
    comments: 8,
    createdAt: '1 day ago',
    track: 'analyst',
  },
  {
    id: 'p3',
    author: { name: 'Michael Chen', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
    title: 'Unity Catalog 权限管理最佳实践',
    content: '分享一下我在生产环境中配置 Unity Catalog 权限的经验，包括如何设置不同级别的访问控制。',
    tags: ['Unity Catalog', 'Best Practices'],
    likes: 18,
    comments: 6,
    createdAt: '3 hours ago',
    track: 'engineer',
  },
  {
    id: 'p4',
    author: { name: 'Emily Wang', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
    title: 'SQL 优化技巧总结',
    content: '总结了一些在 Databricks SQL 中常用的性能优化技巧，希望对大家备考有帮助！',
    tags: ['SQL', 'Performance'],
    likes: 34,
    comments: 12,
    createdAt: '1 day ago',
    track: 'analyst',
  },
  {
    id: 'p5',
    author: { name: 'Alex Kumar', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
    title: 'Auto Loader vs. Traditional ETL',
    content: 'What are the main advantages of using Auto Loader compared to traditional batch ETL processes?',
    tags: ['Auto Loader', 'ETL'],
    likes: 15,
    comments: 7,
    createdAt: '2 days ago',
    track: 'engineer',
  },
  {
    id: 'p6',
    author: { name: 'Lisa Martinez', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80' },
    title: '通过考试啦！分享我的学习路径',
    content: '经过两个月的准备，终于通过了 Data Analyst 认证！分享一下我的学习计划和心得。',
    tags: ['Success Story', 'Study Plan'],
    likes: 56,
    comments: 23,
    createdAt: '3 days ago',
    track: 'analyst',
  },
];
