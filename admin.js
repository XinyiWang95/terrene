// ============================================
// TERRENE — 管理后台 (Supabase 驱动)
// ============================================

let data = { products: [], orders: [], settings: {} };
let editingProductId = null;
let useSupabase = false;

// --- Supabase Auth 登录保护（后台必须登录才能用） ---
let sbClient = null;
try {
  if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_KEY) {
    sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) { console.warn('Supabase client 初始化失败:', e); }

async function checkAuth() {
  const loginScreen = document.getElementById('login-screen');
  const app = document.getElementById('admin-app');
  // 没有 SDK 或配置 → 直接放行（离线模式，无需登录）
  if (!sbClient) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (app) app.style.display = '';
    return false;
  }
  const { data: { session } } = await sbClient.auth.getSession();
  if (session) {
    setAdminToken(session.access_token); // 用管理员 JWT 写库，通过 RLS
    if (loginScreen) loginScreen.style.display = 'none';
    if (app) app.style.display = '';
    return true;
  }
  if (loginScreen) loginScreen.style.display = 'flex';
  if (app) app.style.display = 'none';
  return false;
}

async function doLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  if (!email || !password || !sbClient) return false;
  errEl.textContent = '';
  btn.disabled = true; btn.textContent = '登录中…';
  try {
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setAdminToken(data.session.access_token);
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-app').style.display = '';
    await init(); // 登录成功 → 初始化后台
  } catch (err) {
    errEl.textContent = '登录失败：' + (err.message || '邮箱或密码错误');
  } finally {
    btn.disabled = false; btn.textContent = '登 录';
  }
  return false;
}

async function doLogout() {
  if (sbClient) { try { await sbClient.auth.signOut(); } catch (e) {} }
  setAdminToken(null);
  location.reload();
}

// --- 初始化 ---
async function init() {
  useSupabase = DB.isReady();

  if (useSupabase) {
    try {
      const [dbProducts, dbOrders, dbSettings] = await Promise.all([
        DB.getAllProducts(),
        DB.getOrders(),
        DB.getSettings()
      ]);
      data.products = dbProducts || [];
      data.orders = dbOrders || [];
      data.settings = dbSettings || {};
      console.log('📡 从 Supabase 加载:', data.products.length, '件商品,', data.orders.length, '个订单');
    } catch (e) {
      console.warn('Supabase 加载失败，尝试 data.json:', e.message);
      useSupabase = false;
    }
  }

  if (!useSupabase) {
    try {
      const resp = await fetch('data.json');
      data = await resp.json();
    } catch (e) {
      console.warn('未找到 data.json，从头开始');
    }
  }

  renderAll();
  setupTabs();
  updateConnectionStatus();
}

function updateConnectionStatus() {
  const el = document.getElementById('sidebar-status');
  if (!el) return;
  if (useSupabase) {
    el.innerHTML = '🟢 已连接 Supabase · 已登录';
    el.style.color = '#6B8E23';
  } else {
    el.innerHTML = '⚪ 离线模式 · <a href="#" onclick="alert(\'1. 前往 app.supabase.com\\n2. 创建项目\\n3. 复制 URL 和 anon key\\n4. 粘贴到 supabase.js\\n5. 在 SQL Editor 运行 supabase-schema.sql\')" style="color:var(--color-terracotta);">设置 →</a>';
    el.style.color = '';
  }
}

// --- 标签页切换 ---
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

