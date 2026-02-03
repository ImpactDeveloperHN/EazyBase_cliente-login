import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import Login from './Login';
import Toolbar from './Toolbar';
import CellEditor from './CellEditor';
import AdminPanel from './AdminPanel';
import UsersPanel from './UsersPanel';
import LogsPanel from './LogsPanel';
import './App.css';

const COLUMNAS = ['T/F', 'Calls', 'Date', 'Name', 'Status', 'Law Firm', 'Point of Contact', 'Specialty', 'Type', 'Facility', 'Doctor', 'Location', 'Text', 'Attorney', 'Employee', 'Notes'];
const FILAS_POR_PAGINA = 150;
const ANCHO_MINIMO = 80;
const ALTO_MINIMO = 30;

// ========================================
// COLORES FIJOS E INMUTABLES - NADIE PUEDE CAMBIARLOS
// ========================================

const COLORES_FIJOS = {
  'Law Firm': {
    // CELESTE - Grupo 1
    'Pish & Pish': { bg: '#ADD8E6', text: '#000000' },
    'Moet Law Group': { bg: '#ADD8E6', text: '#000000' },
    'Rezvani Law Firm': { bg: '#ADD8E6', text: '#000000' },
    'Dordick Law': { bg: '#ADD8E6', text: '#000000' },
    'Mamanne Law': { bg: '#ADD8E6', text: '#000000' },
    'Karns & Karns': { bg: '#ADD8E6', text: '#000000' },
    'Estrada Law Group': { bg: '#ADD8E6', text: '#000000' },
    'Yerushalmi Law Firm': { bg: '#ADD8E6', text: '#000000' },
    'The Law Offices of Larry H. Parker Inc.': { bg: '#ADD8E6', text: '#000000' },
    'Wilshire Law Firm, PLC': { bg: '#ADD8E6', text: '#000000' },
    'Valero Law Group': { bg: '#ADD8E6', text: '#000000' },
    'Morgan & Morgan For the People': { bg: '#ADD8E6', text: '#000000' },
    'The Dominguez Firm': { bg: '#ADD8E6', text: '#000000' },
    'The Simon Law Group': { bg: '#ADD8E6', text: '#000000' },
    'Elite Law Group LA': { bg: '#ADD8E6', text: '#000000' },
    // VERDE - Grupo 2
    'Law Office of Joseph D. Ryan': { bg: '#90EE90', text: '#000000' },
    'KR Law': { bg: '#90EE90', text: '#000000' },
    'Fiore Legal': { bg: '#90EE90', text: '#000000' },
    'Lionsgate Law Group': { bg: '#90EE90', text: '#000000' },
    'The Capital Firm': { bg: '#90EE90', text: '#000000' },
    'KAL Law': { bg: '#90EE90', text: '#000000' },
    'Alexandroff Law Group': { bg: '#90EE90', text: '#000000' },
    'Mendez & Sanchez': { bg: '#90EE90', text: '#000000' },
    'Kronos Law': { bg: '#90EE90', text: '#000000' },
    'DK Law': { bg: '#90EE90', text: '#000000' },
  },
  'Specialty': {
    // TODOS VERDES
    'Chiropractor': { bg: '#90EE90', text: '#000000' },
    'Physical Therapy': { bg: '#90EE90', text: '#000000' },
    'Ortho Spine': { bg: '#90EE90', text: '#000000' },
    'Neurosurgeon': { bg: '#90EE90', text: '#000000' },
  },
  'Type': {
    // VERDES
    'Injections': { bg: '#90EE90', text: '#000000' },
    'Pre-Op': { bg: '#90EE90', text: '#000000' },
    'Procedures': { bg: '#90EE90', text: '#000000' },
    // ROJO
    'Surgery': { bg: '#FF0000', text: '#FFFFFF' },
  }
};

// Colores rotativos para fechas - cambian cada día
const COLORES_FECHA = [
  '#3B82F6', // Día 0 (Hoy): Azul
  '#10B981', // Día -1 (Ayer): Verde
  '#F97316', // Día -2: Naranja
  '#8B5CF6', // Día -3: Púrpura
  '#EAB308', // Día -4: Amarillo
  '#EF4444', // Día -5: Rojo
  '#EC4899', // Día -6: Rosa
  '#06B6D4', // Día -7: Cyan
  '#92400E', // Día -8: Marrón
  '#6B7280', // Día -9: Gris
];

// ========================================
// HELPERS
// ========================================

const safeJsonParse = (str, defaultVal = {}) => {
  if (!str) return defaultVal;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return defaultVal;
  }
};

