export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  avatar?: string;
  classId?: string;
  progress: {
    analyst: number;
    engineer: number;
  };
}

export interface Track {
  id: 'analyst' | 'engineer';
  title: string;
  description: string;
  officialLink: string;
  totalModules: number;
  estimatedHours: number;
}

export interface Module {
  id: string;
  trackId: 'analyst' | 'engineer';
  title: string;
  description: string;
  bulletPoints: string[];
  officialUrl: string;
  order: number;
  status?: 'not-started' | 'in-progress' | 'completed';
  completedAt?: string;
}

export interface Question {
  id: string;
  trackId: 'analyst' | 'engineer';
  section: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'single' | 'multiple';
  stem: string;
  options: { id: string; text: string }[];
  correctAnswer: string[];
  explanation: string;
  referenceUrl?: string;
  tags: string[];
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'instructor' | 'admin';
  title: string;
  content: string;
  trackId: 'analyst' | 'engineer' | 'general';
  tags: string[];
  likes: number;
  comments: number;
  createdAt: string;
  isPinned?: boolean;
  isSolved?: boolean;
}

export const CURRENT_USER: User = {
  id: 'u1',
  name: '寮犱笁 (Zhang San)',
  email: 'zhangsan@example.com',
  role: 'student',
  classId: 'class_001',
  progress: {
    analyst: 35,
    engineer: 10,
  }
};

export const TRACKS: Track[] = [
  {
    id: 'analyst',
    title: 'Databricks Certified Data Analyst Associate',
    description: '数据分析认证学习路径，聚焦 AI/BI、SQL 分析与考试准备。',
    officialLink: 'https://partner-academy.databricks.com/learn/learning-plans/78/data-analyst-learning-plan?generated_by=274087&hash=45cf50b2b9aa02a7f8d92dc1dd2e4894d26b38c0',
    totalModules: 5,
    estimatedHours: 30,
  },
  {
    id: 'engineer',
    title: 'Databricks Certified Data Engineer Associate',
    description: '数据工程认证学习路径，聚焦 Lakeflow、数据管道与工程实践。',
    officialLink: 'https://partner-academy.databricks.com/learn/learning-plans/10/data-engineer-learning-plan?generated_by=274087&hash=c82b3df68c59c8732806d833b53a2417f12f2574',
    totalModules: 6,
    estimatedHours: 40,
  }
];

