const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const SALT = 'maktab20uychi1964';

// ─── File paths ───────────────────────────────────────────────
const FILES = {
  messages: path.join(__dirname, 'messages.json'),
  users: path.join(__dirname, 'users.json'),
  announcements: path.join(__dirname, 'announcements.json'),
};

// ─── In-memory sessions  { token -> { userId, role, name } } ──
const sessions = new Map();

// ─── Helpers ──────────────────────────────────────────────────
const hashPwd = pwd => crypto.createHash('sha256').update(pwd + SALT).digest('hex');
const mkToken = () => uuidv4() + '-' + uuidv4();

function read(file) {
  try {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return []; }
}
function write(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }

// ─── Role hierarchy ───────────────────────────────────────────
const ROLE_LEVEL = {
  superadmin: 100, principal: 80, co_principal: 60,
  moderator: 40, watcher: 20, teacher: 15, student: 5,
};
const ROLE_LABELS = {
  superadmin: 'Super Admin', principal: 'Direktor',
  co_principal: 'Ilmiy Mudir', moderator: 'Moderator',
  watcher: 'Kuzatuvchi', teacher: "O'qituvchi", student: "O'quvchi",
};

// ─── Seed ────────────────────────────────────────────────────
function seedUsers() {
  if (read(FILES.users).length > 0) return;
  const defaults = [
    { login: 'admin', password: 'Admin2024!', role: 'superadmin', name: 'Super Admin', class: null },
    { login: 'direktor', password: 'Direktor2024', role: 'principal', name: 'Nuritdinov Athamjon', class: null },
    { login: 'ilmiymudir', password: 'Ilmiy2024', role: 'co_principal', name: 'Ubaydullayeva Mashxura', class: null },
    { login: 'moderator', password: 'Moder2024', role: 'moderator', name: 'Moderator', class: null },
    { login: 'kuzatuvchi', password: 'Watch2024', role: 'watcher', name: 'Kuzatuvchi', class: null },
    { login: 'ustoz1', password: 'Ustoz2024', role: 'teacher', name: 'Rahimova Umida', class: '9-A' },
    { login: 'student001', password: 'Student2024', role: 'student', name: 'Ali Valiyev', class: '9-A' },
    { login: 'student002', password: 'Student2024', role: 'student', name: 'Mohira Karimova', class: '10-B' },
  ];
  write(FILES.users, defaults.map(u => ({
    id: uuidv4(), login: u.login, password: hashPwd(u.password),
    role: u.role, name: u.name, class: u.class,
    active: true, createdAt: new Date().toISOString(),
  })));
  console.log('✅ Standart foydalanuvchilar yaratildi.');
}

function seedAnnouncements() {
  if (read(FILES.announcements).length > 0) return;
  write(FILES.announcements, [{
    id: uuidv4(), title: "Yangi o'quv yiliga xush kelibsiz!",
    body: "2024-2025 o'quv yiliga xush kelibsiz! Barcha o'quvchilar va ota-onalarga omad tilaymiz.",
    role: 'superadmin', author: 'Super Admin', pinned: true,
    createdAt: new Date().toISOString(),
  }]);
}

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  const session = sessions.get(req.headers['x-token']);
  if (!session) return res.status(401).json({ success: false, message: 'Tizimga kiring.' });
  req.user = session;
  next();
}
function requireLevel(min) {
  return (req, res, next) => {
    if ((ROLE_LEVEL[req.user.role] || 0) < min)
      return res.status(403).json({ success: false, message: "Ruxsat yo'q." });
    next();
  };
}

