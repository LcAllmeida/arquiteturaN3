import { Veiculo } from '../negocio/Veiculo.js';
import { VeiculoRepository } from '../negocio/VeiculoRepository.js';

// Segunda implementação do mesmo contrato: guarda tudo em memória.
// Usada nos testes e com DB=memoria, sem mudar nenhuma linha do serviço.
export class VeiculoRepositoryMemoria extends VeiculoRepository {
  #registros = new Map();
  #proximoId = 1;

  // Devolve cópias para que ninguém altere o "banco" sem passar pelo repositório.
  #copia(veiculo) {
    return veiculo ? new Veiculo({ ...veiculo }) : null;
  }

  listar() {
    return [...this.#registros.values()].reverse().map((v) => this.#copia(v));
  }

  buscarPorId(id) {
    return this.#copia(this.#registros.get(id));
  }

  buscarEstacionadoPorPlaca(placa) {
    const achado = [...this.#registros.values()].find((v) => v.placa === placa && v.saida === null);
    return this.#copia(achado);
  }

  contarEstacionados() {
    return [...this.#registros.values()].filter((v) => v.saida === null).length;
  }

  salvar(veiculo) {
    const novo = new Veiculo({ ...veiculo, id: this.#proximoId++ });
    this.#registros.set(novo.id, novo);
    return this.#copia(novo);
  }

  atualizar(veiculo) {
    this.#registros.set(veiculo.id, this.#copia(veiculo));
    return this.#copia(veiculo);
  }

  remover(id) {
    this.#registros.delete(id);
  }
}