function obtenerColorPorFecha(fechaStr) {
  if (!fechaStr || typeof fechaStr !== 'string') return null;
  
  // Parsear YYYY-MM-DD como fecha local consistentemente
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return null;
  
  const fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  if (isNaN(fecha.getTime())) return null;
  
  // Calcular diferencia en días (negativo = pasado, positivo = futuro)
  const diffTime = hoy - fecha;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Usar valor absoluto para el índice del color
  const indice = Math.abs(diffDays) % 10;
  
  return {
    bg: COLORES_FECHA[indice],
    text: '#FFFFFF'
  };
}

function obtenerColorCelda(fila, col, bgGuardado, fcGuardado) {
  const valor = fila[col];
  
  // 1. Verificar color fijo por valor (LAW FIRM, SPECIALTY, TYPE)
  if (COLORES_FIJOS[col] && COLORES_FIJOS[col][valor]) {
    return COLORES_FIJOS[col][valor];
  }
  
  // 2. Verificar color por fecha (DATE)
  if (col === 'Date' && valor) {
    const colorFecha = obtenerColorPorFecha(valor);
    if (colorFecha) return colorFecha;
  }
  
  // 3. Si no hay color automático, usar blanco (pero nunca se guarda)
  return {
    bg: '#ffffff',
    text: '#000000'
  };
}

// Verifica si una celda tiene color automático (fijo)
function esColorAutomatico(fila, col) {
  if (!fila) return false;
  const valor = fila[col];
  if (COLORES_FIJOS[col] && COLORES_FIJOS[col][valor]) return true;
  if (col === 'Date' && valor) return true;
  return false;
}

function useCopyPaste() {
  const copyToClipboard = useCallback((text) => {
    if (text) navigator.clipboard.writeText(String(text));
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    try {
      return await navigator.clipboard.readText();
    } catch (err) {
      console.error('Error al pegar:', err);
      return '';
    }
  }, []);

  return { copyToClipboard, pasteFromClipboard };
}

// ========================================
// COMPONENTE CELDA
// ========================================

const CeldaMemo = React.memo(({ 
  fila, 
  col, 
  anchoColumnas, 
  altoFilas,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onSave,
  opciones
}) => {
  // Siempre calcular color automático - ignorar cualquier color guardado
  const colorInfo = obtenerColorCelda(fila, col, null, null);
  
  return (
    <td
      onClick={onSelect}
      onDoubleClick={() => onEdit(true)}
      className={`${isSelected ? 'celda-seleccionada' : ''} ${isEditing ? 'celda-editando' : ''}`}
      style={{
        backgroundColor: colorInfo.bg,
        color: colorInfo.text,
        width: anchoColumnas[col] || 150,
        height: altoFilas[fila.id] || 40,
        position: 'relative',
        overflow: isEditing ? 'visible' : 'hidden',
        zIndex: isEditing ? 1000 : 'auto',
        cursor: 'pointer',
        fontWeight: esColorAutomatico(fila, col) ? '500' : 'normal'
      }}
      title={esColorAutomatico(fila, col) ? 'Color automático - No modificable' : ''}
    >
      {isEditing ? (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}
        >
          <CellEditor
            valor={fila[col]}
            opciones={opciones}
            alGuardar={onSave}
            alCancelar={() => onEdit(false)}
          />
        </div>
      ) : (
        <span>{fila[col] || ''}</span>
      )}
    </td>
  );
});

// ========================================
// APP PRINCIPAL
// ========================================

