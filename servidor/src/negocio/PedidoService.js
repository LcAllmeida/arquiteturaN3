import { ErroNaoEncontrado, ErroValidacao } from './erros.js';
import { Pedido, REGRA_DESCONTO } from './Pedido.js';

// Camada de negócio dos pedidos: verifica estoque, calcula total, aplica desconto e coordena a operação.
// Recebe repositórios e transação prontos no construtor (injeção de dependência por construtor).
export class PedidoService {
  constructor({ pedidoRepository, produtoRepository, transacao }) {
    this.pedidoRepository = pedidoRepository;
    this.produtoRepository = produtoRepository;
    this.transacao = transacao;
  }

  listar() {
    return this.pedidoRepository.listar();
  }

  buscar(id) {
    const pedido = this.pedidoRepository.buscarPorId(id);
    if (!pedido) throw new ErroNaoEncontrado(`Pedido ${id} não encontrado.`);
    return pedido;
  }

  // Finalização da compra (seção 6.2): recebe { cliente, itens: [{ produtoId, quantidade }] }.
  // O preço vem SEMPRE do catálogo do servidor, nunca do cliente.
  criar({ cliente, itens }) {
    Pedido.validarCliente(cliente);
    const agrupados = this.#agruparPorProduto(itens);

    // Grava o pedido e baixa o estoque numa única transação: se algo falhar, nada fica gravado.
    return this.transacao.executar(() => {
      const linhas = agrupados.map(({ produtoId, quantidade }) => {
        const produto = this.produtoRepository.buscarPorId(produtoId);
        if (!produto) throw new ErroValidacao(`O produto ${produtoId} não existe no catálogo.`, 'itens');
        produto.baixarEstoque(quantidade);
        this.produtoRepository.atualizarEstoque(produto);
        return { produtoId, nome: produto.nome, precoCentavos: produto.precoCentavos, quantidade };
      });
      return this.pedidoRepository.salvar(Pedido.criar({ cliente, itens: linhas }));
    });
  }

  // Cancela o pedido e devolve os itens ao estoque, também numa única transação.
  cancelar(id) {
    return this.transacao.executar(() => {
      const pedido = this.buscar(id);
      pedido.cancelar();
      for (const item of pedido.itens) {
        const produto = this.produtoRepository.buscarPorId(item.produtoId);
        if (produto) {
          produto.devolverEstoque(item.quantidade);
          this.produtoRepository.atualizarEstoque(produto);
        }
      }
      return this.pedidoRepository.atualizarStatus(pedido);
    });
  }

  resumo() {
    const confirmados = this.pedidoRepository.listar().filter((p) => p.estaConfirmado());
    return {
      pedidosConfirmados: confirmados.length,
      faturamentoCentavos: confirmados.reduce((soma, p) => soma + p.totalCentavos, 0),
      itensVendidos: confirmados.reduce((soma, p) => soma + p.quantidadeItens, 0),
      regraDesconto: REGRA_DESCONTO,
    };
  }

  // O mesmo produto repetido no carrinho vira uma linha só, com as quantidades somadas.
  #agruparPorProduto(itens) {
    const mapa = new Map();
    for (const { produtoId, quantidade } of itens) mapa.set(produtoId, (mapa.get(produtoId) ?? 0) + quantidade);
    return [...mapa].map(([produtoId, quantidade]) => ({ produtoId, quantidade }));
  }
}
