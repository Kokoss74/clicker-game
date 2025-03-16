/*
  # Исправление ограничений для таблицы users

  1. Изменения
    - Добавление уникального ограничения для auth_id
    - Обновление существующих индексов
*/

-- Добавляем уникальное ограничение для auth_id
ALTER TABLE users ADD CONSTRAINT users_auth_id_key UNIQUE (auth_id);

-- Создаем индекс для auth_id для оптимизации поиска
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users (auth_id);

-- Обновляем функцию создания пользователя
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  phone_number text;
  user_name text;
BEGIN
  -- Получаем телефон и имя из метаданных
  phone_number := new.raw_user_meta_data->>'phone';
  user_name := COALESCE(new.raw_user_meta_data->>'name', 'User');

  -- Проверяем наличие телефона
  IF phone_number IS NULL THEN
    phone_number := split_part(new.email, '@', 1);
  END IF;

  -- Проверяем, что телефон соответствует формату
  IF NOT (phone_number ~ '^(?:\+972|0)-?(?:[5789]\d)-?\d{3}-?\d{4}$') THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;

  -- Проверяем уникальность телефона
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE phone = phone_number 
    AND auth_id IS DISTINCT FROM new.id
  ) THEN
    RAISE EXCEPTION 'Phone number already exists';
  END IF;

  -- Создаем или обновляем пользователя
  INSERT INTO public.users (
    auth_id,
    phone,
    name,
    attempts_left,
    discount
  )
  VALUES (
    new.id,
    phone_number,
    user_name,
    COALESCE((SELECT attempts_number FROM game_settings WHERE id = 1), 10),
    3
  )
  ON CONFLICT (auth_id) DO UPDATE
  SET
    phone = EXCLUDED.phone,
    name = EXCLUDED.name;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;