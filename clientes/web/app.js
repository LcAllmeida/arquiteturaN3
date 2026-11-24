// Cliente web: roda no navegador e conversa com o servidor só pela API REST (HTTP + JSON).
const API = '/api';
const INTERVALO_ATUALIZACAO_MS = 15000;
const FORMATO_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

const $ = (id) => document.getElementById(id);
const estado = { veiculos: [], filtro: 'estacionado' };

// ---------- formatação ----------
const dinheiro = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const horaAgora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
function duracao(minutos) {
  if (minutos < 1) return 'menos de 1 min';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')} min`;
}

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
    mostrarSemConexao(true);
    throw new ErroApi('Sem conexão com o servidor.');
  }
  mostrarSemConexao(false);
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);
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
  temporizadorAviso = setTimeout(() => { aviso.hidden = true; }, 4000);
}

function mostrarSemConexao(semConexao) {
  $('aviso-conexao').hidden = !semConexao;
}

// ---------- validação do formulário (o servidor valida de novo; aqui é só para ajudar) ----------
function marcarCampo(nome, mensagem) {
  const input = $(nome);
  const dica = $(`dica-${nome}`);
  if (mensagem) {
    input.setAttribute('aria-invalid', 'true');
    dica.textContent = mensagem;
    dica.classList.add('erro');
  } else {
    input.removeAttribute('aria-invalid');
    dica.textContent = dica.dataset.padrao;
    dica.classList.remove('erro');
  }
}

function validarCampo(nome) {
  const valor = $(nome).value.trim();
  let mensagem = null;
  if (nome === 'placa') {
    const placa = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!placa) mensagem = 'Informe a placa.';
    else if (!FORMATO_PLACA.test(placa)) mensagem = 'Formato inválido. Use ABC1234 ou ABC1D23.';
  } else if (!valor) {
    mensagem = nome === 'modelo' ? 'Informe o modelo.' : 'Informe a cor.';
  }
  marcarCampo(nome, mensagem);
  return !mensagem;
}

// ---------- desenho da tela ----------
function td(conteudo, rotulo, classe) {
  const celula = document.createElement('td');
  if (rotulo) celula.dataset.rotulo = rotulo;
  if (classe) celula.className = classe;
  celula.append(...[].concat(conteudo));
  return celula;
}

function span(texto, classe) {
  const s = document.createElement('span');
  s.textContent = texto;
  if (classe) s.className = classe;
  return s;
}

function botaoAcao(texto, classe, aoClicar) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `botao pequeno ${classe}`;
  b.textContent = texto;
  b.addEventListener('click', () => aoClicar(b));
  return b;
}

async function executar(botao, acao) {
  botao.disabled = true;
  try {
    await acao();
  } catch (erro) {
    avisar(erro.message, 'erro');
    botao.disabled = false;
  }
}

// Remover pede um segundo clique em até 4 s (evita apagar sem querer, sem janela de confirmação).
function botaoRemover(v) {
  let temporizador;
  return botaoAcao('Remover', 'perigo remover', (b) => {
    if (b.dataset.confirmando !== 'sim') {
      b.dataset.confirmando = 'sim';
      b.textContent = 'Confirmar?';
      b.className = 'botao pequeno confirmar remover';
      b.setAttribute('aria-label', `Confirmar remoção do registro ${v.placa}`);
      temporizador = setTimeout(() => {
        b.dataset.confirmando = '';
        b.textContent = 'Remover';
        b.className = 'botao pequeno perigo remover';
        b.removeAttribute('aria-label');
      }, 4000);
      return;
    }
    clearTimeout(temporizador);
    executar(b, async () => {
      await chamar('DELETE', `/veiculos/${v.id}`);
      avisar(`Registro de ${v.placa} removido.`);
      await carregar();
    });
  });
}

function linhaVeiculo(v) {
  const tr = document.createElement('tr');
  const noPatio = v.status === 'estacionado';

  const veiculo = [span(v.placa, 'placa'), span(`${v.modelo} · ${v.cor}`, 'secundario')];
  const status = span(noPatio ? 'No pátio' : 'Saiu', `selo ${v.status}`);
  const saida = noPatio ? span('Ainda no pátio', 'secundario') : dataHora(v.saida);
  const valor = noPatio
    ? [span(dinheiro(v.valorParcial)), span('parcial, se sair agora', 'secundario')]
    : [span(dinheiro(v.valor)), span('pago', 'secundario')];

  const acoes = document.createElement('div');
  acoes.className = 'acoes';
  if (noPatio) {
    acoes.append(botaoAcao('Registrar saída', '', (b) => executar(b, async () => {
      const saiu = await chamar('POST', `/veiculos/${v.id}/saida`);
      avisar(`Saída de ${saiu.placa} registrada. Valor: ${dinheiro(saiu.valor)}.`);
      await carregar();
    })));
  }
  acoes.append(botaoRemover(v));

  tr.append(
    td(String(v.id), null, 'col-id'),
    td(veiculo, 'Veículo', 'td-veiculo'),
    td(status, 'Status'),
    td(dataHora(v.entrada), 'Entrada'),
    td(saida, 'Saída'),
    td(duracao(v.permanenciaMinutos), 'Permanência'),
    td(valor, 'Valor', 'col-valor'),
    td(acoes, null, 'td-acoes'),
  );
  return tr;
}

