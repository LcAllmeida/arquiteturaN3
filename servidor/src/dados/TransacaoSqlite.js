import { Transacao } from '../negocio/contratos.js';

// Transação real do banco: BEGIN ... COMMIT, ou ROLLBACK se qualquer passo lançar erro.
export class TransacaoSqlite extends Transacao {
  constructor(db) {
    super();
    this.db = db;
  }

  executar(funcao) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const resultado = funcao();
      this.db.exec('COMMIT');
      return resultado;
    } catch (erro) {
      this.db.exec('ROLLBACK');
      throw erro;
    }
  }
}
