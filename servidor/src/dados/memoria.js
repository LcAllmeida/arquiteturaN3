import { PedidoRepository, ProdutoRepository, Transacao } from '../negocio/contratos.js';
import { Pedido } from '../negocio/Pedido.js';
import { Produto } from '../negocio/Produto.js';

// Segunda implementação dos MESMOS contratos, guardando tudo em memória.
// Usada nos testes e com DB=memoria, sem mudar nenhuma linha dos serviços.
// Sempre devolve cópias, para ninguém alterar o "banco" sem passar pelo repositório.

export class ProdutoRepositoryMemoria extends ProdutoRepository {
  constructor(catalogo = []) {
    super();
    this.dados = new Map(catalogo.map((p) => [p.id, { ...p }]));
  }

  listar() {
    return [...this.dados.values()].map((p) => new Produto(p));
  }

  buscarPorId(id) {
    const p = this.dados.get(id);
    return p ? new Produto(p) : null;
  }

  atualizarEstoque(produto) {
    this.dados.get(produto.id).estoque = produto.estoque;
  }

  fotografar() { return structuredClone(this.dados); }
  restaurar(foto) { this.dados = foto; }
}

export class PedidoRepositoryMemoria extends PedidoRepository {
  constructor() {
    super();
    this.dados = new Map();
    this.proximoId = 1;
  }

  #copia(registro) {
    return registro ? new Pedido(structuredClone(registro)) : null;
  }

  listar() {
    return [...this.dados.values()].reverse().map((r) => this.#copia(r));
  }

  buscarPorId(id) {
    return this.#copia(this.dados.get(id));
  }

  salvar(pedido) {
    const registro = { ...structuredClone({ ...pedido }), id: this.proximoId++ };
    this.dados.set(registro.id, registro);
    return this.#copia(registro);
  }

  atualizarStatus(pedido) {
    this.dados.get(pedido.id).status = pedido.status;
    return this.buscarPorId(pedido.id);
  }

  fotografar() { return { dados: structuredClone(this.dados), proximoId: this.proximoId }; }
  restaurar(foto) { this.dados = foto.dados; this.proximoId = foto.proximoId; }
}

// "Transação" em memória: tira uma foto dos repositórios e volta a ela se der erro.
export class TransacaoMemoria extends Transacao {
  constructor(repositorios) {
    super();
    this.repositorios = repositorios;
  }

  executar(funcao) {
    const fotos = this.repositorios.map((r) => r.fotografar());
    try {
      return funcao();
    } catch (erro) {
      this.repositorios.forEach((r, i) => r.restaurar(fotos[i]));
      throw erro;
    }
  }
}
