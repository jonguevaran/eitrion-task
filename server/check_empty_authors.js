const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'eitrion.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  // Check tasks with empty or null solicitadoPor
  db.all("SELECT id, ref, solicitadoPor FROM tasks WHERE solicitadoPor IS NULL OR solicitadoPor = ''", [], (err, rows) => {
    if (err) {
      console.error('Error checking tasks:', err.message);
      return;
    }
    console.log(`Found ${rows.length} tasks with empty/null solicitadoPor.`);
    rows.forEach(row => console.log(`- Task ${row.id} (${row.ref})`));
  });

  // Check comments with empty or null author
  db.all("SELECT id, comentariosHistorial FROM tasks", [], (err, rows) => {
    if (err) {
      console.error('Error fetching tasks for comments:', err.message);
      return;
    }

    let unidentifiedComments = 0;
    rows.forEach(row => {
      try {
        const history = JSON.parse(row.comentariosHistorial || '[]');
        history.forEach(comment => {
          if (!comment.author || comment.author.trim() === '') {
            unidentifiedComments++;
            console.log(`- Unidentified comment in Task ${row.id}`);
          }
        });
      } catch (e) {
        // ignore parse errors
      }
    });
    console.log(`Found ${unidentifiedComments} comments with empty/null author.`);
  });
});

setTimeout(() => {
  db.close();
}, 2000);
