export const statuses = [
  { value: 'pendente', label: 'Pendente', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'atribuida', label: 'Atribuída', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  { value: 'coletada', label: 'Coletada', color: 'bg-violet-50 text-violet-800 border-violet-200' },
  { value: 'em_transporte', label: 'Em transporte', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  { value: 'entregue', label: 'Entregue', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-rose-50 text-rose-800 border-rose-200' },
] as const;

export type DeliveryStatus = typeof statuses[number]['value'];
export type Driver = {
  id: string;
  nome: string;
  telefone: string | null;
  tipo_veiculo: 'carro' | 'moto';
};
export type Delivery = {
  id: string;
  origem_site: string;
  referencia_pedido: string;
  endereco_coleta: string;
  endereco_destino: string;
  entregador_id: string | null;
  status: DeliveryStatus;
  criado_em: string;
  atualizado_em: string;
};
export type DriverDraft = { nome: string; telefone: string; tipo_veiculo: Driver['tipo_veiculo'] };
export type DeliveryDraft = Omit<Delivery, 'id' | 'criado_em' | 'atualizado_em' | 'entregador_id'> & { entregador_id: string };

export const emptyDriver: DriverDraft = { nome: '', telefone: '', tipo_veiculo: 'moto' };
export const emptyDelivery: DeliveryDraft = {
  origem_site: '', referencia_pedido: '', endereco_coleta: '', endereco_destino: '', entregador_id: '', status: 'pendente',
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === '42501') return 'A conta não tem permissão para esta operação. Verifique o acesso da equipe de gestão.';
    if (error.code === '23503') return 'O entregador selecionado não está mais disponível. Atualize a lista e selecione novamente.';
    if (error.code === '23514') return 'Confira o status e o tipo de veículo informados.';
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Não foi possível concluir a operação. Tente novamente.';
}
