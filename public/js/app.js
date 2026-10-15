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

if ($('#top')) $('#top').innerHTML = `<a class="brand" href="/" aria-label="Star Pets home"><img class="brand-logo" src="images/star-pets-logo.jpg" alt="Star Pets"></a><nav><a href="/#products">Shop</a><a href="dog.html">Dog</a><a href="cat.html">Cat</a><a href="grooming.html">Grooming</a><a href="about.html">About us</a><a href="cart.html">Cart <b id="cnt">0</b></a></nav>`;
if ($('#foot')) $('#foot').innerHTML = `<span>© Star Pets</span><a href="admin.html">Admin login</a>`;
document.body.insertAdjacentHTML('beforeend', '<div id="toast" role="status"></div>');
cart.set(cart.get());

async function pShop() {
  const g = $('#grid'); let all = [], cat = document.body.dataset.cat || 'All';
  try { const r = await fetch('/api/products'); if (!r.ok) throw 0; all = await r.json(); }
  catch { g.innerHTML = '<p class="err">Products could not load. Refresh to try again.</p>'; return; }

  let catList = all.filter(p => cat === 'All' || p.category === cat);
  const state = { brand: new Set(), breed: new Set(), age: new Set(), age_group: new Set(), flavour: new Set(), avail: new Set(), min: null, max: null };

  const ageLabel = a => (a <= 1 ? '1 Year Or Less' : `${a} Years`);
  const facetValue = (p, key) => {
    if (p[key] !== undefined && p[key] !== null && p[key] !== '') {
      return key === 'age' && Number.isFinite(Number(p[key])) ? ageLabel(Number(p[key])) : String(p[key]);
    }
    const name = String(p.name || '');
    if (key === 'brand') return name.trim().split(/\s+/)[0] || '';
    if (key === 'breed') return ['Persian', 'Siamese', 'Maine Coon', 'Labrador', 'Golden Retriever', 'German Shepherd', 'Beagle', 'Poodle', 'Bulldog', 'Ragdoll'].find(b => name.toLowerCase().includes(b.toLowerCase())) || '';
    if (key === 'age') return /kitten|puppy/i.test(name) ? (/kitten/i.test(name) ? 'Kitten' : 'Puppy') : /senior/i.test(name) ? 'Senior' : /adult|junior/i.test(name) ? 'Adult' : '';
    if (key === 'age_group') return /kitten/i.test(name) ? 'Kitten' : /puppy/i.test(name) ? 'Puppy' : /senior/i.test(name) ? 'Senior' : /adult|junior/i.test(name) ? 'Adult' : '';
    if (key === 'flavour') return ['chicken', 'fish', 'seafood', 'tuna', 'salmon', 'mackerel', 'beef', 'lamb', 'turkey', 'duck'].find(f => name.toLowerCase().includes(f)) || '';
    return '';
  };
  const uniq = key => [...new Set(catList.map(p => facetValue(p, key)).filter(Boolean))];
  const count = (key, val) => catList.filter(p => facetValue(p, key) === String(val)).length;

  const prices = catList.map(p => Number(p.price)).filter(n => !isNaN(n));
  const priceMin = prices.length ? Math.min(...prices) : 0;
  const priceMax = prices.length ? Math.max(...prices) : 0;

  const checklist = (title, key, opts, labelFn = v => v, countFn = count) => {
    if (!opts.length) return '';
    return `<details open><summary>${esc(title)}</summary>${opts.map(v => `<label class="opt"><span><input type="checkbox" data-facet="${key}" value="${esc(v)}"> ${esc(labelFn(v))}</span><span>${countFn(key, v)}</span></label>`).join('')}</details>`;
  };

  const drawFilters = () => {
    // The home page intentionally has no sidebar filters; still render its product cards.
    if (!$('#filters')) return;
    $('#filters').innerHTML = `
      <details open><summary>Price</summary>
        <div class="price-row"><label class="sr-only" for="pmin">Minimum price</label><input type="number" id="pmin" min="0" aria-label="Minimum price" placeholder="₹ ${priceMin}"><span>to</span><label class="sr-only" for="pmax">Maximum price</label><input type="number" id="pmax" min="0" aria-label="Maximum price" placeholder="₹ ${priceMax}"></div>
      </details>
      ${checklist('Brand', 'brand', uniq('brand'))}
      ${checklist('Availability', 'avail', ['in', 'out'], v => v === 'in' ? 'In stock' : 'Out of stock', (_key, v) => catList.filter(p => v === 'in' ? Number(p.stock) > 0 : Number(p.stock) <= 0).length)}
      ${checklist('Breed', 'breed', uniq('breed'))}
      ${checklist('Age', 'age', uniq('age'))}
      ${checklist('Age group', 'age_group', uniq('age_group'))}
      ${checklist('Flavour', 'flavour', uniq('flavour'))}
      <button class="filter-reset" type="button">Clear filters</button>
    `;
    $('#pmin').oninput = e => { state.min = e.target.value === '' ? null : Number(e.target.value); draw(); };
    $('#pmax').oninput = e => { state.max = e.target.value === '' ? null : Number(e.target.value); draw(); };
    $('#filters').querySelectorAll('input[data-facet]').forEach(cb => {
      cb.onchange = e => {
        const set = state[e.target.dataset.facet];
        e.target.checked ? set.add(e.target.value) : set.delete(e.target.value);
        draw();
      };
    });
  };

  const draw = () => {
    const list = catList.filter(p => {
      if (state.min !== null && Number(p.price) < state.min) return false;
      if (state.max !== null && Number(p.price) > state.max) return false;
      if (state.brand.size && !state.brand.has(facetValue(p, 'brand'))) return false;
      if (state.breed.size && !state.breed.has(facetValue(p, 'breed'))) return false;
      if (state.age.size && !state.age.has(facetValue(p, 'age'))) return false;
      if (state.age_group.size && !state.age_group.has(facetValue(p, 'age_group'))) return false;
      if (state.flavour.size && !state.flavour.has(facetValue(p, 'flavour'))) return false;
      if (state.avail.size) {
        const bucket = p.stock > 0 ? 'in' : 'out';
        if (!state.avail.has(bucket)) return false;
      }
      return true;
    });
    const sort = $('#sortBy')?.value || 'featured';
    if (sort === 'price-low') list.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === 'price-high') list.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === 'name') list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    g.innerHTML = list.length ? list.map(p => `<article class="card"><div class="pic ${esc(p.category)}">${/^(https?:)?\//.test(p.image || '') ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : esc(p.name[0])}</div><div class="body"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="row"><b>${inr(p.price)}</b><button data-id="${p._id}" ${p.stock < 1 ? 'disabled' : ''}>${p.stock < 1 ? 'Sold out' : 'Add to cart'}</button></div></div></article>`).join('') : catList.length ? '<p>No products match these filters.</p>' : '<p class="empty-products">Products will appear here soon. Please check back shortly.</p>';
    const resultCount = $('#result-count'); if (resultCount) resultCount.textContent = `${list.length} products`;
  };

  if ($('#sortBy')) $('#sortBy').onchange = draw;

  if ($('#chips') && cat === 'All') {
    $('#chips').setAttribute('aria-label', 'Filter products by pet type');
    $('#chips').innerHTML = ['All', 'Dog', 'Cat'].map(category =>
      `<button type="button" data-category="${category}" aria-pressed="${category === 'All'}">${category === 'All' ? 'All products' : `${category} products`}</button>`
    ).join('');
    $('#chips').onclick = e => {
      const category = e.target.closest('button')?.dataset.category;
      if (!category) return;
      catList = all.filter(p => category === 'All' || p.category === category);
      $('#chips').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
      draw();
    };
  }

  g.onclick = e => {
    const id = e.target.dataset.id; if (!id) return;
    const p = all.find(x => x._id === id), c = cart.get(), i = c.find(x => x.id === id);
    if (i && i.qty >= p.stock) return toast('That is all we have in stock');
    i ? i.qty++ : c.push({ id, name: p.name, price: p.price, qty: 1 });
    cart.set(c); toast('Added to cart');
  };

  drawFilters();
  $('#filters')?.querySelector('.filter-reset')?.addEventListener('click', () => {
    Object.values(state).forEach(v => v instanceof Set ? v.clear() : null);
    state.min = state.max = null;
    const min = $('#pmin'), max = $('#pmax'); if (min) min.value = ''; if (max) max.value = '';
    $('#filters').querySelectorAll('input[type="checkbox"]').forEach(input => input.checked = false);
    draw();
  });
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
      const o = await post('/api/orders', { items: c.map(i => ({ id: i.id, qty: i.qty })), customer: { name, phone: v('phone'), address: v('address') }, automatedCallConsent: f.elements.voiceConsent.checked, marketingCallConsent: f.elements.marketingCallConsent.checked, paymentMethod: m });
      const p = await post(`/api/orders/${o.orderId}/pay`, {});   // card/UPI details are never sent to the server
      cart.set([]);
      $('main').className = ''; $('main').style.maxWidth = '640px';
      $('main').innerHTML = `<div class="panel" style="margin-top:2rem">
        <h1>Order placed</h1>
        <p>Thank you, ${esc(name)}. Your order <b>#${esc(String(o.orderId).slice(-6).toUpperCase())}</b> for ${inr(o.total)} is confirmed. ${p.paymentStatus === 'paid' ? 'Payment received.' : 'Pay when it arrives.'}</p>
        <section style="border-top:1px solid var(--line);margin-top:1.2rem;padding-top:1rem">
          <h2>How was your order experience?</h2><p class="sub">Your feedback is optional. You can type or speak.</p>
          <label for="fbRating">Rating</label><select id="fbRating"><option value="">Choose a rating</option><option value="5">5 — Great</option><option value="4">4 — Good</option><option value="3">3 — Okay</option><option value="2">2 — Not good</option><option value="1">1 — Poor</option></select>
          <label for="fbText">Feedback</label><textarea id="fbText" rows="3" maxlength="2000" placeholder="Tell us what you think"></textarea>
          <button type="button" class="alt" id="fbMic">Speak feedback</button> <button type="button" class="btn" id="fbSend">Send feedback</button>
          <p id="fbStatus" class="sub" role="status"></p>
        </section>
        <section style="border-top:1px solid var(--line);margin-top:1.2rem;padding-top:1rem">
          <h2>Need to cancel?</h2><p class="sub">Tell us why, if you’d like. Our assistant can offer one helpful option, and you can cancel at any time.</p>
          <label for="cancelText">Reason for cancelling (optional)</label><textarea id="cancelText" rows="2" maxlength="500" placeholder="Let us know why"></textarea>
          <button type="button" class="alt" id="cancelMic">Speak reason</button>
          <button type="button" class="alt" id="cancelHelp">Ask the assistant</button>
          <p id="cancelReply" class="sub" role="status"></p>
          <button type="button" class="btn" id="cancelOrder" style="background:transparent;color:var(--bad);border:1px solid var(--bad)">Cancel this order</button>
          <p id="cancelStatus" class="sub" role="status"></p>
        </section>
        <p style="margin-top:1rem"><a class="btn" href="/">Keep shopping</a></p>
      </div>`;

      const orderInfo = { orderToken: o.cancelToken };
      const $id = id => document.getElementById(id);
      const speak = (text, audio) => {
        if (audio) {
          const playback = new Audio(`data:audio/mpeg;base64,${audio}`);
          playback.play().catch(() => speak(text));
          return;
        }
        if ('speechSynthesis' in window && text) {
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
        }
      };
      const listenInto = (buttonId, fieldId, statusId) => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const button = $id(buttonId), status = $id(statusId);
        button.onclick = () => {
          if (!SpeechRecognition) { status.textContent = 'Voice input is not available in this browser. You can type instead.'; return; }
          const recognition = new SpeechRecognition();
          recognition.lang = navigator.language || 'en-IN';
          recognition.onstart = () => { status.textContent = 'Listening…'; button.disabled = true; };
          recognition.onresult = event => { $id(fieldId).value = event.results[0][0].transcript; status.textContent = 'Got it. You can edit the text before sending.'; };
          recognition.onerror = () => { status.textContent = 'Could not hear that. Please try again or type instead.'; };
          recognition.onend = () => { button.disabled = false; };
          recognition.start();
        };
      };
      const securePost = async (url, body) => {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, ...orderInfo }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Something went wrong.');
        return data;
      };
      listenInto('fbMic', 'fbText', 'fbStatus');
      listenInto('cancelMic', 'cancelText', 'cancelStatus');
      $id('fbSend').onclick = async () => {
        const status = $id('fbStatus'), button = $id('fbSend');
        button.disabled = true; status.textContent = 'Sending feedback…';
        try {
          const message = $id('fbText').value.trim(), rating = $id('fbRating').value;
          await securePost(`/api/orders/${o.orderId}/feedback`, { message, rating });
          status.textContent = 'Thank you for your feedback.';
          if (message) {
            try {
              const result = await securePost(`/api/orders/${o.orderId}/assistant`, { purpose: 'feedback', message });
              status.textContent = result.reply; speak(result.reply, result.audio);
            } catch { /* Feedback remains saved even if the optional AI reply is unavailable. */ }
          }
        } catch (error) { status.textContent = error.message; }
        finally { button.disabled = false; }
      };
      $id('cancelHelp').onclick = async () => {
        const status = $id('cancelReply'), message = $id('cancelText').value.trim();
        if (!message) { status.textContent = 'Share a reason first, or cancel the order now.'; return; }
        status.textContent = 'The assistant is thinking…';
        try {
          const result = await securePost(`/api/orders/${o.orderId}/assistant`, { purpose: 'cancel', message });
          status.textContent = result.reply; speak(result.reply, result.audio);
        } catch (error) { status.textContent = error.message; }
      };
      $id('cancelOrder').onclick = async () => {
        const status = $id('cancelStatus'), button = $id('cancelOrder');
        if (!confirm('Cancel this order now? You can still choose to keep it.')) return;
        button.disabled = true; status.textContent = 'Cancelling order…';
        try {
          await securePost(`/api/orders/${o.orderId}/cancel`, { reason: $id('cancelText').value.trim() });
          status.textContent = 'Your order is cancelled.';
          $id('cancelHelp').disabled = true; $id('fbSend').disabled = true;
          button.textContent = 'Order cancelled';
          speak('Your order has been cancelled. Thank you for letting us know.');
        } catch (error) { status.textContent = error.message; button.disabled = false; }
      };
    } catch (x) { err.textContent = x.message; $('#go').disabled = false; }
  };
}

