// require('dotenv').config();

// const express = require('express');
// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const path = require('path');

// const { Product, Order, Admin } = require('./models');

// // Customer accounts (used by login.html). Move this into models.js if you prefer.
// const { Schema, model, models } = mongoose;
// const User = models.User || model('User', new Schema({
//     name: { type: String, required: true, trim: true },
//     email: { type: String, required: true, unique: true, lowercase: true, trim: true },
//     phone: String,
//     passwordHash: { type: String, required: true }
// }, { timestamps: true }));

// const app = express();

// // ==================================================
// // MIDDLEWARE
// // ==================================================

// app.use(express.json({ limit: '100kb' }));

// // Serve frontend files from /public (admin panel lives at /admin)
// app.use(express.static(path.join(__dirname, 'public')));

// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// // ==================================================
// // MONGODB CONNECTION
// // ==================================================

// let mongoPromise = null;

// // Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if it doesn't exist yet
// async function seedAdmin() {
//     const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
//     if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

//     const email = ADMIN_EMAIL.toLowerCase();

//     if (!(await Admin.findOne({ email }))) {
//         await Admin.create({
//             email,
//             passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10)
//         });
//         console.log('Admin user created:', email);
//     }
// }

// function connectDB() {
//     if (!process.env.MONGO_URI) {
//         throw new Error('MONGO_URI environment variable is missing');
//     }

//     if (!mongoPromise) {
//         mongoPromise = mongoose
//             .connect(process.env.MONGO_URI)
//             .then(async () => {
//                 console.log('MongoDB connected');
//                 await seedAdmin().catch((e) =>
//                     console.error('Admin seed failed:', e.message)
//                 );
//             })
//             .catch((error) => {
//                 mongoPromise = null;
//                 console.error('MongoDB connection failed:', error.message);
//                 throw error;
//             });
//     }

//     return mongoPromise;
// }

// // Connect database before API requests
// app.use('/api', async (req, res, next) => {
//     try {
//         await connectDB();
//         next();
//     } catch (error) {
//         console.error('Database connection failed:', error.message);
//         res.status(500).json({ error: 'Database connection failed' });
//     }
// });

// // ==================================================
// // ERROR WRAPPER
// // ==================================================

// const wrap = (fn) => (req, res) => {
//     Promise.resolve(fn(req, res)).catch((error) => {
//         if (error.name === 'ValidationError' || error.name === 'CastError') {
//             return res.status(400).json({ error: error.message });
//         }
//         if (error.code === 11000) {
//             return res.status(409).json({
//                 error: 'An account with this email already exists'
//             });
//         }
//         console.error(error);
//         res.status(500).json({ error: 'Something went wrong' });
//     });
// };

// // ==================================================
// // AUTHENTICATION
// // ==================================================

// const auth = (req, res, next) => {
//     if (!process.env.JWT_SECRET) {
//         console.error('JWT_SECRET environment variable is missing');
//         return res.status(500).json({
//             error: 'Server authentication is not configured'
//         });
//     }

//     try {
//         const token = (req.headers.authorization || '').replace('Bearer ', '');
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//         // Customer tokens must never open admin routes
//         if (decoded.role !== 'admin') throw new Error('Not an admin');

//         next();
//     } catch (error) {
//         res.status(401).json({ error: 'Please log in again' });
//     }
// };

// // Customer auth
// const userAuth = (req, res, next) => {
//     try {
//         const token = (req.headers.authorization || '').replace('Bearer ', '');
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         if (decoded.role !== 'user') throw new Error('Not a customer');
//         req.userId = decoded.id;
//         next();
//     } catch (error) {
//         res.status(401).json({ error: 'Please log in again' });
//     }
// };

// // ==================================================
// // PRODUCT HELPER
// // ==================================================

// const pick = (body) => ({
//     name: body.name,
//     category: body.category,
//     price: Number(body.price),
//     stock: Number(body.stock),
//     description: body.description,
//     image: body.image
// });

// // ==================================================
// // STOREFRONT
// // ==================================================

// app.get(
//     '/api/products',
//     wrap(async (req, res) => {
//         res.json(await Product.find().sort('category name'));
//     })
// );

// // ==================================================
// // CREATE ORDER
// // ==================================================

// app.post(
//     '/api/orders',
//     wrap(async (req, res) => {
//         const { items, customer, paymentMethod } = req.body;

//         const bad = (message) => res.status(400).json({ error: message });

