'use strict';

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const ROOT = __dirname;
const DATA_FILE = process.env.CV_DATA_FILE || path.join(ROOT, 'data', 'db.json');
const UPLOAD_DIR = process.env.CV_UPLOAD_DIR || path.join(ROOT, 'uploads');
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY = 24 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon'
};

let writeChain = Promise.resolve();

async function readDb() {
  const raw = await fsp.readFile(DATA_FILE, 'utf8');
  const db = JSON.parse(raw);
  // Keep existing installations' accounts and orders while updating this catalogue asset.
  const goldId = 'v9-02-crownvault-solaris-gold-diver';
  const oldImage = 'assets/images/v9/v9-02.jpeg';
  const newImage = 'assets/images/products/solaris-gold-v12.png';
  const watch = db.watches.find(item => item.id === goldId);
  if (watch?.image === oldImage) watch.image = newImage;
  for (const order of db.orders || []) {
    for (const item of order.items || []) {
      if (item.watchId === goldId && item.image === oldImage) item.image = newImage;
    }
  }
  return db;
}

async function writeDb(db) {
  writeChain = writeChain.catch(() => {}).then(async () => {
    const temp = `${DATA_FILE}.tmp`;
    await fsp.writeFile(temp, JSON.stringify(db, null, 2));
    await fsp.rename(temp, DATA_FILE);
  });
  return writeChain;
}