function pGrooming() {
  const form = $('#groomingForm');
  const date = form.elements.preferredDate;
  date.min = new Date().toLocaleDateString('en-CA');
  form.onsubmit = async e => {
    e.preventDefault();
    const status = $('#groomingStatus'), button = $('#groomingSubmit');
    const services = [...form.querySelectorAll('[name="services"]:checked')].map(x => x.value);
    if (!services.length) { status.textContent = 'Choose at least one service.'; return; }
    button.disabled = true; status.textContent = 'Sending your appointment request…';
    try {
      await post('/api/grooming/appointments', {
        customer: { name: form.elements.customerName.value, phone: form.elements.phone.value, email: form.elements.email.value, location: form.elements.location.value },
        pet: { name: form.elements.petName.value, type: form.elements.petType.value, breed: form.elements.breed.value, notes: form.elements.notes.value },
        services,
        preferredDate: form.elements.preferredDate.value,
        preferredTime: form.elements.preferredTime.value
      });
      form.hidden = true;
      $('#groomingThanks').hidden = false;
      $('#groomingThanks').focus();
    } catch (error) { status.textContent = error.message; button.disabled = false; }
  };
}

({ shop: pShop, cart: pCart, checkout: pCheckout, grooming: pGrooming })[document.body.dataset.page]();
