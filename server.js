require('dotenv').config();
const express = require('express'), mongoose = require('mongoose'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { Product, Order, Admin } = require('./models');
if (!process.env.JWT_SECRET) { console.error('Set JWT_SECRET in .env'); process.exit(1); }

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static('public'));

const wrap = f => (req, res) => f(req, res).catch(e => {
  if (e.name === 'ValidationError' || e.name === 'CastError') return res.status(400).json({ error: e.message });
  console.error(e); res.status(500).json({ error: 'Something went wrong' });
});
const auth = (req, res, next) => {
  try { jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Please log in again' }); }
};
const pick = b => ({ name: b.name, category: b.category, price: Number(b.price), stock: Number(b.stock), description: b.description, image: b.image });

// ---- Storefront ----
app.get('/api/products', wrap(async (req, res) => res.json(await Product.find().sort('category name'))));

// Prices and totals always come from the database, never from the browser.
app.post('/api/orders', wrap(async (req, res) => {
  const { items, customer, paymentMethod } = req.body;
  const bad = msg => res.status(400).json({ error: msg });
  if (!Array.isArray(items) || !items.length) return bad('Your cart is empty');
  if (!customer?.name?.trim() || !/^\d{10}$/.test(customer.phone || '') || !customer.address?.trim()) return bad('Enter your name, a 10-digit phone number and your address');
  if (!['cod', 'upi', 'card'].includes(paymentMethod)) return bad('Choose a payment method');
  const done = [];
  const rollback = () => Promise.all(done.map(l => Product.updateOne({ _id: l.product }, { $inc: { stock: l.qty } })));
  for (const i of items) {
    const qty = Math.floor(Number(i.qty));
    const p = await Product.findById(i.id).catch(() => null);
    if (!p || !(qty >= 1)) { await rollback(); return bad('An item in your cart is no longer available'); }
    const r = await Product.updateOne({ _id: p._id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
    if (!r.modifiedCount) { await rollback(); return bad(`Not enough stock for ${p.name}`); }
    done.push({ product: p._id, name: p.name, price: p.price, qty });
  }
  const total = done.reduce((s, l) => s + l.price * l.qty, 0);
  const o = await Order.create({ items: done, customer: { name: customer.name.trim(), phone: customer.phone, address: customer.address.trim() }, total, paymentMethod });
  res.status(201).json({ orderId: o._id, total });
}));

// DEMO PAYMENT: marks UPI/card orders as paid without charging anyone.
// Before going live, replace with Razorpay/Stripe: create the payment on the server and verify its signature/webhook here.
app.post('/api/orders/:id/pay', wrap(async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (o.paymentMethod !== 'cod') { o.paymentStatus = 'paid'; await o.save(); }
  res.json({ orderId: o._id, paymentStatus: o.paymentStatus });
}));

// ---- Admin ----
app.post('/api/admin/login', wrap(async (req, res) => {
  const a = await Admin.findOne({ email: String(req.body.email || '').toLowerCase() });
  if (!a || !(await bcrypt.compare(String(req.body.password || ''), a.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect' });
  res.json({ token: jwt.sign({ id: a._id }, process.env.JWT_SECRET, { expiresIn: '8h' }) });
}));
app.get('/api/admin/orders', auth, wrap(async (req, res) => res.json(await Order.find().sort('-createdAt').limit(200))));
app.patch('/api/admin/orders/:id', auth, wrap(async (req, res) => res.json(await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true }))));
app.post('/api/admin/products', auth, wrap(async (req, res) => res.status(201).json(await Product.create(pick(req.body)))));
app.put('/api/admin/products/:id', auth, wrap(async (req, res) => res.json(await Product.findByIdAndUpdate(req.params.id, pick(req.body), { new: true, runValidators: true }))));
app.delete('/api/admin/products/:id', auth, wrap(async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));

const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/starpets')
  .then(() => app.listen(port, () => console.log(`Star Pets running at http://localhost:${port}`)))
  .catch(e => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
