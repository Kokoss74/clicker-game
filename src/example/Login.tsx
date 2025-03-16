import React, { useState } from "react";
import { useSupabase } from "../hooks/useSupabase";
import { User } from "../types/user";
import { toast } from "react-toastify";
import { validateIsraeliPhone } from "../auth";

interface LoginProps {
  setUser: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ setUser }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [showRegistration, setShowRegistration] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const { loginUser, registerUser } = useSupabase();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
    setPhoneError("");
  };

  const handleCheckUser = async () => {
    try {
      // Проверяем формат номера
      if (!validateIsraeliPhone(phoneNumber)) {
        setPhoneError(
          "Неверный формат номера телефона. Введите номер в израильском формате (например, 050-1234567 или +972-501234567)"
        );
        return;
      }

      // Авторизуем пользователя
      const user = await loginUser(phoneNumber);

      if (user) {
        // Пользователь существует, устанавливаем его в состояние
        setUser(user);
      } else {
        // Пользователь не зарегистрирован, показываем форму регистрации
        setShowRegistration(true);
      }
    } catch (error) {
      console.error("Ошибка при проверке пользователя:", error);
    }
  };

  const handleRegister = async () => {
    try {
      // Проверяем, что имя не пустое
      if (!name.trim()) {
        toast.error("Введите ваше имя");
        return;
      }

      // Проверяем формат номера еще раз
      if (!validateIsraeliPhone(phoneNumber)) {
        setPhoneError(
          "Неверный формат номера телефона. Введите номер в израильском формате (например, 050-1234567 или +972-501234567)"
        );
        return;
      }

      // Регистрация пользователя
      const user = await registerUser(name, phoneNumber);

      if (user) {
        // Успешная регистрация, устанавливаем пользователя в состояние
        setUser(user);
        setShowRegistration(false);
      }
    } catch (error) {
      console.error("Ошибка при регистрации пользователя:", error);
    }
  };

  return (
    <div className="login-container">
      <h2>Вход/Регистрация</h2>
      {showRegistration ? (
        <div className="registration-form">
          <div className="form-group">
            <label htmlFor="name">Имя</label>
            <input
              id="name"
              type="text"
              placeholder="Введите ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Номер телефона</label>
            <input
              id="phone"
              type="tel"
              placeholder="Например: 050-1234567"
              value={phoneNumber}
              onChange={handlePhoneChange}
              className={phoneError ? "error" : ""}
            />
            {phoneError && <p className="error-message">{phoneError}</p>}
          </div>
          <div className="button-group">
            <button onClick={() => setShowRegistration(false)}>Назад</button>
            <button onClick={handleRegister} className="primary-button">Зарегистрироваться</button>
          </div>
        </div>
      ) : (
        <div className="login-form">
          <div className="form-group">
            <label htmlFor="phone">Номер телефона</label>
            <input
              id="phone"
              type="tel"
              placeholder="Например: 050-1234567 или +972-501234567"
              value={phoneNumber}
              onChange={handlePhoneChange}
              className={phoneError ? "error" : ""}
            />
            {phoneError && <p className="error-message">{phoneError}</p>}
          </div>
          <button onClick={handleCheckUser} className="primary-button">Продолжить</button>
        </div>
      )}
    </div>
  );
};

export default Login;
