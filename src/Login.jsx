import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin, cargando }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [intentos, setIntentos] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!user.trim()) {
      setError('El usuario es requerido');
      return;
    }

    if (!pass.trim()) {
      setError('La contraseña es requerida');
      return;
    }

    if (intentos >= 3) {
      setError('Demasiados intentos fallidos. Recarga la página.');
      return;
    }

    // Ejecutar login
    onLogin(user, pass);
    setIntentos(prev => prev + 1);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        
        <header className="login-header">
          <h1>Eazy Liens</h1>
          <p>Gestión Segura de Datos</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          
          {/* Error visible */}
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          {/* Usuario */}
          <div className="field-group">
            <label>Usuario</label>
            <input 
              className="input-moderno"
              type="text" 
              placeholder="Introduce tu usuario"
              value={user}
              onChange={(e) => {
                setUser(e.target.value);
                setError('');
              }}
              disabled={cargando}
              autoFocus
            />
          </div>

          {/* Contraseña */}
          <div className="field-group">
            <label>Contraseña</label>
            <div className="pass-container">
              <input 
                className="input-moderno"
                type={showPass ? "text" : "password"} 
                placeholder="••••••••"
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setError('');
                }}
                disabled={cargando}
              />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)} 
                className="btn-show"
                disabled={cargando}
              >
                {showPass ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          {/* Botón */}
          <button 
            className="btn-entrar" 
            type="submit" 
            disabled={cargando || intentos >= 3}
          >
            {cargando ? 'Verificando...' : 'Iniciar Sesión'}
          </button>

          {/* Contador de intentos */}
          {intentos > 0 && intentos < 3 && (
            <p className="intentos-restantes">
              Intentos: {intentos}/3
            </p>
          )}
        </form>

      </div>
    </div>
  );
};

export default Login;