//         if (!Array.isArray(items) || !items.length) {
//             return bad('Your cart is empty');
//         }

//         if (
//             !customer?.name?.trim() ||
//             !/^\d{10}$/.test(customer.phone || '') ||
//             !customer.address?.trim()
//         ) {
//             return bad('Enter your name, a 10-digit phone number and your address');
//         }

//         if (!['cod', 'upi', 'card'].includes(paymentMethod)) {
//             return bad('Choose a payment method');
//         }

//         const done = [];

//         // Put stock back if the order fails part-way
//         const rollback = () =>
//             Promise.all(
//                 done.map((line) =>
//                     Product.updateOne(
//                         { _id: line.product },
//                         { $inc: { stock: line.qty } }
//                     )
//                 )
//             );

//         for (const item of items) {
//             const qty = Math.floor(Number(item.qty));

//             const product = await Product.findById(item.id).catch(() => null);

//             if (!product || !(qty >= 1)) {
//                 await rollback();
//                 return bad('An item in your cart is no longer available');
//             }

//             const result = await Product.updateOne(
//                 { _id: product._id, stock: { $gte: qty } },
//                 { $inc: { stock: -qty } }
//             );

//             if (!result.modifiedCount) {
//                 await rollback();
//                 return bad(`Not enough stock for ${product.name}`);
//             }

//             done.push({
//                 product: product._id,
//                 name: product.name,
//                 price: product.price,
//                 qty
//             });
//         }

//         const total = done.reduce((sum, line) => sum + line.price * line.qty, 0);

//         const order = await Order.create({
//             items: done,
//             customer: {
//                 name: customer.name.trim(),
//                 phone: customer.phone,
//                 address: customer.address.trim()
//             },
//             total,
//             paymentMethod
//         });

//         res.status(201).json({ orderId: order._id, total });
//     })
// );

// // ==================================================
// // DEMO PAYMENT
// // ==================================================

// app.post(
//     '/api/orders/:id/pay',
//     wrap(async (req, res) => {
//         const order = await Order.findById(req.params.id);

//         if (!order) {
//             return res.status(404).json({ error: 'Order not found' });
//         }

//         if (order.paymentMethod !== 'cod') {
//             order.paymentStatus = 'paid';
//             await order.save();
//         }

//         res.json({ orderId: order._id, paymentStatus: order.paymentStatus });
//     })
// );

// // ==================================================
// // CUSTOMER ACCOUNTS
// // ==================================================

// const userToken = (user) =>
//     jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET, {
//         expiresIn: '30d'
//     });

// const publicUser = (u) => ({
//     name: u.name,
//     email: u.email,
//     phone: u.phone || ''
// });

// app.post(
//     '/api/auth/register',
//     wrap(async (req, res) => {
//         if (!process.env.JWT_SECRET) {
//             return res.status(500).json({ error: 'Server authentication is not configured' });
//         }

//         const name = String(req.body.name || '').trim();
//         const email = String(req.body.email || '').trim().toLowerCase();
//         const phone = String(req.body.phone || '').trim();
//         const password = String(req.body.password || '');

//         const bad = (message) => res.status(400).json({ error: message });

//         if (!name) return bad('Enter your name');
//         if (!/^\S+@\S+\.\S+$/.test(email)) return bad('Enter a valid email address');
//         if (phone && !/^\d{10}$/.test(phone)) return bad('Phone number must be 10 digits');
//         if (password.length < 8) return bad('Password must be at least 8 characters');

//         if (await User.findOne({ email })) {
//             return res.status(409).json({ error: 'An account with this email already exists' });
//         }

//         const user = await User.create({
//             name,
//             email,
//             phone: phone || undefined,
//             passwordHash: await bcrypt.hash(password, 10)
//         });

//         res.status(201).json({ token: userToken(user), user: publicUser(user) });
//     })
// );

// app.post(
//     '/api/auth/login',
//     wrap(async (req, res) => {
//         if (!process.env.JWT_SECRET) {
//             return res.status(500).json({ error: 'Server authentication is not configured' });
//         }

//         const user = await User.findOne({
//             email: String(req.body.email || '').trim().toLowerCase()
//         });

//         if (
//             !user ||
//             !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))
//         ) {
//             return res.status(401).json({ error: 'Email or password is incorrect' });
//         }

//         res.json({ token: userToken(user), user: publicUser(user) });
//     })
// );

