-- ============================================
-- TERRENE — RLS 安全加固脚本
-- ============================================
-- 适用：你已经运行过 supabase-schema.sql（表已存在、但权限还是“任何人可增删改查”）。
-- 做法：在 Supabase 后台 → SQL Editor → New Query，粘贴本文件全部内容 → Run。
-- 效果：
--   • 商品：所有人可读；只有“登录的管理员”能增删改
--   • 订单：任何人可下单(INSERT)；只有“登录的管理员”能查看/修改
--   • 设置：所有人可读；只有“登录的管理员”能修改
-- 说明：“登录的管理员”= 在 Supabase Auth 里创建的用户（见部署说明）。
--       匿名 anon key 不再拥有任何写权限，即使仓库是公开的也无所谓。
-- ============================================

-- 1) 撤销旧的“开放”策略（USING (true) 全开）
DROP POLICY IF EXISTS "Public read products"  ON products;
DROP POLICY IF EXISTS "Admin write products"  ON products;
DROP POLICY IF EXISTS "Admin read orders"     ON orders;
DROP POLICY IF EXISTS "Public create orders"  ON orders;
DROP POLICY IF EXISTS "Admin update orders"   ON orders;
DROP POLICY IF EXISTS "Admin read settings"   ON settings;
DROP POLICY IF EXISTS "Admin write settings"  ON settings;

-- 确保 RLS 开启（幂等）
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 2) products：公共只读；登录管理员可写
CREATE POLICY "Public read products"
  ON products FOR SELECT USING (true);

CREATE POLICY "Admin write products"
  ON products FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3) orders：任何人可下单；登录管理员可读/改
CREATE POLICY "Public create orders"
  ON orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin read orders"
  ON orders FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin update orders"
  ON orders FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4) settings：公共只读；登录管理员可写
CREATE POLICY "Public read settings"
  ON settings FOR SELECT USING (true);

CREATE POLICY "Admin write settings"
  ON settings FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
