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
// LISTAS DE VALORES CON COLOR FIJO
// ========================================

const LAW_FIRM_CELESTES = [
  'Pish & Pish', 'Moet Law Group', 'Rezvani Law Firm', 'Dordick Law', 'Mamanne Law',
  'Karns & Karns', 'Estrada Law Group', 'Yerushalmi Law Firm', 'The Law Offices of Larry H. Parker Inc.',
  'Wilshire Law Firm, PLC', 'Valero Law Group', 'Morgan & Morgan For the People', 'The Dominguez Firm',
  'The Simon Law Group', 'Elite Law Group LA'
];

const LAW_FIRM_VERDES = [
  'Law Office of Joseph D. Ryan', 'KR Law', 'Fiore Legal', 'Lionsgate Law Group', 'The Capital Firm',
  'KAL Law', 'Alexandroff Law Group', 'Mendez & Sanchez', 'Kronos Law', 'DK Law'
];

const SPECIALTY_VERDES = ['Chiropractor', 'Physical Therapy', 'Ortho Spine', 'Neurosurgeon'];

const TYPE_VERDES = ['Injections', 'Pre-Op', 'Procedures'];
const TYPE_ROJOS = ['Surgery'];

// ========================================
// COLORES
// ========================================

const COLORES_FECHA = [
  '#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EAB308',
  '#EF4444', '#EC4899', '#06B6D4', '#92400E', '#6B7280',
];

const COLOR_CELESTE = '#00FFFF';
const COLOR_VERDE = '#00FF00';
const COLOR_ROJO = '#FF0000';

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

// ========================================
// FUNCIÓN CLAVE: ¿Tiene color fijo esta celda?
// ========================================

function obtenerColorFijo(fila, col) {
  const valor = fila?.[col];
  if (!valor) return null;

  // Law Firm
  if (col === 'Law Firm') {
    if (LAW_FIRM_CELESTES.includes(valor)) return { bg: COLOR_CELESTE, text: '#000000' };
    if (LAW_FIRM_VERDES.includes(valor)) return { bg: COLOR_VERDE, text: '#000000' };
    return null; // No está en lista → no tiene color fijo
  }

  // Specialty
  if (col === 'Specialty') {
    if (SPECIALTY_VERDES.includes(valor)) return { bg: COLOR_VERDE, text: '#000000' };
    return null;
  }

  // Type
  if (col === 'Type') {
    if (TYPE_VERDES.includes(valor)) return { bg: COLOR_VERDE, text: '#000000' };
    if (TYPE_ROJOS.includes(valor)) return { bg: COLOR_ROJO, text: '#FFFFFF' };
    return null;
  }

  // Date
  if (col === 'Date' && valor) {
    return obtenerColorPorFecha(valor);
  }

  return null;
}

// ========================================
// ¿Es esta celda pintable manualmente?
// ========================================

function esCeldaPintable(fila, col) {
  // Date nunca es pintable
  if (col === 'Date') return false;

  // Si tiene color fijo, no es pintable
  const colorFijo = obtenerColorFijo(fila, col);
  if (colorFijo) return false;

  // Todo lo demás es pintable
  return true;
}

function obtenerColorPorFecha(fechaStr) {
  if (!fechaStr || typeof fechaStr !== 'string') return null;
  
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return null;
  
  const fecha = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  if (isNaN(fecha.getTime())) return null;
  
  const diffTime = hoy - fecha;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const indice = Math.abs(diffDays) % 10;
  
  return {
    bg: COLORES_FECHA[indice],
    text: '#FFFFFF'
  };
}

// ========================================
// Obtener color final de celda (fijo o manual)
// ========================================