// ═══ AUTH ════════════════════════════════════════════════════
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password)
    return res.status(400).json({ success: false, message: 'Login va parol kiriting.' });
  const users = read(FILES.users);
  const found = users.find(u => u.login === login.trim());
  // Blocked user with correct password → special response
  if (found && found.active === false && found.password === hashPwd(password))
    return res.status(403).json({
      success: false, blocked: true, name: found.name,
      message: "Hisobingiz bloklangan. Maktab ma'muriyati bilan bog'laning: +998 98 261 20 91"
    });
  const user = found;
  if (!user || user.password !== hashPwd(password))
    return res.status(401).json({ success: false, message: "Login yoki parol noto'g'ri." });
  const t = mkToken();
  sessions.set(t, {
    userId: user.id, login: user.login, role: user.role,
    name: user.name, class: user.class,
    roleLabel: ROLE_LABELS[user.role] || user.role,
  });
  console.log(`[${new Date().toLocaleString('uz-UZ')}] Kirdi: ${user.name} (${user.role})`);
  res.json({ success: true, token: t, user: { id: user.id, login: user.login, name: user.name, role: user.role, class: user.class, roleLabel: ROLE_LABELS[user.role] } });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  sessions.delete(req.headers['x-token']);
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ success: true, user: req.user }));

// ═══ USERS ═══════════════════════════════════════════════════
app.get('/api/users', requireAuth, requireLevel(40), (req, res) => {
  const users = read(FILES.users).map(u => ({ ...u, password: undefined }));
  res.json({ success: true, users });
});

app.post('/api/users', requireAuth, requireLevel(80), (req, res) => {
  const { login, password, role, name, classGroup } = req.body || {};
  if (!login || !password || !role || !name)
    return res.status(400).json({ success: false, message: 'Barcha maydonlarni to\'ldiring.' });
  if (ROLE_LEVEL[role] >= 80 && req.user.role !== 'superadmin')
    return res.status(403).json({ success: false, message: 'Bu rolni faqat Super Admin yarata oladi.' });
  const users = read(FILES.users);
  if (users.find(u => u.login === login.trim()))
    return res.status(400).json({ success: false, message: 'Bu login allaqachon band.' });
  const u = { id: uuidv4(), login: login.trim(), password: hashPwd(password), role, name: name.trim(), class: classGroup || null, active: true, createdAt: new Date().toISOString() };
  users.push(u);
  write(FILES.users, users);
  res.json({ success: true, message: 'Foydalanuvchi yaratildi.', user: { ...u, password: undefined } });
});

app.patch('/api/users/:id/password', requireAuth, requireLevel(80), (req, res) => {
  const { password } = req.body || {};
  if (!password || password.length < 6)
    return res.status(400).json({ success: false, message: 'Parol kamida 6 ta belgi.' });
  const users = read(FILES.users);
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Topilmadi.' });
  users[idx].password = hashPwd(password);
  write(FILES.users, users);
  res.json({ success: true, message: 'Parol yangilandi.' });
});

app.patch('/api/users/:id/toggle', requireAuth, requireLevel(80), (req, res) => {
  const users = read(FILES.users);
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Topilmadi.' });
  if (users[idx].role === 'superadmin')
    return res.status(403).json({ success: false, message: "Super Adminni o'zgartirish mumkin emas." });
  users[idx].active = !users[idx].active;
  write(FILES.users, users);
  res.json({ success: true, active: users[idx].active });
});

app.delete('/api/users/:id', requireAuth, requireLevel(100), (req, res) => {
  let users = read(FILES.users);
  const u = users.find(v => v.id === req.params.id);
  if (!u) return res.status(404).json({ success: false, message: 'Topilmadi.' });
  if (u.role === 'superadmin')
    return res.status(403).json({ success: false, message: "Super Adminni o'chirish mumkin emas." });
  write(FILES.users, users.filter(v => v.id !== req.params.id));
  res.json({ success: true });
});

// ═══ ANNOUNCEMENTS ═══════════════════════════════════════════
app.get('/api/announcements', (req, res) => {
  const list = read(FILES.announcements).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  res.json({ success: true, announcements: list });
});

app.post('/api/announcements', requireAuth, requireLevel(40), (req, res) => {
  const { title, body, pinned } = req.body || {};
  if (!title || !body)
    return res.status(400).json({ success: false, message: 'Sarlavha va matn kiriting.' });
  const ann = { id: uuidv4(), title: title.trim(), body: body.trim(), role: req.user.role, author: req.user.name, pinned: !!pinned, createdAt: new Date().toISOString() };
  const list = read(FILES.announcements);
  list.unshift(ann);
  write(FILES.announcements, list);
  res.json({ success: true, announcement: ann });
});

