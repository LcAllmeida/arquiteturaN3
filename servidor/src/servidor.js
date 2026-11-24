import { fileURLToPath } from 'node:url';
import { criarApp } from './apresentacao/app.js';
import { criarContainer } from './container.js';

// O banco fica sempre em <projeto>/dados, de qualquer pasta que o servidor seja iniciado.
const BANCO_PADRAO = fileURLToPath(new URL('../../dados/loja.db', import.meta.url));

const porta = Number(process.env.PORT ?? 3000);
const banco = process.env.DB ?? BANCO_PADRAO;

const container = criarContainer({ banco });

// No Express 5 o callback do listen também é chamado quando dá erro (com o erro no 1º argumento).
criarApp(container).listen(porta, (erro) => {
  if (erro) {
    if (erro.code === 'EADDRINUSE') {
      console.error(`A porta ${porta} já está em uso. O servidor talvez já esteja aberto em outro terminal.`);
      console.error('Feche o outro terminal ou use outra porta (ex.: PORT=3001 npm start).');
    } else {
      console.error('Não foi possível iniciar o servidor:', erro.message);
    }
    process.exit(1);
  }
  console.log(`Servidor da loja em http://localhost:${porta}`);
  console.log(`Banco: ${banco === 'memoria' ? 'memória (dados somem ao parar)' : banco}`);
  console.log('Para parar: Ctrl + C');
});
