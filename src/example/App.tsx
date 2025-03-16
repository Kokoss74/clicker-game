import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase/client'
import Game from './components/Game'
import Login from './components/Login.tsx'
import AdminPanel from './components/AdminPanel.tsx'
import { useAuthStore } from './auth'
import { User } from './types/user'

function App() {
  const { user, loading, checkUser } = useAuthStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Проверяем состояние аутентификации при загрузке
    const initAuth = async () => {
      await checkUser();
      setInitialized(true);
    };
    
    initAuth();
    
    // Слушаем изменения аутентификации
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          checkUser();
        } else if (event === 'SIGNED_IN') {
          checkUser();
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [checkUser]);

  if (loading || !initialized) {
    return <div className="flex justify-center items-center h-screen">Загрузка...</div>
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Game user={user} /> : <Login setUser={(userData: User) => {
        // Используем setUser только как колбэк для Login
        // Реальное состояние управляется через useAuthStore
      }} />} />
      <Route
        path="/admin"
        element={
          <AdminPanel />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App