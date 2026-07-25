// ============================================
// TERRENE — Store Application
// ============================================

let products = [];
let settings = {};

// --- Load data from data.json ---
async function loadData() {
  try {
    const resp = await fetch('data.json');
    const data = await resp.json();
    products = data.products.filter(p => p.active !== false);
    settings = data.settings || {};
    return true;
  } catch (err) {
    console.error('Failed to load data.json, using fallback', err);
    return false;
  }
}

// --- Cart State ---
let cart = [];

// --- Get product by ID ---
function getProduct(id) {
  return products.find(p => p.id === parseInt(id));
}

// --- Render Products on Homepage ---
function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  grid.innerHTML = products.map(p => `
    <a href="product.html?id=${p.id}" class="product-card" data-id="${p.id}">
      <div class="product-image">
        <img src="${p.images.main}" alt="${p.name} — ${p.material}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'img-placeholder\\'>${p.emoji}</div>'">
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
      </div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-material">${p.material}</p>
        <p class="product-price">$${p.price}.00</p>
        <button class="product-add" onclick="event.preventDefault(); addToCart(${p.id})">Add to Cart</button>
      </div>
    </a>
  `).join('');
}

// --- Render Product Detail Page ---
function renderProductDetail() {
  const container = document.getElementById('product-detail');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');
  const product = getProduct(productId);

  if (!product) {
    container.innerHTML = `
      <div class="not-found">
        <h2>Product Not Found</h2>
        <p>This piece may have been gathered by the earth. <a href="/">Return to the collection.</a></p>
      </div>`;
    document.title = 'Not Found — Terrene';
    return;
  }

  document.title = `${product.name} — ${settings.storeName || 'Terrene'}`;

  container.innerHTML = `
    <div class="product-detail-layout">
      <div class="product-gallery">
        <div class="gallery-main">
          <img id="gallery-main-img" src="${product.images.main}" alt="${product.name}" />
        </div>
        <div class="gallery-thumbs">
          <button class="thumb active" data-img="${product.images.main}">
            <img src="${product.images.main}" alt="Main" loading="lazy" />
          </button>
          <button class="thumb" data-img="${product.images.detail}">
            <img src="${product.images.detail}" alt="Detail" loading="lazy" />
          </button>
          <button class="thumb" data-img="${product.images.wear}">
            <img src="${product.images.wear}" alt="Worn" loading="lazy" />
          </button>
          <button class="thumb" data-img="${product.images.scene}">
            <img src="${product.images.scene}" alt="Scene" loading="lazy" />
          </button>
        </div>
      </div>

      <div class="product-detail-info">
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        <h1 class="detail-name">${product.name}</h1>
        <p class="detail-material">${product.material}</p>
        <p class="detail-price">$${product.price}.00 USD</p>
        <p class="detail-description">${product.description}</p>

        <div class="detail-actions">
          <button class="btn btn-primary btn-block" onclick="addToCart(${product.id})">
            Add to Cart — $${product.price}.00
          </button>
        </div>

        <div class="detail-features">
          <div class="feature"><span class="feature-icon">🌱</span><span>100% natural materials</span></div>
          <div class="feature"><span class="feature-icon">🤲</span><span>Handcrafted — each piece unique</span></div>
          <div class="feature"><span class="feature-icon">📦</span><span>Free shipping over $${settings.freeShippingThreshold || 50}</span></div>
          <div class="feature"><span class="feature-icon">🔄</span><span>30-day returns</span></div>
        </div>
      </div>
    </div>

    <div class="product-story-section">
      <div class="product-story-grid">
        <div class="product-story-image">
          <img src="${product.images.scene}" alt="${product.name} — Lifestyle" loading="lazy" />
        </div>
        <div class="product-story-text">
          <p class="story-eyebrow">The Story</p>
          <h2>Behind the ${product.name}</h2>
          <p>${product.story}</p>
        </div>
      </div>
    </div>

    <div class="product-specs">
      <h2>Details & Care</h2>
      <div class="specs-grid">
        <div class="spec-item"><h4>Materials</h4><p>${product.specs.materials}</p></div>
        <div class="spec-item"><h4>Size</h4><p>${product.specs.size}</p></div>
        <div class="spec-item"><h4>Weight</h4><p>${product.specs.weight}</p></div>
        <div class="spec-item"><h4>Care</h4><p>${product.specs.care}</p></div>
        <div class="spec-item spec-full"><h4>Origin</h4><p>${product.specs.origin}</p></div>
      </div>
    </div>

    <div class="related-products">
      <h2>You May Also Like</h2>
      <div class="related-grid">
        ${products.filter(p => p.id !== product.id).slice(0, 3).map(p => `
          <a href="product.html?id=${p.id}" class="product-card">
            <div class="product-image">
              <img src="${p.images.main}" alt="${p.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'img-placeholder\\'>${p.emoji}</div>'">
            </div>
            <div class="product-info">
              <h3 class="product-name">${p.name}</h3>
              <p class="product-material">${p.material}</p>
              <p class="product-price">$${p.price}.00</p>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
  `;

  document.querySelectorAll('.gallery-thumbs .thumb').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.gallery-thumbs .thumb').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('gallery-main-img').src = this.dataset.img;
    });
  });
}

// --- Cart Functions ---
function addToCart(productId) {
  const product = products.find(p => p.id === parseInt(productId));
  if (!product) return;

  const existing = cart.find(item => item.id === parseInt(productId));
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  updateCart();
  openCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== parseInt(productId));
  updateCart();
}

function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById('cart-count');
  if (countEl) countEl.textContent = count;

  const itemsEl = document.getElementById('cart-items');
  const footerEl = document.getElementById('cart-footer');
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.<br>Find something you love from the earth.</p>';
    if (footerEl) footerEl.style.display = 'none';
  } else {
    itemsEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-image">
          <img src="${item.images.main}" alt="${item.name}" onerror="this.textContent='${item.emoji}'" />
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">$${item.price}.00 × ${item.quantity}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">✕</button>
      </div>
    `).join('');
    if (footerEl) footerEl.style.display = 'block';
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalEl = document.getElementById('cart-total-price');
    if (totalEl) totalEl.textContent = `$${total}.00`;
  }
}

function openCart() {
  document.getElementById('cart-sidebar')?.classList.add('open');
  document.getElementById('cart-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-sidebar')?.classList.remove('open');
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// --- Header Scroll ---
function handleScroll() {
  const header = document.querySelector('.header');
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 10);
}

// --- Smooth Scroll ---
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });
}

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();

  // Update announcement bar if settings loaded
  if (settings.announcement) {
    const bar = document.querySelector('.announcement-bar span');
    if (bar) bar.textContent = settings.announcement;
  }

  renderProducts();
  renderProductDetail();
  updateCart();

  document.getElementById('cart-btn')?.addEventListener('click', openCart);
  document.getElementById('cart-close')?.addEventListener('click', closeCart);
  document.getElementById('cart-overlay')?.addEventListener('click', closeCart);

  window.addEventListener('scroll', handleScroll, { passive: true });
  initSmoothScroll();

  console.log(`🌱 ${settings.storeName || 'Terrene'} — ${settings.tagline || 'Wear the Earth'}`);
  console.log(`${products.length} products loaded from data.json`);
});
