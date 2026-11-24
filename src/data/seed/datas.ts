const DIA = 24 * 60 * 60 * 1000

function meioDia(data: Date): Date {
  const copia = new Date(data)
  copia.setHours(12, 0, 0, 0)
  return copia
}

function resolver(marcador: string, agora: Date): string {
  const dias = /^@dias:(-?\d+)$/.exec(marcador)
  if (dias) return new Date(meioDia(agora).getTime() + Number(dias[1]) * DIA).toISOString()

  const mes = /^@mes:(-?\d+):(\d+)(?::(-?\d+))?$/.exec(marcador)
  if (mes) {
    const deslocamento = Number(mes[1])
    const alvo = new Date(agora.getFullYear(), agora.getMonth() + deslocamento, 1, 12)
    const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
    const limite = deslocamento === 0 ? agora.getDate() : ultimoDia
    alvo.setDate(Math.min(Number(mes[2]), limite))
    return new Date(alvo.getTime() + Number(mes[3] ?? 0) * DIA).toISOString()
  }
  return marcador.replace('@ano', String(agora.getFullYear()))
}

export function materializarDatas<T>(valor: T, agora = new Date()): T {
  if (typeof valor === 'string') {
    const marcado = valor.startsWith('@') || valor.includes('-@ano-')
    return (marcado ? resolver(valor, agora) : valor) as T
  }
  if (Array.isArray(valor)) return valor.map((v) => materializarDatas(v, agora)) as T
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).map(([k, v]) => [k, materializarDatas(v, agora)]),
    ) as T
  }
  return valor
}
