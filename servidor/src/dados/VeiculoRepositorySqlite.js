import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Veiculo } from '../negocio/Veiculo.js';
import { VeiculoRepository } from '../negocio/VeiculoRepository.js';

// Camada de acesso a dados: implementa o contrato usando SQLite (embutido no Node).
// Só esta classe conhece SQL; trocar de banco não afeta o serviço.
export class VeiculoRepositorySqlite extends VeiculoRepository {
  constructor(caminhoArquivo) {
    super();
    mkdirSync(dirname(caminhoArquivo), { recursive: true });
    this.db = new DatabaseSync(caminhoArquivo);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        placa   TEXT NOT NULL,
        modelo  TEXT NOT NULL,
        cor     TEXT NOT NULL,
        entrada TEXT NOT NULL,
        saida   TEXT,
        valor   REAL
      )`);
  }

  #paraVeiculo(linha) {
    return linha ? new Veiculo({ ...linha }) : null;
  }

  listar() {
    return this.db.prepare('SELECT * FROM veiculos ORDER BY id DESC').all().map((l) => this.#paraVeiculo(l));
  }

  buscarPorId(id) {
    return this.#paraVeiculo(this.db.prepare('SELECT * FROM veiculos WHERE id = ?').get(id));
  }

  buscarEstacionadoPorPlaca(placa) {
    return this.#paraVeiculo(
      this.db.prepare('SELECT * FROM veiculos WHERE placa = ? AND saida IS NULL').get(placa),
    );
  }

  contarEstacionados() {
    return this.db.prepare('SELECT COUNT(*) AS total FROM veiculos WHERE saida IS NULL').get().total;
  }

  salvar(veiculo) {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO veiculos (placa, modelo, cor, entrada, saida, valor) VALUES (?, ?, ?, ?, ?, ?)')
      .run(veiculo.placa, veiculo.modelo, veiculo.cor, veiculo.entrada, veiculo.saida, veiculo.valor);
    return this.buscarPorId(Number(lastInsertRowid));
  }

  atualizar(veiculo) {
    this.db
      .prepare('UPDATE veiculos SET placa = ?, modelo = ?, cor = ?, entrada = ?, saida = ?, valor = ? WHERE id = ?')
      .run(veiculo.placa, veiculo.modelo, veiculo.cor, veiculo.entrada, veiculo.saida, veiculo.valor, veiculo.id);
    return this.buscarPorId(veiculo.id);
  }

  remover(id) {
    this.db.prepare('DELETE FROM veiculos WHERE id = ?').run(id);
  }
}
