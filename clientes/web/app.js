// Cliente web: roda no navegador e conversa com o servidor só pela API REST (HTTP + JSON).
// O carrinho fica aqui no cliente; preços, estoque, desconto e total final são decididos pelo servidor.
const API = '/api';
const INTERVALO_ATUALIZACAO_MS = 15000;

const $ = (id) => document.getElementById(id);
const estado = {
  produtos: [],
  pedidos: [],
  regraDesconto: null,
  carrinho: new Map(), // produtoId -> quantidade
  filtro: 'confirmado',
};

// ---------- formatação ----------
const dinheiro = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const horaAgora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const centavos = (reais) => Math.round(reais * 100);

// ---------- comunicação com o servidor ----------
class ErroApi extends Error {
  constructor(mensagem, campo) {
    super(mensagem);
    this.campo = campo;
  }
}

async function chamar(metodo, caminho, corpo) {
  let resposta;
  try {
    resposta = await fetch(API + caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    $('aviso-conexao').hidden = false;
    throw new ErroApi('Sem conexão com o servidor.');
  }
  $('aviso-conexao').hidden = true;
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new ErroApi(dados?.erro ?? `Erro ${resposta.status} no servidor.`, dados?.campo);
  return dados;
}

// ---------- mensagens ----------
let temporizadorAviso;
function avisar(texto, tipo = 'ok') {
  const aviso = $('aviso');
  aviso.textContent = texto;
  aviso.className = `toast ${tipo}`;
  aviso.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { aviso.hidden = true; }, 4500);
}

function marcarErro(campo, mensagem) {
  const dica = $(`dica-${campo}`);
  const input = campo === 'cliente' ? $('cliente') : null;
  dica.textContent = mensagem ?? dica.dataset.padrao;
  dica.classList.toggle('erro', Boolean(mensagem));
  if (input) mensagem ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid');
}

// ---------- pequenos construtores de elementos ----------
function el(tag, { classe, texto, atributos } = {}, filhos = []) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  for (const [k, v] of Object.entries(atributos ?? {})) e.setAttribute(k, v);
  e.append(...filhos);
  return e;
}

function botao(texto, classe, aoClicar, atributos) {
  const b = el('button', { classe: `botao ${classe}`, texto, atributos: { type: 'button', ...atributos } });
  b.addEventListener('click', () => aoClicar(b));
  return b;
}

const produtoPorId = (id) => estado.produtos.find((p) => p.id === id);

// ---------- catálogo ----------
function seloEstoque(estoque) {
  if (estoque === 0) return el('span', { classe: 'selo esgotado', texto: 'Esgotado' });
  if (estoque <= 3) return el('span', { classe: 'selo pouco', texto: estoque === 1 ? 'Última unidade' : `Últimas ${estoque} unidades` });
  return el('span', { classe: 'selo ok', texto: `${estoque} em estoque` });
}

function desenharCatalogo() {
  const lista = $('produtos');
  lista.setAttribute('aria-busy', 'false');
  if (!estado.produtos.length) {
    lista.replaceChildren(el('li', { classe: 'estado', texto: 'Nenhum produto no catálogo.' }));
    return;
  }
  lista.replaceChildren(...estado.produtos.map((p) => {
    const noCarrinho = estado.carrinho.get(p.id) ?? 0;
    let rotulo = 'Adicionar';
    let descricao = `Adicionar ${p.nome} ao carrinho`;
    if (p.estoque === 0) { rotulo = 'Indisponível'; descricao = `${p.nome} indisponível`; }
    else if (noCarrinho >= p.estoque) { rotulo = 'Limite no carrinho'; descricao = `Todo o estoque de ${p.nome} já está no carrinho`; }
    const adicionar = botao(rotulo, 'secundario', () => alterarQuantidade(p.id, +1), { 'aria-label': descricao });
    adicionar.disabled = p.estoque === 0 || noCarrinho >= p.estoque;
    return el('li', { classe: 'produto' }, [
      el('h3', { texto: p.nome }),
      el('p', { classe: 'preco', texto: dinheiro(p.preco) }),
      seloEstoque(p.estoque),
      noCarrinho ? el('p', { classe: 'legenda', texto: `${noCarrinho} no carrinho` }) : el('p', { classe: 'legenda', texto: ' ' }),
      adicionar,
    ]);
  }));
}

// ---------- carrinho ----------
function alterarQuantidade(produtoId, delta) {
  const produto = produtoPorId(produtoId);
  const atual = estado.carrinho.get(produtoId) ?? 0;
  const nova = Math.min(atual + delta, produto?.estoque ?? atual + delta, 99);
  if (nova <= 0) estado.carrinho.delete(produtoId);
  else estado.carrinho.set(produtoId, nova);
  marcarErro('itens', null);
  desenharCarrinho();
  desenharCatalogo();
}

function totaisDoCarrinho() {
  let subtotal = 0;
  for (const [id, qtd] of estado.carrinho) subtotal += centavos(produtoPorId(id)?.preco ?? 0) * qtd;
  const regra = estado.regraDesconto;
  const desconto = regra && subtotal >= centavos(regra.pedidoMinimo) ? Math.round((subtotal * regra.percentual) / 100) : 0;
  return { subtotal, desconto, total: subtotal - desconto };
}

function desenharCarrinho() {
  const lista = $('itens-carrinho');
  if (estado.carrinho.size === 0) {
    lista.replaceChildren(el('li', { classe: 'estado', texto: 'Seu carrinho está vazio. Adicione produtos do catálogo.' }));
  } else {
    lista.replaceChildren(...[...estado.carrinho].map(([id, qtd]) => {
      const p = produtoPorId(id);
      const nome = p?.nome ?? `Produto ${id}`;
      const menos = el('button', { texto: '−', atributos: { type: 'button', 'aria-label': `Diminuir ${nome}` } });
      const mais = el('button', { texto: '+', atributos: { type: 'button', 'aria-label': `Aumentar ${nome}` } });
      menos.addEventListener('click', () => alterarQuantidade(id, -1));
      mais.addEventListener('click', () => alterarQuantidade(id, +1));
      mais.disabled = !p || qtd >= p.estoque || qtd >= 99;
      const remover = el('button', { classe: 'link-remover', texto: 'Remover', atributos: { type: 'button', 'aria-label': `Remover ${nome} do carrinho` } });
      remover.addEventListener('click', () => alterarQuantidade(id, -qtd));

      const item = el('li', { classe: 'item-carrinho' }, [
        el('div', {}, [el('p', { classe: 'item-nome', texto: nome }), el('p', { classe: 'item-unitario', texto: p ? `${dinheiro(p.preco)} cada` : '' })]),
        el('p', { classe: 'item-subtotal', texto: p ? dinheiro(p.preco * qtd) : '—' }),
        el('div', { classe: 'item-controles' }, [
          el('div', { classe: 'quantidade', atributos: { role: 'group', 'aria-label': `Quantidade de ${nome}` } }, [
            menos, el('output', { texto: String(qtd), atributos: { 'aria-live': 'polite' } }), mais,
          ]),
          remover,
        ]),
      ]);
      if (p && qtd > p.estoque) item.append(el('p', { classe: 'item-aviso', texto: p.estoque === 0 ? 'Esgotou: remova este item.' : `Só restam ${p.estoque} em estoque.` }));
      return item;
    }));
  }

  const { subtotal, desconto, total } = totaisDoCarrinho();
  $('c-subtotal').textContent = dinheiro(subtotal / 100);
  $('c-desconto').textContent = desconto ? `− ${dinheiro(desconto / 100)}` : dinheiro(0);
  $('c-total').textContent = dinheiro(total / 100);

  const regra = estado.regraDesconto;
  if (regra) {
    const falta = centavos(regra.pedidoMinimo) - subtotal;
    $('regra-desconto').textContent = desconto
      ? `Desconto de ${regra.percentual}% aplicado. O valor final é confirmado pelo servidor.`
      : `Desconto de ${regra.percentual}% a partir de ${dinheiro(regra.pedidoMinimo)}${subtotal ? ` (faltam ${dinheiro(falta / 100)})` : ''}.`;
  }
  $('finalizar').disabled = estado.carrinho.size === 0;

  // Barra fixa no celular: mostra o carrinho sem precisar rolar até ele.
  const quantidade = [...estado.carrinho.values()].reduce((a, b) => a + b, 0);
  $('barra-carrinho').hidden = quantidade === 0;
  $('b-qtd').textContent = `${quantidade} ${quantidade === 1 ? 'item' : 'itens'}`;
  $('b-total').textContent = dinheiro(total / 100);
}

// ---------- pedidos ----------
function botaoCancelar(pedido) {
  let temporizador;
  return botao('Cancelar', 'pequeno perigo cancelar', (b) => {
    if (b.dataset.confirmando !== 'sim') {
      b.dataset.confirmando = 'sim';
      b.textContent = 'Confirmar?';
      b.className = 'botao pequeno confirmar cancelar';
      b.setAttribute('aria-label', `Confirmar cancelamento do pedido ${pedido.id}`);
      temporizador = setTimeout(() => {
        b.dataset.confirmando = '';
        b.textContent = 'Cancelar';
        b.className = 'botao pequeno perigo cancelar';
        b.setAttribute('aria-label', `Cancelar pedido ${pedido.id}`);
      }, 4000);
      return;
    }
    clearTimeout(temporizador);
    b.disabled = true;
    chamar('POST', `/pedidos/${pedido.id}/cancelamento`)
      .then(() => { avisar(`Pedido nº ${pedido.id} cancelado. Os itens voltaram ao estoque.`); return carregar(); })
      .catch((erro) => { avisar(erro.message, 'erro'); b.disabled = false; });
  }, { 'aria-label': `Cancelar pedido ${pedido.id}` });
}

function td(conteudo, rotulo, classe) {
  const c = el('td', { classe });
  if (rotulo) c.dataset.rotulo = rotulo;
  c.append(...[].concat(conteudo));
  return c;
}

function linhaPedido(p) {
  const itens = p.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(', ');
  return el('tr', {}, [
    td(String(p.id), 'Nº', 'col-id'),
    td(p.cliente, 'Cliente', 'td-cliente'),
    td([el('span', { texto: itens }), el('span', { classe: 'secundario', texto: `${p.quantidadeItens} ${p.quantidadeItens === 1 ? 'item' : 'itens'}` })], 'Itens', 'td-itens'),
    td(dataHora(p.criadoEm), 'Data'),
    td(p.desconto ? `− ${dinheiro(p.desconto)}` : 'Sem desconto', 'Desconto', 'col-valor'),
    td(el('span', { classe: 'forte', texto: dinheiro(p.total) }), 'Total', 'col-valor'),
    td(el('span', { classe: `selo ${p.status}`, texto: p.status === 'confirmado' ? 'Confirmado' : 'Cancelado' }), 'Status'),
    td(p.status === 'confirmado' ? botaoCancelar(p) : [], null, 'td-acoes col-acoes'),
  ]);
}

function linhaEstado(titulo, texto) {
  const celula = el('td', { atributos: { colspan: '8' } }, [el('strong', { texto: titulo }), texto]);
  return el('tr', { classe: 'linha-estado' }, [celula]);
}

const MENSAGENS_VAZIO = {
  confirmado: ['Nenhum pedido confirmado ainda.', 'Monte um carrinho e clique em "Finalizar pedido".'],
  cancelado: ['Nenhum pedido cancelado.', 'Os pedidos cancelados aparecem aqui.'],
  todos: ['Nenhum pedido ainda.', 'Monte um carrinho e clique em "Finalizar pedido".'],
};

