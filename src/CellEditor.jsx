import React, { useState, useEffect, useRef } from 'react';

const CellEditor = ({ valor, opciones, alGuardar, alCancelar }) => {
  const [valorActual, setValorActual] = useState(valor || '');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [opcionesFiltradas, setOpcionesFiltradas] = useState([]);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // ✅ DEBUG: Ver qué llega al componente
  useEffect(() => {
    console.log('🔧 CellEditor montado:');
    console.log('  - valor:', valor);
    console.log('  - opciones:', opciones);
    console.log('  - tipo de opciones:', typeof opciones);
    console.log('  - es array?:', Array.isArray(opciones));
    console.log('  - cantidad:', opciones?.length);
  }, []);

  // ✅ Inicializar opciones filtradas
  useEffect(() => {
    if (opciones && Array.isArray(opciones) && opciones.length > 0) {
      console.log('✅ Inicializando opciones filtradas:', opciones.length);
      setOpcionesFiltradas(opciones);
      // Mostrar dropdown automáticamente si hay opciones
      setMostrarDropdown(true);
    } else {
      console.log('⚠️ No hay opciones disponibles para este campo');
      setOpcionesFiltradas([]);
      setMostrarDropdown(false);
    }
  }, [opciones]);

  // ✅ Auto-focus en el input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      console.log('🎯 Input enfocado');
    }
  }, []);

  // ✅ Cerrar dropdown si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(e.target) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target)
      ) {
        setMostrarDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Filtrar opciones cuando el usuario escribe
  const handleChange = (nuevoValor) => {
    console.log('✏️ Valor cambiado a:', nuevoValor);
    setValorActual(nuevoValor);
    
    if (opciones && Array.isArray(opciones) && opciones.length > 0) {
      const filtradas = opciones.filter(op => 
        op.toLowerCase().includes(nuevoValor.toLowerCase())
      );
      console.log(`🔍 Opciones filtradas: ${filtradas.length}/${opciones.length}`);
      setOpcionesFiltradas(filtradas);
      setMostrarDropdown(filtradas.length > 0);
    }
  };

  // ✅ Seleccionar opción del dropdown
  const seleccionarOpcion = (opcion) => {
    console.log('✅ Opción seleccionada:', opcion);
    setValorActual(opcion);
    setMostrarDropdown(false);
    setTimeout(() => alGuardar(opcion), 0);
  };

  // ✅ Manejar teclas
  const handleKeyDown = (e) => {
    console.log('⌨️ Tecla presionada:', e.key);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      console.log('💾 Enter - Guardando:', valorActual);
      setMostrarDropdown(false);
      alGuardar(valorActual);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      console.log('❌ Escape - Cancelando');
      setMostrarDropdown(false);
      alCancelar();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      console.log('⬇️ Arrow Down - Mostrando dropdown');
      if (opciones && opciones.length > 0) {
        setMostrarDropdown(true);
      }
    }
  };

  // ✅ Manejar blur (perder foco)
  const handleBlur = (e) => {
    console.log('👋 Blur - Perdiendo foco');
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        console.log('💾 Guardando por blur');
        alGuardar(valorActual);
      }
    }, 150);
  };

  const tieneOpciones = opciones && Array.isArray(opciones) && opciones.length > 0;
  
  console.log('🎨 Renderizando CellEditor:');
  console.log('  - tieneOpciones:', tieneOpciones);
  console.log('  - mostrarDropdown:', mostrarDropdown);
  console.log('  - opcionesFiltradas.length:', opcionesFiltradas.length);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center'
      }}
      onClick={(e) => {
        console.log('🖱️ Click en container del editor');
        e.stopPropagation();
      }}
    >
      {/* Input principal */}
      <input
        ref={inputRef}
        type="text"
        value={valorActual}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => {
          console.log('🎯 Focus en input');
          if (tieneOpciones) {
            console.log('📋 Mostrando dropdown por focus');
            setMostrarDropdown(true);
          }
        }}
        placeholder={tieneOpciones ? 'Escribe o selecciona...' : 'Escribe aquí...'}
        style={{
          width: '100%',
          height: '100%',
          background: 'rgba(0, 255, 136, 0.1)',
          border: '2px solid #00ff88',
          color: '#00ff88',
          padding: '8px 12px',
          fontSize: '13px',
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          borderRadius: '4px'
        }}
      />

      {/* Badge indicador (DEBUG) */}
      {tieneOpciones && (
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '0',
          background: '#00ff88',
          color: '#000',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 'bold',
          pointerEvents: 'none'
        }}>
          {opciones.length} opciones
        </div>
      )}

      {/* Dropdown de opciones */}
      {tieneOpciones && mostrarDropdown && opcionesFiltradas.length > 0 ? (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: '200px',
            overflowY: 'auto',
            background: '#1a1a1a',
            border: '2px solid #00ff88',
            borderTop: 'none',
            zIndex: 10000,
            boxShadow: '0 4px 12px rgba(0, 255, 136, 0.5)',
            marginTop: '-2px'
          }}
          onClick={(e) => {
            console.log('🖱️ Click en dropdown');
            e.stopPropagation();
          }}
        >
          {opcionesFiltradas.map((opcion, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Click en opción:', opcion);
                seleccionarOpcion(opcion);
              }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                background: 'transparent',
                color: '#fff',
                fontSize: '13px',
                borderBottom: idx < opcionesFiltradas.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                transition: 'background 0.2s',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 136, 0.2)';
                e.currentTarget.style.color = '#00ff88';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#fff';
              }}
            >
              {opcion}
            </div>
          ))}
        </div>
      ) : (
        tieneOpciones && mostrarDropdown && opcionesFiltradas.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            padding: '10px',
            background: '#1a1a1a',
            border: '2px solid #00ff88',
            borderTop: 'none',
            color: '#666',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            Sin resultados
          </div>
        )
      )}
    </div>
  );
};

export default CellEditor;