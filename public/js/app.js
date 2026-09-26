async function pShop() {
  const g = $('#grid'); let all = [], cat = document.body.dataset.cat || 'All';
  try { const r = await fetch('/api/products'); if (!r.ok) throw 0; all = await r.json(); }
  catch { g.innerHTML = '<p class="err">Products could not load. Refresh to try again.</p>'; return; }

  const catList = all.filter(p => cat === 'All' || p.category === cat);
  const state = { brand: new Set(), breed: new Set(), age: new Set(), avail: new Set(), min: null, max: null };

  const uniq = key => [...new Set(catList.map(p => p[key]).filter(v => v !== undefined && v !== null && v !== ''))];
  const count = (key, val) => catList.filter(p => p[key] === val).length;
  const ageLabel = a => (a <= 1 ? '1 Year Or Less' : `${a} Years`);

  const prices = catList.map(p => Number(p.price)).filter(n => !isNaN(n));
  const priceMin = prices.length ? Math.min(...prices) : 0;
  const priceMax = prices.length ? Math.max(...prices) : 0;

  const checklist = (title, key, opts, labelFn = v => v) => {
    if (!opts.length) return '';
    return `<details open><summary>${esc(title)}</summary>${opts.map(v => `<label class="opt"><span><input type="checkbox" data-facet="${key}" value="${esc(v)}"> ${esc(labelFn(v))}</span><span>${count(key, v)}</span></label>`).join('')}</details>`;
  };

  const drawFilters = () => {
    $('#filters').innerHTML = `
      <details open><summary>Price</summary>
        <div class="price-row"><input type="number" id="pmin" placeholder="${priceMin}"> to <input type="number" id="pmax" placeholder="${priceMax}"></div>
      </details>
      ${checklist('Brand', 'brand', uniq('brand'))}
      ${checklist('Availability', 'stock', [1, 0], v => v ? 'In Stock' : 'Out Of Stock').replace(/data-facet="stock" value="1"/, 'data-facet="avail" value="in"').replace(/data-facet="stock" value="0"/, 'data-facet="avail" value="out"')}
      ${checklist('Breed', 'breed', uniq('breed'))}
      ${checklist('Age', 'age', uniq('age').sort((a, b) => a - b), ageLabel)}
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
      if (state.brand.size && !state.brand.has(String(p.brand))) return false;
      if (state.breed.size && !state.breed.has(String(p.breed))) return false;
      if (state.age.size && !state.age.has(String(p.age))) return false;
      if (state.avail.size) {
        const bucket = p.stock > 0 ? 'in' : 'out';
        if (!state.avail.has(bucket)) return false;
      }
      return true;
    });
    g.innerHTML = list.length ? list.map(p => `<article class="card"><div class="pic ${esc(p.category)}">${/^(https?:)?\//.test(p.image || '') ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : esc(p.name[0])}</div><div class="body"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><div class="row"><b>${inr(p.price)}</b><button data-id="${p._id}" ${p.stock < 1 ? 'disabled' : ''}>${p.stock < 1 ? 'Sold out' : 'Add to cart'}</button></div></div></article>`).join('') : '<p>No products match these filters.</p>';
  };

  g.onclick = e => {
    const id = e.target.dataset.id; if (!id) return;
    const p = all.find(x => x._id === id), c = cart.get(), i = c.find(x => x.id === id);
    if (i && i.qty >= p.stock) return toast('That is all we have in stock');
    i ? i.qty++ : c.push({ id, name: p.name, price: p.price, qty: 1 });
    cart.set(c); toast('Added to cart');
  };

  drawFilters();
  draw();
}