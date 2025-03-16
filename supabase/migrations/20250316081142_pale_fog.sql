/*
  # Настройка аутентификации и авторизации

  1. Изменения в таблицах
    - Добавление auth_id в таблицу users
    - Связь с auth.users
    - Обновление RLS политик

  2. Триггеры
    - Автоматическое создание записи в users при регистрации
    - Обработка телефонной аутентификации

  3. Безопасность
    - Обновленные RLS политики для всех таблиц
*/

-- Добавляем поле auth_id в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);

-- Обновляем RLS политики для users
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid());

-- Создаем функцию для обработки новых пользователей
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    auth_id,
    phone,
    name,
    attempts_left,
    discount
  )
  VALUES (
    new.id,
    new.phone::text,
    new.raw_user_meta_data->>'name',
    (SELECT attempts_number FROM game_settings WHERE id = 1),
    3
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем триггер для автоматического создания записи в users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Обновляем RLS политики для attempts
DROP POLICY IF EXISTS "Users can insert own attempts" ON attempts;
DROP POLICY IF EXISTS "Users can read own attempts" ON attempts;

CREATE POLICY "Users can insert own attempts"
  ON attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can read own attempts"
  ON attempts
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );