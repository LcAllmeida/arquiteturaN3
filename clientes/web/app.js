// Cliente web: roda no navegador e conversa com o servidor só pela API REST (HTTP + JSON).
const API = '/api';

const $ = (id) => document.getElementById(id);
const dinheiro = (v) => (v === null ? '-' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const hora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-');

async function chamar(metodo, caminho, corpo) {
  const resposta = await fetch(API + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = resposta.status === 204 ? null : await resposta.json();
  if (!resposta.ok) throw new Error(dados?.erro ?? `Erro ${resposta.status}`);
  return dados;
}

function avisar(texto, tipo) {
  const m = $('mensagem');
  m.textContent = texto;
  m.className = `mensagem ${tipo}`;
}

function celula(texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  return td;
}

function botao(texto, classe, aoClicar) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `botao pequeno ${classe}`;
  b.textContent = texto;
  b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      await aoClicar();
    } catch (erro) {
      avisar(erro.message, 'erro');
      b.disabled = false;
    }
  });
  return b;
}

function desenharLista(veiculos) {
  const corpo = $('lista');
  corpo.replaceChildren();
  $('vazio').hidden = veiculos.length > 0;

  for (const v of veiculos) {
    const tr = document.createElement('tr');
    const selo = document.createElement('span');
    selo.className = `selo ${v.status}`;
    selo.textContent = v.status === 'estacionado' ? 'Estacionado' : 'Saiu';
    const tdStatus = document.createElement('td');
    tdStatus.append(selo);

    const acoes = document.createElement('div');
    acoes.className = 'acoes';
    if (v.status === 'estacionado') {
      acoes.append(botao('Registrar saída', '', async () => {
        const saiu = await chamar('POST', `/veiculos/${v.id}/saida`);
        avisar(`Saída de ${saiu.placa}: valor ${dinheiro(saiu.valor)}.`, 'ok');
        await carregar();
      }));
    }
    acoes.append(botao('Remover', 'perigo', async () => {
      await chamar('DELETE', `/veiculos/${v.id}`);
      avisar(`Registro de ${v.placa} removido.`, 'ok');
      await carregar();
    }));
    const tdAcoes = document.createElement('td');
    tdAcoes.append(acoes);

    tr.append(
      celula(v.id), celula(v.placa), celula(v.modelo), celula(v.cor), tdStatus,
      celula(hora(v.entrada)), celula(hora(v.saida)), celula(dinheiro(v.valor)), tdAcoes,
    );
    corpo.append(tr);
  }
}

function desenharResumo({ vagas, ocupadas, livres }) {
  $('vagas').textContent = vagas;
  $('ocupadas').textContent = ocupadas;
  $('livres').textContent = livres;
  const barra = $('barra');
  barra.setAttribute('aria-valuemax', vagas);
  barra.setAttribute('aria-valuenow', ocupadas);
  $('barra-cheia').style.width = `${vagas ? (ocupadas / vagas) * 100 : 0}%`;
}

async function carregar() {
  try {
    const [resumo, veiculos] = await Promise.all([chamar('GET', '/garagem/resumo'), chamar('GET', '/veiculos')]);
    desenharResumo(resumo);
    desenharLista(veiculos);
  } catch (erro) {
    avisar(`Não foi possível falar com o servidor: ${erro.message}`, 'erro');
  }
}

$('form-entrada').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const form = evento.target;
  const enviar = form.querySelector('button[type="submit"]');
  enviar.disabled = true;
  try {
    const v = await chamar('POST', '/veiculos', Object.fromEntries(new FormData(form)));
    avisar(`Entrada registrada: ${v.placa}.`, 'ok');
    form.reset();
    $('placa').focus();
    await carregar();
  } catch (erro) {
    avisar(erro.message, 'erro');
  } finally {
    enviar.disabled = false;
  }
});

$('atualizar').addEventListener('click', carregar);
carregar();