function obtenerColorCelda(fila, col, bgGuardado) {
  // 1. Primero verificar si tiene color fijo
  const colorFijo = obtenerColorFijo(fila, col);
  if (colorFijo) return colorFijo;

  // 2. Si no, usar color guardado manualmente
  if (bgGuardado) {
    return {
      bg: bgGuardado,
      text: '#000000'
    };
  }

  // 3. Default blanco
  return {
    bg: '#ffffff',
    text: '#000000'
  };
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
  bgGuardado,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onSave,
  opciones
}) => {
  const colorInfo = obtenerColorCelda(fila, col, bgGuardado);
  const pintable = esCeldaPintable(fila, col);
  const colorFijo = obtenerColorFijo(fila, col);
  
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
        fontWeight: colorFijo ? '500' : 'normal'
      }}
      title={colorFijo ? 'Color automático - No modificable' : (pintable ? 'Clic para editar, doble clic para menú' : '')}
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

  useEffect(() => {
    localStorage.setItem('columnWidths', JSON.stringify(anchoColumnas));
  }, [anchoColumnas]);

  useEffect(() => {
    localStorage.setItem('rowHeights', JSON.stringify(altoFilas));
  }, [altoFilas]);

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

  const fetchDatos = useCallback(async (silencioso = false) => {
    if (!userProfile) return;
    if (!silencioso) setCargando(true);
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
      if (!silencioso) alert('Error al cargar los datos: ' + error.message);
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, [pagina, userProfile, busquedaDiferida]);

  useEffect(() => { 
    if (userProfile) fetchListas(); 
  }, [userProfile, fetchListas]);

  useEffect(() => { 
    if (userProfile) fetchDatos(); 
  }, [userProfile, fetchDatos]);

  // REALTIME CON RECONEXIÓN
  useEffect(() => {
    if (!userProfile) return;
    let subscription = null;
    let reconnectTimeout = null;
    let isSubscribed = true;

    const setupRealtime = () => {
      subscription = supabase
        .channel('eazy_1_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'Eazy_1' },
          (payload) => {
            console.log('✅ Cambio en tiempo real:', payload);
            fetchDatos(true);
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' && isSubscribed) {
            console.log('❌ Error en canal, reconectando en 5s...');
            reconnectTimeout = setTimeout(() => setupRealtime(), 5000);
          }
        });
    };

    setupRealtime();
    
    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (subscription) subscription.unsubscribe();
    };
  }, [userProfile, fetchDatos]);

  useEffect(() => {
    let cancelled = false;
    const h = setTimeout(() => {
      if (!cancelled) {
        setBusquedaDiferida(busqueda);
        if (busqueda.trim()) setPagina(0);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(h); };
  }, [busqueda]);

  const handleSaveCell = useCallback(async (filaId, col, valor) => {
    const datosAnteriores = [...datos];
    setDatos(prev => prev.map(row => row.id === filaId ? { ...row, [col]: valor } : row));
    setEditandoCelda(null);
    try {
      const { error } = await supabase.from('Eazy_1').update({ [col]: valor }).eq('id', filaId);
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
      if (busqueda) { setBusqueda(''); setPagina(0); } else { fetchDatos(); }
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

  // ========================================
  // PINTAR CELDA O FILA
  // ========================================

  const handleCambiarColor = useCallback(async (tipo, color) => {
    // Pintar celda individual
    if (filaSeleccionada?.col && filaSeleccionada?.id) {
      const fila = datos.find(d => d.id === filaSeleccionada.id);
      
      // Verificar si es pintable
      if (!esCeldaPintable(fila, filaSeleccionada.col)) {
        alert('Esta celda tiene un color automático y no se puede modificar manualmente.');
        return;
      }

      try {
        let actuales = safeJsonParse(fila.bg_color, {});
        actuales[filaSeleccionada.col] = color;
        
        const { error } = await supabase
          .from('Eazy_1')
          .update({ bg_color: JSON.stringify(actuales) })
          .eq('id', filaSeleccionada.id);
        
        if (error) throw error;
        
        setDatos(prev => prev.map(d => 
          d.id === filaSeleccionada.id ? { ...d, bg_color: JSON.stringify(actuales) } : d
        ));
      } catch (error) {
        console.error('Error pintando celda:', error);
        alert('Error al pintar la celda');
      }
      return;
    }

    // Pintar fila completa
    if (filaCompletaSeleccionada) {
      const fila = datos.find(d => d.id === filaCompletaSeleccionada);
      if (!fila) return;

      try {
        let actuales = safeJsonParse(fila.bg_color, {});
        let cambiosRealizados = 0;

        // Pintar SOLO las celdas que son pintables
        COLUMNAS.forEach(col => {
          if (esCeldaPintable(fila, col)) {
            actuales[col] = color;
            cambiosRealizados++;
          }
        });

        if (cambiosRealizados === 0) {
          alert('Todas las celdas de esta fila tienen colores automáticos que no se pueden modificar.');
          return;
        }

        const { error } = await supabase
          .from('Eazy_1')
          .update({ bg_color: JSON.stringify(actuales) })
          .eq('id', filaCompletaSeleccionada);
        
        if (error) throw error;
        
        setDatos(prev => prev.map(d => 
          d.id === filaCompletaSeleccionada ? { ...d, bg_color: JSON.stringify(actuales) } : d
        ));
      } catch (error) {
        console.error('Error pintando fila:', error);
        alert('Error al pintar la fila');
      }
      return;
    }

    alert('Selecciona una celda o una fila (clic en #) para pintar');
  }, [datos, filaSeleccionada, filaCompletaSeleccionada]);

  useEffect(() => {
    const handleKey = async (e) => {
      if (!userProfile) return;
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); handleNuevaFila(); }
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
        if (fila && filaSeleccionada.col) copyToClipboard(fila[filaSeleccionada.col]);
      }
      if (e.ctrlKey && e.key === 'v' && filaSeleccionada) {
        e.preventDefault();
        const text = await pasteFromClipboard();
        if (text && filaSeleccionada.col) await handleSaveCell(filaSeleccionada.id, filaSeleccionada.col, text);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [userProfile, filaSeleccionada, filaCompletaSeleccionada, datos, handleNuevaFila, handleSaveCell, copyToClipboard, pasteFromClipboard]);

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

  // ========================================
  // VERIFICAR SI HAY SELECCIÓN PINTABLE
  // ========================================

  const haySeleccionPintable = () => {
    // Si hay fila completa seleccionada, verificar si tiene al menos una celda pintable
    if (filaCompletaSeleccionada) {
      const fila = datos.find(d => d.id === filaCompletaSeleccionada);
      if (fila) {
        return COLUMNAS.some(col => esCeldaPintable(fila, col));
      }
    }
    
    // Si hay celda seleccionada, verificar si es pintable
    if (filaSeleccionada?.id && filaSeleccionada?.col) {
      const fila = datos.find(d => d.id === filaSeleccionada.id);
      if (fila) {
        return esCeldaPintable(fila, filaSeleccionada.col);
      }
    }
    
    return false;
  };

  const handleClickOutside = (e) => {
    if (editandoCelda) return;
    if (tableRef.current && tableRef.current.contains(e.target)) return;
    setFilaSeleccionada(null);
    setFilaCompletaSeleccionada(null);
  };

  return (
    <div className="excel-shell" onClick={handleClickOutside}>
      {/* ✅ HEADER CON LOGOS - ImpactBPO principal, EazyLiens secundario */}
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        padding: '8px 24px',
        backgroundColor: '#0f0f0f',
        borderBottom: '1px solid #333'
      }}>
        {/* ImpactBPO - Logo PRINCIPAL (más grande) */}
        <img 
          src="/logo-impact.png" 
          alt="ImpactBPO" 
          style={{ 
            height: '38px', 
            width: 'auto',
            objectFit: 'contain'
          }} 
        />
        
        {/* Separador sutil */}
        <div style={{ 
          width: '1px', 
          height: '30px', 
          backgroundColor: '#444',
          margin: '0 4px'
        }} />
        
        {/* EazyLiens - Logo SECUNDARIO (más pequeño) */}
        <img 
          src="/logo-eazy.png" 
          alt="EazyLiens" 
          style={{ 
            height: '22px', 
            width: 'auto',
            objectFit: 'contain',
            opacity: 0.9
          }} 
        />
      </header>

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

      {/* ✅ CORREGIDO: Admin también puede ver UsersPanel */}
      {verUsuarios && (userProfile?.role === 'Superadmin' || userProfile?.role === 'Admin') && (
        <UsersPanel onVolver={() => setVerUsuarios(false)} userRole={userProfile?.role} />
      )}

      {verLogs && userProfile?.role === 'Superadmin' && (
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
            puedePintar={haySeleccionPintable()}
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
                            setEditandoCelda(null);
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
                          const bgGuardado = safeJsonParse(fila.bg_color, {})[col];

                          return (
                            <CeldaMemo
                              key={col}
                              fila={fila}
                              col={col}
                              anchoColumnas={anchoColumnas}
                              altoFilas={altoFilas}
                              bgGuardado={bgGuardado}
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