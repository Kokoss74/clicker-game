/*
  # Создание начальной схемы базы данных

  1. Новые таблицы
    - `users` - таблица пользователей
      - `id` (uuid, primary key)
      - `name` (text, минимум 3 символа)
      - `phone` (text, уникальный, с валидацией израильского формата)
      - `attempts_left` (integer, по умолчанию 10)
      - `best_result` (integer, nullable)
      - `discount` (integer, по умолчанию 3)
      - `created_at` (timestamptz)

    - `attempts` - таблица попыток
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `difference` (integer)
      - `created_at` (timestamptz)

    - `game_settings` - настройки игры (singleton)
      - `id` (integer, primary key = 1)
      - `attempts_number` (integer)
      - `discount_ranges` (jsonb)

    - `admin_logs` - логи действий администратора
      - `id` (uuid, primary key)
      - `action` (text)
      - `details` (jsonb)
      - `ip_address` (text)
      - `created_at` (timestamptz)

  2. Безопасность
    - Включение RLS для всех таблиц
    - Политики доступа для пользователей
    - Политики доступа для администраторов

  3. Индексы
    - Индексы для оптимизации запросов
*/

-- Создание таблицы пользователей
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL CHECK (char_length(name) >= 3),
  phone TEXT NOT NULL UNIQUE CHECK (phone ~ '^(?:\+972|0)-?(?:[5789]\d)-?\d{3}-?\d{4}$'),
  attempts_left INTEGER NOT NULL DEFAULT 10,
  best_result INTEGER DEFAULT NULL,
  discount INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы попыток
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  difference INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы настроек игры
CREATE TABLE game_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  attempts_number INTEGER NOT NULL DEFAULT 10,
  discount_ranges JSONB NOT NULL DEFAULT '[
    {"min": 0, "max": 0, "discount": 25},
    {"min": 1, "max": 10, "discount": 15},
    {"min": 11, "max": 50, "discount": 10},
    {"min": 51, "max": 100, "discount": 5},
    {"min": 101, "max": null, "discount": 3}
  ]'::jsonb
);

-- Создание таблицы логов администратора
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  details JSONB NULL,
  ip_address TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включение RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы users
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Политики для таблицы attempts
CREATE POLICY "Users can insert own attempts"
  ON attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own attempts"
  ON attempts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Политики для таблицы game_settings
CREATE POLICY "Anyone can read game settings"
  ON game_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Политики для таблицы admin_logs
CREATE POLICY "Only service role can access admin logs"
  ON admin_logs
  USING (auth.role() = 'service_role');

-- Создание индексов
CREATE INDEX idx_users_phone ON users (phone);
CREATE INDEX idx_attempts_user_id ON attempts (user_id);
CREATE INDEX idx_attempts_created_at ON attempts (created_at);
CREATE INDEX idx_admin_logs_created_at ON admin_logs (created_at);

-- Вставка начальных настроек игры
INSERT INTO game_settings (id) VALUES (1) ON CONFLICT DO NOTHING;