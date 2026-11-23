import { criarApp } from './apresentacao/app.js';
import { criarContainer } from './container.js';

const porta = Number(process.env.PORT ?? 3000);
const banco = process.env.DB ?? 'dados/garagem.db';
const vagas = Number(process.env.VAGAS ?? 10);

const { controller } = criarContainer({ banco, vagas });

criarApp(controller).listen(porta, () => {
  console.log(`Servidor da garagem em http://localhost:${porta}`);
  console.log(`Banco: ${banco === 'memoria' ? 'memória (dados somem ao parar)' : banco} | Vagas: ${vagas}`);
});
