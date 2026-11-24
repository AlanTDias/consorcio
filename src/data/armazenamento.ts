export interface Armazenamento {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
  removeItem(chave: string): void
}

export class ArmazenamentoMemoria implements Armazenamento {
  private readonly dados = new Map<string, string>()

  getItem(chave: string): string | null {
    return this.dados.get(chave) ?? null
  }

  setItem(chave: string, valor: string): void {
    this.dados.set(chave, valor)
  }

  removeItem(chave: string): void {
    this.dados.delete(chave)
  }
}

export function armazenamentoNavegador(tipo: 'local' | 'sessao'): Armazenamento {
  try {
    const alvo = tipo === 'local' ? window.localStorage : window.sessionStorage
    const teste = '__consorcio_teste__'
    alvo.setItem(teste, '1')
    alvo.removeItem(teste)
    return alvo
  } catch {
    return new ArmazenamentoMemoria()
  }
}

export function lerJson(armazenamento: Armazenamento, chave: string): unknown {
  const bruto = armazenamento.getItem(chave)
  if (bruto === null) return undefined
  try {
    return JSON.parse(bruto) as unknown
  } catch {
    return undefined
  }
}