// --- 商品管理 ---
function renderProducts() {
  const tbody = document.getElementById('products-tbody');
  const count = document.getElementById('product-count');
  if (!tbody) return;

  if (data.products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);">
      暂无商品，点击上方「添加商品」开始
    </td></tr>`;
  } else {
    tbody.innerHTML = data.products.map((p, i) => `
      <tr>
        <td><img src="${p.images?.main || ''}" class="table-img" onerror="this.style.display='none'" /></td>
        <td><strong>${p.name}</strong><br><small style="color:var(--text-muted)">${p.material}</small></td>
        <td>$${Number(p.price).toFixed(2)}</td>
        <td>${p.stock || 0}</td>
        <td><span class="status-badge ${p.active !== false ? 'status-active' : 'status-inactive'}">${p.active !== false ? '上架' : '下架'}</span></td>
        <td>
          <div class="action-btns">
            <button onclick="editProduct(${i})" title="编辑">✏️</button>
            <button onclick="toggleProduct(${i})" title="${p.active !== false ? '下架' : '上架'}">${p.active !== false ? '👁️' : '▶️'}</button>
            <button class="btn-del" onclick="deleteProduct(${i})" title="删除">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

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
    title.textContent = '编辑商品';
    saveBtn.textContent = '更新商品';
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
    title.textContent = '添加商品';
    saveBtn.textContent = '保存商品';
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

async function saveProduct() {
  const product = {
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

  if (useSupabase) {
    try {
      if (editingProductId !== null) {
        const existing = data.products[editingProductId];
        await DB.updateProduct(existing.id, product);
        showToast('商品已更新！');
      } else {
        const result = await DB.createProduct(product);
        if (result && result[0]) data.products.push(result[0]);
        showToast('商品已添加！');
      }
      data.products = await DB.getAllProducts();
    } catch (e) {
      showToast('保存失败: ' + e.message, true);
    }
  } else {
    if (editingProductId !== null) {
      product.id = data.products[editingProductId].id;
      product.active = data.products[editingProductId].active;
      data.products[editingProductId] = product;
    } else {
      product.id = (Math.max(0, ...data.products.map(p => p.id))) + 1;
      data.products.push(product);
    }
    showToast(editingProductId !== null ? '商品已更新！（本地）' : '商品已添加！（本地）');
  }

  closeProductModal();
  renderProducts();
}

function editProduct(idx) { openProductModal(idx); }

async function toggleProduct(idx) {
  const p = data.products[idx];
  const newActive = !(p.active !== false);

  if (useSupabase) {
    try {
      await DB.updateProduct(p.id, { active: newActive });
      data.products = await DB.getAllProducts();
      showToast(newActive ? '商品已上架' : '商品已下架');
    } catch (e) {
      showToast('操作失败: ' + e.message, true);
    }
  } else {
    p.active = newActive;
    showToast(newActive ? '商品已上架' : '商品已下架');
  }
  renderProducts();
}

async function deleteProduct(idx) {
  const p = data.products[idx];
  if (!confirm(`确认删除「${p.name}」？此操作不可撤销。`)) return;

  if (useSupabase) {
    try {
      await DB.deleteProduct(p.id);
      data.products = await DB.getAllProducts();
      showToast('商品已删除', true);
    } catch (e) {
      showToast('删除失败: ' + e.message, true);
    }
  } else {
    data.products.splice(idx, 1);
    showToast('商品已删除', true);
  }
  renderProducts();
}

// --- 订单管理 ---
function renderOrders() {
  const tbody = document.getElementById('orders-tbody');
  const count = document.getElementById('order-count');
  if (!tbody) return;

  const filter = document.getElementById('order-status-filter')?.value || 'all';
  let orders = data.orders || [];
  if (filter !== 'all') orders = orders.filter(o => o.status === filter);

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-muted);">
      ${useSupabase ? '暂无订单。客户付款后订单会自动出现在这里。' : '暂无订单。连接 Supabase 后可查看实时订单。'}
    </td></tr>`;
  } else {
    const statusMap = { paid: '已付款', processing: '处理中', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><code>${o.order_id || o.id}</code></td>
        <td>${(o.created_at || o.date || '').substring(0, 10)}</td>
        <td>${o.customer_name || o.customer?.name || '—'}<br><small style="color:var(--text-muted)">${o.customer_email || o.customer?.email || ''}</small></td>
        <td>${(o.items || []).map ? (o.items).map(it => `${it.name} ×${it.quantity}`).join('<br>') : '-'}</td>
        <td>$${Number(o.total).toFixed(2)}</td>
        <td><span class="status-badge status-${o.status}">${statusMap[o.status] || o.status}</span></td>
        <td>
          <div class="action-btns">
            <select onchange="updateOrderStatus('${o.order_id || o.id}', this.value)" style="padding:4px 8px;background:var(--bg-primary);border:1px solid var(--border);color:var(--text-primary);border-radius:4px;font-size:0.75rem;">
              <option value="">更新状态...</option>
              <option value="paid">已付款</option>
              <option value="processing">处理中</option>
              <option value="shipped">已发货</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
        </td>
      </tr>
    `).join('');
  }

  if (count) count.textContent = orders.length;
}

