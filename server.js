require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { Product, Order, Admin } = require('./models');

const app = express();

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(express.json({ limit: '100kb' }));
app.use(express.static('public'));

// --------------------------------------------------
// MongoDB Connection
// --------------------------------------------------

let mongoPromise = null;

function connectDB() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI environment variable is missing');
    }

    if (!mongoPromise) {
        mongoPromise = mongoose.connect(process.env.MONGO_URI)
            .then(() => {
                console.log('MongoDB connected');
            })
            .catch((error) => {
                mongoPromise = null;
                throw error;
            });
    }

    return mongoPromise;
}

// Connect to MongoDB before API requests
app.use('/api', async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);

        res.status(500).json({
            error: 'Database connection failed'
        });
    }
});

// --------------------------------------------------
// Async Error Wrapper
// --------------------------------------------------

const wrap = (fn) => (req, res) => {
    Promise.resolve(fn(req, res)).catch((error) => {

        if (
            error.name === 'ValidationError' ||
            error.name === 'CastError'
        ) {
            return res.status(400).json({
                error: error.message
            });
        }

        console.error(error);

        res.status(500).json({
            error: 'Something went wrong'
        });
    });
};

// --------------------------------------------------
// Admin Authentication
// --------------------------------------------------

const auth = (req, res, next) => {

    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET environment variable is missing');

        return res.status(500).json({
            error: 'Server authentication is not configured'
        });
    }

    try {

        const token = (req.headers.authorization || '')
            .replace('Bearer ', '');

        jwt.verify(token, process.env.JWT_SECRET);

        next();

    } catch (error) {

        res.status(401).json({
            error: 'Please log in again'
        });
    }
};

// --------------------------------------------------
// Product Data Helper
// --------------------------------------------------

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

// Get products
app.get(
    '/api/products',

    wrap(async (req, res) => {

        const products = await Product
            .find()
            .sort('category name');

        res.json(products);
    })
);

// --------------------------------------------------
// Create Order
// --------------------------------------------------

app.post(
    '/api/orders',

    wrap(async (req, res) => {

        const {
            items,
            customer,
            paymentMethod
        } = req.body;

        const bad = (message) =>
            res.status(400).json({
                error: message
            });

        if (!Array.isArray(items) || !items.length) {
            return bad('Your cart is empty');
        }

        if (
            !customer?.name?.trim() ||
            !/^\d{10}$/.test(customer.phone || '') ||
            !customer.address?.trim()
        ) {
            return bad(
                'Enter your name, a 10-digit phone number and your address'
            );
        }

        if (
            !['cod', 'upi', 'card'].includes(paymentMethod)
        ) {
            return bad('Choose a payment method');
        }

        const done = [];

        const rollback = () =>
            Promise.all(
                done.map((line) =>
                    Product.updateOne(
                        {
                            _id: line.product
                        },
                        {
                            $inc: {
                                stock: line.qty
                            }
                        }
                    )
                )
            );

        for (const item of items) {

            const qty = Math.floor(
                Number(item.qty)
            );

            const product = await Product
                .findById(item.id)
                .catch(() => null);

            if (!product || !(qty >= 1)) {

                await rollback();

                return bad(
                    'An item in your cart is no longer available'
                );
            }

            const result = await Product.updateOne(
                {
                    _id: product._id,
                    stock: {
                        $gte: qty
                    }
                },
                {
                    $inc: {
                        stock: -qty
                    }
                }
            );

            if (!result.modifiedCount) {

                await rollback();

                return bad(
                    `Not enough stock for ${product.name}`
                );
            }

            done.push({
                product: product._id,
                name: product.name,
                price: product.price,
                qty
            });
        }

        const total = done.reduce(
            (sum, line) =>
                sum + line.price * line.qty,
            0
        );

        const order = await Order.create({

            items: done,

            customer: {
                name: customer.name.trim(),
                phone: customer.phone,
                address: customer.address.trim()
            },

            total,

            paymentMethod
        });

        res.status(201).json({
            orderId: order._id,
            total
        });
    })
);

// --------------------------------------------------
// Demo Payment
// --------------------------------------------------

app.post(
    '/api/orders/:id/pay',

    wrap(async (req, res) => {

        const order = await Order.findById(
            req.params.id
        );

        if (!order) {
            return res.status(404).json({
                error: 'Order not found'
            });
        }

        if (order.paymentMethod !== 'cod') {

            order.paymentStatus = 'paid';

            await order.save();
        }

        res.json({
            orderId: order._id,
            paymentStatus: order.paymentStatus
        });
    })
);

// ==================================================
// ADMIN
// ==================================================

// Admin Login
app.post(
    '/api/admin/login',

    wrap(async (req, res) => {

        if (!process.env.JWT_SECRET) {

            return res.status(500).json({
                error: 'Server authentication is not configured'
            });
        }

        const admin = await Admin.findOne({
            email: String(
                req.body.email || ''
            ).toLowerCase()
        });

        if (
            !admin ||
            !(await bcrypt.compare(
                String(req.body.password || ''),
                admin.passwordHash
            ))
        ) {
            return res.status(401).json({
                error: 'Email or password is incorrect'
            });
        }

        const token = jwt.sign(
            {
                id: admin._id
            },

            process.env.JWT_SECRET,

            {
                expiresIn: '8h'
            }
        );

        res.json({
            token
        });
    })
);

// --------------------------------------------------
// Get Orders
// --------------------------------------------------

app.get(
    '/api/admin/orders',
    auth,

    wrap(async (req, res) => {

        const orders = await Order
            .find()
            .sort('-createdAt')
            .limit(200);

        res.json(orders);
    })
);

// --------------------------------------------------
// Update Order
// --------------------------------------------------

app.patch(
    '/api/admin/orders/:id',
    auth,

    wrap(async (req, res) => {

        const order =
            await Order.findByIdAndUpdate(
                req.params.id,

                {
                    status: req.body.status
                },

                {
                    new: true,
                    runValidators: true
                }
            );

        res.json(order);
    })
);

// --------------------------------------------------
// Create Product
// --------------------------------------------------

app.post(
    '/api/admin/products',
    auth,

    wrap(async (req, res) => {

        const product =
            await Product.create(
                pick(req.body)
            );

        res.status(201).json(product);
    })
);

// --------------------------------------------------
// Update Product
// --------------------------------------------------

app.put(
    '/api/admin/products/:id',
    auth,

    wrap(async (req, res) => {

        const product =
            await Product.findByIdAndUpdate(
                req.params.id,
                pick(req.body),

                {
                    new: true,
                    runValidators: true
                }
            );

        res.json(product);
    })
);

// --------------------------------------------------
// Delete Product
// --------------------------------------------------

app.delete(
    '/api/admin/products/:id',
    auth,

    wrap(async (req, res) => {

        await Product.findByIdAndDelete(
            req.params.id
        );

        res.json({
            ok: true
        });
    })
);

// ==================================================
// VERCEL
// ==================================================

// Vercel can use the exported Express application.
module.exports = app;

// ==================================================
// LOCAL DEVELOPMENT
// ==================================================

// app.listen() only runs when server.js is executed
// directly on your computer.
//
// It will NOT run when Vercel imports this file.

if (require.main === module) {

    const PORT =
        process.env.PORT || 3000;

    connectDB()
        .then(() => {

            app.listen(
                PORT,
                () => {

                    console.log(
                        `Star Pets running at http://localhost:${PORT}`
                    );
                }
            );

        })
        .catch((error) => {

            console.error(
                'MongoDB connection failed:',
                error.message
            );

            process.exit(1);
        });
}