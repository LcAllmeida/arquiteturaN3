// Cliente de terminal: um segundo cliente, independente do navegador (no texto, o "aplicativo"),
// que consome a MESMA API pelo protocolo HTTP. Não conhece nada da implementação do servidor.
const API = process.env.API_URL ?? 'http://localhost:3000/api';

const AJUDA = `Uso: npm run cli -- <comando>

  produtos                              catálogo com preço e estoque
  comprar "<cliente>" <id>:<qtd> ...    finaliza um pedido
  pedidos                               lista os pedidos
  cancelar <número>                     cancela um pedido e devolve o estoque
  resumo                                pedidos confirmados e faturamento

Exemplo: npm run cli -- comprar "Ana Souza" 1:1 2:2`;

async function chamar(metodo, caminho, corpo) {
  const resposta = await fetch(API + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(`${resposta.status} - ${dados?.erro ?? 'erro'}`);
  return dados;
}

const dinheiro = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// "1:2" -> { produtoId: 1, quantidade: 2 }. "1" sozinho vale quantidade 1.
function lerItem(texto) {
  const [id, qtd = '1'] = texto.split(':');
  if (!/^[1-9][0-9]*$/.test(id) || !/^[1-9][0-9]*$/.test(qtd)) {
    throw new Error(`item "${texto}" inválido. Use <id>:<quantidade>, ex.: 2:3 (veja os ids com "produtos")`);
  }
  return { produtoId: Number(id), quantidade: Number(qtd) };
}

const [comando, ...args] = process.argv.slice(2);

try {
  switch (comando) {
    case 'produtos':
      console.table((await chamar('GET', '/produtos')).map((p) => ({
        id: p.id, produto: p.nome, preço: dinheiro(p.preco), estoque: p.estoque === 0 ? 'esgotado' : p.estoque,
      })));
      break;
    case 'comprar': {
      const [cliente, ...itens] = args;
      if (!cliente || itens.length === 0) throw new Error('informe o cliente e os itens. Ex.: npm run cli -- comprar "Ana Souza" 1:1 2:2');
      const p = await chamar('POST', '/pedidos', { cliente, itens: itens.map(lerItem) });
      console.log(`Pedido nº ${p.id} confirmado para ${p.cliente}.`);
      for (const i of p.itens) console.log(`  ${i.quantidade}x ${i.nome} (${dinheiro(i.precoUnitario)}) = ${dinheiro(i.subtotal)}`);
      console.log(`  Subtotal ${dinheiro(p.subtotal)} | Desconto ${dinheiro(p.desconto)} | Total ${dinheiro(p.total)}`);
      break;
    }
    case 'pedidos': {
      const pedidos = await chamar('GET', '/pedidos');
      if (pedidos.length === 0) { console.log('Nenhum pedido ainda. Use "comprar" para criar o primeiro.'); break; }
      console.table(pedidos.map((p) => ({
        nº: p.id, cliente: p.cliente, itens: p.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(', '),
        data: dataHora(p.criadoEm), total: dinheiro(p.total), status: p.status,
      })));
      break;
    }
    case 'cancelar': {
      if (!/^[1-9][0-9]*$/.test(args[0] ?? '')) throw new Error('informe o número do pedido. Ex.: npm run cli -- cancelar 1');
      const p = await chamar('POST', `/pedidos/${args[0]}/cancelamento`);
      console.log(`Pedido nº ${p.id} cancelado. Os itens voltaram para o estoque.`);
      break;
    }
    case 'resumo': {
      const r = await chamar('GET', '/loja/resumo');
      console.log(`Pedidos confirmados: ${r.pedidosConfirmados} | Itens vendidos: ${r.itensVendidos} | Faturamento: ${dinheiro(r.faturamento)}`);
      console.log(`Desconto: ${r.regraDesconto.percentual}% em pedidos a partir de ${dinheiro(r.regraDesconto.pedidoMinimo)}`);
      break;
    }
    default:
      console.log(AJUDA);
  }
} catch (erro) {
  const semServidor = erro.cause?.code === 'ECONNREFUSED';
  console.error(semServidor ? `Servidor fora do ar em ${API}. Rode "npm start" em outro terminal.` : `Erro: ${erro.message}`);
  process.exitCode = 1;
}
