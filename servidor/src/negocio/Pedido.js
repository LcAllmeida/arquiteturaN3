import { ErroRegraNegocio, ErroValidacao } from './erros.js';

// Regra de desconto: 10% em pedidos a partir de R$ 300,00.
export const REGRA_DESCONTO = { minimoCentavos: 30000, percentual: 10 };
export const LIMITE_CLIENTE = { minimo: 2, maximo: 60 };

// Entidade do domínio (o "M" do MVC). Os itens guardam nome e preço do momento da compra,
// para o pedido não mudar se o preço do produto mudar depois.
export class Pedido {
  constructor({ id = null, cliente, itens, descontoCentavos = 0, status = 'confirmado', criadoEm = new Date().toISOString() }) {
    this.id = id;
    this.cliente = cliente;
    this.itens = itens; // [{ produtoId, nome, precoCentavos, quantidade }]
    this.descontoCentavos = descontoCentavos;
    this.status = status;
    this.criadoEm = criadoEm;
  }

  // Cria um pedido novo aplicando a regra de desconto (usado na finalização da compra).
  static criar({ cliente, itens }) {
    const pedido = new Pedido({ cliente: Pedido.validarCliente(cliente), itens });
    if (itens.length === 0) throw new ErroValidacao('O pedido precisa ter pelo menos um item.', 'itens');
    pedido.descontoCentavos = pedido.subtotalCentavos >= REGRA_DESCONTO.minimoCentavos
      ? Math.round((pedido.subtotalCentavos * REGRA_DESCONTO.percentual) / 100)
      : 0;
    return pedido;
  }

  static validarCliente(cliente) {
    const nome = String(cliente ?? '').trim().replace(/\s+/g, ' ');
    if (nome.length < LIMITE_CLIENTE.minimo) throw new ErroValidacao('Informe o nome do cliente (pelo menos 2 letras).', 'cliente');
    if (nome.length > LIMITE_CLIENTE.maximo) throw new ErroValidacao(`O nome do cliente aceita no máximo ${LIMITE_CLIENTE.maximo} caracteres.`, 'cliente');
    return nome;
  }

  get subtotalCentavos() {
    return this.itens.reduce((soma, item) => soma + item.precoCentavos * item.quantidade, 0);
  }

  get totalCentavos() {
    return this.subtotalCentavos - this.descontoCentavos;
  }

  get quantidadeItens() {
    return this.itens.reduce((soma, item) => soma + item.quantidade, 0);
  }

  estaConfirmado() {
    return this.status === 'confirmado';
  }

  cancelar() {
    if (!this.estaConfirmado()) throw new ErroRegraNegocio(`O pedido ${this.id} já foi cancelado.`);
    this.status = 'cancelado';
  }
}
