import { useEffect, useMemo, useState } from 'react';
import { ThumbsUp, MessageCircle, Plus, Search, TrendingUp, Filter, AtSign, Send, CornerDownRight, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { posts as seedPosts } from '../data/mockData';
import { useApp } from '../../context/AppContext';
import { getJson, listJsonByPrefix, setJson } from '../../lib/supabaseClient';
import { buildMentionNotifications, buildProfileHandleMap, parseMentionHandles } from '../utils/communityNotifications';
import ConfirmActionDialog from '../components/ConfirmActionDialog';

type Track = 'all' | 'analyst' | 'engineer' | 'general';

type CommunityPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  track: Exclude<Track, 'all'>;
};

type CommunityComment = {
  id: string;
  postId: string;
  parentCommentId?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
};

type CommunityLike = {
  id: string;
  userId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  createdAt: string;
};

type ProfileLite = {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  avatar?: string;
  avatar_url?: string;
  avatar_thumb_url?: string;
};

type JumpState = {
  openPostId?: string;
  focusCommentId?: string;
};

const POSTS_KEY = 'db_community_posts';
const COMMENTS_KEY = 'db_community_comments';
const LIKES_KEY = 'db_community_likes';
const NOTIFICATION_KEY_PREFIX = 'db_notifications:';

function seedToPost(raw: any): CommunityPost {
  return {
    id: raw.id,
    authorId: `seed_${raw.id}`,
    authorName: raw.author?.name || '匿名用户',
    authorAvatar: raw.author?.avatar,
    title: raw.title || '',
    content: raw.content || '',
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    track: raw.track || 'general',
  };
}