export const MODULES: Module[] = [
  // Analyst Modules
  {
    id: 'ma1',
    trackId: 'analyst',
    title: 'Introduction',
    description: 'Data Analyst 学习路径介绍与整体说明。',
    bulletPoints: ['学习路径总览', '课程结构说明', '认证目标'],
    officialUrl: 'https://partner-academy.databricks.com/learn/learning-plans/78/data-analyst-learning-plan?generated_by=274087&hash=45cf50b2b9aa02a7f8d92dc1dd2e4894d26b38c0',
    order: 1,
  },
  {
    id: 'ma2',
    trackId: 'analyst',
    title: 'AI/BI for Data Analysts',
    description: '面向数据分析师的 AI/BI 能力课程。',
    bulletPoints: ['AI/BI 基础', '分析工作流', '可视化洞察'],
    officialUrl: 'https://partner-academy.databricks.com/learn/courses/3707/aibi-for-data-analysts/lessons',
    order: 2,
  },
  {
    id: 'ma3',
    trackId: 'analyst',
    title: 'SQL Analytics on Databricks',
    description: 'Databricks SQL 分析实战课程。',
    bulletPoints: ['SQL 分析', '查询优化', '分析实践'],
    officialUrl: 'https://partner-academy.databricks.com/learn/courses/3928/sql-analytics-on-databricks/lessons',
    order: 3,
  },
  {
    id: 'ma4',
    trackId: 'analyst',
    title: 'Exam Information: Databricks Certified Data Analyst Associate',
    description: 'Data Analyst Associate 认证考试信息说明。',
    bulletPoints: ['考试范围', '题型说明', '报名信息'],
    officialUrl: 'https://partner-academy.databricks.com/learn/courses/1075/exam-information-databricks-certified-data-analyst-associate-available-for-an-additional-fee/lessons',
    order: 4,
  },
  {
    id: 'ma5',
    trackId: 'analyst',
    title: 'Preparing for Databricks Certification Exams',
    description: 'Databricks 认证考试备考课程。',
    bulletPoints: ['备考策略', '高频知识点', '冲刺建议'],
    officialUrl: 'https://partner-academy.databricks.com/learn/courses/2683/preparing-for-databricks-certification-exams/lessons',
    order: 5,
  },

  // Engineer Modules
  {
    id: 'me1',
    trackId: 'engineer',
    title: 'Introduction',
    description: 'Data Engineer 学习路径介绍与整体说明。',
    bulletPoints: ['学习路径总览', '课程结构说明', '认证目标'],
    officialUrl: 'https://partner-academy.databricks.com/learn/learning-plans/10/data-engineer-learning-plan?generated_by=274087&hash=c82b3df68c59c8732806d833b53a2417f12f2574',
    order: 1,
  },
  {
    id: 'me2',
    trackId: 'engineer',
    title: 'Data Ingestion with Lakeflow Connect',
    description: '使用 Lakeflow Connect 进行数据摄取。',
    bulletPoints: ['数据源接入', '摄取流程', '实践演练'],
    officialUrl: 'https://partner-academy.databricks.com/learn/courses/2963/data-ingestion-with-lakeflow-connect/lessons',
    order: 2,
  },
  {
    id: 'me3',
    trackId: 'engineer',
    title: 'Deploy Workloads with Lakeflow Jobs',
    description: '使用 Lakeflow Jobs 部署工作负载。',
    bulletPoints: ['作业编排', '调度管理', '稳定性实践'],
    officialUrl: 'https://partner-academy.databricks.com/learn/courses/1365/deploy-workloads-with-lakeflow-jobs/lessons',
    order: 3,
  },
  {
    id: 'me4',
    trackId: 'engineer',
    title: 'Build Data Pipelines with Lakeflow Spark Declarative Pipelines',
    description: '使用 Lakeflow Spark Declarative Pipelines 构建数据管道。',
    bulletPoints: ['管道开发', '声明式构建', '端到端流程'],
    officialUrl: 'https://partner-academy.databricks.com/learn/courses/2971/build-data-pipelines-with-lakeflow-spark-declarative-pipelines/lessons',
    order: 4,
  },
  {
    id: 'me5',
    trackId: 'engineer',
    title: 'DevOps Essentials for Data Engineering',
    description: '数据工程 DevOps 核心能力。',
    bulletPoints: ['版本管理', 'CI/CD', '工程化规范'],
    officialUrl: 'https://partner-academy.databricks.com/learn/courses/3640/devops-essentials-for-data-engineering/lessons',
    order: 5,
  },
  {
    id: 'me6',
    trackId: 'engineer',
    title: 'Exam Information: Databricks Certified Professional Data Engineer',
    description: 'Data Engineer 认证考试信息说明。',
    bulletPoints: ['考试范围', '题型说明', '报名信息'],
    officialUrl: 'https://partner-academy.databricks.com/learn/courses/470/exam-information-databricks-certified-professional-data-engineer-available-for-additional-fee/lessons',
    order: 6,
  }
];
export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    trackId: 'engineer',
    section: 'Delta Lake',
    difficulty: 'medium',
    type: 'single',
    stem: 'After running DELETE on a Delta table, are data files physically removed immediately?',
    options: [
      { id: 'a', text: 'Yes, files are deleted immediately.' },
      { id: 'b', text: 'No, files are tombstoned until VACUUM.' },
      { id: 'c', text: 'Only after OPTIMIZE.' },
      { id: 'd', text: 'Depends on session config.' }
    ],
    correctAnswer: ['b'],
    explanation: 'Delta Lake uses transaction logs and delayed file cleanup.',
    referenceUrl: 'https://docs.databricks.com/delta/vacuum.html',
    tags: ['Delta Lake', 'Storage']
  },
  {
    id: 'q2',
    trackId: 'analyst',
    section: 'Databricks SQL',
    difficulty: 'easy',
    type: 'single',
    stem: 'Which warehouse type is best for high-concurrency BI?',
    options: [
      { id: 'a', text: 'Classic SQL Warehouse' },
      { id: 'b', text: 'Pro SQL Warehouse' },
      { id: 'c', text: 'Serverless SQL Warehouse' },
      { id: 'd', text: 'All Purpose Compute' }
    ],
    correctAnswer: ['c'],
    explanation: 'Serverless SQL Warehouse scales quickly for BI workloads.',
    referenceUrl: 'https://docs.databricks.com/sql/admin/sql-warehouses.html',
    tags: ['SQL Warehouse', 'Compute']
  }
];

export const POSTS: Post[] = [
  {
    id: 'p1',
    authorId: 'u2',
    authorName: 'Instructor Li',
    authorRole: 'instructor',
    title: 'This week mock exam notes',
    content: 'Please review OPTIMIZE and Z-ORDER before the mock exam.',
    trackId: 'engineer',
    tags: ['Announcement', 'Exam'],
    likes: 24,
    comments: 5,
    createdAt: '2023-10-25T10:00:00Z',
    isPinned: true,
  },
  {
    id: 'p2',
    authorId: 'u3',
    authorName: 'Wang Wu',
    authorRole: 'student',
    title: 'Need help with Unity Catalog privileges',
    content: 'I get access denied while creating external location.',
    trackId: 'engineer',
    tags: ['Unity Catalog', 'Help'],
    likes: 3,
    comments: 2,
    createdAt: '2023-10-26T14:30:00Z',
    isSolved: false,
  }
];
