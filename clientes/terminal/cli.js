// Cliente de terminal: um segundo cliente, independente do navegador,
// que consome a MESMA API pelo protocolo HTTP. Não conhece nada da implementação do servidor.
const API = process.env.API_URL ?? 'http://localhost:3000/api';

const AJUDA = `Uso: npm run cli -- <comando>

  resumo                       vagas livres e ocupadas
  listar                       todos os veículos
  entrar <placa> <modelo> <cor>  registra a entrada
  sair <id>                    registra a saída e mostra o valor
  remover <id>                 apaga o registro

Exemplo: npm run cli -- entrar ABC1D23 Gol Prata`;

async function chamar(metodo, caminho, corpo) {
  const resposta = await fetch(API + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = resposta.status === 204 ? null : await resposta.json();
  if (!resposta.ok) throw new Error(`${resposta.status} - ${dados?.erro ?? 'erro'}`);
  return dados;
}

const dinheiro = (v) => (v === null ? '-' : `R$ ${v.toFixed(2).replace('.', ',')}`);
const hora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR') : '-');

function tabela(veiculos) {
  if (veiculos.length === 0) return console.log('Nenhum veículo registrado.');
  console.table(
    veiculos.map((v) => ({
      id: v.id, placa: v.placa, modelo: v.modelo, cor: v.cor, status: v.status,
      entrada: hora(v.entrada), saida: v.saida ? hora(v.saida) : 'no pátio',
      valor: v.valor !== null ? dinheiro(v.valor) : `${dinheiro(v.valorParcial)} (parcial)`,
    })),
  );
}

const [comando, ...args] = process.argv.slice(2);

// Confere os argumentos antes de chamar o servidor, para dar uma mensagem clara.
function exigirId() {
  if (!/^[1-9][0-9]*$/.test(args[0] ?? '')) {
    throw new Error(`informe o número do veículo. Ex.: npm run cli -- ${comando} 1 (veja os números com "listar")`);
  }
  return args[0];
}

try {
  switch (comando) {
    case 'resumo': {
      const r = await chamar('GET', '/garagem/resumo');
      console.log(`Vagas: ${r.vagas} | Ocupadas: ${r.ocupadas} | Livres: ${r.livres}`);
      break;
    }
    case 'listar':
      tabela(await chamar('GET', '/veiculos'));
      break;
    case 'entrar': {
      if (args.length < 3) throw new Error('informe placa, modelo e cor. Ex.: npm run cli -- entrar ABC1D23 Gol Prata');
      // Modelo com espaço: use aspas, ex.: entrar ABC1D23 "Fiat Uno" Branco
      const [placa, modelo, cor] = args;
      const v = await chamar('POST', '/veiculos', { placa, modelo, cor });
      console.log(`Entrada registrada: #${v.id} ${v.placa} (${v.modelo}, ${v.cor})`);
      break;
    }
    case 'sair': {
      const v = await chamar('POST', `/veiculos/${exigirId()}/saida`);
      console.log(`Saída registrada: ${v.placa} | Valor a pagar: ${dinheiro(v.valor)}`);
      break;
    }
    case 'remover':
      await chamar('DELETE', `/veiculos/${exigirId()}`);
      console.log(`Registro #${args[0]} removido.`);
      break;
    default:
      console.log(AJUDA);
  }
} catch (erro) {
  const semServidor = erro.cause?.code === 'ECONNREFUSED';
  console.error(semServidor ? `Servidor fora do ar em ${API}. Rode "npm start" em outro terminal.` : `Erro: ${erro.message}`);
  process.exitCode = 1;
}
