import React, { useState } from 'react'; 
import './Toolbar.css';

const PALETA_OFFICE = [
  '#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646',
  '#f2f2f2', '#7f7f7f', '#ddd9c3', '#c6d9f0', '#dbe5f1', '#f2dbdb', '#eaf1dd', '#e5e0ec', '#dbeef3', '#fdeada',
  '#d8d8d8', '#595959', '#c4bd97', '#8db3e2', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#b7dee8', '#fbd5b5'
];

const Toolbar = ({ 
  filaSeleccionada, onNuevaFila, onBorrarFila, onCambiarColor, 
  busqueda, setBusqueda, pagina, setPagina, totalPaginas,
  username, userRole, totalDatos, setVerAdmin, setVerUsuarios, setVerLogs, 
  onResetTamanos, onExportarExcel, onLogout, puedePintar
}) => {
  
  const [menuAbierto, setMenuAbierto] = useState(null); 

  // PERMISOS
  const roleSeguro = (userRole || 'User').toLowerCase();
  const esSuperadmin = roleSeguro === 'superadmin';
  const esAdmin = roleSeguro === 'admin';

  return (
    <header className="unified-toolbar" onClick={() => setMenuAbierto(null)}>
      
      <div className="group-actions">
        <button className="btn-app btn-create" onClick={(e) => { e.stopPropagation(); onNuevaFila(); }}>
          + NUEVA FILA
        </button>

        {(esSuperadmin || esAdmin) && (
          <button 
            className={`btn-app btn-delete ${filaSeleccionada ? 'active' : ''}`} 
            onClick={(e) => { e.stopPropagation(); onBorrarFila(); }} 
            disabled={!filaSeleccionada}
            title={!filaSeleccionada ? 'Selecciona una fila primero' : 'Borrar fila seleccionada'}
          >
            🗑️ BORRAR
          </button>
        )}
      </div>

      <div className="group-style">
        <span className="label-neon">ESTILO</span>
        <button 
          className={`icon-v ${!puedePintar ? 'disabled' : ''}`}
          title={!puedePintar ? 'Selecciona una celda o fila que se pueda pintar' : 'Color de Fondo'} 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (puedePintar) setMenuAbierto(menuAbierto === 'bg' ? null : 'bg'); 
          }}
          disabled={!puedePintar}
        >
          🪣
        </button>
        
        {menuAbierto && puedePintar && (
          <div className="office-palette" onClick={(e) => e.stopPropagation()}>
            <div className="grid-colors">
              {PALETA_OFFICE.map(c => (
                <div 
                  key={c} 
                  className="color-square" 
                  style={{backgroundColor: c}} 
                  onClick={() => {
                    onCambiarColor(menuAbierto, c);
                    setMenuAbierto(null);
                  }} 
                  title={c}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="group-search">
        <input 
          className="input-neon-search" 
          placeholder="Buscar datos..." 
          value={busqueda} 
          onChange={(e) => setBusqueda(e.target.value)} 
        />
        {busqueda && (
          <button 
            className="btn-clear-search" 
            onClick={(e) => { e.stopPropagation(); setBusqueda(''); }}
            title="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
        <span className="total-badge">{(totalDatos || 0).toLocaleString()} registros</span>
      </div>

      <div className="group-user">
        
        {/* SUPERADMIN: Todos los botones */}
        {esSuperadmin && (
          <>
            <button 
              className="btn-admin-config"
              onClick={(e) => { e.stopPropagation(); setVerAdmin(true); }}
              title="Administrar listas desplegables"
            >
              ⚙️ Editar Listas
            </button>
            
            <button 
              className="btn-reset-sizes"
              onClick={(e) => { e.stopPropagation(); onResetTamanos(); }}
              title="Restaurar tamaños predeterminados"
            >
              📐 Resetear
            </button>

            <button 
              className="btn-super-admin" 
              onClick={(e) => { e.stopPropagation(); setVerUsuarios(true); }}
              title="Gestionar Usuarios"
            >
              👑 Usuarios
            </button>

            <button
              className="btn-admin-config"
              onClick={(e) => { e.stopPropagation(); setVerLogs(true); }}
              title="Ver historial de cambios"
            >
              📋 Logs
            </button>
          </>
        )}

        {/* ADMIN: Solo Editar Listas y Usuarios */}
        {esAdmin && (
          <>
            <button 
              className="btn-admin-config"
              onClick={(e) => { e.stopPropagation(); setVerAdmin(true); }}
              title="Administrar listas desplegables"
            >
              ⚙️ Editar Listas
            </button>

            <button 
              className="btn-super-admin" 
              onClick={(e) => { e.stopPropagation(); setVerUsuarios(true); }}
              title="Gestionar Usuarios"
            >
              👑 Usuarios
            </button>
          </>
        )}

        {/* Todos ven Excel */}
        <button className="btn-action" onClick={onExportarExcel} title="Exportar a Excel">
          📥 Excel
        </button>

        <div className="pagination-compact">
          <button 
            onClick={(e) => { e.stopPropagation(); setPagina(Math.max(0, pagina - 1)); }} 
            disabled={pagina === 0}
            title="Página anterior"
          >
            ◀
          </button>
          <span className="page-txt">
            Pág. {pagina + 1} {totalPaginas > 0 && `de ${totalPaginas}`}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); setPagina(pagina + 1); }}
            disabled={pagina >= totalPaginas - 1 || totalPaginas === 0}
            title="Página siguiente"
          >
            ▶
          </button>
        </div>

        <button className="btn-action" onClick={onLogout} title="Cerrar sesión">
          🚪
        </button>

        <div className="user-info-display">
          <span className="user-login-name">👤 {username || 'Usuario'}</span>
          <span className={`user-role-tag role-${roleSeguro}`}>{userRole || 'User'}</span>
        </div>
      </div>
    </header>
  );
};

export default Toolbar;