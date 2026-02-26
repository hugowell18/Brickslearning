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
  name: '张三 (Zhang San)',
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
    description: '掌握利用 Databricks SQL 进行数据分析的核心能力，包括数据管理、SQL 仓储配置与可视化大屏制作。',
    officialLink: 'https://partner-academy.databricks.com/learn/course/78/data-analyst-learning-plan',
    totalModules: 8,
    estimatedHours: 40,
  },
  {
    id: 'engineer',
    title: 'Databricks Certified Data Engineer Associate',
    description: '验证使用 Databricks Lakehouse 平台完成 ETL 任务的能力，涵盖 Delta Lake、Unity Catalog 与 Workflows。',
    officialLink: 'https://partner-academy.databricks.com/learn/course/10/data-engineer-learning-plan',
    totalModules: 12,
    estimatedHours: 60,
  }
];

export const MODULES: Module[] = [
  // Analyst Modules
  {
    id: 'ma1',
    trackId: 'analyst',
    title: 'Databricks SQL 基础与架构',
    description: '理解 Databricks SQL 的核心组件与 Lakehouse 架构优势。',
    bulletPoints: ['Lakehouse vs Data Warehouse', 'SQL Warehouses 类型与配置', 'Databricks SQL UI 导航'],
    officialUrl: 'https://docs.databricks.com/sql/index.html',
    order: 1,
  },
  {
    id: 'ma2',
    trackId: 'analyst',
    title: '数据查询与可视化',
    description: '使用 SQL 查询数据并创建可视化图表。',
    bulletPoints: ['Basic SQL Queries', 'Visualizations types', 'Dashboard creation'],
    officialUrl: 'https://docs.databricks.com/sql/user/visualizations/index.html',
    order: 2,
  },
    // Engineer Modules
  {
    id: 'me1',
    trackId: 'engineer',
    title: 'Delta Lake 架构与操作',
    description: '深入理解 Delta Lake 的 ACID 事务、版本控制与优化机制。',
    bulletPoints: ['Delta Log 机制', 'Time Travel 查询', 'OPTIMIZE 与 Z-Order'],
    officialUrl: 'https://docs.databricks.com/delta/index.html',
    order: 1,
  },
  {
    id: 'me2',
    trackId: 'engineer',
    title: 'Unity Catalog 数据治理',
    description: '使用 Unity Catalog 管理数据资产、权限与血缘。',
    bulletPoints: ['Metastore, Catalog, Schema 层次结构', 'Granting Privileges', 'Data Lineage'],
    officialUrl: 'https://docs.databricks.com/data-governance/unity-catalog/index.html',
    order: 2,
  },
  {
    id: 'me3',
    trackId: 'engineer',
    title: 'ETL with Auto Loader',
    description: '使用 Auto Loader 高效摄取云存储中的文件数据。',
    bulletPoints: ['cloudFiles format', 'Schema Evolution', 'Checkpointing'],
    officialUrl: 'https://docs.databricks.com/ingestion/auto-loader/index.html',
    order: 3,
  }
];

