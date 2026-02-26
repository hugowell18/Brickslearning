import { useState } from 'react';
import { ThumbsUp, MessageCircle, Plus, Search, TrendingUp, Filter } from 'lucide-react';
import { posts } from '../data/mockData';

export default function Community() {
  const [selectedTrack, setSelectedTrack] = useState<'all' | 'analyst' | 'engineer' | 'general'>('all');
  const [showNewPostModal, setShowNewPostModal] = useState(false);

  const filteredPosts = selectedTrack === 'all' 
    ? posts 
    : posts.filter(p => p.track === selectedTrack);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">社区</h1>
          <p className="text-gray-600 mt-1">与其他学员交流经验，分享学习心得</p>
        </div>
        <button
          onClick={() => setShowNewPostModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          发布帖子
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search & Filter */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索帖子..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-2">
                <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white">
                  <option>最新发布</option>
                  <option>最多点赞</option>
                  <option>最多回复</option>
                </select>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors whitespace-nowrap">
                  <Filter className="w-5 h-5" />
                  <span className="hidden sm:inline">筛选</span>
                </button>
              </div>
            </div>
          </div>

          {/* Track Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTrack('all')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedTrack === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setSelectedTrack('analyst')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedTrack === 'analyst'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              Data Analyst
            </button>
            <button
              onClick={() => setSelectedTrack('engineer')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedTrack === 'engineer'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              Data Engineer
            </button>
            <button
              onClick={() => setSelectedTrack('general')}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedTrack === 'general'
                  ? 'bg-green-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              综合讨论
            </button>
          </div>

          {/* Posts List */}
          <div className="space-y-4">
            {filteredPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Hot Topics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900">热门话题</h3>
            </div>
            <div className="space-y-3">
              {['Delta Lake 优化技巧', 'Unity Catalog 权限管理', 'SQL 性能调优', '考试经验分享'].map((topic, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-orange-50 rounded-lg text-sm text-gray-700 hover:text-orange-700 transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Popular Tags */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">热门标签</h3>
            <div className="flex flex-wrap gap-2">
              {['Delta Lake', 'SQL', 'Unity Catalog', 'ETL', 'DLT', '性能优化', '考试技巧', 'Auto Loader'].map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-700 rounded-full text-sm cursor-pointer transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Community Stats */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">社区统计</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">总帖子数</span>
                <span className="font-bold text-gray-900">1,234</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">活跃用户</span>
                <span className="font-bold text-gray-900">567</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">今日新帖</span>
                <span className="font-bold text-orange-600">23</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Post Modal */}
      {showNewPostModal && (
        <NewPostModal onClose={() => setShowNewPostModal(false)} />
      )}
    </div>
  );
}

function PostCard({ post }) {
  const getTrackColor = () => {
    if (post.track === 'analyst') return 'bg-blue-100 text-blue-700';
    if (post.track === 'engineer') return 'bg-purple-100 text-purple-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Author */}
      <div className="flex items-center gap-3 mb-4">
        <img
          src={post.author.avatar}
          alt={post.author.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="font-medium text-gray-900">{post.author.name}</div>
          <div className="text-sm text-gray-500">{post.createdAt}</div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTrackColor()}`}>
          {post.track === 'analyst' ? 'Analyst' : post.track === 'engineer' ? 'Engineer' : '综合'}
        </span>
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 cursor-pointer hover:text-orange-600 transition-colors">
        {post.title}
      </h3>
      <p className="text-gray-600 mb-4">{post.content}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {post.tags.map(tag => (
          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6 text-gray-600">
        <button className="flex items-center gap-2 hover:text-orange-500 transition-colors">
          <ThumbsUp className="w-4 h-4" />
          <span className="text-sm">{post.likes}</span>
        </button>
        <button className="flex items-center gap-2 hover:text-orange-500 transition-colors">
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm">{post.comments} 回复</span>
        </button>
      </div>
    </div>
  );
}

function NewPostModal({ onClose }) {
  const [track, setTrack] = useState<'analyst' | 'engineer' | 'general'>('general');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">发布新帖子</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Track Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择分类</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTrack('analyst')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  track === 'analyst'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Data Analyst
              </button>
              <button
                onClick={() => setTrack('engineer')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  track === 'engineer'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Data Engineer
              </button>
              <button
                onClick={() => setTrack('general')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  track === 'general'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                综合讨论
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
            <input
              type="text"
              placeholder="输入帖子标题..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
            <textarea
              rows={6}
              placeholder="分享你的问题或经验..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            ></textarea>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">标签</label>
            <input
              type="text"
              placeholder="添加标签，用逗号分隔..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
            发布
          </button>
        </div>
      </div>
    </div>
  );
}
