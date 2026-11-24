import { ErroRegraNegocio } from './erros.js';

// Entidade do catálogo. Valores em centavos (inteiros) para não ter erro de arredondamento.
export class Produto {
  constructor({ id, nome, precoCentavos, estoque }) {
    this.id = id;
    this.nome = nome;
    this.precoCentavos = precoCentavos;
    this.estoque = estoque;
  }

  baixarEstoque(quantidade) {
    if (quantidade > this.estoque) {
      const disponivel = this.estoque === 0 ? 'produto esgotado' : `disponível: ${this.estoque}`;
      throw new ErroRegraNegocio(`Estoque insuficiente para ${this.nome} (pedido: ${quantidade}, ${disponivel}).`, 'itens');
    }
    this.estoque -= quantidade;
  }

  devolverEstoque(quantidade) {
    this.estoque += quantidade;
  }
}