export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    trackId: 'engineer',
    section: 'Delta Lake',
    difficulty: 'medium',
    type: 'single',
    stem: '在 Delta Lake 中，执行 `DELETE` 操作后，数据文件会立即从存储中物理删除吗？',
    options: [
      { id: 'a', text: '是的，为了释放存储空间，会立即物理删除。' },
      { id: 'b', text: '不会，数据文件会被标记为 tombstone，直到运行 VACUUM 命令。' },
      { id: 'c', text: '不会，只有运行 OPTIMIZE 命令后才会删除。' },
      { id: 'd', text: '取决于表属性 `delta.delete.immediate` 的设置。' },
    ],
    correctAnswer: ['b'],
    explanation: 'Delta Lake 使用多版本并发控制 (MVCC)。删除操作实际上是写入一个新的事务日志条目，表明这些文件在当前版本中不再有效。原始 Parquet 文件保留在存储中以支持 Time Travel，直到使用 `VACUUM` 命令清理旧文件。',
    referenceUrl: 'https://docs.databricks.com/delta/vacuum.html',
    tags: ['Delta Lake', 'Storage'],
  },
  {
    id: 'q2',
    trackId: 'engineer',
    section: 'Unity Catalog',
    difficulty: 'hard',
    type: 'single',
    stem: '在 Unity Catalog 的三层命名空间中，以下哪个对象的层级最高？',
    options: [
      { id: 'a', text: 'Schema' },
      { id: 'b', text: 'Metastore' },
      { id: 'c', text: 'Catalog' },
      { id: 'd', text: 'Table' },
    ],
    correctAnswer: ['b'],
    explanation: 'Unity Catalog 的对象模型层级为：Metastore > Catalog > Schema > Table/View/Volume。Metastore 是顶层容器。',
    referenceUrl: 'https://docs.databricks.com/data-governance/unity-catalog/index.html#object-model',
    tags: ['Unity Catalog', 'Governance'],
  },
  {
    id: 'q3',
    trackId: 'analyst',
    section: 'Databricks SQL',
    difficulty: 'easy',
    type: 'single',
    stem: '哪种类型的 SQL Warehouse 最适合高并发的 BI 仪表盘查询？',
    options: [
      { id: 'a', text: 'Classic SQL Warehouse' },
      { id: 'b', text: 'Pro SQL Warehouse' },
      { id: 'c', text: 'Serverless SQL Warehouse' },
      { id: 'd', text: 'All Purpose Compute' },
    ],
    correctAnswer: ['c'],
    explanation: 'Serverless SQL Warehouse 提供最快的启动时间和优秀的自动扩展能力，非常适合高并发的 BI 和交互式分析负载。',
    referenceUrl: 'https://docs.databricks.com/sql/admin/sql-warehouses.html',
    tags: ['SQL Warehouse', 'Compute'],
  },
  {
    id: 'q4',
    trackId: 'analyst',
    section: 'Visualization',
    difficulty: 'medium',
    type: 'multiple',
    stem: '在 Databricks SQL 仪表盘中，以下哪些功能是支持的？（多选）',
    options: [
      { id: 'a', text: '参数化查询 (Parameters)' },
      { id: 'b', text: '自动刷新 (Refresh Schedule)' },
      { id: 'c', text: 'PDF 导出' },
      { id: 'd', text: '直接修改底层 Delta 表数据' },
    ],
    correctAnswer: ['a', 'b', 'c'],
    explanation: 'Databricks SQL 仪表盘支持参数、定时刷新和 PDF 导出。但是仪表盘本身主要用于读取和展示，不直接用于类似 Excel 的单元格级数据修改（尽管可以通过 SQL Update 语句间接修改）。',
    tags: ['Dashboard', 'Visualization'],
  }
];

export const POSTS: Post[] = [
  {
    id: 'p1',
    authorId: 'u2',
    authorName: '李老师 (Instructor Li)',
    authorRole: 'instructor',
    title: '【公告】本周日 Engineer 模拟考试注意事项',
    content: '大家好，本周日的模考将覆盖 Delta Lake 深度优化章节。请大家重点复习 `OPTIMIZE` 和 `Z-ORDER` 的区别。考试时间为 2 小时。',
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
    authorName: '王五',
    authorRole: 'student',
    title: '请教：Unity Catalog 的 External Location 权限问题',
    content: '我在配置 External Location 时遇到了 `Access Denied` 错误，明明已经配置了 Storage Credential。有人遇到过吗？\n\n```sql\nCREATE EXTERNAL LOCATION ...\n```',
    trackId: 'engineer',
    tags: ['Unity Catalog', 'Help'],
    likes: 3,
    comments: 2,
    createdAt: '2023-10-26T14:30:00Z',
    isSolved: false,
  }
];