// app.get(
//     '/api/auth/me',
//     userAuth,
//     wrap(async (req, res) => {
//         const user = await User.findById(req.userId);
//         if (!user) return res.status(401).json({ error: 'Please log in again' });
//         res.json(publicUser(user));
//     })
// );

// // ==================================================
// // ADMIN LOGIN
// // ==================================================

// app.post(
//     '/api/admin/login',
//     wrap(async (req, res) => {
//         if (!process.env.JWT_SECRET) {
//             return res.status(500).json({
//                 error: 'Server authentication is not configured'
//             });
//         }

//         const email = String(req.body.email || '').toLowerCase();

//         const admin = await Admin.findOne({ email });

//         if (
//             !admin ||
//             !(await bcrypt.compare(String(req.body.password || ''), admin.passwordHash))
//         ) {
//             return res.status(401).json({
//                 error: 'Email or password is incorrect'
//             });
//         }

//         const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, {
//             expiresIn: '8h'
//         });

//         res.json({ token, email });
//     })
// );

// // ==================================================
// // ADMIN DASHBOARD STATS
// // ==================================================

// app.get(
//     '/api/admin/stats',
//     auth,
//     wrap(async (req, res) => {
//         const [products, orders, pending, revenue, lowStock] = await Promise.all([
//             Product.countDocuments(),
//             Order.countDocuments(),
//             Order.countDocuments({ status: 'pending' }),
//             // Revenue = all orders except cancelled ones
//             Order.aggregate([
//                 { $match: { status: { $ne: 'cancelled' } } },
//                 { $group: { _id: null, sum: { $sum: '$total' } } }
//             ]),
//             Product.find({ stock: { $lte: 5 } })
//                 .select('name stock')
//                 .sort('stock')
//                 .limit(10)
//         ]);

//         res.json({
//             products,
//             orders,
//             pending,
//             revenue: revenue[0]?.sum || 0,
//             lowStock
//         });
//     })
// );

// // ==================================================
// // ADMIN ORDERS
// // ==================================================

// app.get(
//     '/api/admin/orders',
//     auth,
//     wrap(async (req, res) => {
//         res.json(await Order.find().sort('-createdAt').limit(200));
//     })
// );

// app.patch(
//     '/api/admin/orders/:id',
//     auth,
//     wrap(async (req, res) => {
//         const order = await Order.findByIdAndUpdate(
//             req.params.id,
//             { status: req.body.status },
//             { new: true, runValidators: true }
//         );

//         if (!order) return res.status(404).json({ error: 'Order not found' });

//         res.json(order);
//     })
// );

// // ==================================================
// // ADMIN PRODUCTS
// // ==================================================

// app.get(
//     '/api/admin/products',
//     auth,
//     wrap(async (req, res) => {
//         res.json(await Product.find().sort('-createdAt'));
//     })
// );

// app.post(
//     '/api/admin/products',
//     auth,
//     wrap(async (req, res) => {
//         res.status(201).json(await Product.create(pick(req.body)));
//     })
// );

// app.put(
//     '/api/admin/products/:id',
//     auth,
//     wrap(async (req, res) => {
//         const product = await Product.findByIdAndUpdate(
//             req.params.id,
//             pick(req.body),
//             { new: true, runValidators: true }
//         );

//         if (!product) return res.status(404).json({ error: 'Product not found' });

//         res.json(product);
//     })
// );

// app.delete(
//     '/api/admin/products/:id',
//     auth,
//     wrap(async (req, res) => {
//         await Product.findByIdAndDelete(req.params.id);
//         res.json({ ok: true });
//     })
// );

// // ==================================================
// // VERCEL EXPORT
// // ==================================================

// module.exports = app;

// // ==================================================
// // LOCAL SERVER
// // ==================================================

// if (require.main === module) {
//     const PORT = process.env.PORT || 3000;

//     connectDB()
//         .then(() => {
//             app.listen(PORT, () => {
//                 console.log(`Star Pets running at http://localhost:${PORT}`);
//             });
//         })
//         .catch((error) => {
//             console.error('MongoDB connection failed:', error.message);
//             process.exit(1);
//         });
// }


require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client();

const { Product, Order, Admin, GroomingAppointment } = require('./models');

// Customer accounts (used by login.html). Move this into models.js if you prefer.
const { Schema, model, models } = mongoose;
const User = models.User || model('User', new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: String,
    passwordHash: { type: String, required: true }
}, { timestamps: true }));

const app = express();

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(express.json({ limit: '100kb' }));

function safeSecretEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
    const aa = Buffer.from(a), bb = Buffer.from(b);
    return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

