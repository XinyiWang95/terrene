// ============================================
// TERRENE — Store Application
// ============================================

// --- Product Data ---
const products = [
  {
    id: 1,
    name: 'Morning Ritual',
    material: 'Coffee Bean & Sandalwood',
    price: 22,
    emoji: '☕',
    bg: '#8B6914',
    badge: 'Bestseller',
    description: 'Real Arabica coffee beans paired with sandalwood beads. A tribute to your morning ritual.'
  },
  {
    id: 2,
    name: 'Forest Floor',
    material: 'Tagua Nut & Lava Rock',
    price: 28,
    emoji: '🌰',
    bg: '#6B8E23',
    badge: null,
    description: 'Smooth tagua nut beads with porous lava rock accents. Earthy and grounding.'
  },
  {
    id: 3,
    name: 'Amazon Dawn',
    material: 'Acai Seed & Coconut Shell',
    price: 26,
    emoji: '🫐',
    bg: '#5C4033',
    badge: null,
    description: 'Tiny acai seeds from the Amazon, threaded with coconut shell discs. Light as air.'
  },
  {
    id: 4,
    name: 'Desert Bloom',
    material: 'Lotus Seed & Terracotta',
    price: 24,
    emoji: '🌺',
    bg: '#C67B4B',
    badge: 'New',
    description: 'Sacred lotus seeds with warm terracotta beads. For the free spirit.'
  },
  {
    id: 5,
    name: 'Ocean Drift',
    material: 'Driftwood Seed & Aquamarine',
    price: 30,
    emoji: '🌊',
    bg: '#5B7B8A',
    badge: null,
    description: 'Sea-worn driftwood seeds paired with aquamarine chips. A piece of the shoreline.'
  },
  {
    id: 6,
    name: 'Garden Path',
    material: 'Mixed Botanicals & Brass',
    price: 34,
    emoji: '🌿',
    bg: '#8F9779',
    badge: null,
    description: 'A curated mix of seeds, beans, and a single brass accent. For the collector.'
  }
];

// --- Cart State ---
let cart = [];

// --- Render Products ---
function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  grid.innerHTML = products.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="product-image" style="background: linear-gradient(135deg, ${p.bg}22, ${p.bg}44, ${p.bg}22);">
        <div class="img-placeholder">${p.emoji}</div>
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
      </div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-material">${p.material}</p>
        <p class="product-price">$${p.price}.00</p>
        <button class="product-add" onclick="addToCart(${p.id})">Add to Cart</button>
      </div>
    </div>
  `).join('');
}

// --- Cart Functions ---
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  updateCart();
  openCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  updateCart();
}

function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById('cart-count');
  if (countEl) countEl.textContent = count;

  const itemsEl = document.getElementById('cart-items');
  const footerEl = document.getElementById('cart-footer');

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.<br>Find something you love from the earth.</p>';
    footerEl.style.display = 'none';
  } else {
    itemsEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-image" style="background: ${item.bg}22;">${item.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">$${item.price}.00 × ${item.quantity}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">✕</button>
      </div>
    `).join('');
    footerEl.style.display = 'block';

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    document.getElementById('cart-total-price').textContent = `$${total}.00`;
  }
}

function openCart() {
  document.getElementById('cart-sidebar').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cart-sidebar').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// --- Header Scroll Effect ---
function handleScroll() {
  const header = document.querySelector('.header');
  if (window.scrollY > 10) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

// --- Smooth Anchor Scrolling ---
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  updateCart();

  // Cart toggle
  document.getElementById('cart-btn').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('cart-overlay').addEventListener('click', closeCart);

  // Scroll
  window.addEventListener('scroll', handleScroll, { passive: true });

  // Smooth scroll
  initSmoothScroll();

  console.log('🌱 Terrene — Wear the Earth');
  console.log(`${products.length} products ready. Cart is waiting.`);
});
