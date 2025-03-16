/*
  # Исправление аутентификации и создания пользователя

  1. Изменения
    - Обновление триггера handle_new_user
    - Добавление проверки на существование телефона
    - Исправление обработки метаданных
*/

-- Обновляем функцию для корректной обработки метаданных
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  phone_number text;
  user_name text;
BEGIN
  -- Извлекаем телефон из email (до @)
  phone_number := split_part(new.email, '@', 1);
  -- Получаем имя из метаданных
  user_name := COALESCE(new.raw_user_meta_data->>'name', 'User');

  -- Проверяем, что телефон соответствует формату
  IF NOT (phone_number ~ '^(?:\+972|0)-?(?:[5789]\d)-?\d{3}-?\d{4}$') THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;

  -- Проверяем, что пользователь с таким телефоном не существует
  IF EXISTS (SELECT 1 FROM public.users WHERE phone = phone_number) THEN
    RAISE EXCEPTION 'User with this phone already exists';
  END IF;

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
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;