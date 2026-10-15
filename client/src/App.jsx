import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { HashRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

const StoreContext = createContext(null);
const useStore = () => useContext(StoreContext);
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
const productPrice = product => Math.round(Number(product?.price || 0) * (100 - Number(product?.discountPercent || 0)) / 100);
const api = async (url, body, headers = {}) => {
  const response = await fetch(url, body === undefined ? { headers } : {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
};
const loadRazorpayCheckout = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const existing = document.querySelector('script[data-razorpay-checkout]');
  if (existing) {
    existing.addEventListener('load', () => resolve(), { once: true });
    existing.addEventListener('error', () => reject(new Error('Could not load the secure payment window. Please try again.')), { once: true });
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  script.dataset.razorpayCheckout = 'true';
  script.onload = () => resolve();
  script.onerror = () => reject(new Error('Could not load the secure payment window. Please try again.'));
  document.body.appendChild(script);
});
const readCart = () => { try { return JSON.parse(localStorage.getItem('sp_cart') || '[]'); } catch { return []; } };
const productImage = value => {
  const image = String(value || '');
  if (/^(https?:)?\/\//i.test(image) || image.startsWith('/')) return image;
  return image ? `/${image.replace(/^\.\//, '')}` : '';
};

function LegacyRedirect() {
  const location = useLocation();
  if (location.pathname === '/' && !window.location.hash) {
    const page = window.location.pathname.split('/').pop().toLowerCase();
    const routes = { 'cat.html': '/cat', 'dog.html': '/dog', 'cart.html': '/cart', 'checkout.html': '/checkout', 'about.html': '/about', 'grooming.html': '/grooming', 'login.html': '/login' };
    if (routes[page]) return <Navigate to={routes[page]} replace />;
  }
  return null;
}

function Header() {
  const { cart } = useStore();
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('sp_user') || 'null'); } catch { return null; } });
  useEffect(() => {
    const refreshUser = () => { try { setUser(JSON.parse(localStorage.getItem('sp_user') || 'null')); } catch { setUser(null); } };
    window.addEventListener('sp-auth-change', refreshUser);
    return () => window.removeEventListener('sp-auth-change', refreshUser);
  }, []);
  useEffect(() => {
    const token = localStorage.getItem('sp_user_token');
    if (token) api('/api/auth/me', undefined, { Authorization: `Bearer ${token}` }).then(setUser).catch(() => {
      localStorage.removeItem('sp_user_token'); localStorage.removeItem('sp_user'); setUser(null);
    });
  }, []);
  const signOut = () => { localStorage.removeItem('sp_user_token'); localStorage.removeItem('sp_user'); setUser(null); };
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  return <header className="site-header">
    <Link className="brand" to="/"><img className="brand-logo" src="/images/star-pets-logo.png" alt="Star Pets" /></Link>
    <nav aria-label="Main navigation">
      <Link to="/shop">Shop</Link><Link to="/dog">Dog</Link><Link to="/cat">Cat</Link><Link to="/grooming">Grooming</Link><Link to="/about">About us</Link><Link to="/cart">Cart <b>{count}</b></Link>
    </nav>
    <div className="account-nav">{user ? <><span className="account-greeting">Hi, {user.name?.split(' ')[0] || 'there'}</span><button className="account-button" onClick={signOut}>Log out</button></> : <><Link className="account-button" to="/login">Log in</Link><Link className="account-button account-primary" to="/login?mode=register">Sign up</Link></>}</div>
  </header>;
}

function Footer() {
  return <footer className="rich site-footer">
    <div className="footer-grid">
      <div className="footer-brand"><Link to="/"><img src="/images/star-pets-logo.png" alt="Star Pets" /></Link><p>Nutrition, treats, and everyday essentials for the pets who make your home happier.</p></div>
      <div className="footer-column"><h3>Shop</h3><Link to="/dog">Dog food</Link><Link to="/cat">Cat food</Link><Link to="/grooming">Grooming</Link><Link to="/shop">All products</Link></div>
      <div className="footer-column"><h3>Customer care</h3><Link to="/login">Log in / Sign up</Link><Link to="/cart">Shopping cart</Link><Link to="/about">About Star Pets</Link><a href="tel:+918976176855">Contact us</a></div>
    </div>
    <div className="footer-map"><div><h3>Visit us</h3><address>STAR PETS, Shop No 06, Riddhi Siddhi Prithivi, Plot No 112, Sector 20, Ulwe, Wahal, Maharashtra 410206</address><a className="btn" target="_blank" rel="noreferrer" href="https://www.google.com/maps/search/?api=1&query=STAR+PETS+Shop+No+06+Riddhi+Siddhi+Prithivi+Plot+No+112+Sector+20+Ulwe+Wahal+Maharashtra+410206">Get directions →</a></div><iframe title="Star Pets location map" loading="lazy" src="https://www.google.com/maps?q=STAR+PETS+Shop+No+06+Riddhi+Siddhi+Prithivi+Plot+No+112+Sector+20+Ulwe+Wahal+Maharashtra+410206&output=embed" /></div>
    <div className="footer-bottom"><span>© 2026 Star Pets. All rights reserved.</span><span>Admin login: <a href="/admin.html">here</a></span></div>
  </footer>;
}

