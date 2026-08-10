// ============================================
// TERRENE — Supabase Client Configuration
// ============================================
// Replace these with your actual Supabase project values
// from: https://app.supabase.com → your project → Settings → API

const SUPABASE_URL = 'https://ofkfxibxcrkmdzwdlfxb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ma2Z4aWJ4Y3JrbWR6d2RsZnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyNjExNjksImV4cCI6MjEwMTgzNzE2OX0.9Cfp0csdQOvNUXS08XUcPEuOtbEmZ1ENf5e7iqGSSF0';

// ---- Admin token (set after Supabase Auth login; used for privileged writes) ----
// 说明：匿名 anon key 只能做 RLS 允许的公共操作（看商品/看设置/下单）。
// 登录后台后，把管理员用户的 JWT 注入这里，_headers() 会自动改用它，
// 从而通过 RLS 的 auth.uid() IS NOT NULL 校验，获得写权限。
// service_role key 绝不出现在本文件 / 本仓库。
let ADMIN_TOKEN = null;
function setAdminToken(token) { ADMIN_TOKEN = token || null; }

// ---- Supabase API helpers (no SDK needed for static site) ----

const DB = {
  _headers() {
    const auth = ADMIN_TOKEN || SUPABASE_KEY; // 登录后用管理员 JWT，否则用匿名 key
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + auth,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  },

  // --- Products ---
  async getProducts(activeOnly = true) {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') return null; // not configured
    let url = SUPABASE_URL + '/rest/v1/products?select=*&order=id.asc';
    if (activeOnly) url += '&active=is.true';
    const resp = await fetch(url, { headers: this._headers() });
    if (!resp.ok) throw new Error('Failed to fetch products: ' + resp.status);
    return resp.json();
  },

  async getAllProducts() {
    return this.getProducts(false);
  },

  async createProduct(product) {
    const resp = await fetch(SUPABASE_URL + '/rest/v1/products', {
      method: 'POST', headers: this._headers(),
      body: JSON.stringify(product)
    });
    if (!resp.ok) throw new Error('Failed to create product');
    return resp.json();
  },

  async updateProduct(id, updates) {
    const resp = await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + id, {
      method: 'PATCH', headers: this._headers(),
      body: JSON.stringify(updates)
    });
    if (!resp.ok) throw new Error('Failed to update product');
  },

  async deleteProduct(id) {
    const resp = await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + id, {
      method: 'DELETE', headers: this._headers()
    });
    if (!resp.ok) throw new Error('Failed to delete product');
  },

  // --- Orders ---
  async getOrders(statusFilter = null) {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') return [];
    let url = SUPABASE_URL + '/rest/v1/orders?select=*&order=created_at.desc';
    if (statusFilter && statusFilter !== 'all') url += '&status=eq.' + statusFilter;
    const resp = await fetch(url, { headers: this._headers() });
    if (!resp.ok) throw new Error('Failed to fetch orders: ' + resp.status);
    return resp.json();
  },

  async createOrder(order) {
    const resp = await fetch(SUPABASE_URL + '/rest/v1/orders', {
      method: 'POST', headers: this._headers(),
      body: JSON.stringify(order)
    });
    if (!resp.ok) throw new Error('Failed to create order');
    return resp.json();
  },

  async updateOrderStatus(orderId, status) {
    const resp = await fetch(SUPABASE_URL + '/rest/v1/orders?id=eq.' + orderId, {
      method: 'PATCH', headers: this._headers(),
      body: JSON.stringify({ status })
    });
    if (!resp.ok) throw new Error('Failed to update order');
  },

  // --- Settings ---
  async getSettings() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') return null;
    const resp = await fetch(SUPABASE_URL + '/rest/v1/settings?select=*&id=eq.1', {
      headers: this._headers()
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data[0] || null;
  },

  async saveSettings(settings) {
    const resp = await fetch(SUPABASE_URL + '/rest/v1/settings?id=eq.1', {
      method: 'PATCH', headers: this._headers(),
      body: JSON.stringify(settings)
    });
    if (!resp.ok) throw new Error('Failed to save settings');
  },

  // Check if Supabase is configured
  isReady() {
    return true;
  }
};

// ============================================
// Email Notification — sends you an email when a new order comes in
// Uses EmailJS (free tier: 200 emails/month)
// ============================================
// 1. Go to https://www.emailjs.com and sign up
// 2. Create an Email Service (choose "Gmail" if you use Gmail)
// 3. Create an Email Template with these variables:
//    {{order_id}} {{customer_name}} {{customer_email}} {{items}} {{total}} {{date}}
// 4. Copy your User ID, Service ID, and Template ID below

const EMAILJS_USER_ID = 'UA1MnJvWgwCxQZof-Pwnh';
const EMAILJS_SERVICE_ID = 'service_4zqefgh';
// Template 1: sent to YOU when a new order comes in
const EMAILJS_ADMIN_TEMPLATE_ID = 'template_3n3euor';
// Template 2: sent to CUSTOMER as order confirmation
const EMAILJS_CUSTOMER_TEMPLATE_ID = 'template_0jx0ild';
const ADMIN_EMAIL = 'xinyi_wang22@foxmail.com'; // your email

async function sendOrderEmail(order) {
  if (EMAILJS_USER_ID === 'YOUR_EMAILJS_USER_ID') {
    console.log('📧 EmailJS not configured. Order saved but no email sent.');
    return false;
  }

  const itemsText = (order.items || []).map(i => `${i.name} ×${i.quantity}`).join(', ');
  const dateStr = new Date(order.created_at).toLocaleString('zh-CN');
  const totalStr = '$' + Number(order.total).toFixed(2);

  const results = [];

  // 1. Send to YOU — order notification
  if (EMAILJS_ADMIN_TEMPLATE_ID !== 'YOUR_ADMIN_TEMPLATE_ID') {
    try {
      const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_ADMIN_TEMPLATE_ID,
          user_id: EMAILJS_USER_ID,
          template_params: {
            to_email: ADMIN_EMAIL,
            order_id: order.order_id,
            customer_name: order.customer_name || 'N/A',
            customer_email: order.customer_email || 'N/A',
            items: itemsText,
            total: totalStr,
            date: dateStr
          }
        })
      });
      results.push(resp.ok ? 'admin ✅' : 'admin ❌');
    } catch (e) { results.push('admin ❌'); }
  }

  // 2. Send to CUSTOMER — order confirmation
  if (EMAILJS_CUSTOMER_TEMPLATE_ID !== 'YOUR_CUSTOMER_TEMPLATE_ID' && order.customer_email) {
    try {
      const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_CUSTOMER_TEMPLATE_ID,
          user_id: EMAILJS_USER_ID,
          template_params: {
            to_email: order.customer_email,
            order_id: order.order_id,
            customer_name: order.customer_name || 'Friend',
            items: itemsText,
            total: totalStr,
            date: dateStr
          }
        })
      });
      results.push(resp.ok ? 'customer ✅' : 'customer ❌');
    } catch (e) { results.push('customer ❌'); }
  }

  console.log('📧 Email results:', results.join(', '));
  return results.every(r => r.includes('✅'));
}
