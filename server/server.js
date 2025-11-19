const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const os = require('os');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors()); 
app.use(bodyParser.json());

// Conexión a Base de Datos SQLite
const db = new sqlite3.Database('./eitrion.db', (err) => {
  if (err) console.error('Error conectando a SQLite:', err.message);
  else console.log('Conectado a la base de datos SQLite.');
});

// Inicializar Tabla
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      createdAt TEXT,
      ref TEXT,
      solicitadoPor TEXT,
      prioridad TEXT,
      estado TEXT,
      titulo TEXT,
      comentariosHistorial TEXT, 
      tags TEXT
    )
  `);
});

// --- RUTAS (API) ---

// LEER
app.get('/api/tasks', (req, res) => {
  db.all("SELECT * FROM tasks", [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    const tasks = rows.map(task => ({
      ...task,
      comentariosHistorial: JSON.parse(task.comentariosHistorial || '[]'),
      tags: JSON.parse(task.tags || '[]')
    }));
    res.json({ data: tasks });
  });
});

// CREAR
app.post('/api/tasks', (req, res) => {
  const { id, createdAt, ref, solicitadoPor, prioridad, estado, titulo, comentariosHistorial, tags } = req.body;
  const query = `INSERT INTO tasks (id, createdAt, ref, solicitadoPor, prioridad, estado, titulo, comentariosHistorial, tags) VALUES (?,?,?,?,?,?,?,?,?)`;
  const params = [id, createdAt, ref, solicitadoPor, prioridad, estado, titulo, JSON.stringify(comentariosHistorial), JSON.stringify(tags)];
  db.run(query, params, function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Registro creado", id: id });
  });
});

// ACTUALIZAR (Todos los campos)
app.put('/api/tasks/:id', (req, res) => {
  const { ref, solicitadoPor, prioridad, estado, titulo, comentariosHistorial, tags } = req.body;
  const query = `UPDATE tasks SET ref = ?, solicitadoPor = ?, prioridad = ?, estado = ?, titulo = ?, comentariosHistorial = ?, tags = ? WHERE id = ?`;
  const params = [ref, solicitadoPor, prioridad, estado, titulo, JSON.stringify(comentariosHistorial), JSON.stringify(tags), req.params.id];
  db.run(query, params, function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Registro actualizado completo" });
  });
});

// ELIMINAR
app.delete('/api/tasks/:id', (req, res) => {
  const query = `DELETE FROM tasks WHERE id = ?`;
  db.run(query, req.params.id, function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Registro eliminado" });
  });
});

// Función para detectar IP local
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIp();
  console.log(`\n🚀 SERVIDOR LISTO!`);
  console.log(`🏠 Local:   http://localhost:${PORT}`);
  console.log(`📡 En Red:  http://${ip}:${PORT}`);
});