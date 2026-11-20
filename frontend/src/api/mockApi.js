import { filterPhotos } from '../utils/filterPhotos.js';

// A fake backend that lives in the browser's localStorage.
// Same function names and return shapes as realApi.js, so pages don't care
// which one is in use. Turn on with VITE_USE_MOCK=true in .env.
//
// Logins are per browser tab (sessionStorage) while the data is shared (localStorage),
// so two tabs = two different users on the same "server": handy for multi-user demos.
//
// Demo accounts:  demo@snapshare.test / password123
//                 aina@snapshare.test / password123

const DB_KEY = 'snapshare_mock_db_v2';
const SESSION_KEY = 'snapshare_mock_session';
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

function placeholder(c1, c2, shape) {
  const shapes = {
    sun: `<circle cx="300" cy="170" r="70" fill="#fff" opacity=".85"/><path d="M0 330 L160 230 L280 300 L420 200 L600 320 L600 450 L0 450Z" fill="#000" opacity=".25"/>`,
    hills: `<path d="M0 300 Q150 180 300 280 T600 250 L600 450 L0 450Z" fill="#fff" opacity=".35"/><path d="M0 360 Q200 280 400 350 T600 330 L600 450 L0 450Z" fill="#000" opacity=".2"/>`,
    city: `<g fill="#000" opacity=".3"><rect x="40" y="220" width="70" height="230"/><rect x="130" y="160" width="60" height="290"/><rect x="210" y="250" width="90" height="200"/><rect x="320" y="120" width="55" height="330"/><rect x="395" y="200" width="80" height="250"/><rect x="495" y="260" width="70" height="190"/></g>`,
    waves: `<g fill="none" stroke="#fff" stroke-width="10" opacity=".5"><path d="M0 260 Q75 220 150 260 T300 260 T450 260 T600 260"/><path d="M0 320 Q75 280 150 320 T300 320 T450 320 T600 320"/><path d="M0 380 Q75 340 150 380 T300 380 T450 380 T600 380"/></g>`,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="600" height="450" fill="url(#g)"/>${shapes[shape]}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function seed() {
  const now = Date.now();
  const h = 3600 * 1000;
  return {
    nextId: { user: 3, photo: 5, comment: 5 },
    users: [
      { id: 1, username: 'demo', email: 'demo@snapshare.test', password: 'password123' },
      { id: 2, username: 'aina', email: 'aina@snapshare.test', password: 'password123' },
    ],
    photos: [
      { id: 1, user_id: 2, title: 'Sunset at Teluk Batik', description: 'Golden hour after class. Worth the drive.', image_url: placeholder('#f29e4c', '#c2410c', 'sun'), tags: ['sunset', 'beach'], created_at: new Date(now - 2 * h).toISOString() },
      { id: 2, user_id: 1, title: 'Cameron Highlands tea fields', description: 'Rolling green everywhere.', image_url: placeholder('#7fb685', '#2f5d50', 'hills'), tags: ['nature', 'travel'], created_at: new Date(now - 30 * h).toISOString() },
      { id: 3, user_id: 2, title: 'KL skyline at night', description: 'From the bridge near KLCC.', image_url: placeholder('#3b4c7a', '#141b2d', 'city'), tags: ['kl', 'night', 'city'], created_at: new Date(now - 4 * 24 * h).toISOString() },
      { id: 4, user_id: 1, title: 'Morning at the lake', description: 'Campus lake, 7am, nobody around.', image_url: placeholder('#8ec5d6', '#2b6c8a', 'waves'), tags: ['campus', 'nature'], created_at: new Date(now - 12 * 24 * h).toISOString() },
    ],
    comments: [
      { id: 1, photo_id: 1, user_id: 1, text: 'Those colours are unreal!', created_at: new Date(now - 1.5 * h).toISOString() },
      { id: 2, photo_id: 1, user_id: 2, text: 'Thanks! No filter too.', created_at: new Date(now - 1 * h).toISOString() },
      { id: 3, photo_id: 3, user_id: 1, text: 'Which bridge is this? Saloma?', created_at: new Date(now - 3 * 24 * h).toISOString() },
      { id: 4, photo_id: 2, user_id: 2, text: 'Need to go back there soon', created_at: new Date(now - 20 * h).toISOString() },
    ],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }
  const db = seed();
  save(db);
  return db;
}
function save(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    throw new Error('Browser storage is full. Clear site data to reset the mock backend.');
  }
}

const publicUser = (u) => u && { id: u.id, username: u.username, email: u.email };
const sessionUser = (db) => db.users.find((u) => String(u.id) === sessionStorage.getItem(SESSION_KEY));

function requireUser(db) {
  const u = sessionUser(db);
  if (!u) throw new Error('Please log in first.');
  return u;
}

function decorate(db, p) {
  const owner = db.users.find((u) => u.id === p.user_id);
  return {
    ...p,
    username: owner ? owner.username : 'unknown',
    comment_count: db.comments.filter((c) => c.photo_id === p.id).length,
  };
}

// Shrinks big photos before storing them so localStorage doesn't overflow.
function fileToDataUrl(file, maxSide = 1280) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(reader.result);
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- Auth ----------
export async function register({ username, email, password }) {
  await wait();
  const db = load();
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('That email is already registered.');
  if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) throw new Error('That username is taken.');
  const user = { id: db.nextId.user++, username, email, password };
  db.users.push(user);
  save(db);
  sessionStorage.setItem(SESSION_KEY, String(user.id));
  return { token: `mock-${user.id}`, user: publicUser(user) };
}

