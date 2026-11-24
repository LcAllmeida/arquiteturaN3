// "V" do MVC no servidor: define o formato em que os modelos são devolvidos aos clientes.
// Os controllers nunca montam a resposta à mão; eles pedem a visão aqui.
// Internamente o dinheiro é em centavos; para fora sai em reais com 2 casas.
const reais = (centavos) => centavos / 100;

export function produtoView(produto) {
  return { id: produto.id, nome: produto.nome, preco: reais(produto.precoCentavos), estoque: produto.estoque };
}

export function pedidoView(pedido) {
  return {
    id: pedido.id,
    cliente: pedido.cliente,
    status: pedido.status,
    criadoEm: pedido.criadoEm,
    itens: pedido.itens.map((item) => ({
      produtoId: item.produtoId,
      nome: item.nome,
      precoUnitario: reais(item.precoCentavos),
      quantidade: item.quantidade,
      subtotal: reais(item.precoCentavos * item.quantidade),
    })),
    quantidadeItens: pedido.quantidadeItens,
    subtotal: reais(pedido.subtotalCentavos),
    desconto: reais(pedido.descontoCentavos),
    total: reais(pedido.totalCentavos),
  };
}

export function resumoView(resumo) {
  return {
    pedidosConfirmados: resumo.pedidosConfirmados,
    faturamento: reais(resumo.faturamentoCentavos),
    itensVendidos: resumo.itensVendidos,
    regraDesconto: { pedidoMinimo: reais(resumo.regraDesconto.minimoCentavos), percentual: resumo.regraDesconto.percentual },
  };
}

export function erroView(mensagem, campo = null) {
  return campo ? { erro: mensagem, campo } : { erro: mensagem };
}
