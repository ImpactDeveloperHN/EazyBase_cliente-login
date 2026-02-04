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
        
        {/* ✅ HEADER CON LOGOS - ImpactBPO principal, EazyLiens secundario */}
        <header className="login-header">
          <div className="logos-container" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* ImpactBPO - Logo PRINCIPAL (más grande) */}
            <img 
              src="/logo-impact.png" 
              alt="ImpactBPO" 
              style={{ 
                height: '50px', 
                width: 'auto',
                objectFit: 'contain'
              }} 
            />
            
            {/* Separador */}
            <div style={{ 
              width: '1px', 
              height: '40px', 
              backgroundColor: 'rgba(255,255,255,0.2)' 
            }} />
            
            {/* EazyLiens - Logo SECUNDARIO (más pequeño) */}
            <img 
              src="/logo-eazy.png" 
              alt="EazyLiens" 
              style={{ 
                height: '30px', 
                width: 'auto',
                objectFit: 'contain',
                opacity: 0.9
              }} 
            />
          </div>
          
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
            Gestión Segura de Datos
          </p>
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