/**
 * Manual end-to-end API test.
 *
 * Exercises every endpoint against a RUNNING server + database:
 *   node tests/e2e.manual.mjs                 (defaults to http://localhost:3000/api)
 *   node tests/e2e.manual.mjs http://host:port/api
 *
 * Not part of `npm test` because it needs live services. It creates
 * throwaway accounts with unique names, so it is safe to re-run.
 */

const BASE = process.argv[2] || 'http://localhost:3000/api';

let cookie = ''; // session cookie, managed like a browser would

async function call(method, path, { body, form, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (cookie) headers.Cookie = cookie;

  let payload;
  if (form) {
    payload = form; // FormData sets its own Content-Type
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });

  // Track the auth cookie exactly like a browser would.
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const tokenCookie = setCookies.find((c) => c.startsWith('token='));
  if (tokenCookie) {
    const value = tokenCookie.split(';')[0].split('=')[1] || '';
    cookie = value ? `token=${value}` : ''; // "token=;" means cleared
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no JSON body */
  }
  return { status: res.status, data };
}

let passed = 0;
const failures = [];
function check(name, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✔ ${name}`);
  } else {
    failures.push(name);
    console.error(`  ✘ ${name} ${extra}`);
  }
}

async function main() {
  console.log(`\nRunning E2E checks against ${BASE}\n`);
  const rand = Math.random().toString(36).slice(2, 8);
  const alice = { name: 'Alice Anderson', username: `alice_${rand}`, email: `alice_${rand}@test.dev`, password: 'secret1' };
  const bob = { name: 'Bob Brown', username: `bob_${rand}`, email: `bob_${rand}@test.dev`, password: 'secret2' };

  const health = await call('GET', '/health');
  check('GET /health responds ok', health.status === 200 && health.data?.status === 'ok');

  const regA = await call('POST', '/auth/register', { body: alice });
  check('POST /auth/register (Alice) → 201 + user + cookie',
    regA.status === 201 && regA.data?.user?.id && cookie.includes('token='),
    JSON.stringify(regA.data));
  const tokenA = regA.data?.token;
  const idA = regA.data?.user?.id;

  const regDup = await call('POST', '/auth/register', { body: alice });
  check('duplicate register → 409', regDup.status === 409, `got ${regDup.status}`);

  const regBad = await call('POST', '/auth/register', {
    body: { name: 'X', username: '!!', email: 'nope', password: '1' },
  });
  check('invalid register → 400', regBad.status === 400, `got ${regBad.status}`);

  await call('POST', '/auth/logout');
  check('logout clears cookie', cookie === '' || !cookie.includes('token='), cookie);

  const badLogin = await call('POST', '/auth/login', { body: { email: alice.email, password: 'wrong' } });
  check('wrong password → 401', badLogin.status === 401, `got ${badLogin.status}`);

  const loginA = await call('POST', '/auth/login', { body: { email: alice.email, password: alice.password } });
  check('login (Alice) → 200 + cookie', loginA.status === 200 && cookie.includes('token='), JSON.stringify(loginA.data));

  const me = await call('GET', '/auth/me');
  check('GET /auth/me via cookie', me.status === 200 && me.data?.user?.username === alice.username, JSON.stringify(me.data));

  const meBad = await call('GET', '/auth/me', { token: 'not-a-real-token' });
  check('GET /auth/me with garbage token → 401', meBad.status === 401, `got ${meBad.status}`);

  cookie = ''; // simulate a browser with no session at all
  const meNoAuth = await call('GET', '/auth/me');
  check('GET /auth/me without session → 401', meNoAuth.status === 401, `got ${meNoAuth.status}`);

  const regB = await call('POST', '/auth/register', { body: bob });
  check('POST /auth/register (Bob) → 201', regB.status === 201);
  const tokenB = regB.data?.token;
  cookie = '';

  // ---- Posts --------------------------------------------------------------
  const postA1 = await call('POST', '/posts', { token: tokenA, body: { content: 'Hello from Alice! First post.' } });
  check('create post (Alice) → 201', postA1.status === 201 && postA1.data?.post?.id, JSON.stringify(postA1.data));
  const postId = postA1.data?.post?.id;

  const postA2 = await call('POST', '/posts', { token: tokenA, body: { content: 'Alice second post' } });
  check('second post (Alice) → 201', postA2.status === 201);
  const postId2 = postA2.data?.post?.id;

  const emptyPost = await call('POST', '/posts', { token: tokenA, body: { content: '   ' } });
  check('empty post → 400', emptyPost.status === 400, `got ${emptyPost.status}`);

  const anonPost = await call('POST', '/posts', { body: { content: 'sneaky' } });
  check('create post without auth → 401', anonPost.status === 401, `got ${anonPost.status}`);

  const feed = await call('GET', '/posts');
  const feedAlice = feed.data?.posts?.filter((p) => p.author.username === alice.username) || [];
  check('GET /posts (anon) → 200, newest first, likedByMe false',
    feed.status === 200 && feedAlice.length === 2 &&
    feedAlice[0].id === postA2.data.post.id &&
    feed.data.posts[0].likedByMe === false,
    JSON.stringify(feed.data?.posts?.[0]));

  const feedA = await call('GET', '/posts', { token: tokenA });
  const feedAliceAuth = feedA.data?.posts?.filter((p) => p.author.username === alice.username) || [];
  check('GET /posts (Alice) → 200 with personalisation', feedA.status === 200 && feedAliceAuth.length === 2);

  const single = await call('GET', `/posts/${postId}`);
  check('GET /posts/:id → 200 with author + counts',
    single.status === 200 && single.data?.post?.author?.username === alice.username &&
    typeof single.data.post.likeCount === 'number',
    JSON.stringify(single.data));

  const missingPost = await call('GET', '/posts/999999');
  check('GET missing post → 404', missingPost.status === 404, `got ${missingPost.status}`);

  // Cloudinary is not configured in tests → uploads must fail gracefully.
  const form = new FormData();
  form.append('content', 'has an image');
  form.append('image', new Blob([Buffer.from('fake-image-bytes')], { type: 'image/png' }), 'test.png');
  const withImage = await call('POST', '/posts', { token: tokenA, form });
  check('post with image (no Cloudinary) → 503 + clear message',
    withImage.status === 503 && /not enabled/i.test(withImage.data?.error || ''),
    `${withImage.status} ${JSON.stringify(withImage.data)}`);

  // ---- Ownership ----------------------------------------------------------
  const editA = await call('PUT', `/posts/${postId}`, { token: tokenA, body: { content: 'Alice edited her post.' } });
  check('owner edits post → 200', editA.status === 200 && editA.data?.post?.content === 'Alice edited her post.', JSON.stringify(editA.data));

  const editB = await call('PUT', `/posts/${postId}`, { token: tokenB, body: { content: 'Bob hijacks!' } });
  check("Bob cannot edit Alice's post → 403", editB.status === 403, `got ${editB.status}`);

  const deleteB = await call('DELETE', `/posts/${postId}`, { token: tokenB });
  check("Bob cannot delete Alice's post → 403", deleteB.status === 403, `got ${deleteB.status}`);

  // ---- Likes --------------------------------------------------------------
  const likeA = await call('POST', `/posts/${postId}/like`, { token: tokenA });
  check('Alice likes post → liked=true, count 1',
    likeA.status === 200 && likeA.data?.liked === true && likeA.data?.likeCount === 1,
    JSON.stringify(likeA.data));

  const likeADup = await call('POST', `/posts/${postId}/like`, { token: tokenA });
  check('duplicate like is idempotent (still count 1)',
    likeADup.status === 200 && likeADup.data?.likeCount === 1,
    JSON.stringify(likeADup.data));

  const likeB = await call('POST', `/posts/${postId}/like`, { token: tokenB });
  check('Bob likes post → count 2', likeB.data?.likeCount === 2, JSON.stringify(likeB.data));

  const feedLiked = await call('GET', '/posts', { token: tokenB });
  const bView = feedLiked.data.posts.find((p) => p.id === postId);
  check('feed shows likedByMe=true for Bob', bView?.likedByMe === true, JSON.stringify(bView));

  const unlikeB = await call('DELETE', `/posts/${postId}/like`, { token: tokenB });
  check('Bob unlikes → liked=false, count 1',
    unlikeB.data?.liked === false && unlikeB.data?.likeCount === 1,
    JSON.stringify(unlikeB.data));

  const anonLike = await call('POST', `/posts/${postId}/like`, { body: {} });
  check('like without auth → 401', anonLike.status === 401, `got ${anonLike.status}`);

  // ---- Comments -----------------------------------------------------------
  const commentB = await call('POST', `/posts/${postId}/comments`, { token: tokenB, body: { content: 'Nice post, Alice!' } });
  check('Bob comments → 201', commentB.status === 201 && commentB.data?.comment?.id, JSON.stringify(commentB.data));

  const commentA = await call('POST', `/posts/${postId}/comments`, { token: tokenA, body: { content: 'Thanks Bob!' } });
  check('Alice comments → 201', commentA.status === 201);
  const commentAId = commentA.data?.comment?.id;

  const emptyComment = await call('POST', `/posts/${postId}/comments`, { token: tokenA, body: { content: '  ' } });
  check('empty comment → 400', emptyComment.status === 400, `got ${emptyComment.status}`);

  const comments = await call('GET', `/posts/${postId}/comments`);
  check('GET comments → 2, oldest first, with author',
    comments.status === 200 && comments.data?.comments?.length === 2 &&
    comments.data.comments[0].author.username === bob.username,
    JSON.stringify(comments.data));

  const delCommentB = await call('DELETE', `/comments/${commentAId}`, { token: tokenB });
  check("Bob cannot delete Alice's comment → 403", delCommentB.status === 403, `got ${delCommentB.status}`);

  const delCommentA = await call('DELETE', `/comments/${commentAId}`, { token: tokenA });
  check('Alice deletes own comment → 200', delCommentA.status === 200, `got ${delCommentA.status}`);

  // ---- Profiles -----------------------------------------------------------
  const updA = await call('PUT', '/users/profile', {
    token: tokenA,
    body: { name: 'Alice A.', username: alice.username, bio: 'I write code.' },
  });
  check('Alice updates her profile → 200 + new bio',
    updA.status === 200 && updA.data?.user?.bio === 'I write code.', JSON.stringify(updA.data));

  const updBSteal = await call('PUT', '/users/profile', {
    token: tokenB,
    body: { name: 'Bob', username: alice.username, bio: '' },
  });
  check("Bob cannot take Alice's username → 409", updBSteal.status === 409, `got ${updBSteal.status}`);

  const publicA = await call('GET', `/users/${idA}`);
  check('public profile → 200, no email field, postCount 2',
    publicA.status === 200 && publicA.data?.user?.postCount === 2 &&
    publicA.data.user.email === undefined && publicA.data.user.bio === 'I write code.',
    JSON.stringify(publicA.data));

  const postsA = await call('GET', `/users/${idA}/posts`);
  check("GET /users/:id/posts → Alice's 2 posts", postsA.status === 200 && postsA.data?.posts?.length === 2);

  const missingUser = await call('GET', '/users/999999');
  check('GET missing user → 404', missingUser.status === 404, `got ${missingUser.status}`);

  // ---- CSRF origin protection --------------------------------------------
  const csrfRes = await fetch(`${BASE}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`,
      Origin: 'http://evil.example',
    },
    body: JSON.stringify({ content: 'csrf attempt' }),
  });
  check('state-changing request from foreign Origin → 403', csrfRes.status === 403, `got ${csrfRes.status}`);

  // ---- Delete post → FK cascade ------------------------------------------
  const del = await call('DELETE', `/posts/${postId}`, { token: tokenA });
  check('Alice deletes own post → 200', del.status === 200, `got ${del.status}`);

  const del2 = await call('DELETE', `/posts/${postId2}`, { token: tokenA });
  check('Alice deletes her second post → 200', del2.status === 200, `got ${del2.status}`);

  const gone = await call('GET', `/posts/${postId}`);
  check('deleted post → 404', gone.status === 404, `got ${gone.status}`);

  const commentsAfter = await call('GET', `/posts/${postId}/comments`);
  check('comments of deleted post → 404 (no orphans)', commentsAfter.status === 404, `got ${commentsAfter.status}`);

  const publicAfter = await call('GET', `/users/${idA}`);
  check('postCount back to 0 after delete', publicAfter.data?.user?.postCount === 0, JSON.stringify(publicAfter.data));

  // ---- Rate limiting (auth endpoints; kept last) --------------------------
  let saw429 = false;
  for (let i = 0; i < 25 && !saw429; i += 1) {
    const r = await call('POST', '/auth/login', { body: { email: alice.email, password: 'nope' } });
    if (r.status === 429) saw429 = true;
  }
  check('login rate limiting kicks in (429)', saw429);

  console.log(`\n${passed} passed, ${failures.length} failed\n`);
  if (failures.length > 0) {
    console.error('Failed checks:', failures);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('E2E run crashed:', err);
  process.exit(1);
});
