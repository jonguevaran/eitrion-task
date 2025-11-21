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

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      role TEXT DEFAULT 'Editor'
    )
  `);

  // Migration simple: Add role column if not exists (ignoring error if exists)
  db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'Editor'", (err) => {
    // Ignore error if column already exists
  });
});

// --- RUTAS (API) ---

// AUTH
app.post('/api/register', (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  // Check if it's the first user
  db.get("SELECT count(*) as count FROM users", [], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });

    let userRole = role;
    if (row.count === 0) {
      userRole = 'Admin'; // First user is always Admin
    } else if (!userRole) {
      userRole = 'Editor'; // Default to Editor if not specified
    }

    const query = `INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`;
    db.run(query, [username, password, name, userRole], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: "Nome de utilizador já existe" });
        }
        return res.status(400).json({ error: err.message });
      }
      res.json({ id: this.lastID, username, name, role: userRole });
    });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT id, username, name, role FROM users WHERE username = ? AND password = ?`;
  db.get(query, [username, password], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!row) return res.status(401).json({ error: "Credenciais inválidas" });
    res.json(row);
  });
});

app.get('/api/users', (req, res) => {
  db.all("SELECT id, name, username, role FROM users", [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ data: rows });
  });
});

app.delete('/api/users/:id', (req, res) => {
  const query = `DELETE FROM users WHERE id = ?`;
  db.run(query, req.params.id, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Utilizador eliminado" });
  });
});

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
  db.run(query, params, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Registro creado", id: id });
  });
});

// ACTUALIZAR (Todos los campos)
app.put('/api/tasks/:id', (req, res) => {
  const { ref, solicitadoPor, prioridad, estado, titulo, comentariosHistorial, tags } = req.body;
  const query = `UPDATE tasks SET ref = ?, solicitadoPor = ?, prioridad = ?, estado = ?, titulo = ?, comentariosHistorial = ?, tags = ? WHERE id = ?`;
  const params = [ref, solicitadoPor, prioridad, estado, titulo, JSON.stringify(comentariosHistorial), JSON.stringify(tags), req.params.id];
  db.run(query, params, function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "Registro actualizado completo" });
  });
});

// ELIMINAR
app.delete('/api/tasks/:id', (req, res) => {
  const query = `DELETE FROM tasks WHERE id = ?`;
  db.run(query, req.params.id, function (err) {
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