// ============================================
// TERRENE — Admin Panel
// ============================================

let data = { products: [], orders: [], settings: {} };
let editingProductId = null;

// --- Load data ---
async function init() {
  try {
    const resp = await fetch('data.json');
    data = await resp.json();
  } catch (e) {
    console.warn('No data.json found, starting fresh');
  }
  renderAll();
  setupTabs();
}

// --- Tab Navigation ---
function setupTabs() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      document.getElementById('tab-' + this.dataset.tab)?.classList.add('active');
    });
  });
}

function renderAll() {
  renderProducts();
  renderOrders();
  renderSettings();
}

// --- Products ---
function renderProducts() {
  const tbody = document.getElementById('products-tbody');
  const count = document.getElementById('product-count');
  if (!tbody) return;

  tbody.innerHTML = data.products.map((p, i) => `
    <tr>
      <td><img src="${p.images?.main || ''}" class="table-img" onerror="this.style.display='none'" /></td>
      <td><strong>${p.name}</strong><br><small style="color:var(--text-muted)">${p.material}</small></td>
      <td>$${p.price.toFixed(2)}</td>
      <td>${p.stock || 0}</td>
      <td><span class="status-badge ${p.active !== false ? 'status-active' : 'status-inactive'}">${p.active !== false ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div class="action-btns">
          <button onclick="editProduct(${i})" title="Edit">✏️</button>
          <button onclick="toggleProduct(${i})" title="${p.active !== false ? 'Deactivate' : 'Activate'}">${p.active !== false ? '👁️' : '▶️'}</button>
          <button class="btn-del" onclick="deleteProduct(${i})" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  if (count) count.textContent = data.products.length;
}

function openProductModal(idx = null) {
  editingProductId = idx;
  const modal = document.getElementById('product-modal');
  const overlay = document.getElementById('product-modal-overlay');
  const title = document.getElementById('modal-title');
  const saveBtn = document.getElementById('modal-save-btn');

  if (idx !== null && data.products[idx]) {
    const p = data.products[idx];
    title.textContent = 'Edit Product';
    saveBtn.textContent = 'Update Product';
    setVal('prod-name', p.name);
    setVal('prod-slug', p.slug);
    setVal('prod-material', p.material);
    setVal('prod-price', p.price);
    setVal('prod-emoji', p.emoji);
    setVal('prod-bg', p.bg);
    setVal('prod-badge', p.badge || '');
    setVal('prod-stock', p.stock || 0);
    setVal('prod-description', p.description);
    setVal('prod-story', p.story);
    setVal('prod-img-main', p.images?.main || '');
    setVal('prod-img-detail', p.images?.detail || '');
    setVal('prod-img-wear', p.images?.wear || '');
    setVal('prod-img-scene', p.images?.scene || '');
    setVal('prod-specs-materials', p.specs?.materials || '');
    setVal('prod-specs-size', p.specs?.size || '');
    setVal('prod-specs-weight', p.specs?.weight || '');
    setVal('prod-specs-care', p.specs?.care || '');
    setVal('prod-specs-origin', p.specs?.origin || '');
  } else {
    title.textContent = 'Add Product';
    saveBtn.textContent = 'Save Product';
    clearForm();
    editingProductId = null;
  }

  modal.classList.add('open');
  overlay.classList.add('open');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('open');
  document.getElementById('product-modal-overlay').classList.remove('open');
  editingProductId = null;
}

function saveProduct() {
  const product = {
    id: editingProductId !== null ? data.products[editingProductId].id : (Math.max(0, ...data.products.map(p => p.id)) + 1),
    slug: getVal('prod-slug'),
    name: getVal('prod-name'),
    material: getVal('prod-material'),
    price: parseFloat(getVal('prod-price')) || 0,
    emoji: getVal('prod-emoji'),
    bg: getVal('prod-bg'),
    badge: getVal('prod-badge') || null,
    active: true,
    stock: parseInt(getVal('prod-stock')) || 0,
    description: getVal('prod-description'),
    story: getVal('prod-story'),
    images: {
      main: getVal('prod-img-main'),
      detail: getVal('prod-img-detail'),
      wear: getVal('prod-img-wear'),
      scene: getVal('prod-img-scene')
    },
    specs: {
      materials: getVal('prod-specs-materials'),
      size: getVal('prod-specs-size'),
      weight: getVal('prod-specs-weight'),
      care: getVal('prod-specs-care'),
      origin: getVal('prod-specs-origin')
    }
  };

  if (editingProductId !== null) {
    product.id = data.products[editingProductId].id;
    product.active = data.products[editingProductId].active;
    data.products[editingProductId] = product;
  } else {
    data.products.push(product);
  }

  closeProductModal();
  renderProducts();
  showToast(editingProductId !== null ? 'Product updated!' : 'Product added!');
}

function editProduct(idx) { openProductModal(idx); }

function toggleProduct(idx) {
  data.products[idx].active = !(data.products[idx].active !== false);
  renderProducts();
  showToast(data.products[idx].active ? 'Product activated' : 'Product deactivated');
}

function deleteProduct(idx) {
  if (!confirm(`Delete "${data.products[idx].name}"? This cannot be undone.`)) return;
  data.products.splice(idx, 1);
  renderProducts();
  showToast('Product deleted', true);
}

// --- Orders ---
function renderOrders() {
  const tbody = document.getElementById('orders-tbody');
  const count = document.getElementById('order-count');
  if (!tbody) return;

  const filter = document.getElementById('order-status-filter')?.value || 'all';
  let orders = data.orders || [];
  if (filter !== 'all') orders = orders.filter(o => o.status === filter);

  tbody.innerHTML = orders.map((o, i) => `
    <tr>
      <td><code>${o.id}</code></td>
      <td>${o.date}</td>
      <td>${o.customer?.name}<br><small style="color:var(--text-muted)">${o.customer?.email}</small></td>
      <td>${o.items?.map(it => `${it.name} ×${it.quantity}`).join('<br>') || '-'}</td>
      <td>$${o.total.toFixed(2)}</td>
      <td><span class="status-badge status-${o.status}">${o.status}</span></td>
      <td>
        <div class="action-btns">
          <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:4px 8px;background:var(--bg-primary);border:1px solid var(--border);color:var(--text-primary);border-radius:4px;font-size:0.75rem;">
            <option value="">Update...</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </td>
    </tr>
  `).join('');

  if (count) count.textContent = orders.length;
}

function updateOrderStatus(orderId, newStatus) {
  if (!newStatus) return;
  const order = (data.orders || []).find(o => o.id === orderId);
  if (order) { order.status = newStatus; renderOrders(); showToast(`Order ${orderId} → ${newStatus}`); }
}

// --- Settings ---
function renderSettings() {
  const form = document.getElementById('settings-form');
  if (!form) return;
  const s = data.settings || {};
  form.innerHTML = `
    <div class="form-grid">
      <div class="form-group"><label>Store Name</label><input type="text" id="set-name" value="${esc(s.storeName || '')}"></div>
      <div class="form-group"><label>Tagline</label><input type="text" id="set-tagline" value="${esc(s.tagline || '')}"></div>
      <div class="form-group"><label>Currency</label><input type="text" id="set-currency" value="${esc(s.currency || 'USD')}"></div>
      <div class="form-group"><label>Free Shipping Threshold ($)</label><input type="number" id="set-shipping" value="${s.freeShippingThreshold || 50}"></div>
      <div class="form-group form-full"><label>Announcement Bar</label><input type="text" id="set-announcement" value="${esc(s.announcement || '')}"></div>
    </div>
  `;
}

function saveSettings() {
  data.settings = {
    storeName: document.getElementById('set-name')?.value || 'Terrene',
    tagline: document.getElementById('set-tagline')?.value || 'Wear the Earth',
    currency: document.getElementById('set-currency')?.value || 'USD',
    freeShippingThreshold: parseInt(document.getElementById('set-shipping')?.value) || 50,
    announcement: document.getElementById('set-announcement')?.value || ''
  };
  showToast('Settings saved!');
}

// --- Export ---
function exportJSON() {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('data.json exported! Upload this to your site.');
}

function loadFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        data = JSON.parse(ev.target.result);
        renderAll();
        showToast('Data imported successfully!');
      } catch (err) {
        showToast('Invalid JSON file', true);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetData() {
  if (!confirm('Reset all data? This will clear products, orders, and settings. This cannot be undone.')) return;
  data = { products: [], orders: [], settings: {} };
  renderAll();
  showToast('Data reset');
}

// --- Helpers ---
function getVal(id) { return document.getElementById(id)?.value || ''; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function esc(str) { return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function clearForm() {
  ['prod-name','prod-slug','prod-material','prod-price','prod-emoji','prod-bg','prod-badge','prod-stock',
   'prod-description','prod-story','prod-img-main','prod-img-detail','prod-img-wear','prod-img-scene',
   'prod-specs-materials','prod-specs-size','prod-specs-weight','prod-specs-care','prod-specs-origin']
    .forEach(id => setVal(id, ''));
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + (isError ? 'error' : '');
  setTimeout(() => { toast.classList.add('show'); }, 10);
  setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
  if (e.target.id === 'product-modal-overlay') closeProductModal();
});

// Init
document.addEventListener('DOMContentLoaded', init);
