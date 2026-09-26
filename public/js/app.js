const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const inr = n => '₹' + Number(n).toLocaleString('en-IN');

// Cart lives in the browser; the server re-checks prices and stock at checkout.
const cart = {
  get() { try { return JSON.parse(localStorage.getItem('sp_cart')) || []; } catch { return []; } },
  set(c) { try { localStorage.setItem('sp_cart', JSON.stringify(c)); } catch {} $('#cnt').textContent = c.reduce((n, i) => n + i.qty, 0); },
  total() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); }
};
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 1800); }
async function post(u, b) {
  const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong');
  return d;
}

if ($('#top')) $('#top').innerHTML = `<a class="brand" href="/"><span class="mark" role="img" aria-label="Star Pets logo"></span><span>Star <i>Pets</i></span></a><nav><a href="/#products">Shop</a><a href="dog.html">Dog</a><a href="cat.html">Cat</a><a href="about.html">About us</a><a href="cart.html">Cart <b id="cnt">0</b></a></nav>`;
if ($('#foot')) $('#foot').innerHTML = `<span>© Star Pets</span><a href="admin.html">Admin login</a>`;
document.body.insertAdjacentHTML('beforeend', '<div id="toast" role="status"></div>');
cart.set(cart.get());

async function pShop() {
  const g = $('#grid'); let all = [], cat = document.body.dataset.cat || 'All';
  try { const r = await fetch('/api/products'); if (!r.ok) throw 0; all = await r.json(); }
  catch { g.innerHTML = '<p class="err">Products could not load. Refresh to try again.</p>'; return; }
  const cats = ['All', ...new Set(all.map(p => p.category))];
  const draw = () => {
    $('#chips').innerHTML = cats.map(c => `<button aria-pressed="${c === cat}">${esc(c)}</button>`).join('');
    const list = all.filter(p => cat === 'All' || p.category === cat);
    g.innerHTML = list.length ? list.map(p => `<article class="card"><div class="pic ${esc(p.category)}">${/^(https?:)?\//.test(p.image || '') ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : esc(p.name[0])}</div><div class="body"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="row"><b>${inr(p.price)}</b><button data-id="${p._id}" ${p.stock < 1 ? 'disabled' : ''}>${p.stock < 1 ? 'Sold out' : 'Add to cart'}</button></div></div></article>`).join('') : '<p>No products in this category yet.</p>';
  };
  $('#chips').onclick = e => { if (e.target.tagName === 'BUTTON') { cat = e.target.textContent; draw(); } };
  g.onclick = e => {
    const id = e.target.dataset.id; if (!id) return;
    const p = all.find(x => x._id === id), c = cart.get(), i = c.find(x => x.id === id);
    if (i && i.qty >= p.stock) return toast('That is all we have in stock');
    i ? i.qty++ : c.push({ id, name: p.name, price: p.price, qty: 1 });
    cart.set(c); toast('Added to cart');
  };
  draw();
}

function pCart() {
  const box = $('#lines'), sum = $('#sum');
  const draw = () => {
    const c = cart.get();
    if (!c.length) { box.innerHTML = '<p>Your cart is empty.</p><a class="btn" href="/#products">Browse products</a>'; sum.innerHTML = ''; return; }
    box.innerHTML = c.map((i, n) => `<div class="line"><div><b>${esc(i.name)}</b><br>${inr(i.price)}</div><div><button class="alt" data-a="-" data-n="${n}" aria-label="Decrease quantity">−</button> <b>${i.qty}</b> <button class="alt" data-a="+" data-n="${n}" aria-label="Increase quantity">+</button></div><div><b>${inr(i.price * i.qty)}</b> <button class="alt" data-a="x" data-n="${n}">Remove</button></div></div>`).join('');
    sum.innerHTML = `<p class="row"><span>Total</span><b>${inr(cart.total())}</b></p><a class="btn" href="checkout.html">Go to checkout</a>`;
  };
  box.onclick = e => {
    const { a, n } = e.target.dataset; if (!a) return;
    const c = cart.get();
    if (a === 'x' || (a === '-' && c[n].qty === 1)) c.splice(n, 1); else c[n].qty += a === '+' ? 1 : -1;
    cart.set(c); draw();
  };
  draw();
}

function pCheckout() {
  const f = $('#f'), c = cart.get(), v = n => f.elements[n].value.trim();
  if (!c.length) { location.replace('cart.html'); return; }
  $('#tot').textContent = inr(cart.total());
  const sync = () => { const m = v('pay'); $('#upi').hidden = m !== 'upi'; $('#card').hidden = m !== 'card'; $('#go').textContent = m === 'cod' ? 'Place order' : 'Pay ' + inr(cart.total()); };
  f.addEventListener('change', sync); sync();
  f.onsubmit = async e => {
    e.preventDefault();
    const err = $('#err'), m = v('pay'); err.textContent = '';
    if (m === 'upi' && !/^[\w.\-]{2,}@[a-z]{2,}$/i.test(v('upi'))) return err.textContent = 'Enter a valid UPI ID, like name@bank';
    if (m === 'card' && !(/^\d{12,19}$/.test(v('cn').replace(/\s/g, '')) && /^(0[1-9]|1[0-2])\/\d{2}$/.test(v('exp')) && /^\d{3,4}$/.test(v('cvv')))) return err.textContent = 'Check your card number, expiry (MM/YY) and CVV';
    $('#go').disabled = true;
    const name = v('fullname');
    try {
      const o = await post('/api/orders', { items: c.map(i => ({ id: i.id, qty: i.qty })), customer: { name, phone: v('phone'), address: v('address') }, paymentMethod: m });
      const p = await post(`/api/orders/${o.orderId}/pay`, {});   // card/UPI details are never sent to the server
      cart.set([]);
      $('main').className = ''; $('main').style.maxWidth = '640px';
      $('main').innerHTML = `<div class="panel" style="margin-top:2rem"><h1>Order placed</h1><p>Thank you, ${esc(name)}. Your order <b>#${esc(String(o.orderId).slice(-6).toUpperCase())}</b> for ${inr(o.total)} is confirmed. ${p.paymentStatus === 'paid' ? 'Payment received.' : 'Pay when it arrives.'}</p><a class="btn" href="/">Keep shopping</a></div>`;
    } catch (x) { err.textContent = x.message; $('#go').disabled = false; }
  };
}

({ shop: pShop, cart: pCart, checkout: pCheckout })[document.body.dataset.page]();