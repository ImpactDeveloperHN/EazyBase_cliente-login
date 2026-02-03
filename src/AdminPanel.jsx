import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import * as XLSX from 'xlsx';
import './AdminPanel.css';

// ========================================
// PALETA DE COLORES FIJOS (8 básicos)
// ========================================

const PALETA_COLORES_FIJOS = [
  { nombre: 'Celeste', bg: '#ADD8E6', text: '#000000', icono: '🔵' },
  { nombre: 'Rojo', bg: '#FF0000', text: '#FFFFFF', icono: '🔴' },
  { nombre: 'Azul', bg: '#3B82F6', text: '#FFFFFF', icono: '🔵' },
  { nombre: 'Café', bg: '#92400E', text: '#FFFFFF', icono: '🟤' },
  { nombre: 'Amarillo', bg: '#EAB308', text: '#000000', icono: '🟡' },
  { nombre: 'Verde', bg: '#90EE90', text: '#000000', icono: '🟢' },
  { nombre: 'Naranja', bg: '#F97316', text: '#FFFFFF', icono: '🟠' },
  { nombre: 'Morado', bg: '#8B5CF6', text: '#FFFFFF', icono: '🟣' },
];

const AdminPanel = ({ onVolver, userRole }) => {
  const [datos, setDatos] = useState([]);
  const [editando, setEditando] = useState(null);
  const [modalAgregar, setModalAgregar] = useState(null);
  const [nuevoValor, setNuevoValor] = useState('');
  const [colorSeleccionado, setColorSeleccionado] = useState(null);
  const [busquedas, setBusquedas] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [vistaCompacta, setVistaCompacta] = useState(false);
  const [tema, setTema] = useState('neon');
  const [coloresAsignados, setColoresAsignados] = useState({});
  
  // Estados para DataManager
  const [mostrarDataManager, setMostrarDataManager] = useState(false);
  const [cargandoData, setCargandoData] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mensajeData, setMensajeData] = useState(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  
  // Ref para el menú de temas
  const themeMenuRef = useRef(null);
  const [themeMenuAbierto, setThemeMenuAbierto] = useState(false);
  
  const COL_LISTAS = ['Calls', 'Status', 'Law Firm', 'Specialty', 'Type', 'Facility', 'Doctor', 'Employee'];
  const COLUMNAS_REQUERIDAS = ['T/F', 'Calls', 'Date', 'Name', 'Status', 'Law Firm', 'Point of Contact', 'Specialty', 'Type', 'Facility', 'Doctor', 'Location', 'Text', 'Attorney', 'Employee', 'Notes'];

  const esSuperadmin = userRole === 'Superadmin';

  const esValorValido = (valor) => {
    return valor !== null && valor !== undefined && typeof valor === 'string' && valor.trim() !== '';
  };

  // ========================================
  // FETCH DE COLORES ASIGNADOS
  // ========================================

  const fetchColoresAsignados = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('Colores_Listas').select('*');
      if (error) throw error;
      
      // Convertir a objeto { columna_valor: {bg, text} }
      const coloresMap = {};
      if (data) {
        data.forEach(item => {
          const key = `${item.columna}_${item.valor}`;
          coloresMap[key] = { bg: item.bg_color, text: item.text_color };
        });
      }
      setColoresAsignados(coloresMap);
    } catch (err) {
      console.error('Error cargando colores:', err);
    }
  }, []);

  const fetchOpciones = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Lista_Desplegable')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) throw error;
      setDatos(data || []);
      // También recargar colores
      await fetchColoresAsignados();
    } catch (err) {
      alert('Error al cargar: ' + err.message);
    }
  }, [fetchColoresAsignados]);

  useEffect(() => { 
    fetchOpciones(); 
  }, [fetchOpciones]);

  // Cerrar menú de temas al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) {
        setThemeMenuAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ========================================
  // FUNCIONES DE COLORES
  // ========================================

  const obtenerColorCelda = (columna, valor) => {
    const key = `${columna}_${valor}`;
    return coloresAsignados[key] || null;
  };

  const guardarColor = async (columna, valor, colorInfo) => {
    if (!colorInfo) return;
    
    try {
      // Verificar si ya existe
      const { data: existente } = await supabase
        .from('Colores_Listas')
        .select('id')
        .eq('columna', columna)
        .eq('valor', valor)
        .single();
      
      if (existente) {
        // Actualizar
        await supabase
          .from('Colores_Listas')
          .update({ 
            bg_color: colorInfo.bg, 
            text_color: colorInfo.text 
          })
          .eq('id', existente.id);
      } else {
        // Insertar nuevo
        await supabase
          .from('Colores_Listas')
          .insert([{ 
            columna, 
            valor, 
            bg_color: colorInfo.bg, 
            text_color: colorInfo.text 
          }]);
      }
      
      // Recargar colores
      await fetchColoresAsignados();
    } catch (error) {
      console.error('Error guardando color:', error);
    }
  };

  const eliminarColor = async (columna, valor) => {
    try {
      await supabase
        .from('Colores_Listas')
        .delete()
        .eq('columna', columna)
        .eq('valor', valor);
      
      await fetchColoresAsignados();
    } catch (error) {
      console.error('Error eliminando color:', error);
    }
  };

  // Data Manager Functions
  const validarEncabezados = (encabezadosArchivo) => {
    const faltantes = COLUMNAS_REQUERIDAS.filter(col => !encabezadosArchivo.includes(col));
    const sobrantes = encabezadosArchivo.filter(col => !COLUMNAS_REQUERIDAS.includes(col));
    return { valido: faltantes.length === 0, faltantes, sobrantes };
  };

  const borrarTodo = async () => {
    setCargandoData(true);
    setMensajeData({ tipo: 'info', texto: 'Eliminando todos los registros...' });
    
    try {
      const { count } = await supabase.from('Eazy_1').select('*', { count: 'exact', head: true });
      const { error } = await supabase.from('Eazy_1').delete().neq('id', 0);
      
      if (error) throw error;
      setMensajeData({ tipo: 'exito', texto: `✅ Se eliminaron ${count || 0} registros` });
      setConfirmarBorrar(false);
    } catch (error) {
      setMensajeData({ tipo: 'error', texto: '❌ Error: ' + error.message });
    } finally {
      setCargandoData(false);
      setProgreso(0);
    }
  };

  const procesarArchivo = async (file) => {
    const extensiones = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!extensiones.includes(ext)) {
      alert('Solo archivos Excel o CSV');
      return;
    }

    if (!window.confirm(`¿Reemplazar TODOS los datos con "${file.name}"?`)) return;

    setCargandoData(true);
    setMensajeData({ tipo: 'info', texto: 'Leyendo archivo...' });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) throw new Error('Archivo vacío');

      const validacion = validarEncabezados(Object.keys(jsonData[0]));
      if (!validacion.valido) {
        throw new Error(`Faltan: ${validacion.faltantes.join(', ')}`);
      }

      setProgreso(10);
      await supabase.from('Eazy_1').delete().neq('id', 0);

      const BATCH_SIZE = 100;
      for (let i = 0; i < jsonData.length; i += BATCH_SIZE) {
        const batch = jsonData.slice(i, i + BATCH_SIZE).map(row => ({
          ...row,
          bg_color: row.bg_color || '{}',
          font_color: row.font_color || '{}',
          created_at: new Date().toISOString()
        }));
        await supabase.from('Eazy_1').insert(batch);
        setProgreso(20 + Math.round(((i + batch.length) / jsonData.length) * 80));
      }

      setMensajeData({ tipo: 'exito', texto: `✅ ${jsonData.length} registros cargados` });
    } catch (error) {
      setMensajeData({ tipo: 'error', texto: '❌ ' + error.message });
    } finally {
      setCargandoData(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) await procesarArchivo(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files.length > 0) {
      await procesarArchivo(e.dataTransfer.files[0]);
    }
  };

  // ========================================
  // LISTAS FUNCTIONS (ACTUALIZADAS CON COLORES)
  // ========================================

  const guardarCambio = async (id, col, valor) => {
    if (!valor?.trim()) {
      setEditando(null);
      return;
    }

    const valorLimpio = valor.trim();
    const existeDuplicado = datos.some(d => 
      esValorValido(d[col]) && 
      d[col].trim().toLowerCase() === valorLimpio.toLowerCase() && 
      d.id !== id
    );
    
    if (existeDuplicado) {
      alert(`"${valorLimpio}" ya existe`);
      return;
    }

    setGuardando(true);
    try {
      await supabase.from('Lista_Desplegable').update({ [col]: valorLimpio }).eq('id', id);
      setEditando(null);
      fetchOpciones();
    } catch (error) {
      alert('Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const abrirModalAgregar = (columna) => {
    setModalAgregar(columna);
    setNuevoValor('');
    setColorSeleccionado(null);
  };

  const confirmarAgregar = async () => {
    if (!nuevoValor?.trim()) return;

    const valorLimpio = nuevoValor.trim();
    const existe = datos.some(d => esValorValido(d[modalAgregar]) && d[modalAgregar].trim().toLowerCase() === valorLimpio.toLowerCase());
    
    if (existe) {
      alert(`"${valorLimpio}" ya existe`);
      return;
    }

    setGuardando(true);
    try {
      const filaLibre = datos.find(f => !esValorValido(f[modalAgregar]));
      
      if (filaLibre) {
        await supabase.from('Lista_Desplegable').update({ [modalAgregar]: valorLimpio }).eq('id', filaLibre.id);
      } else {
        const nuevaFila = {};
        COL_LISTAS.forEach(col => nuevaFila[col] = col === modalAgregar ? valorLimpio : null);
        await supabase.from('Lista_Desplegable').insert([nuevaFila]);
      }
      
      // Guardar color si se seleccionó
      if (colorSeleccionado) {
        await guardarColor(modalAgregar, valorLimpio, colorSeleccionado);
      }
      
      setModalAgregar(null);
      setNuevoValor('');
      setColorSeleccionado(null);
      fetchOpciones();
    } catch (error) {
      alert('Error al agregar');
    } finally {
      setGuardando(false);
    }
  };

  const borrarCelda = async (id, col, valor) => {
    if (!window.confirm(`¿Eliminar "${valor}"?`)) return;
    
    setGuardando(true);
    try {
      await supabase.from('Lista_Desplegable').update({ [col]: null }).eq('id', id);
      // También eliminar el color asignado
      await eliminarColor(col, valor);
      fetchOpciones();
    } catch (error) {
      alert('Error al eliminar');
    } finally {
      setGuardando(false);
    }
  };

  const datosFiltrados = (columna) => {
    const busqueda = busquedas[columna]?.toLowerCase() || '';
    return datos
      .filter(f => esValorValido(f[columna]))
      .filter(f => !busqueda || f[columna].toLowerCase().includes(busqueda));
  };

  const iconos = {
    'Calls': '📞', 'Status': '📊', 'Law Firm': '⚖️', 'Specialty': '⚕️',
    'Type': '📋', 'Facility': '🏥', 'Doctor': '👨‍⚕️', 'Employee': '👤'
  };

  const temas = {
    neon: { nombre: 'Neón', icono: '✨' },
    cyberpunk: { nombre: 'Cyberpunk', icono: '🌆' },
    minimal: { nombre: 'Minimal', icono: '◾' },
    ocean: { nombre: 'Océano', icono: '🌊' }
  };

  const toggleDataManager = () => {
    setMostrarDataManager(!mostrarDataManager);
    setMensajeData(null);
    setConfirmarBorrar(false);
    setThemeMenuAbierto(false);
  };

  return (
    <div className={`admin-full-screen-v2 tema-${tema}`}>
      
      <header className="admin-header-v2">
        <div className="header-left">
          <div className="logo-section">
            <div className="logo-glow"></div>
            <h1>ADMINISTRADOR DE LISTAS</h1>
          </div>
          <span className="badge-role">{userRole}</span>
        </div>
        
        <div className="header-actions">
          <div className="theme-selector" ref={themeMenuRef}>
            <button 
              className="btn-theme-toggle"
              onClick={() => setThemeMenuAbierto(!themeMenuAbierto)}
            >
              {temas[tema].icono}
            </button>
            {themeMenuAbierto && (
              <div className="theme-menu">
                {Object.entries(temas).map(([key, {nombre, icono}]) => (
                  <button 
                    key={key}
                    className={tema === key ? 'active' : ''}
                    onClick={() => {
                      setTema(key);
                      setThemeMenuAbierto(false);
                    }}
                  >
                    {icono} {nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {esSuperadmin && (
            <button 
              className={`btn-toggle-vista ${mostrarDataManager ? 'active' : ''}`}
              onClick={toggleDataManager}
            >
              🗄️ {mostrarDataManager ? 'Ver Listas' : 'Gestionar Datos'}
            </button>
          )}
          
          <button 
            className="btn-toggle-vista"
            onClick={() => setVistaCompacta(!vistaCompacta)}
          >
            {vistaCompacta ? '📐' : '📊'}
          </button>
          
          <button 
            className="btn-guardar-v2" 
            onClick={onVolver}
            disabled={guardando}
          >
            <span className="btn-icon">{guardando ? '⏳' : '💾'}</span>
            <span>{guardando ? 'Guardando...' : 'Cerrar'}</span>
          </button>
        </div>
      </header>

      {/* VISTA LISTAS */}
      {!mostrarDataManager && (
        <>
          <div className="stats-bar">
            <div className="stat-item" style={{'--delay': '0.1s'}}>
              <span className="stat-label">Total Listas</span>
              <span className="stat-value">{COL_LISTAS.length}</span>
            </div>
            <div className="stat-item" style={{'--delay': '0.2s'}}>
              <span className="stat-label">Total Opciones</span>
              <span className="stat-value">
                {COL_LISTAS.reduce((sum, col) => sum + datos.filter(f => esValorValido(f[col])).length, 0)}
              </span>
            </div>
            <div className="stat-item" style={{'--delay': '0.3s'}}>
              <span className="stat-label">Registros BD</span>
              <span className="stat-value">{datos.length}</span>
            </div>
          </div>

          <div className={`admin-grid-v2 ${vistaCompacta ? 'compacto' : ''}`}>
            {COL_LISTAS.map((col, index) => {
              const total = datos.filter(f => esValorValido(f[col])).length;
              const filtrados = datosFiltrados(col);
              const buscando = busquedas[col]?.length > 0;
              
              return (
                <div 
                  key={col} 
                  className={`lista-card-v2 ${guardando ? 'cargando' : ''}`}
                  style={{'--card-index': index}}
                >
                  <div className="card-header-v2">
                    <div className="header-info">
                      <span className="col-icon">{iconos[col]}</span>
                      <div className="col-title-group">
                        <h3>{col}</h3>
                        <span className="count-badge">
                          {buscando ? `${filtrados.length}/${total}` : total}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      className="btn-add-v2 shine-effect" 
                      onClick={() => abrirModalAgregar(col)}
                    >
                      <span className="plus-icon">+</span>
                    </button>
                  </div>

                  <div className="search-box-v2">
                    <input
                      type="text"
                      placeholder="🔍 Buscar..."
                      value={busquedas[col] || ''}
                      onChange={(e) => setBusquedas({...busquedas, [col]: e.target.value})}
                      className="search-input-v2"
                    />
                    {buscando && (
                      <button 
                        className="btn-clear-mini magnetic"
                        onClick={() => setBusquedas({...busquedas, [col]: ''})}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="items-list-v2">
                    {filtrados.length === 0 ? (
                      <div className="empty-state-v2">
                        <span className="empty-icon floating">📭</span>
                        <p>{buscando ? 'Sin resultados' : 'Sin opciones'}</p>
                      </div>
                    ) : (
                      filtrados.map((f, idx) => {
                        const colorInfo = obtenerColorCelda(col, f[col]);
                        
                        return (
                          <div 
                            key={f.id}
                            className={`item-v2 ${editando?.id === f.id && editando?.col === col ? 'editando' : ''}`}
                            style={{'--item-index': idx}}
                          >
                            {editando?.id === f.id && editando?.col === col ? (
                              <div style={{ width: '100%' }}>
                                <input 
                                  className="edit-input-v2 glow-input" 
                                  autoFocus 
                                  defaultValue={f[col]} 
                                  onBlur={(e) => guardarCambio(f.id, col, e.target.value)} 
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') guardarCambio(f.id, col, e.target.value);
                                    if (e.key === 'Escape') setEditando(null);
                                  }}
                                />
                                {/* Selector de color en edición */}
                                <div style={{ 
                                  display: 'flex', 
                                  gap: '4px', 
                                  marginTop: '8px',
                                  flexWrap: 'wrap',
                                  justifyContent: 'center'
                                }}>
                                  <button
                                    onClick={() => eliminarColor(col, f[col])}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '10px',
                                      border: '1px solid #666',
                                      background: '#333',
                                      color: '#fff',
                                      borderRadius: '4px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Sin color
                                  </button>
                                  {PALETA_COLORES_FIJOS.map((color) => (
                                    <button
                                      key={color.nombre}
                                      onClick={() => guardarColor(col, f[col], color)}
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        backgroundColor: color.bg,
                                        border: colorInfo?.bg === color.bg ? '3px solid #fff' : '1px solid #666',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                      }}
                                      title={color.nombre}
                                    >
                                      {color.icono}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="item-content-v2">
                                  <span className="item-number">{idx + 1}.</span>
                                  <span 
                                    className="item-text-v2" 
                                    onDoubleClick={() => setEditando({id: f.id, col})}
                                    style={colorInfo ? {
                                      backgroundColor: colorInfo.bg,
                                      color: colorInfo.text,
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontWeight: '500'
                                    } : {}}
                                  >
                                    {f[col]}
                                  </span>
                                  {colorInfo && (
                                    <span 
                                      style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: colorInfo.bg,
                                        border: '2px solid #fff',
                                        marginLeft: '8px',
                                        display: 'inline-block'
                                      }}
                                      title="Tiene color fijo asignado"
                                    />
                                  )}
                                </div>
                                <button 
                                  className="btn-delete-v2 magnetic" 
                                  onClick={() => borrarCelda(f.id, col, f[col])}
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {esSuperadmin && (
            <div className="footer-info-v2">
              <span className="shield-icon floating">🛡️</span>
              <p>Modo Superadmin: Acceso completo a configuración del sistema</p>
            </div>
          )}
        </>
      )}

      {/* VISTA DATA MANAGER */}
      {esSuperadmin && mostrarDataManager && (
        <div className="data-manager-section" onClick={(e) => e.stopPropagation()}>
          <div className="stats-bar">
            <div className="stat-item"><span className="stat-label">Gestión Masiva</span><span className="stat-value">🗄️</span></div>
            <div className="stat-item"><span className="stat-label">Funciones</span><span className="stat-value">2</span></div>
          </div>

          {mensajeData && (
            <div className={`mensaje-estado mensaje-${mensajeData.tipo}`}>
              <span>{mensajeData.texto}</span>
              <button onClick={() => setMensajeData(null)}>×</button>
            </div>
          )}

          {cargandoData && progreso > 0 && (
            <div className="barra-progreso-container">
              <div className="barra-progreso" style={{ width: `${progreso}%` }} />
              <span>{progreso}%</span>
            </div>
          )}

          <div className="admin-grid-v2">
            <div className="lista-card-v2 data-manager-card" style={{'--card-index': 0}}>
              <div className="card-header-v2 danger-gradient">
                <div className="header-info">
                  <span className="col-icon pulse">🗑️</span>
                  <div className="col-title-group">
                    <h3>Borrar Todos los Datos</h3>
                    <span className="count-badge danger">PELIGRO</span>
                  </div>
                </div>
              </div>
              <div className="items-list-v2" style={{padding: '25px'}}>
                <p className="description-text">
                  Elimina permanentemente todos los registros de la tabla Eazy_1.
                </p>
                {!confirmarBorrar ? (
                  <button 
                    className="btn-peligro shine-effect" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmarBorrar(true);
                    }} 
                    disabled={cargandoData}
                  >
                    Borrar Todo
                  </button>
                ) : (
                  <div className="confirmar-accion">
                    <p className="advertencia">⚠️ ¿Estás seguro?</p>
                    <div className="botones-confirmar">
                      <button 
                        className="btn-peligro" 
                        onClick={(e) => {
                          e.stopPropagation();
                          borrarTodo();
                        }} 
                        disabled={cargandoData}
                      >
                        {cargandoData ? 'Borrando...' : 'Sí, borrar todo'}
                      </button>
                      <button 
                        className="btn-secundario" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmarBorrar(false);
                        }} 
                        disabled={cargandoData}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lista-card-v2 data-manager-card" style={{'--card-index': 1}}>
              <div className="card-header-v2 success-gradient">
                <div className="header-info">
                  <span className="col-icon">📁</span>
                  <div className="col-title-group">
                    <h3>Cargar Nueva Tabla</h3>
                    <span className="count-badge success">EXCEL</span>
                  </div>
                </div>
              </div>
              <div className="items-list-v2" style={{padding: '25px'}}>
                <p className="description-text">
                  Sube un archivo Excel con los encabezados correctos.
                </p>
                <div 
                  className={`drop-zone ${arrastrando ? 'arrastrando' : ''}`}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDrop(e);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setArrastrando(true);
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    setArrastrando(false);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById('file-upload').click();
                  }}
                >
                  <div className="drop-zone-content">
                    <span className="icono floating">📊</span>
                    <p>Arrastra un archivo aquí o haz clic</p>
                    <small>.xlsx, .xls, .csv</small>
                  </div>
                  <input 
                    id="file-upload" 
                    type="file" 
                    accept=".xlsx,.xls,.csv" 
                    onChange={(e) => {
                      e.stopPropagation();
                      handleFileSelect(e);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    hidden 
                  />
                </div>
                <div className="info-encabezados">
                  <small><strong>Requeridos:</strong> {COLUMNAS_REQUERIDAS.join(', ')}</small>
                </div>
              </div>
            </div>
          </div>

          {cargandoData && (
            <div className="overlay-cargando">
              <div className="spinner"></div>
              <p>Procesando...</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL AGREGAR CON SELECTOR DE COLOR */}
      {!mostrarDataManager && modalAgregar && (
        <div className="modal-overlay-v2" onClick={() => setModalAgregar(null)}>
          <div className="modal-box-v2 glassmorphism" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header-v2">
              <h2><span className="modal-icon">{iconos[modalAgregar]}</span>Agregar a {modalAgregar}</h2>
              <button className="btn-close-modal magnetic" onClick={() => setModalAgregar(null)}>✕</button>
            </div>
            <div className="modal-body-v2">
              <input
                type="text"
                className="modal-input-v2 glow-input"
                placeholder="Escribe la nueva opción..."
                value={nuevoValor}
                onChange={(e) => setNuevoValor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nuevoValor.trim()) confirmarAgregar();
                  if (e.key === 'Escape') setModalAgregar(null);
                }}
                autoFocus
              />
              
              {/* SELECTOR DE COLOR */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '10px', 
                  color: '#00ff88',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Seleccionar color fijo (opcional):
                </label>
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  padding: '15px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,255,136,0.2)'
                }}>
                  <button
                    onClick={() => setColorSeleccionado(null)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      border: !colorSeleccionado ? '2px solid #00ff88' : '1px solid #666',
                      background: !colorSeleccionado ? 'rgba(0,255,136,0.2)' : '#333',
                      color: '#fff',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      minWidth: '60px'
                    }}
                  >
                    Ninguno
                  </button>
                  {PALETA_COLORES_FIJOS.map((color) => (
                    <button
                      key={color.nombre}
                      onClick={() => setColorSeleccionado(color)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '8px',
                        backgroundColor: colorSeleccionado?.nombre === color.nombre ? 'rgba(255,255,255,0.1)' : 'transparent',
                        border: colorSeleccionado?.nombre === color.nombre ? '2px solid #00ff88' : '1px solid #666',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        minWidth: '60px'
                      }}
                      title={color.nombre}
                    >
                      <span style={{ fontSize: '20px' }}>{color.icono}</span>
                      <span style={{ 
                        fontSize: '10px', 
                        color: colorSeleccionado?.nombre === color.nombre ? '#00ff88' : '#aaa',
                        fontWeight: colorSeleccionado?.nombre === color.nombre ? 'bold' : 'normal'
                      }}>
                        {color.nombre}
                      </span>
                    </button>
                  ))}
                </div>
                {colorSeleccionado && (
                  <div style={{ 
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: colorSeleccionado.bg,
                    color: colorSeleccionado.text,
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    Vista previa: {nuevoValor || 'Texto de ejemplo'}
                  </div>
                )}
              </div>

              <div className="modal-footer-v2" style={{ marginTop: '20px' }}>
                <button className="btn-modal-cancel" onClick={() => setModalAgregar(null)}>Cancelar</button>
                <button 
                  className="btn-modal-confirm shine-effect" 
                  onClick={confirmarAgregar} 
                  disabled={!nuevoValor.trim() || guardando}
                >
                  {guardando ? '⏳ Guardando...' : (colorSeleccionado ? '✓ Agregar con color' : '✓ Agregar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;