function linhaEstado(titulo, texto) {
  const tr = document.createElement('tr');
  tr.className = 'linha-estado';
  const celula = document.createElement('td');
  celula.colSpan = 8;
  const forte = document.createElement('strong');
  forte.textContent = titulo;
  celula.append(forte, texto);
  tr.append(celula);
  return tr;
}

const MENSAGENS_VAZIO = {
  estacionado: ['Nenhum veículo no pátio.', 'Use o formulário "Registrar entrada" acima para adicionar o primeiro.'],
  saiu: ['Nenhuma saída registrada ainda.', 'As saídas aparecem aqui com o valor pago.'],
  todos: ['Nenhum veículo registrado.', 'Use o formulário "Registrar entrada" acima para começar.'],
};

function desenharLista() {
  const { veiculos, filtro } = estado;
  const contagem = {
    estacionado: veiculos.filter((v) => v.status === 'estacionado').length,
    saiu: veiculos.filter((v) => v.status === 'saiu').length,
    todos: veiculos.length,
  };
  for (const [nome, total] of Object.entries(contagem)) $(`n-${nome}`).textContent = total;
  document.querySelectorAll('.aba').forEach((aba) => aba.setAttribute('aria-pressed', String(aba.dataset.filtro === filtro)));

  const visiveis = filtro === 'todos' ? veiculos : veiculos.filter((v) => v.status === filtro);
  const corpo = $('lista');
  corpo.replaceChildren(...(visiveis.length ? visiveis.map(linhaVeiculo) : [linhaEstado(...MENSAGENS_VAZIO[filtro])]));
}

function desenharResumo({ vagas, ocupadas, livres }) {
  $('vagas').textContent = vagas;
  $('ocupadas').textContent = ocupadas;
  $('livres').textContent = livres;
  $('numeros').setAttribute('aria-busy', 'false');
  const percentual = vagas ? Math.round((ocupadas / vagas) * 100) : 0;
  const barra = $('barra');
  barra.setAttribute('aria-valuemax', vagas);
  barra.setAttribute('aria-valuenow', ocupadas);
  $('barra-cheia').style.width = `${percentual}%`;
  $('legenda-barra').textContent = livres === 0
    ? `Garagem lotada: ${ocupadas} de ${vagas} vagas ocupadas.`
    : `${ocupadas} de ${vagas} vagas ocupadas (${percentual}%).`;
}

let carregando = false;
async function carregar() {
  if (carregando) return;
  carregando = true;
  try {
    const [resumo, veiculos] = await Promise.all([chamar('GET', '/garagem/resumo'), chamar('GET', '/veiculos')]);
    estado.veiculos = veiculos;
    desenharResumo(resumo);
    desenharLista();
    $('atualizado').textContent = `Atualizado às ${horaAgora()}`;
  } catch (erro) {
    if (!estado.veiculos.length) {
      $('lista').replaceChildren(linhaEstado('Não foi possível carregar os veículos.', erro.message));
      $('legenda-barra').textContent = 'Ocupação indisponível.';
    }
  } finally {
    carregando = false;
  }
}

// ---------- eventos ----------
for (const nome of ['placa', 'modelo', 'cor']) {
  $(nome).addEventListener('blur', () => { if ($(nome).value) validarCampo(nome); });
  $(nome).addEventListener('input', () => { if ($(nome).getAttribute('aria-invalid')) validarCampo(nome); });
}

$('form-entrada').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const form = evento.target;
  const validos = ['placa', 'modelo', 'cor'].map(validarCampo);
  const primeiroInvalido = ['placa', 'modelo', 'cor'][validos.indexOf(false)];
  if (primeiroInvalido) return $(primeiroInvalido).focus();

  const enviar = form.querySelector('button[type="submit"]');
  enviar.disabled = true;
  enviar.textContent = 'Registrando…';
  try {
    const v = await chamar('POST', '/veiculos', Object.fromEntries(new FormData(form)));
    avisar(`Entrada de ${v.placa} registrada.`);
    form.reset();
    estado.filtro = 'estacionado';
    $('placa').focus();
    await carregar();
  } catch (erro) {
    if (erro.campo) {
      marcarCampo(erro.campo, erro.message);
      $(erro.campo).focus();
    } else {
      avisar(erro.message, 'erro');
    }
  } finally {
    enviar.disabled = false;
    enviar.textContent = 'Registrar entrada';
  }
});

document.querySelectorAll('.aba').forEach((aba) => aba.addEventListener('click', () => {
  estado.filtro = aba.dataset.filtro;
  desenharLista();
}));

$('atualizar').addEventListener('click', carregar);
$('tentar-novamente').addEventListener('click', carregar);

// Atualiza sozinho (mostra o que o cliente de terminal fizer), só com a aba visível.
setInterval(() => { if (!document.hidden) carregar(); }, INTERVALO_ATUALIZACAO_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) carregar(); });

carregar();