function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [datos, setDatos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDiferida, setBusquedaDiferida] = useState('');
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [filaCompletaSeleccionada, setFilaCompletaSeleccionada] = useState(null);
  const [editandoCelda, setEditandoCelda] = useState(null);
  const [pagina, setPagina] = useState(0);
  const [totalEncontrados, setTotalEncontrados] = useState(0);
  const [opcionesListas, setOpcionesListas] = useState({});
  const [verAdmin, setVerAdmin] = useState(false);
  const [verUsuarios, setVerUsuarios] = useState(false);
  const [verLogs, setVerLogs] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [anchoColumnas, setAnchoColumnas] = useState(() => {
    const saved = localStorage.getItem('columnWidths');
    return saved ? JSON.parse(saved) : {};
  });
  const [altoFilas, setAltoFilas] = useState(() => {
    const saved = localStorage.getItem('rowHeights');
    return saved ? JSON.parse(saved) : {};
  });

  const tableRef = useRef(null);
  const { copyToClipboard, pasteFromClipboard } = useCopyPaste();

  // Persistir tamaños
  useEffect(() => {
    localStorage.setItem('columnWidths', JSON.stringify(anchoColumnas));
  }, [anchoColumnas]);

  useEffect(() => {
    localStorage.setItem('rowHeights', JSON.stringify(altoFilas));
  }, [altoFilas]);

  // Fetch de listas
  const fetchListas = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('Lista_Desplegable').select('*');
      if (error) throw error;
      if (data) {
        const mapeo = {};
        const cols = ['Employee', 'Type', 'Specialty', 'Doctor', 'Facility', 'Law Firm', 'Status', 'Calls'];
        cols.forEach(col => {
          const valores = data
            .map(row => row[col])
            .filter(v => v && typeof v === 'string' && v.trim() !== '');
          if (valores.length > 0) {
            mapeo[col] = [...new Set(valores)];
          }
        });
        setOpcionesListas(mapeo);
      }
    } catch (error) {
      console.error('Error cargando listas:', error);
    }
  }, []);

  // Fetch de datos
  const fetchDatos = useCallback(async () => {
    if (!userProfile) return;
    setCargando(true);
    try {
      let query = supabase.from('Eazy_1').select('*', { count: 'exact' });
      
      if (busquedaDiferida.trim()) {
        const term = busquedaDiferida.trim().replace(/"/g, '\\"');
        const filterStr = COLUMNAS.map(col => `"${col}".ilike.%${term}%`).join(',');
        query = query.or(filterStr);
      }
      
      query = query.range(
        pagina * FILAS_POR_PAGINA, 
        (pagina * FILAS_POR_PAGINA) + FILAS_POR_PAGINA - 1
      ).order('id', { ascending: false });
      
      const { data, count, error } = await query;
      if (error) throw error;
      setDatos(data || []);
      setTotalEncontrados(count || 0);
    } catch (error) {
      console.error('Error cargando datos:', error);
      alert('Error al cargar los datos: ' + error.message);
    } finally {
      setCargando(false);
    }
  }, [pagina, userProfile, busquedaDiferida]);

  useEffect(() => { 
    if (userProfile) fetchListas(); 
  }, [userProfile, fetchListas]);

  useEffect(() => { 
    if (userProfile) fetchDatos(); 
  }, [userProfile, fetchDatos]);

  // Debounce búsqueda
  useEffect(() => {
    let cancelled = false;
    const h = setTimeout(() => {
      if (!cancelled) {
        setBusquedaDiferida(busqueda);
        if (busqueda.trim()) setPagina(0);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
  }, [busqueda]);

  // Funciones de datos
  const handleSaveCell = useCallback(async (filaId, col, valor) => {
    const datosAnteriores = [...datos];
    
    setDatos(prev => prev.map(row => 
      row.id === filaId ? { ...row, [col]: valor } : row
    ));
    setEditandoCelda(null);
    
    try {
      const { error } = await supabase
        .from('Eazy_1')
        .update({ [col]: valor })
        .eq('id', filaId);
      
      if (error) throw error;
    } catch (error) {
      setDatos(datosAnteriores);
      console.error('Error guardando:', error);
      alert('Error al guardar los cambios');
    }
  }, [datos]);

  const handleNuevaFila = useCallback(async () => {
    try {
      const { error } = await supabase.from('Eazy_1').insert([{
        Name: '...',
        Date: new Date().toISOString().split('T')[0]
      }]);
      if (error) throw error;
      if (busqueda) {
        setBusqueda('');
        setPagina(0);
      } else {
        fetchDatos();
      }
    } catch (error) {
      console.error('Error creando fila:', error);
      alert('Error al crear nueva fila');
    }
  }, [busqueda, fetchDatos]);

  const handleBorrarFila = useCallback(async () => {
    const tienePermiso = userProfile?.role === 'Admin' || userProfile?.role === 'Superadmin';
    if (!tienePermiso || !filaSeleccionada) return;
    if (!window.confirm("¿Seguro que desea borrar este registro?")) return;
    
    try {
      const { error } = await supabase.from('Eazy_1').delete().eq('id', filaSeleccionada.id);
      if (error) throw error;
      setFilaSeleccionada(null);
      fetchDatos();
    } catch (error) {
      console.error('Error borrando fila:', error);
      alert('Error al borrar la fila');
    }
  }, [userProfile, filaSeleccionada, fetchDatos]);

  // DESHABILITADO: No se puede cambiar colores manualmente
  const handleCambiarColor = useCallback((tipo, color) => {
    // Los colores son automáticos - no se pueden cambiar manualmente
    alert('Los colores son automáticos según el contenido de la celda y no se pueden modificar manualmente.\n\n' +
          '• Law Firm: Celeste o Verde según el bufete\n' +
          '• Specialty: Verde\n' +
          '• Type: Verde (Rojo para Surgery)\n' +
          '• Date: Color diferente cada día');
  }, []);

  // Atajos de teclado
  useEffect(() => {
    const handleKey = async (e) => {
      if (!userProfile) return;
      
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handleNuevaFila();
      }
      
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        if (filaSeleccionada) {
          setEditandoCelda(filaSeleccionada);
        } else if (filaCompletaSeleccionada) {
          setEditandoCelda({ id: filaCompletaSeleccionada, col: COLUMNAS[0] });
          setFilaSeleccionada({ id: filaCompletaSeleccionada, col: COLUMNAS[0] });
          setFilaCompletaSeleccionada(null);
        }
      }
      
      if (e.ctrlKey && e.key === 'c' && filaSeleccionada) {
        e.preventDefault();
        const fila = datos.find(d => d.id === filaSeleccionada.id);
        if (fila && filaSeleccionada.col) {
          copyToClipboard(fila[filaSeleccionada.col]);
        }
      }
      
      if (e.ctrlKey && e.key === 'v' && filaSeleccionada) {
        e.preventDefault();
        const textoPegado = await pasteFromClipboard();
        if (textoPegado && filaSeleccionada.col) {
          await handleSaveCell(filaSeleccionada.id, filaSeleccionada.col, textoPegado);
        }
      }
    };
    
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [userProfile, filaSeleccionada, filaCompletaSeleccionada, datos, handleNuevaFila, handleSaveCell, copyToClipboard, pasteFromClipboard]);

  // Redimensionamiento
  const iniciarRedimensionarColumna = (e, columna) => {
    e.preventDefault();
    const startWidth = anchoColumnas[columna] || 150;
    const startX = e.clientX;
    
    const handleMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      const nuevoAncho = Math.max(ANCHO_MINIMO, startWidth + delta);
      const th = e.target.closest('th');
      if (th) th.style.width = `${nuevoAncho}px`;
    };
    
    const handleUp = (upEvent) => {
      const delta = upEvent.clientX - startX;
      const nuevoAncho = Math.max(ANCHO_MINIMO, startWidth + delta);
      setAnchoColumnas(prev => ({ ...prev, [columna]: nuevoAncho }));
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const iniciarRedimensionarFila = (e, filaId) => {
    e.preventDefault();
    const startHeight = altoFilas[filaId] || 40;
    const startY = e.clientY;
    
    const handleMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      const nuevoAlto = Math.max(ALTO_MINIMO, startHeight + delta);
      const tr = e.target.closest('tr');
      if (tr) tr.style.height = `${nuevoAlto}px`;
    };
    
    const handleUp = (upEvent) => {
      const delta = upEvent.clientY - startY;
      const nuevoAlto = Math.max(ALTO_MINIMO, startHeight + delta);
      setAltoFilas(prev => ({ ...prev, [filaId]: nuevoAlto }));
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const resetearTamanos = () => {
    if (window.confirm('¿Restaurar tamaños predeterminados de filas y columnas?')) {
      setAnchoColumnas({});
      setAltoFilas({});
      localStorage.removeItem('columnWidths');
      localStorage.removeItem('rowHeights');
    }
  };

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'EazyLiens');
    XLSX.writeFile(wb, 'EazyLiens.xlsx');
  };

  const totalPaginas = Math.ceil(totalEncontrados / FILAS_POR_PAGINA);

  const handleClickOutside = (e) => {
    if (editandoCelda) return;
    if (tableRef.current && tableRef.current.contains(e.target)) return;
    setFilaSeleccionada(null);
    setFilaCompletaSeleccionada(null);
  };

  return (
    <div className="excel-shell" onClick={handleClickOutside}>
      <div style={{ color: '#fff', fontSize: '1.2rem', padding: '10px 20px', fontWeight: 700, letterSpacing: 1 }}>
        EazyLiens | ImpactBPO
      </div>

      {!userProfile && (
        <Login
          cargando={cargando}
          onLogin={async (u, p) => {
            setCargando(true);
            try {
              const { data, error } = await supabase
                .from('Users_Database')
                .select('*')
                .eq('username', u.trim())
                .eq('password', p.trim())
                .single();
              if (error || !data) {
                alert("Acceso denegado: Credenciales incorrectas");
              } else {
                setUserProfile(data);
              }
            } catch (error) {
              console.error('Error en login:', error);
              alert("Error al conectar. Verifica tu conexión.");
            } finally {
              setCargando(false);
            }
          }}
        />
      )}

      {verAdmin && (userProfile?.role === 'Admin' || userProfile?.role === 'Superadmin') && (
        <AdminPanel onVolver={() => { setVerAdmin(false); fetchListas(); }} userRole={userProfile?.role} />
      )}

      {verUsuarios && (userProfile?.role === 'Admin' || userProfile?.role === 'Superadmin') && (
        <UsersPanel onVolver={() => setVerUsuarios(false)} userRole={userProfile?.role} />
      )}

      {verLogs && (userProfile?.role === 'Admin' || userProfile?.role === 'Superadmin') && (
        <LogsPanel onVolver={() => setVerLogs(false)} userRole={userProfile?.role} />
      )}

      {userProfile && !verAdmin && !verUsuarios && !verLogs && (
        <>
          <Toolbar
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            totalDatos={totalEncontrados}
            filaSeleccionada={filaSeleccionada}
            filaCompletaSeleccionada={filaCompletaSeleccionada}
            onNuevaFila={handleNuevaFila}
            onBorrarFila={handleBorrarFila}
            onCambiarColor={handleCambiarColor}
            pagina={pagina}
            setPagina={setPagina}
            totalPaginas={totalPaginas}
            username={userProfile.username}
            userRole={userProfile.role}
            setVerAdmin={setVerAdmin}
            setVerUsuarios={setVerUsuarios}
            setVerLogs={setVerLogs}
            onResetTamanos={resetearTamanos}
            onExportarExcel={exportarExcel}
            onLogout={() => setUserProfile(null)}
          />

          <main className="table-viewport">
            {cargando && <div className="loading-overlay">Cargando...</div>}

            <table ref={tableRef} className="excel-table" onClick={(e) => e.stopPropagation()}>
              <thead>
                <tr>
                  <th className="id-col-fixed" style={{ width: '60px' }}>#</th>
                  {COLUMNAS.map(c => (
                    <th
                      key={c}
                      style={{
                        width: anchoColumnas[c] || 150,
                        position: 'relative'
                      }}
                    >
                      {c}
                      {esColorAutomatico({[c]: 'ejemplo'}, c) && (
                        <span style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#00ff88'
                        }} title="Colores automáticos" />
                      )}
                      <div
                        className="column-resizer"
                        onMouseDown={(e) => iniciarRedimensionarColumna(e, c)}
                        title="Arrastrar para redimensionar"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {datos.length === 0 && !cargando ? (
                  <tr>
                    <td colSpan={COLUMNAS.length + 1} style={{ textAlign: 'center', padding: '40px', color: '#fff' }}>
                      {busqueda ? 'No se encontraron resultados' : 'No hay datos disponibles'}
                    </td>
                  </tr>
                ) : (
                  datos.map((fila, i) => {
                    const isFilaCompletaSeleccionada = filaCompletaSeleccionada === fila.id;

                    return (
                      <tr
                        key={fila.id}
                        className={`${isFilaCompletaSeleccionada ? 'fila-seleccionada' : ''} ${editandoCelda?.id === fila.id ? 'fila-editando' : ''}`}
                        style={{ height: altoFilas[fila.id] || 40 }}
                      >
                        <td
                          className="id-col-fixed row-number-cell"
                          style={{ position: 'relative', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFilaCompletaSeleccionada(fila.id);
                            setFilaSeleccionada(null);
                          }}
                          title="Clic para seleccionar toda la fila"
                        >
                          {pagina * FILAS_POR_PAGINA + i + 1}
                          <div
                            className="row-resizer"
                            onMouseDown={(e) => iniciarRedimensionarFila(e, fila.id)}
                            title="Arrastrar para redimensionar"
                          />
                        </td>
                        
                        {COLUMNAS.map(col => {
                          const isSelected = filaSeleccionada?.id === fila.id && filaSeleccionada?.col === col;
                          const isEditing = editandoCelda?.id === fila.id && editandoCelda?.col === col;

                          return (
                            <CeldaMemo
                              key={col}
                              fila={fila}
                              col={col}
                              anchoColumnas={anchoColumnas}
                              altoFilas={altoFilas}
                              isSelected={isSelected}
                              isEditing={isEditing}
                              opciones={opcionesListas[col]}
                              onSelect={() => {
                                if (!isEditing) {
                                  setFilaSeleccionada({ id: fila.id, col });
                                  setFilaCompletaSeleccionada(null);
                                }
                              }}
                              onEdit={(activar) => {
                                if (activar) {
                                  setEditandoCelda({ id: fila.id, col });
                                } else {
                                  setEditandoCelda(null);
                                }
                              }}
                              onSave={(valor) => handleSaveCell(fila.id, col, valor)}
                            />
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </main>
        </>
      )}
    </div>
  );
}

export default App;