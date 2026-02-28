import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMentionHandles,
  buildProfileHandleMap,
  buildMentionNotifications,
} from '../src/app/utils/communityNotifications.js';

test('parseMentionHandles extracts and deduplicates handles', () => {
  const text = 'hello @Alice and @bob.dev and @alice again';
  assert.deepEqual(parseMentionHandles(text), ['alice', 'bob.dev']);
});

test('buildProfileHandleMap supports email prefix and compact name', () => {
  const profiles = [
    { id: 'u1', email: 'alice@example.com', name: 'Alice Wang' },
    { id: 'u2', email: 'bob.dev@example.com', name: 'Bob Dev' },
  ];
  const map = buildProfileHandleMap(profiles);
  assert.equal(map.get('alice')?.id, 'u1');
  assert.equal(map.get('alicewang')?.id, 'u1');
  assert.equal(map.get('bob.dev')?.id, 'u2');
  assert.equal(map.get('bobdev')?.id, 'u2');
});

test('buildMentionNotifications excludes self and unknown users', () => {
  const profiles = [
    { id: 'u1', email: 'alice@example.com', name: 'Alice Wang' },
    { id: 'u2', email: 'bob@example.com', name: 'Bob Li' },
  ];
  const profileByHandle = buildProfileHandleMap(profiles);
  const list = buildMentionNotifications({
    actorId: 'u1',
    actorName: 'Alice',
    postId: 'p1',
    sourceId: 'c1',
    sourceType: 'comment',
    text: 'ping @alice @bob @nobody @bob',
    profileByHandle,
  });
  assert.equal(list.length, 1);
  assert.equal(list[0].recipientUserId, 'u2');
  assert.equal(list[0].notification.type, 'mention');
  assert.equal(list[0].notification.postId, 'p1');
});

