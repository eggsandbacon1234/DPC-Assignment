# Snapshare: Frontend (Student 2)

React frontend (presentation tier) for the **TEB3033 Distributed Photo Sharing System**.
Built with React 19, React Router 7 and Vite.

```
Client tier (this repo)  →  Application tier (Express on EC2)  →  Data tier (RDS MySQL) + photo storage (S3)
```

## How the frontend covers the brief

| Requirement in the brief | What the frontend does |
|---|---|
| User accounts, identify who shared / commented | Register, log in, log out. Every photo and comment shows `@username`. Pages that need a login send you to the login page. |
| Uploading and sharing photos among friends | Upload page (drag and drop, preview, checks, progress bar), shared feed, **Share** button that copies the photo link |
| Adding, viewing **and managing** comments | Post, view, **edit** and **delete** your own comments. The **photo owner can remove any comment** on their photo. "edited" label. |
| Multi-tier architecture | The UI only calls the REST API in `src/api/realApi.js`. All search, filtering and data access happen on the server. |
| Concurrent multi-user access | Feed checks every 15 s and shows **"↑ N new photos from friends"**. Comments refresh every 10 s, so other users' comments appear without reloading. |
| **Bonus:** search & filter | Search across **title, description, uploader, tags and comment content**. Filters: **uploader**, **upload date**, **tags**, Everyone / My photos. Sort: newest, oldest, most commented, A–Z. |

## Task status (Student 2: Frontend Lead)

| Task | Status | Where |
|---|---|---|
| React Setup | Completed | `package.json`, `vite.config.js`, `src/main.jsx`, `src/App.jsx` |
| Login Page | Completed | `src/pages/LoginPage.jsx` |
| Registration Page | Completed | `src/pages/RegisterPage.jsx` |
| Feed Page | Completed | `src/pages/FeedPage.jsx`, `src/components/PhotoCard.jsx` |
| Upload Page | Completed | `src/pages/UploadPage.jsx` (includes tags) |
| Comment UI | Completed | `src/components/CommentSection.jsx` (add / edit / delete) |
| Search Bar | Completed | `src/components/SearchBar.jsx` |
| Filter UI | Completed | `src/components/FilterBar.jsx` (uploader, date, tags, sort) |
| Connect APIs | Ready, waiting on backend | `src/api/realApi.js` |

## Quick start

```bash
npm install
cp .env.example .env      # VITE_USE_MOCK=true by default
npm run dev               # http://localhost:5173
```

With `VITE_USE_MOCK=true` the app runs on a **fake backend inside the browser**, so the UI works
before the real backend is ready.

- Demo logins: `demo@snapshare.test` / `password123` and `aina@snapshare.test` / `password123`
- **Each browser tab can be logged in as a different user** while sharing the same data. Open two tabs
  side by side, log in as different users, and you can rehearse the multi-user part of the demo.
- To reset the demo data, clear the site's localStorage in DevTools.

### Connecting to the real backend

1. In `.env` set `VITE_USE_MOCK=false`.
2. Local: run Express on port **5000**. Vite forwards `/api/*` to it (`vite.config.js`).
3. Production: set `VITE_API_URL=http://<ec2-public-dns>:5000` and rebuild, or use the nginx setup below.

## Folder structure

```
src/
  api/
    index.js        picks real or mock API based on VITE_USE_MOCK
    realApi.js      ALL calls to the Express backend (edit here if routes change)
    mockApi.js      in-browser fake backend for development / demo backup
  context/AuthContext.jsx   logged-in user, login(), register(), logout()
  components/       Navbar, ProtectedRoute, PhotoCard, SearchBar, FilterBar, CommentSection
  pages/            LoginPage, RegisterPage, FeedPage, UploadPage, PhotoPage
  utils/filterPhotos.js     reference search/filter logic (used by the mock), tag parsing, "2h ago"
  styles.css
```

## API contract (for Student 1, Backend Lead)

Routes marked 🔒 need `Authorization: Bearer <JWT>`.
Errors should return JSON `{ "message": "..." }` with a 4xx/5xx status; the message is shown to the user.

