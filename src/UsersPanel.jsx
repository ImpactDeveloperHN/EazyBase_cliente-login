import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import './UsersPanel.css';

const UsersPanel = ({ onVolver, userRole }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(null); // 'nuevo', 'editar', 'password'
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  
  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'Usuario',
    active: true
  });

  const esSuper = userRole === 'Superadmin';
  const esAdmin = userRole === 'Admin';

  // Cargar usuarios
  const fetchUsuarios = useCallback(async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('Users_Database')
        .select('*')
        .order('role', { ascending: true })
        .order('username', { ascending: true });
      
      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      alert('Error al cargar usuarios');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // Filtrar usuarios según rol del que gestiona
  const usuariosFiltrados = usuarios.filter(u => {
    if (esSuper) return true;
    return u.role !== 'Superadmin';
  }).filter(u => 
    busqueda === '' || 
    u.username.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.role.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Abrir modal para nuevo usuario
  const abrirModalNuevo = () => {
    setFormData({
      username: '',
      password: '',
      role: 'Usuario',
      active: true
    });
    setUsuarioSeleccionado(null);
    setModalAbierto('nuevo');
  };

  // Abrir modal para editar
  const abrirModalEditar = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setFormData({
      username: usuario.username,
      role: usuario.role,
      active: usuario.active ?? true
    });
    setModalAbierto('editar');
  };

  // Abrir modal para cambiar contraseña
  const abrirModalPassword = (usuario) => {
    console.log('🔑 abrirModalPassword llamado', usuario); // ← debug
    setUsuarioSeleccionado(usuario);
    setFormData({ password: '' });
    setModalAbierto('password');
  };

  // Crear nuevo usuario
  const crearUsuario = async () => {
    if (cargando) return;
  
    if (!formData.username.trim() || !formData.password.trim()) {
      alert('Usuario y contraseña son obligatorios');
      return;
    }
  
    const existe = usuarios.some(
      u => u.username.toLowerCase() === formData.username.trim().toLowerCase()
    );
    if (existe) {
      alert('El usuario ya existe');
      return;
    }
  
    if (!esSuper && formData.role === 'Superadmin') {
      alert('No tienes permisos para crear Superadmins');
      return;
    }
  
    setCargando(true);
  
    try {
      const { error } = await supabase
        .from('Users_Database')
        .insert([{
          username: formData.username.trim(),
          password: formData.password.trim(),
          role: formData.role,
          active: formData.active
        }]);
  
      if (error) throw error;
  
      alert('Usuario creado exitosamente');
  
      setFormData({
        username: '',
        password: '',
        role: 'Usuario',
        active: true
      });
  
      setModalAbierto(null);
      fetchUsuarios();
  
    } catch (error) {
      console.error('Error creando usuario:', error);
      alert('Error al crear usuario. Puede que el username ya exista.');
    } finally {
      setCargando(false);
    }
  };

  // Actualizar usuario
  const actualizarUsuario = async () => {
    console.log('🔥 actualizarUsuario() llamado');
  
    if (!formData.username.trim()) {
      alert('El username es obligatorio');
      return;
    }
  
    if (!esSuper && (
      usuarioSeleccionado.role === 'Superadmin' || 
      formData.role === 'Superadmin'
    )) {
      alert('No tienes permisos para modificar Superadmins');
      return;
    }
  
    const existe = usuarios.some(
      u => u.username.toLowerCase() === formData.username.trim().toLowerCase() &&
           u.id !== usuarioSeleccionado.id
    );
    if (existe) {
      alert('El usuario ya existe');
      return;
    }
  
    setCargando(true);
    try {
      const { error } = await supabase
        .from('Users_Database')
        .update({
          username: formData.username.trim(),
          role: formData.role,
          active: formData.active
        })
        .eq('id', usuarioSeleccionado.id);
  
      if (error) throw error;
  
      alert('Usuario actualizado exitosamente');
      setModalAbierto(null);
      fetchUsuarios();
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      alert('Error al actualizar usuario');
    } finally {
      setCargando(false);
    }
  };

  // Cambiar contraseña
  const cambiarPassword = async () => {
    if (!formData.password.trim()) {
      alert('La nueva contraseña es obligatoria');
      return;
    }

    if (formData.password.length < 4) {
      alert('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    setCargando(true);
    try {
      const { error } = await supabase
        .from('Users_Database')
        .update({ password: formData.password.trim() })
        .eq('id', usuarioSeleccionado.id);

      if (error) throw error;
      
      alert('Contraseña cambiada exitosamente');
      setModalAbierto(null);
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      alert('Error al cambiar contraseña');
    } finally {
      setCargando(false);
    }
  };

  // Toggle activar/desactivar
  const toggleActivo = async (usuario) => {
    const nuevoEstado = !(usuario.active ?? true);
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    if (!window.confirm(`¿Seguro que deseas ${accion} a ${usuario.username}?`)) {
      return;
    }

    setCargando(true);
    try {
      const { error } = await supabase
        .from('Users_Database')
        .update({ active: nuevoEstado })
        .eq('id', usuario.id);

      if (error) throw error;
      
      fetchUsuarios();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error al cambiar estado del usuario');
    } finally {
      setCargando(false);
    }
  };

  // Eliminar usuario (solo Superadmin)
  const eliminarUsuario = async (usuario) => {
    if (!esSuper) {
      alert('Solo Superadmin puede eliminar usuarios');
      return;
    }

    if (!window.confirm(`¿ELIMINAR PERMANENTEMENTE a ${usuario.username}?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    setCargando(true);
    try {
      const { error } = await supabase
        .from('Users_Database')
        .delete()
        .eq('id', usuario.id);

      if (error) throw error;
      
      alert('Usuario eliminado');
      fetchUsuarios();
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      alert('Error al eliminar usuario');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="users-panel-screen">
      <div className="users-panel-wrapper">
        
        {/* HEADER */}
        <header className="users-header">
          <div className="header-left">
            <div className="title-section">
              <span className="icon-crown">👑</span>
              <div>
                <h1>GESTIÓN DE USUARIOS</h1>
                <p className="subtitle">Control de acceso y permisos</p>
              </div>
            </div>
          </div>
          
          <button className="btn-close-panel" onClick={onVolver}>
            ✕ Cerrar
          </button>
        </header>

        {/* ESTADÍSTICAS */}
        <div className="users-stats">
          <div className="stat-card">
            <span className="stat-icon">👥</span>
            <div>
              <p className="stat-number">{usuarios.length}</p>
              <p className="stat-label">Total Usuarios</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">✅</span>
            <div>
              <p className="stat-number">{usuarios.filter(u => u.active ?? true).length}</p>
              <p className="stat-label">Activos</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⛔</span>
            <div>
              <p className="stat-number">{usuarios.filter(u => !(u.active ?? true)).length}</p>
              <p className="stat-label">Inactivos</p>
            </div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="users-toolbar">
          <input
            type="text"
            placeholder="🔍 Buscar usuario..."
            className="search-users"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          
          <button className="btn-nuevo-usuario" onClick={abrirModalNuevo}>
            + Nuevo Usuario
          </button>
        </div>

        {/* TABLA DE USUARIOS */}
        <div className="users-table-container">
          {cargando && <div className="loading-users">Cargando...</div>}
          
          <table className="users-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{textAlign: 'center', padding: '40px'}}>
                    {busqueda ? 'No se encontraron usuarios' : 'No hay usuarios'}
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map(usuario => {
                  const activo = usuario.active ?? true;
                  const puedeEditar = esSuper || usuario.role !== 'Superadmin';
                  
                  return (
                    <tr key={usuario.id} className={!activo ? 'usuario-inactivo' : ''}>
                      <td>
                        <span className={`status-badge ${activo ? 'active' : 'inactive'}`}>
                          {activo ? '✓ Activo' : '⊗ Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="user-info">
                          <span className="username">{usuario.username}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge role-${usuario.role.toLowerCase()}`}>
                          {usuario.role}
                        </span>
                      </td>
                      <td>
                        <div className="actions-group">
                          {puedeEditar ? (
                            <>
                              <button 
                                className="btn-action edit"
                                onClick={() => abrirModalEditar(usuario)}
                                title="Editar usuario"
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn-action password"
                                onClick={() => abrirModalPassword(usuario)}
                                title="Cambiar contraseña"
                              >
                                🔑
                              </button>
                              <button 
                                className={`btn-action toggle ${activo ? 'deactivate' : 'activate'}`}
                                onClick={() => toggleActivo(usuario)}
                                title={activo ? 'Desactivar' : 'Activar'}
                              >
                                {activo ? '⛔' : '✅'}
                              </button>
                              {esSuper && (
                                <button 
                                  className="btn-action delete"
                                  onClick={() => eliminarUsuario(usuario)}
                                  title="Eliminar usuario"
                                >
                                  🗑️
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="no-permisos">🔒 Sin permisos</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* LEYENDA */}
        <div className="users-legend">
          <p><strong>Permisos:</strong></p>
          <p>• <strong>Superadmin:</strong> Puede gestionar todos los usuarios incluyendo otros Superadmins</p>
          <p>• <strong>Admin:</strong> Puede gestionar Admin y Usuario (NO puede tocar Superadmin)</p>
          <p>• <strong>Usuario:</strong> No tiene acceso a este panel</p>
        </div>
      </div>

      {/* MODALES */}
      {modalAbierto && (
        <div className="modal-overlay-users" onClick={() => setModalAbierto(null)}>
          <div className="modal-users" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-users">
              <h2>
                {modalAbierto === 'nuevo' && '➕ Nuevo Usuario'}
                {modalAbierto === 'editar' && '✏️ Editar Usuario'}
                {modalAbierto === 'password' && '🔑 Cambiar Contraseña'}
              </h2>
              <button className="btn-close-modal-x" onClick={() => setModalAbierto(null)}>✕</button>
            </div>

            <div className="modal-body-users">
              {modalAbierto === 'nuevo' && (
                <>
                  <div className="form-group">
                    <label>Usuario *</label>
                    <input
                      type="text"
                      placeholder="Nombre de usuario"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      autoFocus
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Contraseña *</label>
                    <input
                      type="password"
                      placeholder="Contraseña"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label>Rol *</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="Usuario">Usuario</option>
                      <option value="Admin">Admin</option>
                      {esSuper && <option value="Superadmin">Superadmin</option>}
                    </select>
                  </div>

                  <div className="form-group-check">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({...formData, active: e.target.checked})}
                      />
                      Usuario activo
                    </label>
                  </div>
                </>
              )}

              {modalAbierto === 'editar' && (
                <>
                  <div className="form-group">
                    <label>Usuario *</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label>Rol *</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="Usuario">Usuario</option>
                      <option value="Admin">Admin</option>
                      {esSuper && <option value="Superadmin">Superadmin</option>}
                    </select>
                  </div>

                  <div className="form-group-check">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({...formData, active: e.target.checked})}
                      />
                      Usuario activo
                    </label>
                  </div>
                </>
              )}

              {modalAbierto === 'password' && (
                <div className="form-group">
                  <label>Nueva Contraseña *</label>
                  <input
                    type="password"
                    placeholder="Mínimo 4 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    autoFocus
                  />
                  <small>La contraseña se guardará para: <strong>{usuarioSeleccionado?.username}</strong></small>
                </div>
              )}
            </div>

            <div className="modal-footer-users">
              <button className="btn-modal-cancel-u" onClick={() => setModalAbierto(null)}>
                Cancelar
              </button>
              <button
                className="btn-modal-confirm-u"
                onClick={modalAbierto === 'nuevo' ? crearUsuario : modalAbierto === 'editar' ? actualizarUsuario : cambiarPassword}
                disabled={cargando || (modalAbierto !== 'password' && !formData.username.trim()) || (modalAbierto === 'nuevo' && !formData.password.trim())}
              >
                {cargando ? 'Guardando...' : 'Guardar'}
              </button>   
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPanel;