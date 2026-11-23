import { VeiculoController } from './apresentacao/VeiculoController.js';
import { VeiculoRepositoryMemoria } from './dados/VeiculoRepositoryMemoria.js';
import { VeiculoRepositorySqlite } from './dados/VeiculoRepositorySqlite.js';
import { VeiculoService } from './negocio/VeiculoService.js';

// Raiz de composição (o "montador" da injeção de dependência).
// É o ÚNICO lugar que escolhe as classes concretas e as conecta:
//   repositório -> serviço -> controller.
// Trocar o banco = mudar só esta escolha.
export function criarContainer({ banco = 'dados/garagem.db', vagas = 10 } = {}) {
  const repository = banco === 'memoria' ? new VeiculoRepositoryMemoria() : new VeiculoRepositorySqlite(banco);
  const service = new VeiculoService(repository, { vagas });
  const controller = new VeiculoController(service);
  return { repository, service, controller };
}
