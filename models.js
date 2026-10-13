const m = require('mongoose');
const Product = m.model('Product', new m.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['Dog', 'Cat', 'Accessories'], required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  description: String,
  image: String
}, { timestamps: true }));
const Order = m.model('Order', new m.Schema({
  items: [{ product: { type: m.Schema.Types.ObjectId, ref: 'Product' }, name: String, price: Number, qty: Number }],
  customer: { name: String, phone: String, address: String },
  automatedCallConsent: { type: Boolean, default: false },
  marketingCallConsent: { type: Boolean, default: false },
  total: Number,
  paymentMethod: { type: String, enum: ['cod', 'upi', 'card'] },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  status: { type: String, enum: ['placed', 'packed', 'shipped', 'delivered', 'cancelled'], default: 'placed' },
  cancelTokenHash: { type: String, select: false },
  cancellationReason: { type: String, default: '' },
  voiceFollowUp: {
    callId: { type: String, default: '' },
    status: { type: String, default: '' },
    reason: { type: String, default: '' },
    summary: { type: String, default: '' },
    updatedAt: Date
  },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    message: { type: String, default: '' },
    submittedAt: Date
  }
}, { timestamps: true }));
const Admin = m.model('Admin', new m.Schema({ email: { type: String, unique: true }, passwordHash: String }));
module.exports = { Product, Order, Admin };
