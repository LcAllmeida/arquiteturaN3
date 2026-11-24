import { ErroRegraNegocio, ErroValidacao } from './erros.js';

// Placa antiga (ABC1234) ou Mercosul (ABC1D23).
const FORMATO_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
export const TAMANHO_MAXIMO = { modelo: 40, cor: 20 };
export const PRECO_PRIMEIRA_HORA = 10;
export const PRECO_HORA_ADICIONAL = 5;
const UMA_HORA_MS = 60 * 60 * 1000;

// Entidade do domínio (o "M" do MVC): guarda os dados e as regras do próprio veículo.
export class Veiculo {
  constructor({ id = null, placa, modelo, cor, entrada = new Date().toISOString(), saida = null, valor = null }) {
    this.id = id;
    this.placa = Veiculo.normalizarPlaca(placa);
    this.modelo = Veiculo.#texto(modelo);
    this.cor = Veiculo.#texto(cor);
    this.entrada = entrada;
    this.saida = saida;
    this.valor = valor;
  }

  static normalizarPlaca(placa) {
    return typeof placa === 'string' ? placa.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  }

  // Aceita só texto ou número; qualquer outro tipo (objeto, lista) vira vazio e cai na validação.
  static #texto(valor) {
    return typeof valor === 'string' || typeof valor === 'number' ? String(valor).trim().replace(/\s+/g, ' ') : '';
  }

  validar() {
    if (!this.placa) throw new ErroValidacao('Informe a placa do veículo.', 'placa');
    if (!FORMATO_PLACA.test(this.placa)) {
      throw new ErroValidacao('Placa inválida. Use o formato ABC1234 ou ABC1D23.', 'placa');
    }
    if (!this.modelo) throw new ErroValidacao('Informe o modelo do veículo.', 'modelo');
    if (this.modelo.length > TAMANHO_MAXIMO.modelo) {
      throw new ErroValidacao(`O modelo aceita no máximo ${TAMANHO_MAXIMO.modelo} caracteres.`, 'modelo');
    }
    if (!this.cor) throw new ErroValidacao('Informe a cor do veículo.', 'cor');
    if (this.cor.length > TAMANHO_MAXIMO.cor) {
      throw new ErroValidacao(`A cor aceita no máximo ${TAMANHO_MAXIMO.cor} caracteres.`, 'cor');
    }
  }

  estaEstacionado() {
    return this.saida === null;
  }

  // Minutos entre a entrada e a saída (ou até agora, se ainda estiver no pátio).
  permanenciaMinutos(agora = new Date()) {
    const fim = this.saida ? new Date(this.saida) : agora;
    return Math.max(0, Math.floor((fim - new Date(this.entrada)) / 60000));
  }

  // Cobrança: primeira hora (ou fração) R$ 10, cada hora adicional iniciada R$ 5.
  calcularValor(agora = new Date()) {
    const horas = Math.max(1, Math.ceil((agora - new Date(this.entrada)) / UMA_HORA_MS));
    return PRECO_PRIMEIRA_HORA + (horas - 1) * PRECO_HORA_ADICIONAL;
  }

  registrarSaida(agora = new Date()) {
    if (!this.estaEstacionado()) throw new ErroRegraNegocio('Este veículo já saiu da garagem.');
    this.valor = this.calcularValor(agora);
    this.saida = agora.toISOString();
  }
}
