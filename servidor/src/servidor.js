import { fileURLToPath } from 'node:url';
import { criarApp } from './apresentacao/app.js';
import { criarContainer } from './container.js';

// O banco fica sempre em <projeto>/dados, de qualquer pasta que o servidor seja iniciado.
const BANCO_PADRAO = fileURLToPath(new URL('../../dados/garagem.db', import.meta.url));

const porta = Number(process.env.PORT ?? 3000);
const banco = process.env.DB ?? BANCO_PADRAO;
const vagas = Number(process.env.VAGAS ?? 10);

if (!Number.isInteger(vagas) || vagas < 1) {
  console.error('VAGAS deve ser um número inteiro maior que zero.');
  process.exit(1);
}

const { controller } = criarContainer({ banco, vagas });

// No Express 5 o callback do listen também é chamado quando dá erro (com o erro no 1º argumento).
criarApp(controller).listen(porta, (erro) => {
  if (erro) {
    if (erro.code === 'EADDRINUSE') {
      console.error(`A porta ${porta} já está em uso. O servidor talvez já esteja aberto em outro terminal.`);
      console.error('Feche o outro terminal ou use outra porta (ex.: PORT=3001 npm start).');
    } else {
      console.error('Não foi possível iniciar o servidor:', erro.message);
    }
    process.exit(1);
  }
  console.log(`Servidor da garagem em http://localhost:${porta}`);
  console.log(`Banco: ${banco === 'memoria' ? 'memória (dados somem ao parar)' : banco} | Vagas: ${vagas}`);
  console.log('Para parar: Ctrl + C');
});
