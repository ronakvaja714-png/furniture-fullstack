/**
 * FurniHaven - Full Stack (User + Admin + Profile + Orders Map)
 * Pure Node.js + SQLite (no npm packages needed)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DB_PATH = path.join(__dirname, '..', 'database', 'furnihaven.db');

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

// ========== SCHEMA ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    old_price REAL,
    image TEXT,
    badge TEXT,
    description TEXT,
    stock INTEGER DEFAULT 50,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    pincode TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    address TEXT,
    city TEXT,
    pincode TEXT,
    lat REAL,
    lng REAL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed products
const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
if (productCount === 0) {
  const insert = db.prepare('INSERT INTO products (name, category, price, old_price, image, badge, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const products = [
    ["Modern Velvet Sofa", "living", 45999, 52999, "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&h=400&fit=crop", "Sale", "Luxurious 3-seater velvet sofa.", 25],
    ["Oak Dining Table", "dining", 32999, null, "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=500&h=400&fit=crop", null, "Solid oak dining table seating 6.", 18],
    ["King Size Platform Bed", "bedroom", 38999, 44999, "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&h=400&fit=crop", "Sale", "Minimalist platform bed with storage.", 15],
    ["Executive Office Desk", "office", 24999, null, "https://images.unsplash.com/photo-1518455027359-f3f8164ba9c7?w=500&h=400&fit=crop", "New", "Spacious executive desk, walnut finish.", 30],
    ["Accent Armchair", "living", 18999, 21999, "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=500&h=400&fit=crop", "Sale", "Comfortable accent chair.", 40],
    ["Wardrobe with Mirror", "bedroom", 42999, null, "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=500&h=400&fit=crop", null, "3-door wardrobe with mirror.", 12],
    ["Marble Coffee Table", "living", 15999, 18999, "https://images.unsplash.com/photo-1533090481720-8568742a6e54?w=500&h=400&fit=crop", "Sale", "Marble top coffee table.", 22],
    ["Dining Chair Set (4)", "dining", 21999, null, "https://images.unsplash.com/photo-1503602642458-232111445657?w=500&h=400&fit=crop", "New", "Set of 4 dining chairs.", 20],
    ["Bookshelf Unit", "office", 17999, 20999, "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=500&h=400&fit=crop", "Sale", "Tall open bookshelf.", 28],
    ["Nightstand Pair", "bedroom", 12999, null, "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&h=400&fit=crop", null, "Pair of nightstands with USB.", 35],
    ["Recliner Lounge Chair", "living", 34999, 39999, "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&h=400&fit=crop", "Sale", "Premium power recliner.", 10],
    ["Extendable Dining Set", "dining", 54999, null, "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?w=500&h=400&fit=crop", "Premium", "Extendable table + 6 chairs.", 8]
  ];
  for (const p of products) insert.run(...p);
  console.log('✅ Seeded products');
}

// Seed default admin if not exists
const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get('admin@furnihaven.in');
if (!adminExists) {
  const hash = hashPassword('admin123');
  db.prepare('INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)').run(
    'Admin', 'admin@furnihaven.in', hash, '9876543210', 'admin'
  );
  console.log('✅ Default admin created: admin@furnihaven.in / admin123');
}

// ========== HELPERS ==========
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const hashVerify = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === hashVerify;
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getUserFromToken(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
  if (!session) return null;
  return db.prepare('SELECT id, name, email, phone, address, city, pincode, role, created_at FROM users WHERE id = ?').get(session.user_id);
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function getMime(ext) {
  const m = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  return m[ext] || 'application/octet-stream';
}

function serveStatic(req, res, urlPath) {
  let filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (fs.existsSync(filePath + '.html')) filePath += '.html';
    else if (urlPath.startsWith('/admin')) filePath = path.join(PUBLIC_DIR, 'admin', 'index.html');
    else filePath = path.join(PUBLIC_DIR, 'index.html');
  }
  if (!fs.existsSync(filePath)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': getMime(path.extname(filePath)) });
  fs.createReadStream(filePath).pipe(res);
}

// Simple city → approx lat/lng (India major cities) for map demo
const CITY_COORDS = {
  'ahmedabad': [23.0225, 72.5714], 'surat': [21.1702, 72.8311], 'vadodara': [22.3072, 73.1812],
  'rajkot': [22.3039, 70.8022], 'mumbai': [19.0760, 72.8777], 'delhi': [28.6139, 77.2090],
  'bangalore': [12.9716, 77.5946], 'bengaluru': [12.9716, 77.5946], 'hyderabad': [17.3850, 78.4867],
  'chennai': [13.0827, 80.2707], 'kolkata': [22.5726, 88.3639], 'pune': [18.5204, 73.8567],
  'jaipur': [26.9124, 75.7873], 'lucknow': [26.8467, 80.9462], 'indore': [22.7196, 75.8577],
  'nagpur': [21.1458, 79.0882], 'bhopal': [23.2599, 77.4126], 'patna': [25.5941, 85.1376],
  'chandigarh': [30.7333, 76.7794], 'gandhinagar': [23.2156, 72.6369]
};

function approxCoords(city, pincode) {
  if (!city) return { lat: 23.0225, lng: 72.5714 }; // default Ahmedabad
  const key = city.toLowerCase().trim();
  if (CITY_COORDS[key]) return { lat: CITY_COORDS[key][0], lng: CITY_COORDS[key][1] };
  // slight random offset so multiple orders in same city don't stack perfectly
  return { lat: 23.0225 + (Math.random() - 0.5) * 0.1, lng: 72.5714 + (Math.random() - 0.5) * 0.1 };
}

// ========== SERVER ==========
const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, 'http://localhost:' + PORT);
  const pathname = parsed.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  try {
    // ---- AUTH ----
    if (pathname === '/api/register' && method === 'POST') {
      const body = await parseBody(req);
      const { name, email, password, phone } = body;
      if (!name || !email || !password) return sendJSON(res, 400, { success: false, message: 'Name, email, password required' });
      if (password.length < 6) return sendJSON(res, 400, { success: false, message: 'Password min 6 characters' });
      const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
      if (exists) return sendJSON(res, 400, { success: false, message: 'Email already registered' });
      const hash = hashPassword(password);
      const result = db.prepare('INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)').run(
        name, email.toLowerCase(), hash, phone || null, 'user'
      );
      const token = createToken();
      db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, result.lastInsertRowid);
      const user = db.prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?').get(result.lastInsertRowid);
      return sendJSON(res, 201, { success: true, token, user });
    }

    if (pathname === '/api/login' && method === 'POST') {
      const body = await parseBody(req);
      const { email, password } = body;
      if (!email || !password) return sendJSON(res, 400, { success: false, message: 'Email and password required' });
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
      if (!user || !verifyPassword(password, user.password_hash)) {
        return sendJSON(res, 401, { success: false, message: 'Invalid email or password' });
      }
      const token = createToken();
      db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);
      return sendJSON(res, 200, {
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
      });
    }

    if (pathname === '/api/logout' && method === 'POST') {
      const auth = req.headers['authorization'] || '';
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
      if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return sendJSON(res, 200, { success: true, message: 'Logged out' });
    }

    if (pathname === '/api/me' && method === 'GET') {
      const user = getUserFromToken(req);
      if (!user) return sendJSON(res, 401, { success: false, message: 'Not logged in' });
      return sendJSON(res, 200, { success: true, user });
    }

    if (pathname === '/api/profile' && method === 'PUT') {
      const user = getUserFromToken(req);
      if (!user) return sendJSON(res, 401, { success: false, message: 'Not logged in' });
      const body = await parseBody(req);
      const { name, phone, address, city, pincode } = body;
      db.prepare('UPDATE users SET name = ?, phone = ?, address = ?, city = ?, pincode = ? WHERE id = ?').run(
        name || user.name, phone || null, address || null, city || null, pincode || null, user.id
      );
      const updated = db.prepare('SELECT id, name, email, phone, address, city, pincode, role FROM users WHERE id = ?').get(user.id);
      return sendJSON(res, 200, { success: true, user: updated });
    }

    // ---- PRODUCTS ----
    if (pathname === '/api/products' && method === 'GET') {
      const category = parsed.searchParams.get('category');
      let rows = category
        ? db.prepare('SELECT * FROM products WHERE category = ? ORDER BY id').all(category)
        : db.prepare('SELECT * FROM products ORDER BY id').all();
      const products = rows.map(p => ({
        id: p.id, name: p.name, category: p.category, price: p.price,
        oldPrice: p.old_price, image: p.image, badge: p.badge,
        description: p.description, stock: p.stock
      }));
      return sendJSON(res, 200, { success: true, data: products });
    }

    if (pathname.startsWith('/api/products/') && method === 'GET') {
      const id = pathname.split('/').pop();
      const p = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!p) return sendJSON(res, 404, { success: false, message: 'Not found' });
      return sendJSON(res, 200, {
        success: true,
        data: { id: p.id, name: p.name, category: p.category, price: p.price, oldPrice: p.old_price, image: p.image, badge: p.badge, description: p.description, stock: p.stock }
      });
    }

    // ---- ORDERS ----
    if (pathname === '/api/orders' && method === 'POST') {
      const body = await parseBody(req);
      const { customer_name, customer_email, customer_phone, address, city, pincode, items } = body;
      if (!customer_name || !customer_email || !items || !items.length) {
        return sendJSON(res, 400, { success: false, message: 'Missing required fields' });
      }
      const user = getUserFromToken(req); // optional login

      let total = 0;
      for (const item of items) {
        const product = db.prepare('SELECT price, stock, name FROM products WHERE id = ?').get(item.product_id);
        if (!product) return sendJSON(res, 400, { success: false, message: 'Product not found' });
        if (product.stock < item.quantity) return sendJSON(res, 400, { success: false, message: 'Insufficient stock: ' + product.name });
        total += product.price * item.quantity;
      }

      const coords = approxCoords(city, pincode);
      const orderResult = db.prepare(`
        INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, address, city, pincode, lat, lng, total_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user ? user.id : null,
        customer_name, customer_email, customer_phone || null,
        address || null, city || null, pincode || null,
        coords.lat, coords.lng, total
      );
      const orderId = orderResult.lastInsertRowid;
      const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)');
      const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
      for (const item of items) {
        const product = db.prepare('SELECT name, price FROM products WHERE id = ?').get(item.product_id);
        insertItem.run(orderId, item.product_id, product.name, product.price, item.quantity);
        updateStock.run(item.quantity, item.product_id);
      }
      return sendJSON(res, 201, { success: true, message: 'Order placed!', orderId, total });
    }

    // User's own orders
    if (pathname === '/api/my-orders' && method === 'GET') {
      const user = getUserFromToken(req);
      if (!user) return sendJSON(res, 401, { success: false, message: 'Login required' });
      const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? OR customer_email = ? ORDER BY created_at DESC').all(user.id, user.email);
      return sendJSON(res, 200, { success: true, data: orders });
    }

    // Admin: all orders
    if (pathname === '/api/admin/orders' && method === 'GET') {
      const user = getUserFromToken(req);
      if (!user || user.role !== 'admin') return sendJSON(res, 403, { success: false, message: 'Admin only' });
      const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
      return sendJSON(res, 200, { success: true, data: orders });
    }

    if (pathname.startsWith('/api/admin/orders/') && method === 'GET') {
      const user = getUserFromToken(req);
      if (!user || user.role !== 'admin') return sendJSON(res, 403, { success: false, message: 'Admin only' });
      const id = pathname.split('/').pop();
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
      if (!order) return sendJSON(res, 404, { success: false, message: 'Order not found' });
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
      return sendJSON(res, 200, { success: true, data: { ...order, items } });
    }

    if (pathname.startsWith('/api/admin/orders/') && method === 'PUT') {
      const user = getUserFromToken(req);
      if (!user || user.role !== 'admin') return sendJSON(res, 403, { success: false, message: 'Admin only' });
      const id = pathname.split('/').pop();
      const body = await parseBody(req);
      if (body.status) {
        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(body.status, id);
      }
      return sendJSON(res, 200, { success: true, message: 'Updated' });
    }

    // Admin: users list
    if (pathname === '/api/admin/users' && method === 'GET') {
      const user = getUserFromToken(req);
      if (!user || user.role !== 'admin') return sendJSON(res, 403, { success: false, message: 'Admin only' });
      const users = db.prepare('SELECT id, name, email, phone, city, role, created_at FROM users ORDER BY created_at DESC').all();
      return sendJSON(res, 200, { success: true, data: users });
    }

    // Admin dashboard stats
    if (pathname === '/api/admin/stats' && method === 'GET') {
      const user = getUserFromToken(req);
      if (!user || user.role !== 'admin') return sendJSON(res, 403, { success: false, message: 'Admin only' });
      const stats = {
        products: db.prepare('SELECT COUNT(*) as c FROM products').get().c,
        orders: db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
        users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
        revenue: db.prepare('SELECT COALESCE(SUM(total_amount),0) as s FROM orders').get().s,
        pending: db.prepare("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'").get().c
      };
      return sendJSON(res, 200, { success: true, data: stats });
    }

    // Contact
    if (pathname === '/api/contact' && method === 'POST') {
      const body = await parseBody(req);
      const { name, email, phone, subject, message } = body;
      if (!name || !email || !message) return sendJSON(res, 400, { success: false, message: 'Required fields missing' });
      const r = db.prepare('INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)').run(
        name, email, phone || null, subject || null, message
      );
      return sendJSON(res, 201, { success: true, message: 'Sent!', id: r.lastInsertRowid });
    }

    if (pathname === '/api/health') {
      return sendJSON(res, 200, { success: true, message: 'FurniHaven API running', time: new Date().toISOString() });
    }

    // Static
    if (!pathname.startsWith('/api')) {
      return serveStatic(req, res, pathname);
    }

    sendJSON(res, 404, { success: false, message: 'API not found' });
  } catch (err) {
    console.error(err);
    sendJSON(res, 500, { success: false, message: 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('🚀 FurniHaven Server: http://localhost:' + PORT);
  console.log('👤 User site : http://localhost:' + PORT);
  console.log('🔑 Admin     : http://localhost:' + PORT + '/admin/');
  console.log('   Login     : admin@furnihaven.in / admin123');
  console.log('');
});
