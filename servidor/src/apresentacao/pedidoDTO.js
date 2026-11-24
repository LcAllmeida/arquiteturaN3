import { ErroValidacao } from '../negocio/erros.js';

export const LIMITES_PEDIDO = { maxItens: 20, maxQuantidade: 99 };

// Objeto de transferência (DTO) da finalização de compra (seção 6.2, item b).
// O controller valida só o FORMATO do JSON e devolve um objeto simples e confiável.
// Regras do negócio (estoque, desconto) ficam no serviço. Preço enviado pelo cliente é ignorado.
export function paraNovoPedidoDTO(corpo) {
  if (corpo === null || typeof corpo !== 'object' || Array.isArray(corpo)) {
    throw new ErroValidacao('Envie um objeto JSON com "cliente" e "itens".');
  }
  if (typeof corpo.cliente !== 'string') throw new ErroValidacao('Informe o nome do cliente.', 'cliente');
  if (!Array.isArray(corpo.itens) || corpo.itens.length === 0) {
    throw new ErroValidacao('O carrinho está vazio: adicione pelo menos um produto.', 'itens');
  }
  if (corpo.itens.length > LIMITES_PEDIDO.maxItens) {
    throw new ErroValidacao(`O pedido aceita no máximo ${LIMITES_PEDIDO.maxItens} produtos diferentes.`, 'itens');
  }

  const itens = corpo.itens.map((item, posicao) => {
    const produtoId = item?.produtoId;
    const quantidade = item?.quantidade;
    if (!Number.isSafeInteger(produtoId) || produtoId < 1) {
      throw new ErroValidacao(`Item ${posicao + 1}: "produtoId" deve ser um número inteiro positivo.`, 'itens');
    }
    if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > LIMITES_PEDIDO.maxQuantidade) {
      throw new ErroValidacao(`Item ${posicao + 1}: a quantidade deve ser um número inteiro de 1 a ${LIMITES_PEDIDO.maxQuantidade}.`, 'itens');
    }
    return { produtoId, quantidade };
  });

  return { cliente: corpo.cliente, itens };
}
