/**
 * Parse @handles from text (e.g. "@alice @bob.dev")
 * @param {string} text
 * @returns {string[]}
 */
export function parseMentionHandles(text) {
  if (!text) return [];
  const regex = /@([a-zA-Z0-9_.-]+)/g;
  const out = [];
  const seen = new Set();
  let m;
  while ((m = regex.exec(text)) !== null) {
    const handle = String(m[1] || '').trim().toLowerCase();
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    out.push(handle);
  }
  return out;
}

/**
 * @param {{id:string,name?:string,email?:string}[]} profiles
 * @returns {Map<string, {id:string,name?:string,email?:string}>}
 */
export function buildProfileHandleMap(profiles) {
  const normalize = (v) => String(v || '').trim().toLowerCase();
  const compact = (v) => normalize(v).replace(/[\s_.-]+/g, '');

  const map = new Map();
  for (const p of profiles || []) {
    const rawName = normalize(p?.name);
    const rawEmailLocal = normalize(p?.email).split('@')[0];
    const rawUsername = normalize(p?.username);

    const keys = new Set();

    if (rawEmailLocal) {
      keys.add(rawEmailLocal); // e.g. y.yang
      keys.add(compact(rawEmailLocal)); // e.g. yyang
    }

    if (rawName) {
      keys.add(rawName.replace(/\s+/g, '')); // old behavior
      keys.add(compact(rawName));

      // Name-based aliases, e.g. "Y Yang" -> "yyang", "yangy"
      const parts = rawName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const first = parts[0];
        const last = parts[parts.length - 1];
        keys.add(`${first[0] || ''}${last}`);
        keys.add(`${last}${first[0] || ''}`);
      }
    }

    if (rawUsername) {
      keys.add(rawUsername);
      keys.add(compact(rawUsername));
    }

    for (const k of keys) {
      if (!k) continue;
      map.set(k, p);
    }
  }
  return map;
}

/**
 * @param {object} args
 * @param {string} args.actorId
 * @param {string} args.actorName
 * @param {string} args.postId
 * @param {string} args.sourceId
 * @param {'post'|'comment'} args.sourceType
 * @param {string} args.text
 * @param {Map<string, {id:string,name?:string,email?:string}>} args.profileByHandle
 * @returns {{recipientUserId:string, notification: any}[]}
 */
export function buildMentionNotifications(args) {
  const {
    actorId,
    actorName,
    postId,
    sourceId,
    sourceType,
    text,
    profileByHandle,
  } = args;
  const handles = parseMentionHandles(text);
  const out = [];
  const dedupRecipient = new Set();
  for (const handle of handles) {
    const profile = profileByHandle.get(handle);
    if (!profile?.id) continue;
    if (profile.id === actorId) continue;
    if (dedupRecipient.has(profile.id)) continue;
    dedupRecipient.add(profile.id);
    out.push({
      recipientUserId: profile.id,
      notification: {
        id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'mention',
        sourceType,
        sourceId,
        postId,
        actorId,
        actorName,
        contentPreview: text.slice(0, 140),
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    });
  }
  return out;
}
