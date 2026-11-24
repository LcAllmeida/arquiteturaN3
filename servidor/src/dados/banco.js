import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { CATALOGO_INICIAL } from './catalogoInicial.js';

// Abre (ou cria) o banco SQLite, cria as tabelas e cadastra o catálogo inicial se estiver vazio.
export function abrirBanco(caminhoArquivo) {
  mkdirSync(dirname(caminhoArquivo), { recursive: true });
  const db = new DatabaseSync(caminhoArquivo);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS produtos (
      id             INTEGER PRIMARY KEY,
      nome           TEXT    NOT NULL,
      preco_centavos INTEGER NOT NULL CHECK (preco_centavos >= 0),
      estoque        INTEGER NOT NULL CHECK (estoque >= 0)
    );
    CREATE TABLE IF NOT EXISTS pedidos (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente           TEXT    NOT NULL,
      status            TEXT    NOT NULL CHECK (status IN ('confirmado', 'cancelado')),
      desconto_centavos INTEGER NOT NULL,
      criado_em         TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS itens_pedido (
      pedido_id      INTEGER NOT NULL REFERENCES pedidos(id),
      produto_id     INTEGER NOT NULL REFERENCES produtos(id),
      nome           TEXT    NOT NULL,
      preco_centavos INTEGER NOT NULL,
      quantidade     INTEGER NOT NULL CHECK (quantidade > 0),
      PRIMARY KEY (pedido_id, produto_id)
    );
  `);

  if (db.prepare('SELECT COUNT(*) AS total FROM produtos').get().total === 0) {
    const inserir = db.prepare('INSERT INTO produtos (id, nome, preco_centavos, estoque) VALUES (?, ?, ?, ?)');
    for (const p of CATALOGO_INICIAL) inserir.run(p.id, p.nome, p.precoCentavos, p.estoque);
  }
  return db;
}
