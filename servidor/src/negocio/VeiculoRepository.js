// Contrato (abstração) do Repository, definido pela camada de NEGÓCIO.
// A camada de dados implementa este contrato (inversão de dependência):
// o serviço conhece só esta classe, nunca o SQLite.
// JavaScript não tem "interface", então cada método lança erro se não for implementado.
export class VeiculoRepository {
  listar() { throw new Error('não implementado'); }
  buscarPorId(id) { throw new Error('não implementado'); }
  buscarEstacionadoPorPlaca(placa) { throw new Error('não implementado'); }
  contarEstacionados() { throw new Error('não implementado'); }
  salvar(veiculo) { throw new Error('não implementado'); }
  atualizar(veiculo) { throw new Error('não implementado'); }
  remover(id) { throw new Error('não implementado'); }
}