async function updateOrderStatus(orderId, newStatus) {
  if (!newStatus) return;

  if (useSupabase) {
    try {
      await DB.updateOrderStatus(orderId, newStatus);
      data.orders = await DB.getOrders(document.getElementById('order-status-filter')?.value || 'all');
      showToast(`订单 ${orderId} → ${newStatus}`);
    } catch (e) {
      showToast('更新失败: ' + e.message, true);
    }
  } else {
    const order = (data.orders || []).find(o => (o.order_id || o.id) === orderId);
    if (order) { order.status = newStatus; showToast(`订单 ${orderId} → ${newStatus}`); }
  }
  renderOrders();
}

// --- 店铺设置 ---
function renderSettings() {
  const form = document.getElementById('settings-form');
  if (!form) return;
  const s = data.settings || {};
  form.innerHTML = `
    <div class="form-grid">
      <div class="form-group"><label>店铺名称</label><input type="text" id="set-name" value="${esc(s.storeName || '')}"></div>
      <div class="form-group"><label>品牌口号</label><input type="text" id="set-tagline" value="${esc(s.tagline || '')}"></div>
      <div class="form-group"><label>联系邮箱</label><input type="email" id="set-email" value="${esc(s.contactEmail || '')}"></div>
      <div class="form-group"><label>包邮门槛 ($)</label><input type="number" id="set-shipping" value="${s.freeShippingThreshold || 50}"></div>
      <div class="form-group form-full"><label>顶部公告栏</label><input type="text" id="set-announcement" value="${esc(s.announcement || '')}"></div>
    </div>
  `;
}

async function saveSettings() {
  const newSettings = {
    storeName: document.getElementById('set-name')?.value || 'Terrene',
    tagline: document.getElementById('set-tagline')?.value || 'Wear the Earth',
    contactEmail: document.getElementById('set-email')?.value || '',
    freeShippingThreshold: parseInt(document.getElementById('set-shipping')?.value) || 50,
    announcement: document.getElementById('set-announcement')?.value || ''
  };

  if (useSupabase) {
    try {
      await DB.saveSettings(newSettings);
      data.settings = newSettings;
      showToast('设置已保存到 Supabase！');
    } catch (e) {
      showToast('保存失败: ' + e.message, true);
    }
  } else {
    data.settings = newSettings;
    showToast('设置已保存！（本地）');
  }
}

// --- 数据导出 ---
function exportJSON() {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('data.json 已导出！');
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
        showToast('数据导入成功！');
      } catch (err) {
        showToast('无效的 JSON 文件', true);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetData() {
  if (!confirm('确认重置所有数据？这将清空商品、订单和设置，且不可撤销。')) return;
  data = { products: [], orders: [], settings: {} };
  renderAll();
  showToast('数据已重置');
}

// --- 从 Supabase 同步 ---
async function syncFromSupabase() {
  if (!useSupabase) {
    showToast('Supabase 未配置。请先编辑 supabase.js。', true);
    return;
  }
  try {
    const [dbProducts, dbOrders, dbSettings] = await Promise.all([
      DB.getAllProducts(),
      DB.getOrders(),
      DB.getSettings()
    ]);
    data.products = dbProducts || [];
    data.orders = dbOrders || [];
    data.settings = dbSettings || {};
    renderAll();
    showToast('已从 Supabase 同步！');
  } catch (e) {
    showToast('同步失败: ' + e.message, true);
  }
}

// --- 工具函数 ---
function getVal(id) { return document.getElementById(id)?.value || ''; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function esc(str) { return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

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

// 点击遮罩关闭弹窗
document.addEventListener('click', function(e) {
  if (e.target.id === 'product-modal-overlay') closeProductModal();
});

// 启动：先检查登录，已登录才初始化后台
document.addEventListener('DOMContentLoaded', async () => {
  const authed = await checkAuth();
  if (authed) await init();
});
