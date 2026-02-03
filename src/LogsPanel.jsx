import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './LogsPanel.css';

const LogsPanel = ({ onVolver, userRole }) => {
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('logs')
        .select(`
          id,
          accion,
          fila_id,
          columna,
          valor_anterior,
          valor_nuevo,
          fecha,
          Users_Database(username, role)
        `)
        .order('fecha', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error cargando logs:', error);
      alert('Error al cargar logs');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="logs-panel-screen">
      <header className="logs-header">
        <h1>📋 HISTORIAL DE CAMBIOS</h1>
        <button className="btn-close-panel" onClick={onVolver}>✕ Cerrar</button>
      </header>

      <div className="logs-table-container">
        {cargando && <div className="loading-logs">Cargando...</div>}

        <table className="logs-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Acción</th>
              <th>Fila</th>
              <th>Columna</th>
              <th>Valor anterior</th>
              <th>Valor nuevo</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && !cargando ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                  No hay cambios registrados
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.fecha).toLocaleString()}</td>
                  <td>{log.Users_Database?.username || '—'}</td>
                  <td>{log.Users_Database?.role || '—'}</td>
                  <td>{log.accion}</td>
                  <td>{log.fila_id}</td>
                  <td>{log.columna}</td>
                  <td className="valor-cell">{log.valor_anterior || '—'}</td>
                  <td className="valor-cell">{log.valor_nuevo || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogsPanel;