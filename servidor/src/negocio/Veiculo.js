import { ErroRegraNegocio, ErroValidacao } from './erros.js';

// Placa antiga (ABC1234) ou Mercosul (ABC1D23).
const FORMATO_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
export const PRECO_PRIMEIRA_HORA = 10;
export const PRECO_HORA_ADICIONAL = 5;
const UMA_HORA_MS = 60 * 60 * 1000;

// Entidade do domínio (o "M" do MVC): guarda os dados e as regras do próprio veículo.
export class Veiculo {
  constructor({ id = null, placa, modelo, cor, entrada = new Date().toISOString(), saida = null, valor = null }) {
    this.id = id;
    this.placa = Veiculo.normalizarPlaca(placa);
    this.modelo = String(modelo ?? '').trim();
    this.cor = String(cor ?? '').trim();
    this.entrada = entrada;
    this.saida = saida;
    this.valor = valor;
  }

  static normalizarPlaca(placa) {
    return String(placa ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  validar() {
    if (!FORMATO_PLACA.test(this.placa)) {
      throw new ErroValidacao('Placa inválida. Use o formato ABC1234 ou ABC1D23.');
    }
    if (!this.modelo) throw new ErroValidacao('Informe o modelo do veículo.');
    if (!this.cor) throw new ErroValidacao('Informe a cor do veículo.');
  }

  estaEstacionado() {
    return this.saida === null;
  }

  // Cobrança: primeira hora (ou fração) R$ 10, cada hora adicional iniciada R$ 5.
  registrarSaida(agora = new Date()) {
    if (!this.estaEstacionado()) throw new ErroRegraNegocio('Este veículo já saiu da garagem.');
    const horas = Math.max(1, Math.ceil((agora - new Date(this.entrada)) / UMA_HORA_MS));
    this.valor = PRECO_PRIMEIRA_HORA + (horas - 1) * PRECO_HORA_ADICIONAL;
    this.saida = agora.toISOString();
  }
}