app.patch('/api/announcements/:id/pin', requireAuth, requireLevel(60), (req, res) => {
  const list = read(FILES.announcements);
  const idx = list.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Topilmadi.' });
  list[idx].pinned = !list[idx].pinned;
  write(FILES.announcements, list);
  res.json({ success: true, pinned: list[idx].pinned });
});

app.delete('/api/announcements/:id', requireAuth, requireLevel(40), (req, res) => {
  let list = read(FILES.announcements);
  const a = list.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ success: false, message: 'Topilmadi.' });
  if (ROLE_LEVEL[req.user.role] < 60 && a.author !== req.user.name)
    return res.status(403).json({ success: false, message: "Faqat o'z e'lonlaringizni o'chirishingiz mumkin." });
  write(FILES.announcements, list.filter(x => x.id !== req.params.id));
  res.json({ success: true });
});

// ═══ MESSAGES ════════════════════════════════════════════════
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body || {};
  const errs = [];
  if (!name || name.trim().length < 2) errs.push("Ism kamida 2 ta belgi.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push("Email noto'g'ri.");
  if (!message || message.trim().length < 5) errs.push("Xabar kamida 5 ta belgi.");
  if (errs.length) return res.status(400).json({ success: false, errors: errs });
  const msgs = read(FILES.messages);
  msgs.unshift({ id: uuidv4(), name: name.trim(), email: email.trim(), message: message.trim(), createdAt: new Date().toISOString(), read: false });
  write(FILES.messages, msgs);
  res.json({ success: true, message: 'Xabaringiz yuborildi!' });
});

app.get('/api/messages', requireAuth, requireLevel(40), (req, res) =>
  res.json({ success: true, messages: read(FILES.messages) }));

app.patch('/api/messages/:id/read', requireAuth, requireLevel(40), (req, res) => {
  const msgs = read(FILES.messages);
  const idx = msgs.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Topilmadi.' });
  msgs[idx].read = true;
  write(FILES.messages, msgs);
  res.json({ success: true });
});

app.delete('/api/messages/:id', requireAuth, requireLevel(60), (req, res) => {
  let msgs = read(FILES.messages);
  if (!msgs.find(m => m.id === req.params.id))
    return res.status(404).json({ success: false, message: 'Topilmadi.' });
  write(FILES.messages, msgs.filter(m => m.id !== req.params.id));
  res.json({ success: true });
});

// ═══ STATS ═══════════════════════════════════════════════════
app.get('/api/stats', (req, res) => {
  const users = read(FILES.users);
  const msgs = read(FILES.messages);
  const anns = read(FILES.announcements);
  res.json({
    success: true, stats: {
      students: users.filter(u => u.role === 'student').length,
      teachers: users.filter(u => u.role === 'teacher').length,
      totalUsers: users.length,
      messages: msgs.length,
      unread: msgs.filter(m => !m.read).length,
      announcements: anns.length,
      schoolStudents: 1424, staff: 95,
      founded: 1964, experience: new Date().getFullYear() - 1964,
    }
  });
});

// ═══ Pages ═══════════════════════════════════════════════════
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/student', (req, res) => res.sendFile(path.join(__dirname, 'public', 'student.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.use((req, res) => res.status(404).json({ success: false, message: 'Topilmadi.' }));

// ═══ Boot ════════════════════════════════════════════════════
seedUsers();
seedAnnouncements();
app.listen(PORT, () => {
  console.log(`\n🏫 20-sonli maktab serveri ishga tushdi!`);
  console.log(`🌐  http://localhost:${PORT}`);
  console.log(`🔑  /login  |  👨‍🎓 /student  |  ⚙️  /admin`);
  console.log(`\nLoginlar:`);
  console.log(`  admin / Admin2024!       → Super Admin`);
  console.log(`  direktor / Direktor2024  → Direktor`);
  console.log(`  ilmiymudir / Ilmiy2024   → Ilmiy Mudir`);
  console.log(`  moderator / Moder2024    → Moderator`);
  console.log(`  kuzatuvchi / Watch2024   → Kuzatuvchi`);
  console.log(`  ustoz1 / Ustoz2024       → O'qituvchi`);
  console.log(`  student001 / Student2024 → O'quvchi\n`);
});