function prettyTime(iso: string) {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso || '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function Community() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, cloudState } = useApp();

  const [selectedTrack, setSelectedTrack] = useState<Track>('all');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'latest' | 'likes' | 'comments'>('latest');

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [likes, setLikes] = useState<CommunityLike[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);

  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);
  const [focusedPostId, setFocusedPostId] = useState<string | null>(null);
  const [pendingJump, setPendingJump] = useState<{ postId: string; commentId?: string } | null>(null);

  const [commentDraftByPost, setCommentDraftByPost] = useState<Record<string, string>>({});
  const [replyToCommentByPost, setReplyToCommentByPost] = useState<Record<string, string | undefined>>({});
  const [mentionErrorByPost, setMentionErrorByPost] = useState<Record<string, string>>({});
  const isAdmin = user?.role === 'admin';
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'deletePost' | 'deleteComment';
    postId: string;
    commentId?: string;
  } | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  useEffect(() => {
    if (cloudState.blocked) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [cloudPosts, cloudComments, cloudLikes, profileRows] = await Promise.all([
          getJson<CommunityPost[]>(POSTS_KEY, []),
          getJson<CommunityComment[]>(COMMENTS_KEY, []),
          getJson<CommunityLike[]>(LIKES_KEY, []),
          listJsonByPrefix<ProfileLite>('db_profile:'),
        ]);

        if (cancelled) return;
        const initialPosts =
          Array.isArray(cloudPosts) && cloudPosts.length > 0 ? cloudPosts : (seedPosts || []).map(seedToPost);

        setPosts(initialPosts);
        setComments(Array.isArray(cloudComments) ? cloudComments : []);
        setLikes(Array.isArray(cloudLikes) ? cloudLikes : []);
        setProfiles((profileRows || []).map((r) => r.value).filter(Boolean));
      } catch {
        if (cancelled) return;
        setPosts((seedPosts || []).map(seedToPost));
        setComments([]);
        setLikes([]);
        setProfiles([]);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [cloudState.blocked]);

  useEffect(() => {
    const state = (location.state || {}) as JumpState;
    if (!state.openPostId) return;

    // 强制可见，避免筛选条件导致目标帖子不在列表中
    setSelectedTrack('all');
    setSearch('');
    setSort('latest');
    setExpandedPostId(state.openPostId);
    setFocusedPostId(state.openPostId);
    if (state.focusCommentId) setFocusedCommentId(state.focusCommentId);

    setPendingJump({
      postId: state.openPostId,
      commentId: state.focusCommentId,
    });
  }, [location.state]);

  useEffect(() => {
    if (!pendingJump) return;
    const targetId = pendingJump.commentId ? `comment-${pendingJump.commentId}` : `post-${pendingJump.postId}`;
    const el = document.getElementById(targetId);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setPendingJump(null);
    navigate(location.pathname, { replace: true, state: null });
  }, [pendingJump, posts, comments, expandedPostId, navigate, location.pathname]);

  useEffect(() => {
    if (!focusedCommentId && !focusedPostId) return;
    const timer = setTimeout(() => {
      setFocusedCommentId(null);
      setFocusedPostId(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [focusedCommentId, focusedPostId]);

  const likesByPost = useMemo(() => {
    const map = new Map<string, number>();
    for (const like of likes) {
      if (like.targetType !== 'post') continue;
      map.set(like.targetId, (map.get(like.targetId) || 0) + 1);
    }
    return map;
  }, [likes]);

  const commentsByPostCount = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of comments) {
      map.set(c.postId, (map.get(c.postId) || 0) + 1);
    }
    return map;
  }, [comments]);

  const profileByHandle = useMemo(() => buildProfileHandleMap(profiles), [profiles]);
  const profileById = useMemo(() => {
    const map = new Map<string, ProfileLite>();
    for (const p of profiles) {
      if (p?.id) map.set(p.id, p);
    }
    return map;
  }, [profiles]);

  const getMentionStatus = (text: string) => {
    const handles = parseMentionHandles(text || '');
    if (handles.length === 0) {
      return { matched: [] as Array<{ handle: string; name: string }>, unknown: [] as string[] };
    }
    const matched: Array<{ handle: string; name: string }> = [];
    const unknown: string[] = [];
    for (const h of handles) {
      const p: any = profileByHandle.get(h);
      if (p?.id) {
        matched.push({ handle: h, name: p.name || p.email || p.id });
      } else {
        unknown.push(h);
      }
    }
    return { matched, unknown };
  };

  const filteredPosts = useMemo(() => {
    let next = selectedTrack === 'all' ? posts : posts.filter((p) => p.track === selectedTrack);

    const kw = search.trim().toLowerCase();
    if (kw) {
      next = next.filter(
        (p) =>
          p.title.toLowerCase().includes(kw) ||
          p.content.toLowerCase().includes(kw) ||
          p.tags.some((t) => t.toLowerCase().includes(kw)),
      );
    }

    const sorted = [...next];
    if (sort === 'likes') {
      sorted.sort((a, b) => (likesByPost.get(b.id) || 0) - (likesByPost.get(a.id) || 0));
    } else if (sort === 'comments') {
      sorted.sort((a, b) => (commentsByPostCount.get(b.id) || 0) - (commentsByPostCount.get(a.id) || 0));
    } else {
      sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    }
    return sorted;
  }, [selectedTrack, posts, search, sort, likesByPost, commentsByPostCount]);

  const persistPosts = async (next: CommunityPost[]) => {
    setPosts(next);
    if (!cloudState.blocked) await setJson(POSTS_KEY, next);
  };

  const persistComments = async (next: CommunityComment[]) => {
    setComments(next);
    if (!cloudState.blocked) await setJson(COMMENTS_KEY, next);
  };

  const persistLikes = async (next: CommunityLike[]) => {
    setLikes(next);
    if (!cloudState.blocked) await setJson(LIKES_KEY, next);
  };

  const pushMentionNotifications = async (
    text: string,
    postId: string,
    sourceType: 'post' | 'comment',
    sourceId: string,
  ) => {
    if (!user) return;
    const mentionPayloads = buildMentionNotifications({
      actorId: user.id,
      actorName: user.name,
      postId,
      sourceType,
      sourceId,
      text,
      profileByHandle,
    });
    for (const item of mentionPayloads) {
      const key = `${NOTIFICATION_KEY_PREFIX}${item.recipientUserId}`;
      const list = await getJson<any[]>(key, []);
      await setJson(key, [item.notification, ...(Array.isArray(list) ? list : [])].slice(0, 200));
    }
  };

  const handleTogglePostLike = async (postId: string) => {
    if (!user) return;
    const existing = likes.find((l) => l.userId === user.id && l.targetType === 'post' && l.targetId === postId);
    let next: CommunityLike[];
    if (existing) {
      next = likes.filter((l) => l.id !== existing.id);
    } else {
      next = [
        {
          id: makeId('like'),
          userId: user.id,
          targetType: 'post',
          targetId: postId,
          createdAt: new Date().toISOString(),
        },
        ...likes,
      ];
    }
    await persistLikes(next);
  };

  const handleSubmitComment = async (postId: string) => {
    if (!user) return;
    const content = (commentDraftByPost[postId] || '').trim();
    if (!content) return;
    const mentionStatus = getMentionStatus(content);
    if (mentionStatus.unknown.length > 0) {
      setMentionErrorByPost((prev) => ({
        ...prev,
        [postId]: `存在未识别 @：${mentionStatus.unknown.map((h) => `@${h}`).join('，')}`,
      }));
      return;
    }

    const parentCommentId = replyToCommentByPost[postId];
    const newComment: CommunityComment = {
      id: makeId('c'),
      postId,
      parentCommentId,
      authorId: user.id,
      authorName: user.name,
      authorAvatar:
        ((user as { avatar_url?: string; avatar?: string } | null)?.avatar_url ||
          (user as { avatar_url?: string; avatar?: string } | null)?.avatar ||
          ''
        ).trim(),
      content,
      createdAt: new Date().toISOString(),
    };

    const nextComments = [...comments, newComment];
    await persistComments(nextComments);
    await pushMentionNotifications(content, postId, 'comment', newComment.id);
    setCommentDraftByPost((prev) => ({ ...prev, [postId]: '' }));
    setReplyToCommentByPost((prev) => ({ ...prev, [postId]: undefined }));
    setMentionErrorByPost((prev) => ({ ...prev, [postId]: '' }));
  };

  const handleDeletePost = async (postId: string) => {
    if (!user || !isAdmin) return;

    const removedCommentIds = comments.filter((c) => c.postId === postId).map((c) => c.id);
    const removedCommentSet = new Set(removedCommentIds);

    const nextPosts = posts.filter((p) => p.id !== postId);
    const nextComments = comments.filter((c) => c.postId !== postId);
    const nextLikes = likes.filter((l) => {
      if (l.targetType === 'post' && l.targetId === postId) return false;
      if (l.targetType === 'comment' && removedCommentSet.has(l.targetId)) return false;
      return true;
    });

    await Promise.all([persistPosts(nextPosts), persistComments(nextComments), persistLikes(nextLikes)]);
    if (expandedPostId === postId) setExpandedPostId(null);
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user || !isAdmin) return;

    const removed = new Set<string>();
    const queue = [commentId];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (removed.has(current)) continue;
      removed.add(current);
      comments.forEach((c) => {
        if (c.parentCommentId === current) queue.push(c.id);
      });
    }

    const nextComments = comments.filter((c) => !removed.has(c.id));
    const nextLikes = likes.filter((l) => !(l.targetType === 'comment' && removed.has(l.targetId)));

    await Promise.all([persistComments(nextComments), persistLikes(nextLikes)]);
    if (replyToCommentByPost[postId] && removed.has(replyToCommentByPost[postId] as string)) {
      setReplyToCommentByPost((prev) => ({ ...prev, [postId]: undefined }));
    }
  };

  const requestDeletePost = (postId: string) => {
    if (!user || !isAdmin) return;
    setConfirmDialog({ type: 'deletePost', postId });
  };

  const requestDeleteComment = (postId: string, commentId: string) => {
    if (!user || !isAdmin) return;
    setConfirmDialog({ type: 'deleteComment', postId, commentId });
  };

  const runConfirmAction = async () => {
    if (!confirmDialog) return;
    try {
      setConfirmPending(true);
      if (confirmDialog.type === 'deletePost') {
        await handleDeletePost(confirmDialog.postId);
      } else if (confirmDialog.type === 'deleteComment' && confirmDialog.commentId) {
        await handleDeleteComment(confirmDialog.postId, confirmDialog.commentId);
      }
    } finally {
      setConfirmPending(false);
      setConfirmDialog(null);
    }
  };

  const postStats = {
    totalPosts: posts.length,
    totalUsers: new Set(posts.map((p) => p.authorId)).size,
    todayPosts: posts.filter((p) => Date.now() - Date.parse(p.createdAt) < 24 * 60 * 60 * 1000).length,
  };

  const popularTags = useMemo(() => {
    const counter = new Map<string, { label: string; count: number }>();
    for (const post of posts) {
      for (const rawTag of post.tags || []) {
        const label = String(rawTag || '').trim();
        if (!label) continue;
        const key = label.toLowerCase();
        const existing = counter.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          counter.set(key, { label, count: 1 });
        }
      }
    }
    return Array.from(counter.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 12);
  }, [posts]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">社区</h1>
          <p className="text-gray-600 mt-1">交流经验，支持评论回复与 @ 提及。</p>
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
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索帖子..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as 'latest' | 'likes' | 'comments')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="latest">最新发布</option>
                  <option value="likes">最多点赞</option>
                  <option value="comments">最多回复</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {(['all', 'analyst', 'engineer', 'general'] as Track[]).map((track) => (
              <button
                key={track}
                onClick={() => setSelectedTrack(track)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedTrack === track
                    ? track === 'analyst'
                      ? 'bg-blue-500 text-white'
                      : track === 'engineer'
                      ? 'bg-purple-500 text-white'
                      : track === 'general'
                      ? 'bg-green-500 text-white'
                      : 'bg-orange-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {track === 'all' ? '全部' : track === 'analyst' ? 'Data Analyst' : track === 'engineer' ? 'Data Engineer' : '综合讨论'}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredPosts.map((post) => {
              const postComments = comments.filter((c) => c.postId === post.id);
              const isExpanded = expandedPostId === post.id;
              const likesCount = likesByPost.get(post.id) || 0;
              const commentsCount = commentsByPostCount.get(post.id) || 0;
              const myLike = !!likes.find(
                (l) => l.userId === user?.id && l.targetType === 'post' && l.targetId === post.id,
              );
              const mentionStatus = getMentionStatus(commentDraftByPost[post.id] || '');

              return (
                <div
                  id={`post-${post.id}`}
                  key={post.id}
                  className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow ${
                    focusedPostId === post.id ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={
                        post.authorAvatar ||
                        profileById.get(post.authorId)?.avatar_url ||
                        profileById.get(post.authorId)?.avatar ||
                        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=60'
                      }
                      alt={post.authorName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{post.authorName}</div>
                      <div className="text-sm text-gray-500">{prettyTime(post.createdAt)}</div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        post.track === 'analyst'
                          ? 'bg-blue-100 text-blue-700'
                          : post.track === 'engineer'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {post.track === 'analyst' ? 'Analyst' : post.track === 'engineer' ? 'Engineer' : '综合'}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => requestDeletePost(post.id)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                        title="删除帖子"
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </button>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                  <p className="text-gray-600 mb-4 whitespace-pre-wrap">{post.content}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {(post.tags || []).map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-6 text-gray-600">
                    <button
                      onClick={() => void handleTogglePostLike(post.id)}
                      className={`flex items-center gap-2 transition-colors ${
                        myLike ? 'text-orange-500' : 'hover:text-orange-500'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-sm">{likesCount}</span>
                    </button>
                    <button
                      onClick={() => setExpandedPostId((prev) => (prev === post.id ? null : post.id))}
                      className="flex items-center gap-2 hover:text-orange-500 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm">{commentsCount} 回复</span>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-5 border-t pt-4 space-y-4">
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <AtSign className="w-3 h-3" />
                        可使用 @用户名（通常是邮箱前缀），例如：@admin 或 @alice
                      </div>

                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {postComments.length === 0 && <div className="text-sm text-gray-500">还没有回复，来做第一个回复吧。</div>}

                        {postComments.map((c) => {
                          const replyHandle =
                            (profiles.find((p) => p.id === c.authorId)?.email || '').toLowerCase().split('@')[0] ||
                            c.authorName.toLowerCase().replace(/\s+/g, '');

                          return (
                            <div
                              id={`comment-${c.id}`}
                              key={c.id}
                              className={`rounded-lg border px-3 py-2 ${
                                focusedCommentId === c.id ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-gray-800">{c.authorName}</div>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-gray-500">{prettyTime(c.createdAt)}</div>
                                  {isAdmin && (
                                    <button
                                      onClick={() => requestDeleteComment(post.id, c.id)}
                                      className="text-xs text-red-600 hover:text-red-700"
                                      title="删除评论"
                                    >
                                      删除
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{c.content}</div>
                              <div className="mt-2">
                                <button
                                  className="text-xs text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
                                  onClick={() => {
                                    setExpandedPostId(post.id);
                                    setReplyToCommentByPost((prev) => ({ ...prev, [post.id]: c.id }));
                                    setCommentDraftByPost((prev) => ({ ...prev, [post.id]: `@${replyHandle} ` }));
                                  }}
                                >
                                  <CornerDownRight className="w-3 h-3" />
                                  回复
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-2">
                        {replyToCommentByPost[post.id] && (
                          <div className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1 inline-flex items-center gap-2">
                            正在回复评论
                            <button
                              className="underline"
                              onClick={() => setReplyToCommentByPost((prev) => ({ ...prev, [post.id]: undefined }))}
                            >
                              取消
                            </button>
                          </div>
                        )}
                        <textarea
                          value={commentDraftByPost[post.id] || ''}
                          onChange={(e) => {
                            setCommentDraftByPost((prev) => ({ ...prev, [post.id]: e.target.value }));
                            setMentionErrorByPost((prev) => ({ ...prev, [post.id]: '' }));
                          }}
                          rows={3}
                          placeholder="写下你的回复，支持 @用户名"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                        />
                        {(mentionStatus.matched.length > 0 || mentionStatus.unknown.length > 0) && (
                          <div className="text-xs space-y-1">
                            {mentionStatus.matched.length > 0 && (
                              <div className="text-green-700">
                                已识别：{mentionStatus.matched.map((m) => `@${m.handle}(${m.name})`).join('，')}
                              </div>
                            )}
                            {mentionStatus.unknown.length > 0 && (
                              <div className="text-red-600">
                                未识别：{mentionStatus.unknown.map((h) => `@${h}`).join('，')}（请检查用户名或邮箱前缀）
                              </div>
                            )}
                          </div>
                        )}
                        {!!mentionErrorByPost[post.id] && (
                          <div className="text-xs text-red-600">{mentionErrorByPost[post.id]}</div>
                        )}
                        <div className="flex justify-end">
                          <button
                            onClick={() => void handleSubmitComment(post.id)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            <Send className="w-4 h-4" />
                            发送回复
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900">热门标签</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularTags.length > 0 ? (
                popularTags.map((tag) => (
                  <span
                    key={tag.label.toLowerCase()}
                    className="px-3 py-1 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-700 rounded-full text-sm cursor-pointer transition-colors"
                    onClick={() => setSearch(tag.label)}
                    title={`出现 ${tag.count} 次`}
                  >
                    {tag.label}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">暂无标签</span>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">社区统计</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">总帖子数</span>
                <span className="font-bold text-gray-900">{postStats.totalPosts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">活跃用户</span>
                <span className="font-bold text-gray-900">{postStats.totalUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">今日新帖</span>
                <span className="font-bold text-orange-600">{postStats.todayPosts}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmActionDialog
        open={!!confirmDialog}
        title={confirmDialog?.type === 'deletePost' ? '确认删除帖子？' : '确认删除评论？'}
        description={
          confirmDialog?.type === 'deletePost'
            ? '删除后将同步移除该帖下全部评论和相关点赞，此操作不可恢复。'
            : '删除后将同步移除该评论及其子回复和相关点赞，此操作不可恢复。'
        }
        confirmText="确认删除"
        cancelText="取消"
        destructive
        pending={confirmPending}
        onOpenChange={(open) => !open && !confirmPending && setConfirmDialog(null)}
        onConfirm={runConfirmAction}
      />

      {showNewPostModal && (
        <NewPostModal
          onClose={() => setShowNewPostModal(false)}
          onSubmit={async (draft) => {
            if (!user) return;
            const post: CommunityPost = {
              id: makeId('p'),
              authorId: user.id,
              authorName: user.name,
              authorAvatar:
                ((user as { avatar_url?: string; avatar?: string } | null)?.avatar_url ||
                  (user as { avatar_url?: string; avatar?: string } | null)?.avatar ||
                  ''
                ).trim(),
              title: draft.title.trim(),
              content: draft.content.trim(),
              tags: draft.tags,
              track: draft.track,
              createdAt: new Date().toISOString(),
            };
            const nextPosts = [post, ...posts];
            await persistPosts(nextPosts);
            await pushMentionNotifications(post.content, post.id, 'post', post.id);
          }}
        />
      )}
    </div>
  );
}

function NewPostModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (draft: {
    track: 'analyst' | 'engineer' | 'general';
    title: string;
    content: string;
    tags: string[];
  }) => Promise<void>;
}) {
  const [track, setTrack] = useState<'analyst' | 'engineer' | 'general'>('general');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8);
      await onSubmit({ track, title, content, tags });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">发布新帖子</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTrack('analyst')}
                className={`px-4 py-2 rounded-lg ${
                  track === 'analyst' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Data Analyst
              </button>
              <button
                onClick={() => setTrack('engineer')}
                className={`px-4 py-2 rounded-lg ${
                  track === 'engineer' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Data Engineer
              </button>
              <button
                onClick={() => setTrack('general')}
                className={`px-4 py-2 rounded-lg ${
                  track === 'general' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                综合讨论
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">标签（逗号分隔）</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">
            取消
          </button>
          <button
            onClick={() => void submit()}
            disabled={saving || !title.trim() || !content.trim()}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? '发布中...' : '发布'}
          </button>
        </div>
      </div>
    </div>
  );
}
