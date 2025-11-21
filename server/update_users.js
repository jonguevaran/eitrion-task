const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'eitrion.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

const oldName = 'Utilizador';
const newName = 'endernarea';

db.serialize(() => {
  // 1. Update 'solicitadoPor' in tasks table
  db.run(`UPDATE tasks SET solicitadoPor = ? WHERE solicitadoPor = ?`, [newName, oldName], function(err) {
    if (err) {
      return console.error('Error updating tasks:', err.message);
    }
    console.log(`Updated ${this.changes} tasks where solicitadoPor was '${oldName}'.`);
  });

  // 2. Update 'author' in comentariosHistorial JSON in tasks table
  // Since SQLite JSON support might vary or be complex to update partially, we'll read all tasks, parse JSON, update, and write back.
  db.all("SELECT id, comentariosHistorial FROM tasks", [], (err, rows) => {
    if (err) {
      return console.error('Error fetching tasks for comments update:', err.message);
    }

    let updatedCount = 0;
    const updateStmt = db.prepare("UPDATE tasks SET comentariosHistorial = ? WHERE id = ?");

    rows.forEach(row => {
      try {
        let history = JSON.parse(row.comentariosHistorial || '[]');
        let changed = false;

        history = history.map(comment => {
          if (comment.author === oldName) {
            changed = true;
            return { ...comment, author: newName };
          }
          return comment;
        });

        if (changed) {
          updateStmt.run(JSON.stringify(history), row.id, (err) => {
            if (err) console.error(`Error updating task ${row.id}:`, err.message);
          });
          updatedCount++;
        }
      } catch (e) {
        console.error(`Error parsing JSON for task ${row.id}:`, e.message);
      }
    });

    updateStmt.finalize(() => {
        console.log(`Updated comments in ${updatedCount} tasks.`);
    });
  });
  
    // 3. Update 'users' table if exists
    db.run(`UPDATE users SET name = ? WHERE name = ?`, [newName, oldName], function(err) {
        if (err) {
            // Ignore if table doesn't exist or other errors for now, as users table might not have this specific record
             console.log('Users table update skipped or no changes (might not exist or no match).');
        } else {
             console.log(`Updated ${this.changes} users where name was '${oldName}'.`);
        }
    });

});

// Close the database connection after a short delay to allow async operations to finish
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
  });
}, 2000);