function CategoryRail({ active = 'All pets' }) {
  return <nav className="category-rail" aria-label="Shop categories">
    <Link className={active === 'All pets' ? 'active' : ''} to="/shop"><span aria-hidden="true">★</span> All pets</Link>
    <Link className={active === 'Cat' ? 'active' : ''} to="/cat"><span aria-hidden="true">🐱</span> Cat</Link>
    <Link className={active === 'Dog' ? 'active' : ''} to="/dog"><span aria-hidden="true">🐶</span> Dog</Link>
    <Link className={active === 'Grooming' ? 'active' : ''} to="/grooming"><span aria-hidden="true">✂️</span> Grooming</Link>
  </nav>;
}

function ShopPage({ category = 'All' }) {
  const { addToCart, toast } = useStore();
  const [products, setProducts] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [sort, setSort] = useState('featured'), [minimum, setMinimum] = useState(''), [maximum, setMaximum] = useState('');
  const [selected, setSelected] = useState({ type: new Set(), brand: new Set(), availability: new Set(), breed: new Set(), age: new Set(), flavour: new Set() });
  useEffect(() => { let active = true; setLoading(true); api('/api/products').then(data => { if (active) { setProducts(Array.isArray(data) ? data : []); setError(''); } }).catch(err => { if (active) setError(err.message); }).finally(() => active && setLoading(false)); return () => { active = false; }; }, []);
  const source = useMemo(() => category === 'All' ? products : products.filter(product => product.category === category), [category, products]);
  const ageGroup = product => /kitten/i.test(product.name) ? 'Kitten' : /puppy/i.test(product.name) ? 'Puppy' : /senior/i.test(product.name) ? 'Senior' : /adult|junior/i.test(product.name) ? 'Adult' : '';
  const facet = (product, name) => {
    const value = product[name]; if (value !== undefined && value !== null && value !== '') return String(value);
    const title = String(product.name || '');
    if (name === 'type') return product.category || '';
    if (name === 'brand') return title.trim().split(/\s+/)[0] || '';
    if (name === 'breed') return ['Persian', 'Siamese', 'Maine Coon', 'Labrador', 'Golden Retriever', 'German Shepherd', 'Beagle', 'Poodle', 'Bulldog', 'Ragdoll'].find(item => title.toLowerCase().includes(item.toLowerCase())) || '';
    if (name === 'age') return ageGroup(product);
    if (name === 'flavour') return ['chicken', 'fish', 'seafood', 'tuna', 'salmon', 'mackerel', 'beef', 'lamb', 'turkey', 'duck'].find(item => title.toLowerCase().includes(item)) || '';
    return '';
  };
  const options = key => [...new Set(source.map(product => facet(product, key)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const counts = (key, value) => source.filter(product => key === 'availability' ? (value === 'In stock' ? Number(product.stock) > 0 : Number(product.stock) <= 0) : facet(product, key) === value).length;
  const filtered = useMemo(() => {
    let list = source.filter(product => {
      const price = productPrice(product);
      if (minimum !== '' && price < Number(minimum)) return false;
      if (maximum !== '' && price > Number(maximum)) return false;
      for (const key of ['type', 'brand', 'breed', 'age', 'flavour']) if (selected[key].size && !selected[key].has(facet(product, key))) return false;
      if (selected.availability.size && !selected.availability.has(Number(product.stock) > 0 ? 'In stock' : 'Out of stock')) return false;
      return true;
    });
    if (sort === 'price-low') list = [...list].sort((a, b) => productPrice(a) - productPrice(b));
    if (sort === 'price-high') list = [...list].sort((a, b) => productPrice(b) - productPrice(a));
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [source, selected, minimum, maximum, sort]);
  const changeFacet = (key, value, checked) => setSelected(previous => {
    const values = new Set(previous[key]); checked ? values.add(value) : values.delete(value);
    return { ...previous, [key]: values };
  });
  const clearFilters = () => { setSelected({ type: new Set(), brand: new Set(), availability: new Set(), breed: new Set(), age: new Set(), flavour: new Set() }); setMinimum(''); setMaximum(''); };
  const productTypeOptions = category === 'All' ? options('type') : [];
  const title = category === 'All' ? 'Our products' : `${category} products`;
  const introTitle = category === 'Cat' ? 'Good food. Happier cats.' : category === 'Dog' ? 'Good food. Happier dogs.' : 'Good things for the pets who wait by the door.';
  return <main className="shop-catalog">
    {category === 'All' ? <section className="hero home-hero"><div><span className="shop-eyebrow">Care for your best friend</span><h1>Good food for the ones who wait by the door.</h1><p>Thoughtfully selected food, treats, and everyday essentials for dogs and cats.</p><a className="btn" href="#products">Shop products</a></div><img src="/images/hero-pets.png" alt="A golden retriever and tabby cat relaxing together beside their food bowls" fetchPriority="high" /></section> : <section className="shop-banner"><div className="shop-banner-copy"><span className="shop-eyebrow">Thoughtful picks for {category.toLowerCase()}</span><h1>{introTitle}</h1><p>Browse nourishing meals, tasty treats, and everyday essentials for your {category === 'Cat' ? 'feline' : 'canine'} friend.</p><a className="btn" href="#products">Shop {category.toLowerCase()} products</a></div><img src="/images/hero-pets.png" alt="A pet parent with a cat and dog" fetchPriority="high" /></section>}
    <CategoryRail active={category === 'All' ? 'All pets' : category} />
    <section id="products"><div className="bar"><div><h2>{title}</h2><span className="result-count" aria-live="polite">{loading ? 'Loading products…' : `${filtered.length} products`}</span></div><label className="sort-control" htmlFor="sortBy">Sort by<select id="sortBy" value={sort} onChange={event => setSort(event.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label></div>
      <div className="shop-layout"><aside id="filters" aria-label="Product filters">
        <FilterGroup title="Price"><div className="price-row"><input type="number" min="0" aria-label="Minimum price" placeholder="₹ Min" value={minimum} onChange={event => setMinimum(event.target.value)} /><span>to</span><input type="number" min="0" aria-label="Maximum price" placeholder="₹ Max" value={maximum} onChange={event => setMaximum(event.target.value)} /></div></FilterGroup>
        {productTypeOptions.length > 1 && <FilterGroup title="Product type"><FilterOptions values={productTypeOptions} facet="type" selected={selected.type} count={counts} onChange={changeFacet} /> </FilterGroup>}
        {options('brand').length > 0 && <FilterGroup title="Brand"><FilterOptions values={options('brand')} facet="brand" selected={selected.brand} count={counts} onChange={changeFacet} /></FilterGroup>}
        <FilterGroup title="Availability"><FilterOptions values={['In stock', 'Out of stock']} facet="availability" selected={selected.availability} count={counts} onChange={changeFacet} /></FilterGroup>
        {options('breed').length > 0 && <FilterGroup title="Breed"><FilterOptions values={options('breed')} facet="breed" selected={selected.breed} count={counts} onChange={changeFacet} /></FilterGroup>}
        {options('age').length > 0 && <FilterGroup title="Age group"><FilterOptions values={options('age')} facet="age" selected={selected.age} count={counts} onChange={changeFacet} /></FilterGroup>}
        {options('flavour').length > 0 && <FilterGroup title="Flavour"><FilterOptions values={options('flavour')} facet="flavour" selected={selected.flavour} count={counts} onChange={changeFacet} /></FilterGroup>}
        <button type="button" className="filter-reset" onClick={clearFilters}>Clear filters</button>
      </aside><div id="grid-wrap"><div id="grid" className="grid" aria-live="polite">{loading ? <p>Loading products…</p> : error ? <p className="err">{error}</p> : filtered.length ? filtered.map(product => { const discount = Number(product.discountPercent || 0); const price = productPrice(product); return <article className="card" key={product._id}><div className={`pic ${product.category}`}>{discount > 0 && <span className="discount-badge">{discount}% off</span>}{productImage(product.image) ? <img src={productImage(product.image)} alt={product.name} loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} /> : <span aria-hidden="true">{product.category === 'Cat' ? '🐱' : '🐾'}</span>}</div><div className="body"><h3>{product.name}</h3><p>{product.description}</p><div className="row"><div className="product-prices"><b>{money(price)}</b>{discount > 0 && <s>{money(product.price)}</s>}</div><button disabled={Number(product.stock) < 1} onClick={() => { addToCart(product); toast('Added to cart'); }}>{Number(product.stock) < 1 ? 'Sold out' : 'Add to cart'}</button></div></div></article>; }) : <p>{source.length ? 'No products match these filters.' : 'Products will appear here soon. Please check back shortly.'}</p>}</div></div></div>
    </section>
    {category === 'All' && <AboutHighlights />}
  </main>;
}

function FilterGroup({ title, children }) { return <details open><summary>{title}</summary><div className="filter-options">{children}</div></details>; }
function FilterOptions({ values, facet, selected, count, onChange }) {
  return values.map(value => <label className="opt" key={value}><span><input type="checkbox" checked={selected.has(value)} onChange={event => onChange(facet, value, event.target.checked)} />{value}</span><span>{count(facet, value)}</span></label>);
}

function AboutHighlights() {
  return <section id="about" className="about-highlights"><div className="about-box"><img src="/images/about-pets.png" alt="A pet parent with a dog and cat" loading="lazy" /><div><span className="eyebrow">Made for pet parents</span><h2>Better choices for every bowl, walk, and nap.</h2><p>Star Pets is built around simple, practical pet care: quality food, useful treats, and essentials selected with dogs and cats in mind.</p><ul><li>Carefully selected pet food and treats</li><li>Products for dogs, puppies, cats, and kittens</li><li>Secure online payment at checkout</li><li>Friendly support for pet parents</li></ul></div></div></section>;
}

function CartPage() {
  const { cart, setCart } = useStore();
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const changeQty = (index, delta) => setCart(previous => previous.flatMap((item, itemIndex) => {
    if (itemIndex !== index) return [item];
    const qty = item.qty + delta;
    return qty > 0 ? [{ ...item, qty }] : [];
  }));
  return <main className="page-main cart-page"><h1>Your shopping cart</h1>{!cart.length ? <section className="panel empty-cart"><p>Your cart is empty.</p><Link className="btn" to="/shop">Browse products</Link></section> : <div className="cart-columns"><section className="panel">{cart.map((item, index) => <article className="cart-line" key={item.id}><div><h2>{item.name}</h2><span>{money(item.price)} each {item.discountPercent > 0 && <s>{money(item.originalPrice)}</s>}</span></div><div className="quantity-control"><button className="alt" aria-label="Decrease quantity" onClick={() => changeQty(index, -1)}>−</button><b>{item.qty}</b><button className="alt" aria-label="Increase quantity" onClick={() => changeQty(index, 1)}>+</button></div><strong>{money(item.price * item.qty)}</strong><button className="remove-link" onClick={() => setCart(previous => previous.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></article>)}</section><aside className="panel order-summary"><h2>Order summary</h2><p className="row"><span>Subtotal</span><b>{money(total)}</b></p><p className="demo">Shipping and availability are confirmed at checkout.</p><Link className="btn" to="/checkout">Continue to checkout</Link></aside></div>}</main>;
}

function CheckoutPage() {
  const { cart, setCart } = useStore();
  const [paymentMethod, setPaymentMethod] = useState('razorpay'), [error, setError] = useState(''), [busy, setBusy] = useState(false), [placed, setPlaced] = useState(null);
  const [voiceConsent, setVoiceConsent] = useState(false), [marketingConsent, setMarketingConsent] = useState(false);
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const submit = async event => {
    event.preventDefault(); setError('');
    if (!cart.length) return setError('Your cart is empty.');
    const form = new FormData(event.currentTarget), value = name => String(form.get(name) || '').trim();
    const phone = value('phone');
    if (!/^\d{10}$/.test(phone)) return setError('Enter a 10-digit phone number.');
    setBusy(true);
    try {
      const order = await api('/api/orders', { items: cart.map(item => ({ id: item.id, qty: item.qty })), customer: { name: value('fullname'), phone, address: value('address') }, automatedCallConsent: voiceConsent, marketingCallConsent: marketingConsent, paymentMethod });
      if (paymentMethod === 'cod') {
        setCart([]); setPlaced({ ...order, paymentStatus: 'pending', customerName: value('fullname'), paymentMethod });
        return;
      }
      if (!order.razorpay?.keyId || !order.razorpay?.orderId) throw new Error('The online payment session could not be created. Please try again or choose cash on delivery.');
      await loadRazorpayCheckout();
      await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.razorpay.keyId,
          amount: order.razorpay.amount,
          currency: order.razorpay.currency,
          name: 'Star Pets',
          description: `Order #${String(order.orderId).slice(-6).toUpperCase()}`,
          image: `${window.location.origin}/images/star-pets-logo.png`,
          order_id: order.razorpay.orderId,
          prefill: { name: value('fullname'), contact: `+91${phone}` },
          theme: { color: '#2c8c86' },
          modal: { ondismiss: () => reject(new Error('Payment was cancelled. Your cart is still saved; you can try again.')) },
          handler: async response => {
            try {
              const payment = await api(`/api/orders/${order.orderId}/verify-payment`, { ...response, orderToken: order.cancelToken });
              setCart([]);
              setPlaced({ ...order, paymentStatus: payment.paymentStatus, customerName: value('fullname'), paymentMethod });
              resolve();
            } catch (verifyError) { reject(verifyError); }
          }
        });
        checkout.on('payment.failed', response => reject(new Error(response.error?.description || 'Payment failed. Your cart is still saved; please try again.')));
        checkout.open();
      });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  if (placed) return <OrderConfirmation order={placed} />;
  if (!cart.length) return <main className="page-main"><section className="panel"><h1>Checkout</h1><p>Your cart is empty.</p><Link className="btn" to="/shop">Browse products</Link></section></main>;
  return <main className="page-main checkout-page"><form className="panel checkout-form" onSubmit={submit}>
    <h1>Checkout</h1>
    <label>Full name<input name="fullname" required autoComplete="name" maxLength="100" /></label>
    <label>Phone (10 digits)<input name="phone" required inputMode="numeric" maxLength="10" autoComplete="tel-national" /></label>
    <label className="consent-option"><input type="checkbox" checked={voiceConsent} onChange={event => setVoiceConsent(event.target.checked)} /> I agree Star Pets may call me using an automated voice assistant about cancellations or delivery feedback. Optional.</label>
    <label className="consent-option"><input type="checkbox" checked={marketingConsent} onChange={event => setMarketingConsent(event.target.checked)} /> I also agree to occasional automated calls about Star Pets offers. Optional and separate from order updates.</label>
    <label>Delivery address<textarea name="address" rows="3" required autoComplete="street-address" maxLength="500" /></label>
    <h2>Payment</h2>
    <label className="consent-option"><input type="radio" name="pay" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} /> Pay online with UPI, cards, or net banking</label>
    <label className="consent-option"><input type="radio" name="pay" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} /> Cash on delivery</label>
    <p className="err" role="alert">{error}</p><button disabled={busy}>{busy ? 'Please wait…' : paymentMethod === 'cod' ? 'Place order' : `Pay ${money(total)}`}</button>
    <p className="demo">Online payments open in Razorpay’s secure checkout. Star Pets never receives your card details.</p>
  </form><aside className="panel order-summary"><h2>Order total</h2>{cart.map(item => <p className="row" key={item.id}><span>{item.name} × {item.qty}</span><b>{money(item.price * item.qty)}</b></p>)}<hr /><p className="row"><b>Total</b><b>{money(total)}</b></p><Link to="/cart">Edit cart</Link></aside></main>;
}

function OrderConfirmation({ order }) {
  const [rating, setRating] = useState(''), [feedback, setFeedback] = useState(''), [feedbackStatus, setFeedbackStatus] = useState(''), [cancelReason, setCancelReason] = useState(''), [assistantReply, setAssistantReply] = useState(''), [cancelStatus, setCancelStatus] = useState(''), [cancelled, setCancelled] = useState(false);
  const securePost = (path, body) => api(path, { ...body, orderToken: order.cancelToken });
  const speak = text => { if ('speechSynthesis' in window && text) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } };
  const voiceInput = (setter, statusSetter) => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return statusSetter('Voice input is not available here. You can type instead.');
    const recognition = new Recognition(); recognition.lang = navigator.language || 'en-IN';
    recognition.onstart = () => statusSetter('Listening…'); recognition.onresult = event => { setter(event.results[0][0].transcript); statusSetter('Got it. You can edit the text before sending.'); };
    recognition.onerror = () => statusSetter('Could not hear that. Please try again or type instead.'); recognition.start();
  };
  const sendFeedback = async () => {
    setFeedbackStatus('Sending feedback…');
    try { await securePost(`/api/orders/${order.orderId}/feedback`, { message: feedback.trim(), rating }); setFeedbackStatus('Thank you for your feedback.'); if (feedback.trim()) { try { const result = await securePost(`/api/orders/${order.orderId}/assistant`, { purpose: 'feedback', message: feedback.trim() }); setFeedbackStatus(result.reply); speak(result.reply); } catch {} } }
    catch (error) { setFeedbackStatus(error.message); }
  };
  const askAssistant = async () => {
    if (!cancelReason.trim()) return setAssistantReply('Share a reason first, or cancel the order now.');
    setAssistantReply('The assistant is thinking…');
    try { const result = await securePost(`/api/orders/${order.orderId}/assistant`, { purpose: 'cancel', message: cancelReason.trim() }); setAssistantReply(result.reply); speak(result.reply); }
    catch (error) { setAssistantReply(error.message); }
  };
  const cancelOrder = async () => {
    if (!window.confirm('Cancel this order now? You can still choose to keep it.')) return;
    setCancelStatus('Cancelling order…');
    try { await securePost(`/api/orders/${order.orderId}/cancel`, { reason: cancelReason.trim() }); setCancelled(true); setCancelStatus('Your order is cancelled.'); speak('Your order has been cancelled. Thank you for letting us know.'); }
    catch (error) { setCancelStatus(error.message); }
  };
  return <main className="page-main confirmation-page"><section className="panel"><span className="shop-eyebrow">Order received</span><h1>Thank you, {order.customerName}.</h1><p>Your order <b>#{String(order.orderId).slice(-6).toUpperCase()}</b> for {money(order.total)} is confirmed. {order.paymentStatus === 'paid' ? 'Payment received.' : 'Pay when it arrives.'}</p>
    <section className="followup-section"><h2>How was your order experience?</h2><p className="sub">Your feedback is optional. You can type or speak.</p><label>Rating<select value={rating} onChange={event => setRating(event.target.value)}><option value="">Choose a rating</option>{[5,4,3,2,1].map(value => <option value={value} key={value}>{value} — {['','Poor','Not good','Okay','Good','Great'][value]}</option>)}</select></label><label>Feedback<textarea rows="3" maxLength="2000" placeholder="Tell us what you think" value={feedback} onChange={event => setFeedback(event.target.value)} /></label><button className="alt" onClick={() => voiceInput(setFeedback, setFeedbackStatus)}>Speak feedback</button> <button onClick={sendFeedback}>Send feedback</button><p className="sub" role="status">{feedbackStatus}</p></section>
    <section className="followup-section"><h2>Need to cancel?</h2><p className="sub">Tell us why, if you’d like. Our assistant can offer one helpful option, and you can cancel at any time.</p><label>Reason for cancelling (optional)<textarea rows="2" maxLength="500" placeholder="Let us know why" value={cancelReason} onChange={event => setCancelReason(event.target.value)} /></label><button className="alt" onClick={() => voiceInput(setCancelReason, setCancelStatus)}>Speak reason</button> <button className="alt" onClick={askAssistant} disabled={cancelled}>Ask the assistant</button><p className="sub" role="status">{assistantReply || cancelStatus}</p><button className="cancel-button" onClick={cancelOrder} disabled={cancelled}>{cancelled ? 'Order cancelled' : 'Cancel this order'}</button><p className="sub" role="status">{cancelStatus}</p></section><Link className="btn" to="/shop">Keep shopping</Link></section></main>;
}

function GroomingPage() {
  const [services, setServices] = useState([]), [status, setStatus] = useState(''), [submitted, setSubmitted] = useState(false), [busy, setBusy] = useState(false);
  const today = new Date().toLocaleDateString('en-CA');
  const toggle = value => setServices(previous => previous.includes(value) ? previous.filter(item => item !== value) : [...previous, value]);
  const submit = async event => {
    event.preventDefault(); setStatus('');
    if (!services.length) return setStatus('Choose at least one service.');
    const form = new FormData(event.currentTarget), value = name => String(form.get(name) || '').trim();
    setBusy(true); setStatus('Sending your appointment request…');
    try {
      await api('/api/grooming/appointments', { customer: { name: value('customerName'), phone: value('phone'), email: value('email'), location: value('location') }, pet: { name: value('petName'), type: value('petType'), breed: value('breed'), notes: value('notes') }, services, preferredDate: value('preferredDate'), preferredTime: value('preferredTime') });
      setSubmitted(true); setStatus('');
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  };
  return <main className="page-main grooming-page"><section className="grooming-hero"><span className="shop-eyebrow">A little extra care</span><h1>Fresh, clean, and comfy.</h1><p>Request a grooming appointment for your pet. Choose a bath, haircut, nail trim, or a combination, and our team will contact you to confirm the appointment and price.</p></section>
    <section className="service-cards" aria-label="Grooming services">{[['grooming-bath.png','Bath & brush','A refreshing bath and a good brush to help your pet feel their best.'],['grooming-haircut.png','Haircut','Tell us about the trim you have in mind and we’ll discuss what suits your pet.'],['grooming-nails.png','Nail trimming','A careful nail trim as a standalone service or alongside a bath.']].map(([image,title,copy]) => <article className="service-card" key={title}><img src={`/images/${image}`} alt={title} loading="lazy" /><div className="service-copy"><h2>{title}</h2><p>{copy}</p></div></article>)}</section>
    <section className="panel booking"><h2>Request an appointment</h2><p className="hint">This is an appointment request, not a confirmed booking. We’ll call or message to confirm availability and pricing.</p>
      {submitted ? <div className="grooming-success" role="status"><h2>Request received!</h2><p>Thanks. Star Pets will contact you to confirm the groomer, appointment time, and price.</p><Link className="btn" to="/shop">Back to shop</Link></div> : <form onSubmit={submit}>
        <label>Your name<input name="customerName" autoComplete="name" required maxLength="100" /></label><label>Phone number<input name="phone" type="tel" autoComplete="tel" required maxLength="30" placeholder="For appointment confirmation" /></label><label>Email address<input name="email" type="email" autoComplete="email" required maxLength="160" /></label><label className="wide">Your location / address<textarea name="location" autoComplete="street-address" rows="2" required maxLength="500" placeholder="Street, area, city, and postal code" /></label><label>Pet’s name<input name="petName" required maxLength="80" /></label><label>Pet type<select name="petType" required defaultValue=""><option value="">Choose one</option><option>Dog</option><option>Cat</option><option>Other</option></select></label><label>Breed (optional)<input name="breed" maxLength="80" /></label>
        <fieldset className="wide"><legend>Services (choose at least one)</legend>{['Bath','Haircut','Nail trimming'].map(service => <label className="service-option" key={service}><input type="checkbox" checked={services.includes(service)} onChange={() => toggle(service)} />{service === 'Bath' ? 'Bath & brush' : service}</label>)}</fieldset>
        <label>Preferred date<input name="preferredDate" type="date" min={today} required /></label><label>Preferred time<select name="preferredTime" required defaultValue=""><option value="">Choose a time</option><option>Morning</option><option>Afternoon</option><option>Evening</option></select></label><label className="wide">Anything we should know? (optional)<textarea name="notes" rows="3" maxLength="1000" placeholder="For example, your pet’s coat or any handling needs" /></label><div className="wide"><button disabled={busy}>{busy ? 'Sending request…' : 'Request grooming appointment'}</button><p className="err" role="status" aria-live="polite">{status}</p></div>
      </form>}
    </section></main>;
}

function AboutPage() {
  return <main className="page-main about-page"><section className="about-story"><span className="shop-eyebrow">A little about us</span><h1>Good care for the pets who make a house a home.</h1><p>Star Pets started with a simple idea: food and accessories good enough that your dog or cat notices the difference. We pick every recipe and product ourselves, and keep the range practical for local pet parents.</p><p>Based in Ulwe, Maharashtra, we handle orders and customer care with a small, friendly team. Questions about an order or a product? Contact us and a real person will get back to you.</p><Link className="btn" to="/shop">Explore products</Link></section><img src="/images/about-pets.png" alt="A pet parent spending time with a dog and cat" /></main>;
}

function LoginPage() {
  const location = useLocation(), navigate = useNavigate();
  const [register, setRegister] = useState(() => location.search.includes('register'));
  const [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => setRegister(location.search.includes('register')), [location.search]);
  useEffect(() => {
    const id = 'google-identity-script';
    if (!document.getElementById(id)) { const script = document.createElement('script'); script.id = id; script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; document.head.appendChild(script); }
  }, []);
  const saveSession = data => {
    localStorage.setItem('sp_user_token', data.token); localStorage.setItem('sp_user', JSON.stringify(data.user));
    window.dispatchEvent(new Event('sp-auth-change')); navigate('/shop');
  };
  const submit = async event => {
    event.preventDefault(); setStatus(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(['name', 'email', 'phone', 'password'].map(key => [key, String(form.get(key) || '').trim()]));
    try { saveSession(await api(register ? '/api/auth/register' : '/api/auth/login', register ? body : { email: body.email, password: body.password })); }
    catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  };
  const googleLogin = async response => {
    setBusy(true); setStatus('Signing in with Google…');
    try { saveSession(await api('/api/auth/google', { credential: response.credential })); }
    catch (error) { setStatus(error.message); setBusy(false); }
  };
  useEffect(() => {
    let attempts = 0, timer;
    const mountButton = () => {
      const google = window.google?.accounts?.id, target = document.getElementById('google-signin');
      if (google && target) { google.initialize({ client_id: '852447387928-9ft9phdm60ca0nd530qddma057kgq9nc.apps.googleusercontent.com', callback: googleLogin }); google.renderButton(target, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 320 }); }
      else if (attempts++ < 20) timer = window.setTimeout(mountButton, 300);
    };
    mountButton(); return () => window.clearTimeout(timer);
  }, []);
  return <main className="page-main auth-page"><section className="panel auth-card"><span className="shop-eyebrow">Welcome to Star Pets</span><h1>{register ? 'Create your account' : 'Welcome back'}</h1><p>{register ? 'Save your details for a smoother checkout.' : 'Sign in to your Star Pets account.'}</p><form onSubmit={submit}>{register && <label>Your name<input name="name" autoComplete="name" required maxLength="100" /></label>}<label>Email address<input name="email" type="email" autoComplete="email" required /></label>{register && <label>Phone number<input name="phone" type="tel" autoComplete="tel" required maxLength="30" /></label>}<label>Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={8} /></label><button disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Log in'}</button><p className="err" role="alert">{status}</p></form><div className="auth-divider"><span>or</span></div><div id="google-signin" className="google-signin" /><p className="auth-switch">{register ? 'Already have an account?' : 'New to Star Pets?'} <button className="text-button" onClick={() => { setRegister(!register); setStatus(''); navigate(register ? '/login' : '/login?mode=register'); }}>{register ? 'Log in' : 'Create an account'}</button></p></section></main>;
}

function RoutedContent() {
  const { toast } = useStore();
  return <><LegacyRedirect /><Header /><Routes>
    <Route path="/" element={<ShopPage />} /><Route path="/shop" element={<ShopPage />} /><Route path="/products" element={<ShopPage />} />
    <Route path="/cat" element={<ShopPage category="Cat" />} /><Route path="/dog" element={<ShopPage category="Dog" />} />
    <Route path="/cart" element={<CartPage />} /><Route path="/checkout" element={<CheckoutPage />} /><Route path="/grooming" element={<GroomingPage />} /><Route path="/about" element={<AboutPage />} /><Route path="/login" element={<LoginPage />} />
    <Route path="/order-confirmation" element={<ConfirmationRoute />} /><Route path="*" element={<Navigate to="/" replace />} />
  </Routes><Footer />{toast && <div className="store-toast" role="status">{toast}</div>}</>;
}

function ConfirmationRoute() {
  const navigate = useNavigate();
  const [order] = useState(() => { try { return JSON.parse(sessionStorage.getItem('sp_recent_order') || 'null'); } catch { return null; } });
  if (!order) return <main className="page-main"><section className="panel"><h1>No recent order</h1><p>Place an order to see its confirmation.</p><Link className="btn" to="/shop">Shop products</Link></section></main>;
  return <OrderConfirmation order={order} onDone={() => navigate('/shop')} />;
}

export default function App() {
  const [cart, setCart] = useState(readCart);
  const [toast, setToast] = useState('');
  useEffect(() => { localStorage.setItem('sp_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { if (!toast) return undefined; const timer = window.setTimeout(() => setToast(''), 2400); return () => window.clearTimeout(timer); }, [toast]);
  const addToCart = product => setCart(previous => {
    const id = String(product._id || product.id);
    const existing = previous.find(item => item.id === id);
    return existing ? previous.map(item => item.id === id ? { ...item, name: product.name, price: productPrice(product), originalPrice: Number(product.price), discountPercent: Number(product.discountPercent || 0), qty: item.qty + 1 } : item) : [...previous, { id, name: product.name, price: productPrice(product), originalPrice: Number(product.price), discountPercent: Number(product.discountPercent || 0), qty: 1, image: product.image }];
  });
  const store = useMemo(() => ({ cart, setCart, addToCart, toast: message => setToast(message) }), [cart]);
  return <StoreContext.Provider value={store}><HashRouter><RoutedContent /></HashRouter></StoreContext.Provider>;
}
