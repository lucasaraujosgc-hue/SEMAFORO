
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do Banco de Dados SQLite
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir);
}
const dbPath = path.join(dataDir, 'database.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    initDb();
  }
});

function initDb() {
  const sql = `
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      topicId TEXT NOT NULL,
      description TEXT NOT NULL,
      chartConfig TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      extraData TEXT -- Nova coluna para armazenar JSON completo (Report, Progresso, etc)
    )
  `;
  db.run(sql, (err) => {
    if (err) console.error('Erro ao criar tabela:', err.message);
    else {
      // Tenta adicionar a coluna extraData se ela não existir (Migração Simples)
      db.run("ALTER TABLE posts ADD COLUMN extraData TEXT", (alterErr) => {
         // Se der erro, provavelmente a coluna já existe, ignoramos.
         if (!alterErr) console.log("Coluna extraData adicionada com sucesso.");
      });
    }
  });
}

// --- API ROUTES ---

// Listar todos os posts
app.get('/api/posts', (req, res) => {
  const sql = 'SELECT * FROM posts ORDER BY createdAt DESC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    // O frontend fará o parse do chartConfig e extraData
    res.json({ data: rows });
  });
});

// Criar novo post
app.post('/api/posts', (req, res) => {
  // Extraímos apenas o que precisamos para colunas fixas, o resto vai pro extraData
  const { id, topicId, description, chartConfig, createdAt, ...rest } = req.body;
  
  // O 'rest' contém: responsavel, report, progress, etc.
  const extraDataStr = JSON.stringify(rest);
  const chartConfigStr = JSON.stringify(chartConfig);

  const sql = `INSERT INTO posts (id, topicId, description, chartConfig, createdAt, extraData) VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [id, topicId, description, chartConfigStr, createdAt, extraDataStr];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'Post criado com sucesso', id: id });
  });
});

// Atualizar post (Edição)
app.put('/api/posts/:id', (req, res) => {
  const { topicId, description, chartConfig, ...rest } = req.body;
  const id = req.params.id;
  
  const extraDataStr = JSON.stringify(rest);
  const chartConfigStr = JSON.stringify(chartConfig);

  const sql = `UPDATE posts SET topicId = ?, description = ?, chartConfig = ?, extraData = ? WHERE id = ?`;
  const params = [topicId, description, chartConfigStr, extraDataStr, id];

  db.run(sql, params, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'Post atualizado com sucesso', changes: this.changes });
  });
});

// Deletar post
app.delete('/api/posts/:id', (req, res) => {
  const sql = 'DELETE FROM posts WHERE id = ?';
  db.run(sql, req.params.id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'Post deletado', changes: this.changes });
  });
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
