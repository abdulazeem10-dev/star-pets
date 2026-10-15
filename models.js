const m = require('mongoose');
const Product = m.model('Product', new m.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['Dog', 'Cat', 'Accessories'], required: true },
  price: { type: Number, required: true, min: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  stock: { type: Number, default: 0, min: 0 },
  description: String,
  image: String
}, { timestamps: true }));
const Order = m.model('Order', new m.Schema({
  items: [{ product: { type: m.Schema.Types.ObjectId, ref: 'Product' }, name: String, price: Number, regularPrice: Number, discountPercent: Number, qty: Number }],
  customer: { name: String, phone: String, address: String },
  automatedCallConsent: { type: Boolean, default: false },
  marketingCallConsent: { type: Boolean, default: false },
  total: Number,
  paymentMethod: { type: String, enum: ['cod', 'razorpay'] },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
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
const GroomingAppointment = m.model('GroomingAppointment', new m.Schema({
  customer: {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    location: { type: String, required: true, trim: true, maxlength: 500 }
  },
  pet: {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: ['Dog', 'Cat', 'Other'], required: true },
    breed: { type: String, trim: true, maxlength: 80, default: '' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' }
  },
  services: [{ type: String, enum: ['Bath', 'Haircut', 'Nail trimming'] }],
  preferredDate: { type: Date, required: true },
  preferredTime: { type: String, required: true, enum: ['Morning', 'Afternoon', 'Evening'] },
  status: { type: String, enum: ['requested', 'confirmed', 'completed', 'cancelled'], default: 'requested' }
}, { timestamps: true }));
module.exports = { Product, Order, Admin, GroomingAppointment };
