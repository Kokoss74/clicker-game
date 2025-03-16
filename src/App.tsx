import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from './store/auth';

function AuthForm() {
  const { signIn, signUp, error } = useAuthStore();
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [phone, setPhone] = React.useState('');
  const [name, setName] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      await signUp({ phone, name });
    } else {
      await signIn({ phone });
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Телефон"
        />
        {isSignUp && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя"
          />
        )}
        <button type="submit">
          {isSignUp ? 'Зарегистрироваться' : 'Войти'}
        </button>
      </form>
      <button onClick={() => setIsSignUp(!isSignUp)}>
        {isSignUp ? 'Уже есть аккаунт?' : 'Создать аккаунт'}
      </button>
      {error && <div>{error}</div>}
    </div>
  );
}

function App() {
  const { user, loading, checkUser } = useAuthStore();

  React.useEffect(() => {
    checkUser();
  }, []);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {!user ? (
          <AuthForm />
        ) : (
          <Routes>
            <Route path="/" element={<div>Главная страница</div>} />
            <Route path="/admin/*" element={<div>Админ панель</div>} />
          </Routes>
        )}
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;