require('dotenv').config();
const mongoose = require('mongoose'), bcrypt = require('bcryptjs');
const { Product, Admin } = require('./models');
(async () => {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 8) { console.error('Set ADMIN_PASSWORD (8+ characters) in .env'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/starpets');
  const email = (process.env.ADMIN_EMAIL || 'admin@starpets.com').toLowerCase();
  await Admin.findOneAndUpdate({ email }, { passwordHash: await bcrypt.hash(pw, 10) }, { upsert: true });
  if (!(await Product.countDocuments())) await Product.insertMany([
    { name: 'Chicken & Rice Adult Dog Food, 3 kg', category: 'Dog', price: 1299, stock: 40, description: 'Complete daily meal with real chicken and brown rice.' },
    { name: 'Puppy Growth Formula, 1.5 kg', category: 'Dog', price: 749, stock: 30, description: 'Extra protein and DHA for growing puppies.' },
    { name: 'Peanut Butter Dog Biscuits, 500 g', category: 'Dog', price: 299, stock: 60, description: 'Crunchy baked treats, no artificial colours.' },
    { name: 'Ocean Fish Adult Cat Food, 1.2 kg', category: 'Cat', price: 649, stock: 35, description: 'Fish-first recipe with taurine for heart and eyes.' },
    { name: 'Kitten Tuna Pouches, 12 pack', category: 'Cat', price: 599, stock: 25, description: 'Soft tuna in gravy, sized for kittens.' },
    { name: 'Padded Adjustable Dog Collar', category: 'Accessories', price: 349, stock: 50, description: 'Soft lining, quick-release buckle, reflective stitching.' }
  ]);
  console.log('Seeded. Admin login:', email); process.exit(0);
})();
