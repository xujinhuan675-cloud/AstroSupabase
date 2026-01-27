-- 设置管理员用户的 SQL 脚本
-- 在 Supabase SQL Editor 中执行此脚本

-- 更新指定用户为管理员
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE id IN (
  '372a716c-2c7d-44ca-a7fb-3dd221cedb60',
  '851af13c-6923-47aa-b25a-95044d032b07'
);

-- 验证更新结果
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'nickname' as nickname,
  created_at
FROM auth.users
WHERE id IN (
  '372a716c-2c7d-44ca-a7fb-3dd221cedb60',
  '851af13c-6923-47aa-b25a-95044d032b07'
);
