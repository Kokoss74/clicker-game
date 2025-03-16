/*
  # Обновление триггера для работы с email аутентификацией

  1. Изменения
    - Обновление функции handle_new_user для работы с email
    - Использование метаданных для хранения телефона
*/

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
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'name',
    (SELECT attempts_number FROM game_settings WHERE id = 1),
    3
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;