export async function login({ email, password }) {
  await wait();
  const db = load();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!user) throw new Error('Invalid email or password.');
  sessionStorage.setItem(SESSION_KEY, String(user.id));
  return { token: `mock-${user.id}`, user: publicUser(user) };
}

export async function getCurrentUser() {
  return publicUser(sessionUser(load())) || null;
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ---------- Photos ----------
export async function getPhotos(filters = {}) {
  await wait(200);
  const db = load();
  // Acts like the server: search/filter/sort happen here, not in the page.
  const commentsByPhoto = {};
  db.comments.forEach((c) => (commentsByPhoto[c.photo_id] ||= []).push(c.text));
  return filterPhotos(db.photos.map((p) => decorate(db, p)), filters, commentsByPhoto);
}

export async function getPhoto(id) {
  await wait(150);
  const db = load();
  const p = db.photos.find((x) => String(x.id) === String(id));
  if (!p) throw new Error('Photo not found.');
  return decorate(db, p);
}

export async function uploadPhoto({ file, title, description, tags = [] }, onProgress) {
  const db = load();
  const user = requireUser(db);
  for (let pct = 0; pct <= 100; pct += 20) {
    onProgress && onProgress(pct);
    await wait(120);
  }
  const image_url = await fileToDataUrl(file);
  const photo = { id: db.nextId.photo++, user_id: user.id, title, description, tags, image_url, created_at: new Date().toISOString() };
  db.photos.push(photo);
  save(db);
  return decorate(db, photo);
}

export async function deletePhoto(id) {
  await wait();
  const db = load();
  const user = requireUser(db);
  const p = db.photos.find((x) => String(x.id) === String(id));
  if (!p) throw new Error('Photo not found.');
  if (p.user_id !== user.id) throw new Error('You can only delete your own photos.');
  db.photos = db.photos.filter((x) => x !== p);
  db.comments = db.comments.filter((c) => c.photo_id !== p.id);
  save(db);
  return { message: 'Deleted' };
}

// ---------- Comments ----------
export async function getComments(photoId) {
  await wait(150);
  const db = load();
  return db.comments
    .filter((c) => String(c.photo_id) === String(photoId))
    .map((c) => ({ ...c, username: db.users.find((u) => u.id === c.user_id)?.username || 'unknown' }))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export async function addComment(photoId, text) {
  await wait(200);
  const db = load();
  const user = requireUser(db);
  const comment = { id: db.nextId.comment++, photo_id: Number(photoId), user_id: user.id, text, created_at: new Date().toISOString() };
  db.comments.push(comment);
  save(db);
  return { ...comment, username: user.username };
}

export async function updateComment(commentId, text) {
  await wait(200);
  const db = load();
  const user = requireUser(db);
  const c = db.comments.find((x) => String(x.id) === String(commentId));
  if (!c) throw new Error('Comment not found.');
  if (c.user_id !== user.id) throw new Error('You can only edit your own comments.');
  c.text = text;
  c.updated_at = new Date().toISOString();
  save(db);
  return { ...c, username: user.username };
}

// Allowed for the comment's author, or the owner of the photo (moderation).
export async function deleteComment(commentId) {
  await wait(200);
  const db = load();
  const user = requireUser(db);
  const c = db.comments.find((x) => String(x.id) === String(commentId));
  if (!c) throw new Error('Comment not found.');
  const photo = db.photos.find((p) => p.id === c.photo_id);
  if (c.user_id !== user.id && photo?.user_id !== user.id) throw new Error('You cannot delete this comment.');
  db.comments = db.comments.filter((x) => x !== c);
  save(db);
  return { message: 'Deleted' };
}

// ---------- Tags ----------
export async function getTags() {
  const counts = {};
  load().photos.forEach((p) => (p.tags || []).forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

// ---------- Users ----------
export async function getUsers() {
  return load().users.map(publicUser);
}
