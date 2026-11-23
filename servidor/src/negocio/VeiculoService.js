import { Veiculo } from './Veiculo.js';
import { ErroNaoEncontrado, ErroRegraNegocio } from './erros.js';

// Camada de negócio: coordena as operações e aplica as regras da garagem.
// Recebe o repositório pronto no construtor (injeção de dependência por construtor).
export class VeiculoService {
  constructor(repository, { vagas = 10 } = {}) {
    this.repository = repository;
    this.vagas = vagas;
  }

  listar() {
    return this.repository.listar();
  }

  buscar(id) {
    const veiculo = this.repository.buscarPorId(id);
    if (!veiculo) throw new ErroNaoEncontrado(`Veículo ${id} não encontrado.`);
    return veiculo;
  }

  registrarEntrada(dados) {
    const veiculo = new Veiculo({ placa: dados.placa, modelo: dados.modelo, cor: dados.cor });
    veiculo.validar();
    if (this.repository.buscarEstacionadoPorPlaca(veiculo.placa)) {
      throw new ErroRegraNegocio(`O veículo ${veiculo.placa} já está na garagem.`);
    }
    if (this.repository.contarEstacionados() >= this.vagas) {
      throw new ErroRegraNegocio('Garagem lotada: não há vagas livres.');
    }
    return this.repository.salvar(veiculo);
  }

  registrarSaida(id, agora = new Date()) {
    const veiculo = this.buscar(id);
    veiculo.registrarSaida(agora);
    return this.repository.atualizar(veiculo);
  }

  remover(id) {
    this.buscar(id);
    this.repository.remover(id);
  }

  resumo() {
    const ocupadas = this.repository.contarEstacionados();
    return { vagas: this.vagas, ocupadas, livres: this.vagas - ocupadas };
  }
}
