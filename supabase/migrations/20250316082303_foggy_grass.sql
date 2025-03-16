/*
  # Исправление триггера создания пользователя

  1. Изменения
    - Улучшена обработка метаданных
    - Добавлена проверка уникальности телефона
    - Исправлена обработка ошибок
*/

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
    AND auth_id != new.id
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