function desenharPedidos() {
  const { pedidos, filtro } = estado;
  const contagem = {
    confirmado: pedidos.filter((p) => p.status === 'confirmado').length,
    cancelado: pedidos.filter((p) => p.status === 'cancelado').length,
    todos: pedidos.length,
  };
  for (const [nome, total] of Object.entries(contagem)) $(`n-${nome}`).textContent = total;
  document.querySelectorAll('.aba').forEach((aba) => aba.setAttribute('aria-pressed', String(aba.dataset.filtro === filtro)));
  const visiveis = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.status === filtro);
  $('lista-pedidos').replaceChildren(...(visiveis.length ? visiveis.map(linhaPedido) : [linhaEstado(...MENSAGENS_VAZIO[filtro])]));
}

function desenharResumo(r) {
  $('r-pedidos').textContent = r.pedidosConfirmados;
  $('r-itens').textContent = r.itensVendidos;
  $('r-faturamento').textContent = dinheiro(r.faturamento);
  $('numeros').setAttribute('aria-busy', 'false');
}

// ---------- carga de dados ----------
let carregando = false;
async function carregar() {
  if (carregando) return;
  carregando = true;
  try {
    const [produtos, pedidos, resumo] = await Promise.all([chamar('GET', '/produtos'), chamar('GET', '/pedidos'), chamar('GET', '/loja/resumo')]);
    Object.assign(estado, { produtos, pedidos, regraDesconto: resumo.regraDesconto });
    desenharResumo(resumo);
    desenharCatalogo();
    desenharCarrinho();
    desenharPedidos();
    $('atualizado').textContent = `Atualizado às ${horaAgora()}`;
  } catch (erro) {
    if (!estado.produtos.length) {
      $('produtos').replaceChildren(el('li', { classe: 'estado', texto: `Não foi possível carregar o catálogo. ${erro.message}` }));
      $('lista-pedidos').replaceChildren(linhaEstado('Não foi possível carregar os pedidos.', erro.message));
    }
  } finally {
    carregando = false;
  }
}

// ---------- eventos ----------
$('cliente').addEventListener('input', () => { if ($('cliente').getAttribute('aria-invalid')) marcarErro('cliente', null); });

$('form-pedido').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const cliente = $('cliente').value.trim();
  if (estado.carrinho.size === 0) return marcarErro('itens', 'Adicione pelo menos um produto ao carrinho.');
  if (cliente.length < 2) {
    marcarErro('cliente', 'Informe o nome do cliente (pelo menos 2 letras).');
    return $('cliente').focus();
  }

  const enviar = $('finalizar');
  enviar.disabled = true;
  enviar.textContent = 'Finalizando…';
  try {
    const itens = [...estado.carrinho].map(([produtoId, quantidade]) => ({ produtoId, quantidade }));
    const pedido = await chamar('POST', '/pedidos', { cliente, itens });
    avisar(`Pedido nº ${pedido.id} confirmado. Total: ${dinheiro(pedido.total)}.`);
    estado.carrinho.clear();
    $('form-pedido').reset();
    marcarErro('cliente', null);
    marcarErro('itens', null);
    estado.filtro = 'confirmado';
    await carregar();
  } catch (erro) {
    if (erro.campo === 'cliente' || erro.campo === 'itens') {
      marcarErro(erro.campo, erro.message);
      if (erro.campo === 'cliente') $('cliente').focus();
      await carregar(); // estoque pode ter mudado: atualiza o catálogo e os avisos do carrinho
    } else {
      avisar(erro.message, 'erro');
    }
  } finally {
    enviar.textContent = 'Finalizar pedido';
    enviar.disabled = estado.carrinho.size === 0;
  }
});

document.querySelectorAll('.aba').forEach((aba) => aba.addEventListener('click', () => {
  estado.filtro = aba.dataset.filtro;
  desenharPedidos();
}));
$('atualizar').addEventListener('click', carregar);
$('tentar-novamente').addEventListener('click', carregar);

// Atualiza sozinho (mostra pedidos feitos pelo cliente de terminal), só com a aba visível.
setInterval(() => { if (!document.hidden) carregar(); }, INTERVALO_ATUALIZACAO_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) carregar(); });

carregar();