// Ask the configured third-party voice assistant to follow up on an order.
// Calls are skipped unless the customer opted in at checkout and Vapi is configured.
async function startVoiceFollowUpCall(order, purpose) {
    const { VAPI_API_KEY, VAPI_ASSISTANT_ID, VAPI_PHONE_NUMBER_ID } = process.env;
    if (!order.automatedCallConsent || !order.customer?.phone || !VAPI_API_KEY || !VAPI_ASSISTANT_ID || !VAPI_PHONE_NUMBER_ID) return;

    order.voiceFollowUp = { ...(order.voiceFollowUp?.toObject?.() || order.voiceFollowUp || {}), status: 'requesting', updatedAt: new Date() };
    await order.save();
    const phone = `+91${String(order.customer.phone).replace(/\D/g, '').slice(-10)}`;
    try {
        const response = await fetch('https://api.vapi.ai/call', {
            method: 'POST',
            headers: { Authorization: `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                assistantId: VAPI_ASSISTANT_ID,
                phoneNumberId: VAPI_PHONE_NUMBER_ID,
                customer: { number: phone, name: order.customer.name },
                metadata: { orderId: String(order._id), purpose },
                assistantOverrides: { variableValues: {
                    customerName: order.customer.name || 'there',
                    orderId: String(order._id),
                    followUpPurpose: purpose,
                    cancellationReason: order.cancellationReason || 'not provided',
                    orderItems: (order.items || []).map(item => item.name).join(', '),
                    marketingCallConsent: String(order.marketingCallConsent === true)
                } }
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || data.error || `Vapi returned ${response.status}`);
        order.voiceFollowUp.callId = data.id || '';
        order.voiceFollowUp.status = 'queued';
        order.voiceFollowUp.updatedAt = new Date();
        await order.save();
    } catch (err) {
        console.error('Vapi follow-up call failed:', err.message);
        order.voiceFollowUp.status = 'failed';
        order.voiceFollowUp.updatedAt = new Date();
        await order.save();
    }
}

// Vapi should send end-of-call-report events to this URL. Configure a Bearer
// credential in Vapi with the same value as VAPI_WEBHOOK_SECRET.
app.post('/api/webhooks/vapi', async (req, res) => {
  try {
    const expected = process.env.VAPI_WEBHOOK_SECRET;
    const supplied = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!expected || !safeSecretEqual(supplied, expected)) return res.status(401).json({ error: 'Unauthorized' });
    const message = req.body?.message || {};
    if (message.type !== 'end-of-call-report') return res.json({ received: true });
    const call = message.call || {};
    const orderId = call.metadata?.orderId || message.metadata?.orderId;
    if (!mongoose.isValidObjectId(orderId)) return res.json({ received: true });
    const analysis = message.analysis || call.analysis || {};
    const artifact = message.artifact || call.artifact || {};
    const structuredOutputs = artifact.structuredOutputs || {};
    const extractedResults = Object.values(structuredOutputs).map(output => output?.result ?? output);
    const extracted = extractedResults.find(result => result && typeof result === 'object' && (result.customerReason || result.reason)) || {};
    const extractedText = extractedResults.find(result => typeof result === 'string' && result.trim());
    const reason = String(extracted.customerReason || extracted.reason || extractedText || '').slice(0, 500);
    const summary = String(analysis.summary || '').slice(0, 2000);
    const status = String(call.status || message.status || 'completed').slice(0, 40);
    await Order.updateOne({ _id: orderId }, { $set: {
        'voiceFollowUp.callId': String(call.id || ''),
        'voiceFollowUp.status': status,
        'voiceFollowUp.reason': reason,
        'voiceFollowUp.summary': summary,
        'voiceFollowUp.updatedAt': new Date()
    } });
    res.json({ received: true });
  } catch (error) {
    console.error('Vapi webhook failed:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Serve frontend files from /public (admin panel lives at /admin)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================================================
// MONGODB CONNECTION
// ==================================================

let mongoPromise = null;

// Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD if it doesn't exist yet
async function seedAdmin() {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

    const email = ADMIN_EMAIL.toLowerCase();

    if (!(await Admin.findOne({ email }))) {
        await Admin.create({
            email,
            passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10)
        });
        console.log('Admin user created:', email);
    }
}

function connectDB() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI environment variable is missing');
    }

    if (!mongoPromise) {
        mongoPromise = mongoose
            .connect(process.env.MONGO_URI)
            .then(async () => {
                console.log('MongoDB connected');
                await seedAdmin().catch((e) =>
                    console.error('Admin seed failed:', e.message)
                );
            })
            .catch((error) => {
                mongoPromise = null;
                console.error('MongoDB connection failed:', error.message);
                throw error;
            });
    }

    return mongoPromise;
}

// Connect database before API requests
app.use('/api', async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection failed:', error.message);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// ==================================================
// ERROR WRAPPER
// ==================================================

const wrap = (fn) => (req, res) => {
    Promise.resolve(fn(req, res)).catch((error) => {
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ error: error.message });
        }
        if (error.code === 11000) {
            return res.status(409).json({
                error: 'An account with this email already exists'
            });
        }
        console.error(error);
        res.status(500).json({ error: 'Something went wrong' });
    });
};

app.post('/api/grooming/appointments', wrap(async (req, res) => {
    const customer = req.body?.customer && typeof req.body.customer === 'object' ? req.body.customer : {};
    const pet = req.body?.pet && typeof req.body.pet === 'object' ? req.body.pet : {};
    const name = String(customer.name || '').trim();
    const phone = String(customer.phone || '').trim();
    const petName = String(pet.name || '').trim();
    const petType = String(pet.type || '');
    const services = Array.isArray(req.body.services) ? [...new Set(req.body.services)] : [];
    const preferredDate = new Date(req.body.preferredDate);
    const preferredTime = String(req.body.preferredTime || '');
    if (!name || name.length > 100 || !phone || phone.length > 30 || !petName || petName.length > 80) {
        return res.status(400).json({ error: 'Enter your name, phone number, and pet name.' });
    }
    if (!['Dog', 'Cat', 'Other'].includes(petType)) return res.status(400).json({ error: 'Choose your pet type.' });
    if (!services.length || services.some(s => !['Bath', 'Haircut', 'Nail trimming'].includes(s))) {
        return res.status(400).json({ error: 'Choose at least one grooming service.' });
    }
    if (!Number.isFinite(preferredDate.getTime()) || preferredDate < new Date(new Date().toDateString())) {
        return res.status(400).json({ error: 'Choose today or a future preferred date.' });
    }
    if (!['Morning', 'Afternoon', 'Evening'].includes(preferredTime)) return res.status(400).json({ error: 'Choose a preferred time.' });
    const appointment = await GroomingAppointment.create({
        customer: { name, phone, email: String(customer.email || '').trim().slice(0, 160) },
        pet: { name: petName, type: petType, breed: String(pet.breed || '').trim().slice(0, 80), notes: String(pet.notes || '').trim().slice(0, 1000) },
        services, preferredDate, preferredTime
    });
    res.status(201).json({ ok: true, appointmentId: appointment._id });
}));

// ==================================================
// AUTHENTICATION
// ==================================================

const auth = (req, res, next) => {
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET environment variable is missing');
        return res.status(500).json({
            error: 'Server authentication is not configured'
        });
    }

    try {
        const token = (req.headers.authorization || '').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Customer tokens must never open admin routes
        if (decoded.role !== 'admin') throw new Error('Not an admin');

        next();
    } catch (error) {
        res.status(401).json({ error: 'Please log in again' });
    }
};

// Customer auth
const userAuth = (req, res, next) => {
    try {
        const token = (req.headers.authorization || '').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'user') throw new Error('Not a customer');
        req.userId = decoded.id;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please log in again' });
    }
};

// ==================================================
// PRODUCT HELPER
// ==================================================

const pick = (body) => ({
    name: body.name,
    category: body.category,
    price: Number(body.price),
    stock: Number(body.stock),
    description: body.description,
    image: body.image
});

// ==================================================
// STOREFRONT
// ==================================================

app.get(
    '/api/products',
    wrap(async (req, res) => {
        res.json(await Product.find().sort('category name'));
    })
);

// ==================================================
// CREATE ORDER
// ==================================================

app.post(
    '/api/orders',
    wrap(async (req, res) => {
        const { items, customer, paymentMethod } = req.body;

        const bad = (message) => res.status(400).json({ error: message });

        if (!Array.isArray(items) || !items.length) {
            return bad('Your cart is empty');
        }

        if (
            !customer?.name?.trim() ||
            !/^\d{10}$/.test(customer.phone || '') ||
            !customer.address?.trim()
        ) {
            return bad('Enter your name, a 10-digit phone number and your address');
        }

        if (!['cod', 'upi', 'card'].includes(paymentMethod)) {
            return bad('Choose a payment method');
        }

        const done = [];

        // Put stock back if the order fails part-way
        const rollback = () =>
            Promise.all(
                done.map((line) =>
                    Product.updateOne(
                        { _id: line.product },
                        { $inc: { stock: line.qty } }
                    )
                )
            );

        for (const item of items) {
            const qty = Math.floor(Number(item.qty));

            const product = await Product.findById(item.id).catch(() => null);

            if (!product || !(qty >= 1)) {
                await rollback();
                return bad('An item in your cart is no longer available');
            }

            const result = await Product.updateOne(
                { _id: product._id, stock: { $gte: qty } },
                { $inc: { stock: -qty } }
            );

            if (!result.modifiedCount) {
                await rollback();
                return bad(`Not enough stock for ${product.name}`);
            }

            done.push({
                product: product._id,
                name: product.name,
                price: product.price,
                qty
            });
        }

        const total = done.reduce((sum, line) => sum + line.price * line.qty, 0);

        const cancelToken = crypto.randomBytes(32).toString('hex');
        const cancelTokenHash = crypto.createHash('sha256').update(cancelToken).digest('hex');
        const order = await Order.create({
            items: done,
            customer: {
                name: customer.name.trim(),
                phone: customer.phone,
                address: customer.address.trim()
            },
            automatedCallConsent: req.body.automatedCallConsent === true,
            marketingCallConsent: req.body.marketingCallConsent === true,
            total,
            paymentMethod,
            cancelTokenHash
        });

        // Return this secret once; only its hash is stored in MongoDB.
        res.status(201).json({ orderId: order._id, cancelToken, total });
    })
);

// Customer order actions require the one-time secret returned at checkout.
function orderTokenMatches(order, rawToken) {
    if (!order?.cancelTokenHash || typeof rawToken !== 'string' || !rawToken) return false;
    const saved = Buffer.from(order.cancelTokenHash, 'hex');
    const supplied = crypto.createHash('sha256').update(rawToken).digest();
    return saved.length === supplied.length && crypto.timingSafeEqual(saved, supplied);
}

async function getCustomerOrder(req, res) {
    const order = await Order.findById(req.params.id).select('+cancelTokenHash');
    if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return null;
    }
    if (!orderTokenMatches(order, String(req.body.orderToken || ''))) {
        res.status(403).json({ error: 'This order link is invalid. Please use the confirmation page for this order.' });
        return null;
    }
    return order;
}

app.post('/api/orders/:id/feedback', wrap(async (req, res) => {
    const order = await getCustomerOrder(req, res);
    if (!order) return;
    const message = String(req.body.message || '').trim().slice(0, 2000);
    const rating = Number(req.body.rating);
    if (!message && !(rating >= 1 && rating <= 5)) {
        return res.status(400).json({ error: 'Add a rating or a short comment first.' });
    }
    order.feedback = {
        rating: rating >= 1 && rating <= 5 ? rating : undefined,
        message,
        submittedAt: new Date()
    };
    await order.save();
    res.json({ ok: true });
}));

app.post('/api/orders/:id/assistant', wrap(async (req, res) => {
    const order = await getCustomerOrder(req, res);
    if (!order) return;
    const purpose = req.body.purpose === 'cancel' ? 'cancel' : 'feedback';
    const message = String(req.body.message || '').trim().slice(0, 1200);
    if (!message) return res.status(400).json({ error: 'Please say or type a little more first.' });
    if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ error: 'The AI assistant is not configured yet. You can still submit feedback or cancel your order.' });
    }

    const instructions = purpose === 'cancel'
        ? 'You are Star Pets customer care. Reply in one short, kind sentence to a customer considering cancelling an order. Acknowledge their stated reason and offer one practical way we may help, such as answering a question or changing an eligible order. Do not invent discounts, policies, delivery guarantees, or capabilities. Never pressure or guilt the customer. Clearly say they can still cancel now.'
        : 'You are Star Pets customer care. Respond warmly and briefly to a customer who has shared feedback about their order. Thank them and do not invent promises or claim an action will be taken.';

    const ai = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
            instructions,
            input: message,
            max_output_tokens: 120
        })
    });
    const result = await ai.json().catch(() => ({}));
    if (!ai.ok) {
        console.error('OpenAI assistant request failed:', result.error?.message || ai.status);
        return res.status(502).json({ error: 'The assistant could not reply just now. You can still continue with your order choice.' });
    }
    const reply = (result.output || []).flatMap(item => item.content || [])
        .filter(item => item.type === 'output_text').map(item => item.text).join(' ').trim();
    const finalReply = reply || 'Thanks for letting us know. You can still continue with your order choice.';
    const speech = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gpt-4o-mini-tts',
            voice: 'coral',
            input: finalReply,
            instructions: 'Speak warmly and clearly in a concise customer-service voice.'
        })
    });
    if (!speech.ok) {
        console.error('OpenAI speech generation failed:', speech.status);
        return res.json({ reply: finalReply });
    }
    const audio = Buffer.from(await speech.arrayBuffer()).toString('base64');
    res.json({ reply: finalReply, audio });
}));

app.post('/api/orders/:id/cancel', wrap(async (req, res) => {
    const order = await getCustomerOrder(req, res);
    if (!order) return;
    if (order.status !== 'placed') {
        return res.status(409).json({ error: 'This order can no longer be cancelled here. Please contact Star Pets for help.' });
    }
    const reason = String(req.body.reason || '').trim().slice(0, 500);
    const cancelled = await Order.findOneAndUpdate(
        { _id: order._id, status: 'placed' },
        { $set: { status: 'cancelled', cancellationReason: reason } },
        { new: true }
    );
    if (!cancelled) return res.status(409).json({ error: 'This order has already changed status and can no longer be cancelled here.' });
    await Promise.all((cancelled.items || []).map(line =>
        Product.updateOne({ _id: line.product }, { $inc: { stock: line.qty } })
    ));
    // Cancellation is already complete; a provider outage must not undo it.
    await startVoiceFollowUpCall(cancelled, 'cancellation');
    res.json({ ok: true, status: 'cancelled' });
}));

// ==================================================
// DEMO PAYMENT
// ==================================================

app.post(
    '/api/orders/:id/pay',
    wrap(async (req, res) => {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.paymentMethod !== 'cod') {
            order.paymentStatus = 'paid';
            await order.save();
        }

        res.json({ orderId: order._id, paymentStatus: order.paymentStatus });
    })
);

// ==================================================
// CUSTOMER ACCOUNTS
// ==================================================

const userToken = (user) =>
    jwt.sign({ id: user._id, role: 'user' }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });

const publicUser = (u) => ({
    name: u.name,
    email: u.email,
    phone: u.phone || ''
});

app.post(
    '/api/auth/register',
    wrap(async (req, res) => {
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'Server authentication is not configured' });
        }

        const name = String(req.body.name || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const phone = String(req.body.phone || '').trim();
        const password = String(req.body.password || '');

        const bad = (message) => res.status(400).json({ error: message });

        if (!name) return bad('Enter your name');
        if (!/^\S+@\S+\.\S+$/.test(email)) return bad('Enter a valid email address');
        if (phone && !/^\d{10}$/.test(phone)) return bad('Phone number must be 10 digits');
        if (password.length < 8) return bad('Password must be at least 8 characters');

        if (await User.findOne({ email })) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        const user = await User.create({
            name,
            email,
            phone: phone || undefined,
            passwordHash: await bcrypt.hash(password, 10)
        });

        res.status(201).json({ token: userToken(user), user: publicUser(user) });
    })
);

app.post(
    '/api/auth/login',
    wrap(async (req, res) => {
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'Server authentication is not configured' });
        }

        const user = await User.findOne({
            email: String(req.body.email || '').trim().toLowerCase()
        });

        if (
            !user ||
            !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))
        ) {
            return res.status(401).json({ error: 'Email or password is incorrect' });
        }

        res.json({ token: userToken(user), user: publicUser(user) });
    })
);

app.post(
    '/api/auth/google',
    wrap(async (req, res) => {
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'Server authentication is not configured' });
        }
        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(500).json({ error: 'Google sign-in is not configured on the server' });
        }

        const credential = String(req.body.credential || '').trim();
        if (!credential) {
            return res.status(400).json({ error: 'Google credential is missing' });
        }

        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            payload = ticket.getPayload();
        } catch (error) {
            console.error('Google credential verification failed:', error.message);
            return res.status(401).json({ error: 'Google sign-in could not be verified' });
        }

        if (!payload?.sub || !payload.email || payload.email_verified !== true) {
            return res.status(401).json({ error: 'Use a verified Google account to sign in' });
        }

        const email = String(payload.email).trim().toLowerCase();
        let user = await User.findOne({ email });

        if (!user) {
            // Keep the existing passwordHash schema; the random value is not a usable user password.
            user = await User.create({
                name: String(payload.name || email.split('@')[0]).trim(),
                email,
                passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)
            });
        }

        res.json({ token: userToken(user), user: publicUser(user) });
    })
);

app.get(
    '/api/auth/me',
    userAuth,
    wrap(async (req, res) => {
        const user = await User.findById(req.userId);
        if (!user) return res.status(401).json({ error: 'Please log in again' });
        res.json(publicUser(user));
    })
);

// ==================================================
// ADMIN LOGIN
// ==================================================

app.post(
    '/api/admin/login',
    wrap(async (req, res) => {
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                error: 'Server authentication is not configured'
            });
        }

        const email = String(req.body.email || '').toLowerCase();

        const admin = await Admin.findOne({ email });

        if (
            !admin ||
            !(await bcrypt.compare(String(req.body.password || ''), admin.passwordHash))
        ) {
            return res.status(401).json({
                error: 'Email or password is incorrect'
            });
        }

        const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, {
            expiresIn: '8h'
        });

        res.json({ token, email });
    })
);

// ==================================================
// ADMIN DASHBOARD STATS
// ==================================================

app.get(
    '/api/admin/stats',
    auth,
    wrap(async (req, res) => {
        const [products, orders, pending, revenue, lowStock] = await Promise.all([
            Product.countDocuments(),
            Order.countDocuments(),
            Order.countDocuments({ status: 'pending' }),
            // Revenue = all orders except cancelled ones
            Order.aggregate([
                { $match: { status: { $ne: 'cancelled' } } },
                { $group: { _id: null, sum: { $sum: '$total' } } }
            ]),
            Product.find({ stock: { $lte: 5 } })
                .select('name stock')
                .sort('stock')
                .limit(10)
        ]);

        res.json({
            products,
            orders,
            pending,
            revenue: revenue[0]?.sum || 0,
            lowStock
        });
    })
);

// ==================================================
// ADMIN ORDERS
// ==================================================

app.get(
    '/api/admin/orders',
    auth,
    wrap(async (req, res) => {
        res.json(await Order.find().sort('-createdAt').limit(200));
    })
);

app.get('/api/admin/grooming-appointments', auth, wrap(async (req, res) => {
    res.json(await GroomingAppointment.find().sort('-createdAt').limit(200));
}));

app.patch('/api/admin/grooming-appointments/:id', auth, wrap(async (req, res) => {
    const allowed = ['requested', 'confirmed', 'completed', 'cancelled'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Choose a valid appointment status.' });
    const appointment = await GroomingAppointment.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!appointment) return res.status(404).json({ error: 'Grooming request not found.' });
    res.json(appointment);
}));

app.patch(
    '/api/admin/orders/:id',
    auth,
    wrap(async (req, res) => {
        const before = await Order.findById(req.params.id);
        if (!before) return res.status(404).json({ error: 'Order not found' });
        const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (before.status !== order.status && order.status === 'cancelled') await startVoiceFollowUpCall(order, 'cancellation');
        if (before.status !== order.status && order.status === 'delivered') await startVoiceFollowUpCall(order, 'delivery-feedback');
        res.json(order);
    })
);

// ==================================================
// ADMIN PRODUCTS
// ==================================================

app.get(
    '/api/admin/products',
    auth,
    wrap(async (req, res) => {
        res.json(await Product.find().sort('-createdAt'));
    })
);

app.post(
    '/api/admin/products',
    auth,
    wrap(async (req, res) => {
        res.status(201).json(await Product.create(pick(req.body)));
    })
);

app.put(
    '/api/admin/products/:id',
    auth,
    wrap(async (req, res) => {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            pick(req.body),
            { new: true, runValidators: true }
        );

        if (!product) return res.status(404).json({ error: 'Product not found' });

        res.json(product);
    })
);

app.delete(
    '/api/admin/products/:id',
    auth,
    wrap(async (req, res) => {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    })
);

// ==================================================
// VERCEL EXPORT
// ==================================================

module.exports = app;

// ==================================================
// LOCAL SERVER
// ==================================================

if (require.main === module) {
    const PORT = process.env.PORT || 3000;

    connectDB()
        .then(() => {
            app.listen(PORT, () => {
                console.log(`Star Pets running at http://localhost:${PORT}`);
            });
        })
        .catch((error) => {
            console.error('MongoDB connection failed:', error.message);
            process.exit(1);
        });
}
