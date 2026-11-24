import { PedidoRepository } from '../negocio/contratos.js';
import { Pedido } from '../negocio/Pedido.js';

// Camada de acesso a dados: implementa o contrato de pedidos com SQLite.
// Só esta classe conhece as tabelas "pedidos" e "itens_pedido".
export class PedidoRepositorySqlite extends PedidoRepository {
  constructor(db) {
    super();
    this.db = db;
  }

  #paraItem(linha) {
    return { produtoId: linha.produto_id, nome: linha.nome, precoCentavos: linha.preco_centavos, quantidade: linha.quantidade };
  }

  #paraPedido(linha, itens) {
    return new Pedido({
      id: linha.id, cliente: linha.cliente, status: linha.status,
      descontoCentavos: linha.desconto_centavos, criadoEm: linha.criado_em, itens,
    });
  }

  // Duas consultas no total (pedidos + itens), sem uma consulta por pedido.
  listar() {
    const itensPorPedido = new Map();
    for (const linha of this.db.prepare('SELECT * FROM itens_pedido ORDER BY pedido_id, nome').all()) {
      if (!itensPorPedido.has(linha.pedido_id)) itensPorPedido.set(linha.pedido_id, []);
      itensPorPedido.get(linha.pedido_id).push(this.#paraItem(linha));
    }
    return this.db.prepare('SELECT * FROM pedidos ORDER BY id DESC').all()
      .map((linha) => this.#paraPedido(linha, itensPorPedido.get(linha.id) ?? []));
  }

  buscarPorId(id) {
    const linha = this.db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
    if (!linha) return null;
    const itens = this.db.prepare('SELECT * FROM itens_pedido WHERE pedido_id = ? ORDER BY nome').all(id).map((l) => this.#paraItem(l));
    return this.#paraPedido(linha, itens);
  }

  salvar(pedido) {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO pedidos (cliente, status, desconto_centavos, criado_em) VALUES (?, ?, ?, ?)')
      .run(pedido.cliente, pedido.status, pedido.descontoCentavos, pedido.criadoEm);
    const id = Number(lastInsertRowid);
    const inserirItem = this.db.prepare('INSERT INTO itens_pedido (pedido_id, produto_id, nome, preco_centavos, quantidade) VALUES (?, ?, ?, ?, ?)');
    for (const item of pedido.itens) inserirItem.run(id, item.produtoId, item.nome, item.precoCentavos, item.quantidade);
    return this.buscarPorId(id);
  }

  atualizarStatus(pedido) {
    this.db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(pedido.status, pedido.id);
    return this.buscarPorId(pedido.id);
  }
}
