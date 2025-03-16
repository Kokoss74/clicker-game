/*
  # Создание таблицы администраторов и логов

  1. Новые таблицы
    - `admins`
      - `id` (uuid, primary key)
      - `password_hash` (text)
      - `failed_attempts` (integer)
      - `locked_until` (timestamptz)
      - `created_at` (timestamptz)
    - `admin_logs`
      - `id` (uuid, primary key)
      - `action` (text)
      - `details` (jsonb)
      - `ip_address` (text)
      - `created_at` (timestamptz)

  2. Безопасность
    - Включение RLS для обеих таблиц
    - Политики доступа только для сервисной роли
*/

-- Создание таблицы администраторов
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  password_hash TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включение RLS для admins
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Политики доступа для admins
CREATE POLICY "Only service role can access admins"
  ON admins
  FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text);

-- Обновление таблицы admin_logs
DO $$ 
BEGIN
  -- Удаляем существующие записи и внешние ключи, если они есть
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'admin_logs'
  ) THEN
    DROP TABLE IF EXISTS admin_logs CASCADE;
  END IF;

  -- Создаем таблицу admin_logs заново
  CREATE TABLE admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Создаем индексы
  CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs (created_at);

  -- Включаем RLS
  ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

  -- Создаем политику доступа
  CREATE POLICY "Only service role can access admin logs"
    ON admin_logs
    FOR ALL
    TO public
    USING (auth.role() = 'service_role'::text);
END $$;