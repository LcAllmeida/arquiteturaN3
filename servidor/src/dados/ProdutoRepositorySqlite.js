import { ProdutoRepository } from '../negocio/contratos.js';
import { Produto } from '../negocio/Produto.js';

// Camada de acesso a dados: implementa o contrato do catálogo com SQLite.
export class ProdutoRepositorySqlite extends ProdutoRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  #paraProduto(linha) {
    return linha ? new Produto({ id: linha.id, nome: linha.nome, precoCentavos: linha.preco_centavos, estoque: linha.estoque }) : null;
  }

  listar() {
    return this.db.prepare('SELECT * FROM produtos ORDER BY id').all().map((l) => this.#paraProduto(l));
  }

  buscarPorId(id) {
    return this.#paraProduto(this.db.prepare('SELECT * FROM produtos WHERE id = ?').get(id));
  }

  atualizarEstoque(produto) {
    this.db.prepare('UPDATE produtos SET estoque = ? WHERE id = ?').run(produto.estoque, produto.id);
  }
}