// Serializes every API request so a request's read-db -> modify -> write-db cycle can
// never interleave with another request's cycle (e.g. two tabs adding to cart at once).
// Without this, the second request could read stale data and silently overwrite the
// first request's change when it writes back.
let requestChain = Promise.resolve();
function runSerialized(task) {
  const result = requestChain.then(task, task);
  requestChain = result.then(() => {}, () => {});
  return result;
}

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, item) => {
    const idx = item.indexOf('=');
    if (idx === -1) return acc;
    const key = item.slice(0, idx).trim();
    let value; try { value = decodeURIComponent(item.slice(idx + 1).trim()); } catch { return acc; }
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function randomId(prefix = '') {
  return `${prefix}${crypto.randomBytes(10).toString('hex')}`;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, passwordSalt, ...safe } = user;
  return safe;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  const { hash } = hashPassword(password, user.passwordSalt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(user.passwordHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function getBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        const body = JSON.parse(raw);
        if (!body || typeof body !== 'object' || Array.isArray(body)) return reject(Object.assign(new Error('Expected a JSON object'), { statusCode: 400 }));
        resolve(body);
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function sessionUser(req, db) {
  const token = parseCookies(req).cv_session;
  if (!token) return null;
  const session = (db.sessions || []).find(s => s.token === token && new Date(s.expiresAt) > new Date());
  if (!session) return null;
  return db.users.find(u => u.id === session.userId) || null;
}

function requireUser(req, res, db) {
  const user = sessionUser(req, db);
  if (!user) {
    sendJson(res, 401, { error: 'Please sign in to continue.' });
    return null;
  }
  return user;
}

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

// Returns { path } on success or { error } on failure, instead of silently returning
// null, so the caller can tell the seller exactly which photo failed and why rather
// than just publishing a listing with fewer images than they selected.
function saveDataImage(dataUrl) {
  const match = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(String(dataUrl || ''));
  if (!match) return { error: 'Unsupported image format.' };
  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const buffer = Buffer.from(match[2], 'base64');
  const valid = ext === 'png' ? buffer.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')) : ext === 'webp' ? buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP' : buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (!valid) return { error: 'Image content does not match its format.' };
  if (buffer.length > 3 * 1024 * 1024) return { error: 'Image is larger than 3MB.' };
  const name = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, name);
  fs.writeFileSync(filePath, buffer);
  return { path: `/uploads/${name}` };
}

function cleanText(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function watchMatches(watch, query) {
  const haystack = [watch.brand, watch.model, watch.reference, watch.category, watch.condition, watch.movement, watch.segment, watch.dial, watch.strap]
    .join(' ')
    .toLowerCase();
  return haystack.includes(String(query || '').trim().toLowerCase());
}

async function handleApi(req, res, url) {
  const db = await readDb();
  db.sessions = (db.sessions || []).filter(s => new Date(s.expiresAt) > new Date());
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, version: '14.0.0' });
  }

  if (req.method === 'GET' && pathname === '/api/watches') {
    let watches = [...db.watches];
    const search = url.searchParams.get('search');
    const brand = url.searchParams.get('brand');
    const condition = url.searchParams.get('condition');
    const segment = url.searchParams.get('segment');
    const source = url.searchParams.get('source');
    const includeSold = url.searchParams.get('includeSold') === 'true';
    const preOwned = url.searchParams.get('preowned');
    const featured = url.searchParams.get('featured');
    const sort = url.searchParams.get('sort') || 'featured';

    if (search) watches = watches.filter(w => watchMatches(w, search));
    if (brand && brand !== 'all') watches = watches.filter(w => w.brand === brand);
    if (condition && condition !== 'all') watches = watches.filter(w => w.condition === condition);
    if (!includeSold) watches = watches.filter(w => w.available !== false);
    if (segment && segment !== 'all') watches = watches.filter(w => w.segment === segment);
    if (source && source !== 'all') watches = watches.filter(w => (w.source || 'catalog') === source);
    if (preOwned === 'true') watches = watches.filter(w => w.preOwned);
    if (preOwned === 'false') watches = watches.filter(w => !w.preOwned);
    if (featured === 'true') watches = watches.filter(w => w.featured);

    if (sort === 'price-asc') watches.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') watches.sort((a, b) => b.price - a.price);
    else if (sort === 'year-desc') watches.sort((a, b) => b.year - a.year);
    else watches.sort((a, b) => Number(b.featured) - Number(a.featured));

    const brands = [...new Set(db.watches.filter(w => w.available !== false).map(w => w.brand))].sort();
    return sendJson(res, 200, { watches, brands });
  }

  const watchMatch = /^\/api\/watches\/([^/]+)$/.exec(pathname);
  if (req.method === 'GET' && watchMatch) {
    const watch = db.watches.find(w => w.id === decodeURIComponent(watchMatch[1]));
    if (!watch) return sendJson(res, 404, { error: 'Watch not found.' });
    return sendJson(res, 200, { watch });
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const body = await getBody(req);
    const name = cleanText(body.name, 80);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    if (name.length < 2 || !email.includes('@') || password.length < 10 || password.length > 128) {
      return sendJson(res, 400, { error: 'Enter a valid name, email and password of 10–128 characters.' });
    }
    if (db.users.some(u => u.email === email)) {
      return sendJson(res, 409, { error: 'An account with this email already exists.' });
    }
    const { salt, hash } = hashPassword(password);
    const user = {
      id: randomId('usr_'), name, email,
      passwordSalt: salt, passwordHash: hash,
      role: 'member', createdAt: new Date().toISOString()
    };
    db.users.push(user);
    const token = randomId('sess_');
    db.sessions.push({ token, userId: user.id, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
    await writeDb(db);
    return sendJson(res, 201, { user: publicUser(user) }, {
      'Set-Cookie': `cv_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    });
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await getBody(req);
    const email = normalizeEmail(body.email);
    if (typeof body.password !== 'string' || body.password.length > 128) return sendJson(res, 400, { error: 'Invalid credentials.' });
    const user = db.users.find(u => u.email === email);
    if (!user || !verifyPassword(body.password, user)) {
      return sendJson(res, 401, { error: 'Incorrect email or password.' });
    }
    const token = randomId('sess_');
    db.sessions.push({ token, userId: user.id, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() });
    await writeDb(db);
    return sendJson(res, 200, { user: publicUser(user) }, {
      'Set-Cookie': `cv_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    });
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = parseCookies(req).cv_session;
    if (token) db.sessions = db.sessions.filter(s => s.token !== token);
    await writeDb(db);
    return sendJson(res, 200, { ok: true }, {
      'Set-Cookie': 'cv_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'
    });
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const user = sessionUser(req, db);
    return sendJson(res, 200, { user: publicUser(user) });
  }

  if (pathname === '/api/wishlist') {
    const user = requireUser(req, res, db); if (!user) return;
    const userItems = db.wishlists.filter(x => x.userId === user.id);
    if (req.method === 'GET') {
      const watches = userItems.map(x => db.watches.find(w => w.id === x.watchId)).filter(Boolean);
      return sendJson(res, 200, { watches });
    }
    if (req.method === 'POST') {
      const body = await getBody(req);
      const watch = db.watches.find(w => w.id === body.watchId);
      if (!watch) return sendJson(res, 404, { error: 'Watch not found.' });
      if (!db.wishlists.some(x => x.userId === user.id && x.watchId === watch.id)) {
        db.wishlists.push({ userId: user.id, watchId: watch.id, createdAt: new Date().toISOString() });
        await writeDb(db);
      }
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      const body = await getBody(req);
      db.wishlists = db.wishlists.filter(x => !(x.userId === user.id && x.watchId === body.watchId));
      await writeDb(db);
      return sendJson(res, 200, { ok: true });
    }
  }

  if (pathname === '/api/compare') {
    const user = requireUser(req, res, db); if (!user) return;
    if (req.method === 'GET') {
      const rows = db.compare.filter(x => x.userId === user.id);
      const watches = rows.map(x => db.watches.find(w => w.id === x.watchId)).filter(Boolean);
      return sendJson(res, 200, { watches });
    }
    if (req.method === 'POST') {
      const body = await getBody(req);
      const watch = db.watches.find(w => w.id === body.watchId);
      if (!watch) return sendJson(res, 404, { error: 'Watch not found.' });
      const rows = db.compare.filter(x => x.userId === user.id);
      if (rows.length >= 3 && !rows.some(x => x.watchId === watch.id)) {
        return sendJson(res, 400, { error: 'You can compare up to 3 watches.' });
      }
      if (!db.compare.some(x => x.userId === user.id && x.watchId === watch.id)) {
        db.compare.push({ userId: user.id, watchId: watch.id });
        await writeDb(db);
      }
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      const body = await getBody(req);
      db.compare = db.compare.filter(x => !(x.userId === user.id && x.watchId === body.watchId));
      await writeDb(db);
      return sendJson(res, 200, { ok: true });
    }
  }

  if (pathname === '/api/buy-now' && req.method === 'POST') {
    const user = requireUser(req, res, db); if (!user) return;
    const body = await getBody(req);
    const watch = db.watches.find(w => w.id === body.watchId);
    if (!watch) return sendJson(res, 404, { error: 'Watch not found.' });
    if (watch.available === false) return sendJson(res, 409, { error: 'This watch is no longer available.' });
    db.cart = db.cart.filter(x => x.userId !== user.id);
    db.cart.push({ userId: user.id, watchId: watch.id, quantity: 1 });
    await writeDb(db);
    return sendJson(res, 200, { ok: true, watchId: watch.id });
  }

  if (pathname === '/api/cart') {
    const user = requireUser(req, res, db); if (!user) return;
    if (req.method === 'GET') {
      const rows = db.cart.filter(x => x.userId === user.id);
      const items = rows.map(x => ({ ...x, watch: db.watches.find(w => w.id === x.watchId) })).filter(x => x.watch);
      return sendJson(res, 200, { items });
    }
    if (req.method === 'POST') {
      const body = await getBody(req);
      const watch = db.watches.find(w => w.id === body.watchId);
      if (!watch) return sendJson(res, 404, { error: 'Watch not found.' });
      if (watch.available === false) return sendJson(res, 409, { error: 'This watch is no longer available.' });
      if (!db.cart.some(x => x.userId === user.id && x.watchId === watch.id)) {
        db.cart.push({ userId: user.id, watchId: watch.id, quantity: 1 });
        await writeDb(db);
      }
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      const body = await getBody(req);
      db.cart = db.cart.filter(x => !(x.userId === user.id && x.watchId === body.watchId));
      await writeDb(db);
      return sendJson(res, 200, { ok: true });
    }
  }

  if (pathname === '/api/orders') {
    const user = requireUser(req, res, db); if (!user) return;
    if (req.method === 'GET') {
      const orders = db.orders.filter(o => o.userId === user.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      return sendJson(res, 200, { orders });
    }
    if (req.method === 'POST') {
      const body = await getBody(req);
      const key = cleanText(req.headers['idempotency-key'], 100);
      if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key)) return sendJson(res, 400, { error: 'A valid idempotency key is required.' });
      const fingerprint = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
      const existing = db.orders.find(o => o.userId === user.id && o.idempotencyKey === key);
      if (existing) return existing.fingerprint === fingerprint ? sendJson(res, 200, { order: existing }) : sendJson(res, 409, { error: 'This checkout key was already used with different details.' });
      const rows = db.cart.filter(x => x.userId === user.id);
      if (!rows.length) return sendJson(res, 400, { error: 'Your cart is empty.' });
      if (rows.some(row => !db.watches.some(w => w.id === row.watchId && w.available !== false))) return sendJson(res, 409, { error: 'A watch in your bag is no longer available. Remove it before checkout.' });
      const items = rows.map(row => {
        const watch = db.watches.find(w => w.id === row.watchId);
        return watch ? { watchId: watch.id, brand: watch.brand, model: watch.model, price: watch.price, image: watch.image } : null;
      }).filter(Boolean);
      const total = money(items.reduce((sum, item) => sum + item.price, 0));
      const order = {
        id: randomId('ord_'), userId: user.id, items, total,
        shipping: {
          name: cleanText(body.name, 100),
          email: normalizeEmail(body.email),
          address: cleanText(body.address, 220),
          city: cleanText(body.city, 100),
          country: cleanText(body.country, 100)
        },
        status: 'ORDER_PLACED', idempotencyKey: key, fingerprint,
        history: [{ status: 'ORDER_PLACED', at: new Date().toISOString(), actorId: user.id }],
        paymentMethod: 'Demo checkout',
        createdAt: new Date().toISOString()
      };
      if (!order.shipping.name || !order.shipping.email || !order.shipping.address || !order.shipping.city || !order.shipping.country || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.shipping.email)) {
        return sendJson(res, 400, { error: 'Complete the shipping details.' });
      }
      db.orders.push(order);
      const purchasedIds = new Set(items.map(item => item.watchId));
      db.watches.forEach(w => { if (purchasedIds.has(w.id)) { w.available = false; w.soldAt = new Date().toISOString(); } });
      db.cart = db.cart.filter(x => x.userId !== user.id);
      await writeDb(db);
      return sendJson(res, 201, { order });
    }
  }

  const orderRoute = /^\/api\/orders\/([^/]+)(\/status)?$/.exec(pathname);
  if (orderRoute) {
    const user = requireUser(req, res, db); if (!user) return;
    const order = db.orders.find(o => o.id === orderRoute[1]);
    if (!order || (order.userId !== user.id && user.role !== 'admin')) return sendJson(res, 404, { error: 'Order not found.' });
    if (req.method === 'GET' && !orderRoute[2]) return sendJson(res, 200, { order });
    if (req.method === 'PATCH' && orderRoute[2]) {
      if (user.role !== 'admin') return sendJson(res, 403, { error: 'Administrator access required.' });
      const body = await getBody(req);
      const transitions = { ORDER_PLACED: ['CONFIRMED','CANCELLED'], CONFIRMED: ['PREPARING','CANCELLED'], PREPARING: ['SHIPPED','CANCELLED'], SHIPPED: ['DELIVERED'], DELIVERED: [], CANCELLED: [] };
      const current = order.status === 'Payment Confirmed' ? 'ORDER_PLACED' : order.status;
      if (!(transitions[current] || []).includes(body.status)) return sendJson(res, 409, { error: 'Invalid order status transition.' });
      order.status = body.status;
      order.history ||= [{ status: current, at: order.createdAt }];
      order.history.push({ status: body.status, at: new Date().toISOString(), actorId: user.id });
      if (body.status === 'CANCELLED') for (const item of order.items) {
        const watch = db.watches.find(w => w.id === item.watchId);
        if (watch) { watch.available = true; delete watch.soldAt; }
      }
      await writeDb(db);
      return sendJson(res, 200, { order });
    }
  }
  if (pathname === '/api/admin/orders' && req.method === 'GET') {
    const user = requireUser(req, res, db); if (!user) return;
    if (user.role !== 'admin') return sendJson(res, 403, { error: 'Administrator access required.' });
    return sendJson(res, 200, { orders: [...db.orders].reverse() });
  }

  if (pathname === '/api/listings') {
    const user = requireUser(req, res, db); if (!user) return;
    if (req.method === 'GET') {
      const listings = db.listings.filter(x => x.userId === user.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      return sendJson(res, 200, { listings });
    }
    if (req.method === 'POST') {
      const body = await getBody(req);
      const listingYear = body.year === '' || body.year == null ? null : Number(body.year);
      if (!cleanText(body.brand) || !cleanText(body.model) || !cleanText(body.condition) || !Number.isFinite(Number(body.price)) || Number(body.price) <= 0 || Number(body.price) > 100000000 || (listingYear !== null && (!Number.isInteger(listingYear) || listingYear < 1800 || listingYear > new Date().getFullYear() + 1))) return sendJson(res, 400, { error: 'Enter valid watch details, year and price.' });
      if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 5) return sendJson(res, 400, { error: 'Upload 1–5 photos.' });
      const rawImages = Array.isArray(body.images) ? body.images.slice(0, 5).map(saveDataImage) : [];
      const images = rawImages.filter(x => x.path).map(x => x.path);
      const failedCount = rawImages.filter(x => x.error).length;
      if (failedCount) {
        images.forEach(image => fs.unlinkSync(path.join(UPLOAD_DIR, path.basename(image))));
        return sendJson(res, 400, { error: rawImages.find(x => x.error).error });
      }
      const listing = {
        id: randomId('lst_'), userId: user.id,
        brand: cleanText(body.brand, 80), model: cleanText(body.model, 100),
        reference: cleanText(body.reference, 80), year: listingYear,
        condition: cleanText(body.condition, 40), price: money(body.price),
        segment: cleanText(body.segment, 30) || "Men's", category: cleanText(body.category, 50) || 'Classic',
        movement: cleanText(body.movement, 80), caseMaterial: cleanText(body.caseMaterial, 80), caseSize: cleanText(body.caseSize, 40),
        dial: cleanText(body.dial, 80), strap: cleanText(body.strap, 80), waterResistance: cleanText(body.waterResistance, 60),
        boxPapers: cleanText(body.boxPapers, 60), serviceHistory: cleanText(body.serviceHistory, 400),
        notes: cleanText(body.notes, 800), description: cleanText(body.description, 700), images,
        status: 'Live', createdAt: new Date().toISOString()
      };
      if (!listing.brand || !listing.model || !listing.condition || listing.price <= 0) {
        return sendJson(res, 400, { error: 'Brand, model, condition and asking price are required.' });
      }
      if (!images.length) return sendJson(res, 400, { error: 'Add at least one clear photo of the watch.' });

      const watchId = randomId('seller_');
      listing.watchId = watchId;
      const watch = {
        id: watchId, brand: listing.brand, model: listing.model,
        reference: listing.reference || `CV-${watchId.slice(-6).toUpperCase()}`,
        year: listing.year, price: listing.price, condition: listing.condition,
        movement: listing.movement || 'Not specified', caseMaterial: listing.caseMaterial || 'Not specified',
        caseSize: listing.caseSize || 'Not specified', dial: listing.dial || 'Not specified',
        strap: listing.strap || 'Not specified', waterResistance: listing.waterResistance || 'Not specified',
        category: listing.category, segment: listing.segment, preOwned: true, featured: false, available: true,
        image: images[0], gallery: images, source: 'seller', sellerListingId: listing.id, sellerUserId: user.id,
        seller: user.name, boxPapers: listing.boxPapers || 'Not specified',
        authenticity: 'Seller submitted · CrownVault review pending', warranty: 'Seller terms',
        delivery: 'Insured delivery arranged at checkout',
        description: listing.description || listing.notes || `${listing.brand} ${listing.model}, listed by a CrownVault member.`,
        serviceHistory: listing.serviceHistory || '', conditionNotes: listing.notes || ''
      };
      db.listings.push(listing);
      db.watches.unshift(watch);
      await writeDb(db);
      return sendJson(res, 201, {
        listing, watch,
        warning: failedCount ? `${failedCount} photo${failedCount === 1 ? '' : 's'} could not be saved (over 3MB or unsupported format) and ${failedCount === 1 ? 'was' : 'were'} skipped.` : undefined
      });
    }
  }

  if (pathname === '/api/offers') {
    const user = requireUser(req, res, db); if (!user) return;
    if (req.method === 'GET') {
      const offers = db.offers.filter(o => o.userId === user.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      return sendJson(res, 200, { offers });
    }
    if (req.method === 'POST') {
      const body = await getBody(req);
      const watch = db.watches.find(w => w.id === body.watchId);
      const amount = money(body.amount);
      if (!watch || watch.available === false || !Number.isFinite(amount) || amount <= 0 || amount > 100000000) return sendJson(res, 400, { error: 'Enter a valid offer.' });
      const offer = { id: randomId('off_'), userId: user.id, watchId: watch.id, brand: watch.brand, model: watch.model, amount, status: 'Pending', createdAt: new Date().toISOString() };
      db.offers.push(offer);
      await writeDb(db);
      return sendJson(res, 201, { offer });
    }
  }

  if (pathname === '/api/contact' && req.method === 'POST') {
    const body = await getBody(req);
    const message = {
      id: randomId('msg_'), name: cleanText(body.name, 100), email: normalizeEmail(body.email),
      subject: cleanText(body.subject, 120), message: cleanText(body.message, 2000),
      createdAt: new Date().toISOString(), status: 'New'
    };
    if (!message.name || !message.email || !message.message) {
      return sendJson(res, 400, { error: 'Name, email and message are required.' });
    }
    db.messages.push(message);
    await writeDb(db);
    return sendJson(res, 201, { ok: true });
  }

  if (pathname === '/api/dashboard' && req.method === 'GET') {
    const user = requireUser(req, res, db); if (!user) return;
    const wishlistCount = db.wishlists.filter(x => x.userId === user.id).length;
    const compareCount = db.compare.filter(x => x.userId === user.id).length;
    const cartCount = db.cart.filter(x => x.userId === user.id).length;
    const listings = db.listings.filter(x => x.userId === user.id);
    const offers = db.offers.filter(x => x.userId === user.id);
    const orders = db.orders.filter(x => x.userId === user.id);
    return sendJson(res, 200, {
      user: publicUser(user), counts: { wishlistCount, compareCount, cartCount, listings: listings.length, offers: offers.length, orders: orders.length },
      listings: listings.slice(-5).reverse(), offers: offers.slice(-5).reverse(), orders: orders.slice(-5).reverse()
    });
  }

  return sendJson(res, 404, { error: 'API endpoint not found.' });
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  if (!(/^\/[a-z0-9-]+\.html$/i.test(pathname) || /^\/assets\/(css|js|images|video)\//.test(pathname) || /^\/uploads\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(pathname)) || pathname.includes('..')) { res.writeHead(404); return res.end('Not found'); }
  const safe = path.normalize(pathname).replace(/^([.][.][/\\])+/, '');
  let filePath = path.join(ROOT, safe);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  if (pathname.startsWith('/uploads/')) filePath = path.join(UPLOAD_DIR, path.basename(pathname));
  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (ext === '.html') headers['Cache-Control'] = 'no-cache';
    else headers['Cache-Control'] = 'public, max-age=3600';
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).on('error', () => res.destroy()).pipe(res);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const attempts = new Map();
setInterval(() => { const now = Date.now(); for (const [key,value] of attempts) if (value.until < now) attempts.delete(key); }, 60000).unref();
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      if (!['GET','HEAD'].includes(req.method)) {
        if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && req.headers.origin !== `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${req.headers.host}`)) return sendJson(res, 403, { error: 'Cross-origin request rejected.' });
        if (url.pathname.startsWith('/api/auth/')) {
          const key = req.socket.remoteAddress; const now = Date.now();
          const entry = attempts.get(key) || { count: 0, until: now + 60000 };
          if (entry.until < now) { entry.count = 0; entry.until = now + 60000; }
          entry.count++; attempts.set(key, entry);
          if (entry.count > 20) return sendJson(res, 429, { error: 'Too many attempts. Try again in a minute.' });
        }
      }
      // GET requests only read, so they can run concurrently. Anything that can mutate
      // the JSON store (POST/PUT/DELETE/etc.) is serialized to avoid the race above.
      if (req.method === 'GET') return await handleApi(req, res, url);
      return await runSerialized(() => handleApi(req, res, url));
    }
    return await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, error.statusCode || 500, { error: error.statusCode ? error.message : 'An unexpected server error occurred.' });
    else res.end();
  }
});

Promise.all([
  fsp.mkdir(path.dirname(DATA_FILE), { recursive: true }),
  fsp.mkdir(UPLOAD_DIR, { recursive: true })
]).then(() => {
  server.listen(PORT, process.env.HOST || '127.0.0.1', () => {
    console.log(`CrownVault running at http://localhost:${PORT}`);
  });
});