| Method | Path | Body / query | Returns |
|---|---|---|---|
| POST | `/api/auth/register` | `{ username, email, password }` | `{ token, user: { id, username, email } }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| GET | `/api/auth/me` 🔒 | none | `{ user }` |
| GET | `/api/photos` 🔒 | query (all optional): `search`, `userId`, `tag`, `period` (`today`/`week`/`month`), `sort` (`newest`/`oldest`/`most_commented`/`title`) | `[ photo ]` |
| GET | `/api/photos/:id` 🔒 | none | `photo` |
| POST | `/api/photos` 🔒 | `multipart/form-data`: `image` (file), `title`, `description`, `tags` (`"sunset,beach"`) | `photo` |
| DELETE | `/api/photos/:id` 🔒 | owner only | `{ message }` |
| GET | `/api/photos/:id/comments` 🔒 | none | `[ comment ]` (oldest first) |
| POST | `/api/photos/:id/comments` 🔒 | `{ text }` | `comment` |
| PUT | `/api/comments/:id` 🔒 | `{ text }`. Comment author only. | `comment` (with `updated_at`) |
| DELETE | `/api/comments/:id` 🔒 | Comment author **or** the photo's owner | `{ message }` |
| GET | `/api/users` 🔒 *(optional)* | none | `[ { id, username } ]` |
| GET | `/api/tags` 🔒 *(optional)* | none | `[ { name, count } ]` (most used first) |

**photo**: `{ id, user_id, username, title, description, image_url, tags: ["sunset","beach"], created_at, comment_count }`
**comment**: `{ id, photo_id, user_id, username, text, created_at, updated_at }`

**The frontend does not filter photos itself. `GET /api/photos` must apply the query params.**
The `search` term should match title, description, uploader username, tag names **and comment text**.
Suggested SQL:

```sql
SELECT p.*, u.username,
       (SELECT COUNT(*) FROM comments c WHERE c.photo_id = p.id) AS comment_count,
       (SELECT GROUP_CONCAT(t.name) FROM photo_tags pt JOIN tags t ON t.id = pt.tag_id
         WHERE pt.photo_id = p.id) AS tags            -- split on ',' before sending
FROM photos p JOIN users u ON u.id = p.user_id
WHERE (? IS NULL OR p.title LIKE ? OR p.description LIKE ? OR u.username LIKE ?
       OR EXISTS (SELECT 1 FROM comments c WHERE c.photo_id = p.id AND c.text LIKE ?)
       OR EXISTS (SELECT 1 FROM photo_tags pt JOIN tags t ON t.id = pt.tag_id
                  WHERE pt.photo_id = p.id AND t.name LIKE ?))
  AND (? IS NULL OR p.user_id = ?)
  AND (? IS NULL OR EXISTS (SELECT 1 FROM photo_tags pt JOIN tags t ON t.id = pt.tag_id
                            WHERE pt.photo_id = p.id AND t.name = ?))
  AND (? IS NULL OR p.created_at >= NOW() - INTERVAL ? DAY)
ORDER BY p.created_at DESC;   -- switch on ?sort=
```

Suggested tables for tags (in addition to `users`, `photos`, `comments`):

```sql
CREATE TABLE tags       (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(30) UNIQUE NOT NULL);
CREATE TABLE photo_tags (photo_id INT NOT NULL, tag_id INT NOT NULL,
                         PRIMARY KEY (photo_id, tag_id),
                         FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
                         FOREIGN KEY (tag_id)   REFERENCES tags(id));
ALTER TABLE comments ADD COLUMN updated_at DATETIME NULL;
```

Other backend notes:
- Upload field name is `image`: use `upload.single('image')` with multer / multer-s3.
- Tags arrive lowercase, max 5, letters/numbers/`-`/`_` only (the frontend cleans them), but check them again on the server.
- If `/api/users` or `/api/tags` is missing, the frontend builds those lists from the feed instead.
- Enable CORS for the frontend's origin in production: `app.use(cors({ origin: '<frontend url>' }))`.

## Multi-user demo / testing tips (for the video and report section 6)

1. Open the deployed site in two browsers (or a normal and an incognito window) and log in as two users.
2. User B uploads a photo with tags. Within 15 s, user A's feed shows **"↑ 1 new photo from friends"**.
3. User A comments on it. The comment appears on user B's screen within 10 s, without a refresh.
4. User B (the photo owner) deletes A's comment. User A edits a comment on another photo, and it shows "edited".
5. Search a word that only appears in a comment, then click a tag chip and use the uploader and date filters.

## Build & deploy (with Student 3, AWS)

```bash
VITE_USE_MOCK=false VITE_API_URL=http://<ec2-public-dns>:5000 npm run build
# output: dist/
```

**Option A: S3 static website hosting**
1. Create a bucket (separate from the photo bucket), enable *Static website hosting*,
   index document `index.html`, **error document `index.html`** (needed so routes like `/photos/3` work).
2. Allow public read with a bucket policy, then `aws s3 sync dist/ s3://<bucket-name> --delete`.

**Option B: Same EC2 as the backend (nginx)**
```nginx
server {
  listen 80;
  root /var/www/snapshare/dist;
  location /api/ { proxy_pass http://localhost:5000; client_max_body_size 10M; }
  location / { try_files $uri /index.html; }
}
```
With option B, leave `VITE_API_URL` empty: the browser calls `/api` on the same host and you avoid CORS.

## Submission

The brief asks for source code **without build artifacts**: zip the project **without `node_modules/` and `dist/`**.
