// ============================================================
// ВИРТУАЛЬНОЕ МИНИСТЕРСТВО — ДВИЖОК ОЦЕНКИ
// Тот же принцип, что в «Пульсе сети» (сеть «Браво»):
//   1) профессиональная посадка на должность (компетенции 0–10),
//   2) соционическая посадка (дихотомии + эталонные типы),
//   3) атмосфера кабинета по полной таблице интертипных
//      отношений из общей библиотеки relations.ts,
//   4) квадровый баланс (ценностный разнобой враждующих квадр).
// Контекст эпохи (стабильность / реформы / кризис / война)
// меняет ВЕС позиций, а не самих людей.
// ============================================================

import type { Bi } from './i18n'
import { TYPES, type SocioType, type QuadraId } from './socionics-data'
import { relationBetween, PAIR_SCORE } from './relations'
import {
  POSITIONS, POLITICIANS, CABINETS, isEligible, fieldsOf,
  type Position, type Politician, type CompKey, type ContextKind,
} from './ministry-data'

export const COMP_KEYS: CompKey[] = ['adm', 'econ', 'dip', 'cri']

/** Множитель веса позиции в зависимости от контекста эпохи */
export const CONTEXT_WEIGHT: Record<ContextKind, Record<string, number>> = {
  stability: {},
  reform: { justice: 1.3, economy: 1.3, education: 1.2, finance: 1.2, digital: 1.2 },
  crisis: { finance: 1.5, economy: 1.4, pm: 1.2, energy: 1.2 },
  war: { defense: 1.6, mvd: 1.5, energy: 1.4, pm: 1.3, mfa: 1.2, finance: 1.15 },
}

const TYPE_BY_RU: Record<string, SocioType> = Object.fromEntries(TYPES.map(t => [t.ru, t]))

export function typeByRu(ru: string): SocioType {
  const t = TYPE_BY_RU[ru]
  if (!t) throw new Error(`Неизвестный тип соционики: ${ru}`)
  return t
}

export function quadraOf(pol: Politician): QuadraId {
  return typeByRu(pol.type).quadra
}

/** Соционическая посадка типа на должность: 0–10.
 *  База 2 + до 6 очков за дихотомические предпочтения + 2 эталонным типам. */
export function socioFit(ru: string, pos: Position): number {
  const t = typeByRu(ru)
  let got = 0
  let total = 0
  for (const [k, pref] of Object.entries(pos.prefs)) {
    total += pref.w
    if (t[k as keyof SocioType] === pref.val) got += pref.w
  }
  const score = 2 + (total > 0 ? (got / total) * 6 : 3)
  const final = pos.ideal.includes(t.ru) ? Math.min(10, score + 2) : Math.min(10, score)
  return Math.round(final * 10) / 10
}

/** Профессиональная посадка на должность: 0–1.
 *  По каждой оси — min(факт / требование, 1): перевыполнение
 *  не компенсирует провал по другой оси. */
export function compFit(pol: Politician, pos: Position): number {
  let num = 0
  let den = 0
  for (const axis of COMP_KEYS) {
    const req = pos.req[axis]
    if (req <= 0) continue
    num += req * Math.min(pol.comp[axis] / req, 1)
    den += req
  }
  return den > 0 ? num / den : 1
}

export interface PositionEval {
  posId: string
  polId: string | null
  compPct: number    // 0–100
  socioScore: number // 0–10
  weight: number     // эффективный вес позиции
}

export interface PairNote {
  a: Bi
  b: Bi
  kind: string
  score: number
}

export interface CabinetEval {
  comp: number      // 0–100
  socio: number     // 0–100
  cohesion: number  // 0–100
  total: number     // 0–100
  positions: PositionEval[]
  dyads: PairNote[]
  conflicts: PairNote[]
  tense: PairNote[]
  quadras: Record<QuadraId, number>
  filledCount: number
  warnings: Bi[]
}

/** Оценка состава кабинета. na — позиции, которых у правительства
 *  ещё не существовало (не штрафуются и не участвуют в знаменателе).
 *  extra — личные кандидаты игрока (свой пул поверх базового). */
export function evaluateCabinet(
  members: Record<string, string | null>,
  context: ContextKind,
  na: string[] = [],
  extra: Politician[] = [],
): CabinetEval {
  const naSet = new Set(na)
  const lookup: Record<string, Politician> = extra.length
    ? { ...POLITICIANS, ...Object.fromEntries(extra.map(p => [p.id, p])) }
    : POLITICIANS
  const filled: { pos: Position; pol: Politician }[] = []
  const positions: PositionEval[] = []
  const warnings: Bi[] = []
  let compNum = 0, compDen = 0
  let socioNum = 0, socioDen = 0

  for (const pos of POSITIONS) {
    const polId = members[pos.id] ?? null
    if (naSet.has(pos.id)) continue
    if (!polId) {
      positions.push({ posId: pos.id, polId: null, compPct: 0, socioScore: 0, weight: pos.weight })
      warnings.push({ uk: `Вакансія: ${pos.title.uk}`, ru: `Вакантно: ${pos.title.ru}` })
      continue
    }
    const pol = lookup[polId]
    if (!pol) {
      warnings.push({ uk: `Немає профілю: ${polId}`, ru: `Нет профиля: ${polId}` })
      continue
    }
    const effW = pos.weight * (CONTEXT_WEIGHT[context][pos.id] ?? 1)
    const c = compFit(pol, pos)
    const s = socioFit(pol.type, pos)
    filled.push({ pos, pol })
    compNum += effW * c
    compDen += effW
    socioNum += effW * s
    socioDen += effW
    positions.push({ posId: pos.id, polId, compPct: Math.round(c * 100), socioScore: s, weight: effW })
  }

  // --- атмосфера: полная таблица интертипных отношений ---
  const dyads: PairNote[] = []
  const conflicts: PairNote[] = []
  const tense: PairNote[] = []
  let pairSum = 0
  let pairCount = 0
  for (let i = 0; i < filled.length; i++) {
    for (let j = i + 1; j < filled.length; j++) {
      const A = filled[i]
      const B = filled[j]
      const rel = relationBetween(typeByRu(A.pol.type), typeByRu(B.pol.type))
      const sc = PAIR_SCORE[rel.kind]
      pairSum += sc
      pairCount++
      const note: PairNote = { a: A.pol.name, b: B.pol.name, kind: rel.kind, score: sc }
      if (rel.kind === 'дуальность') dyads.push(note)
      if (rel.kind === 'конфликт') conflicts.push(note)
      else if (sc <= -1.5) tense.push(note)
    }
  }
  const avg = pairCount > 0 ? pairSum / pairCount : 1.5
  // шкала PAIR_SCORE: от −2.5 (конфликт) до +3 (дуальность)
  let cohesion = ((avg + 2.5) / 5.5) * 100

  // --- квадры: ценностный разнобой враждующих квадр ---
  const quadras: Record<QuadraId, number> = { alpha: 0, beta: 0, gamma: 0, delta: 0 }
  for (const f of filled) quadras[quadraOf(f.pol)]++
  const present = (Object.keys(quadras) as QuadraId[]).filter(q => quadras[q] > 0)
  if (quadras.alpha > 0 && quadras.gamma > 0) cohesion -= 3
  if (quadras.beta > 0 && quadras.delta > 0) cohesion -= 3
  cohesion = Math.max(0, Math.min(100, cohesion))

  const comp = compDen > 0 ? (compNum / compDen) * 100 : 0
  const socio = socioDen > 0 ? (socioNum / socioDen) * 10 : 0
  // Итоговая формула: компетентность — половина счёта, соционика — 15%,
  // сплочённость — 30% (было 45/25/30: компетентность поднята,
  // вклад соционики снижен — по отзывам игроков)
  const total = 0.55 * comp + 0.15 * socio + 0.30 * cohesion

  return {
    comp, socio, cohesion, total,
    positions, dyads, conflicts, tense, quadras,
    filledCount: filled.length,
    warnings,
  }
}

export interface RankedCabinet {
  id: string
  name: Bi
  ord: number
  period: Bi
  context: ContextKind
  isPlayer?: boolean
  eval: CabinetEval
}

/** Рейтинг: все исторические кабинеты (в СВОЁМ контексте) + кабинет игрока */
export function rankAll(
  playerMembers: Record<string, string | null>,
  context: ContextKind,
  extra: Politician[] = [],
): RankedCabinet[] {
  const list: RankedCabinet[] = CABINETS.map(c => ({
    id: c.id, name: c.name, ord: c.ord, period: c.period, context: c.context,
    eval: evaluateCabinet(c.members, c.context, c.na ?? []),
  }))
  const hasAny = Object.values(playerMembers).some(Boolean)
  if (hasAny) {
    list.push({
      id: '__player__', name: { uk: 'Ваш уряд', ru: 'Ваш кабинет' }, ord: 24, period: { uk: 'проєкт', ru: 'проект' },
      context, isPlayer: true,
      eval: evaluateCabinet(playerMembers, context, [], extra),
    })
  }
  return list.sort((a, b) => b.eval.total - a.eval.total)
}

/** Акценты эпохи для ПОДБОРА кандидатов: какие компетенции в эту эпоху
 *  «дороже» (множитель требований оси). Оценка собранного кабинета
 *  считается по базовым требованиям — эпоха меняет ВЕС позиций,
 *  а здесь помогает решать, КОГО ставить, пока кабинет ещё не собран:
 *  война — стойкость везде, кризис — экономисты и дисциплина,
 *  реформы — администраторы и переговорщики. */
export const CONTEXT_AXIS: Record<ContextKind, Partial<Record<CompKey, number>>> = {
  stability: {},
  reform: { dip: 1.2, adm: 1.1 },
  crisis: { econ: 1.45, adm: 1.2 },
  war: { cri: 1.6, adm: 1.15 },
}

/** Профессиональный индекс кандидата на должность: 0–1.
 *  compFit — закрытие требуемых минимумов по компетенциям (в контексте
 *  эпохи требования к акцентным осям повышаются — CONTEXT_AXIS);
 *  профильная сфера должности (pos.core) решает: специалист — 1,
 *  допущенный из смежной сферы — 0.4. Без этого слагаемого
 *  врач с хорошим управлением обгоняет профильного министра:
 *  Ульяна Супрун на цифре вместо Фёдорова, Кинах — в энергетиках. */
export function posFit(pol: Politician, pos: Position, ctx: ContextKind = 'stability'): number {
  const amp = CONTEXT_AXIS[ctx]
  let num = 0
  let den = 0
  for (const axis of COMP_KEYS) {
    const req = pos.req[axis] * (amp[axis] ?? 1)
    if (req <= 0) continue
    num += req * Math.min(pol.comp[axis] / req, 1)
    den += req
  }
  const fit = den > 0 ? num / den : 1
  const fieldFit = fieldsOf(pol).includes(pos.core) ? 1 : 0.4
  return 0.65 * fit + 0.35 * fieldFit
}

/** Лучшие кандидаты на должность по совокупной посадке.
 *  pool — доступный пул (по умолчанию — все политики датасета);
 *  отбираются только кандидаты, допустимые на должность по сферам.
 *  ctx — эпоха: повышенные требования CONTEXT_AXIS меняют расклад
 *  (в войне — стойкие, в кризисе — экономные).
 *  Ранжирование: 75% — профессиональный индекс posFit
 *  (компетенции + профильная сфера), 25% — соционика. */
export function topForPosition(
  posId: string, n = 5, pool: Politician[] = Object.values(POLITICIANS),
  ctx: ContextKind = 'stability',
): { pol: Politician; score: number }[] {
  const pos = POSITIONS.find(p => p.id === posId)
  if (!pos) return []
  return pool
    .filter(pol => isEligible(pol, pos))
    .map(pol => ({ pol, score: 0.75 * posFit(pol, pos, ctx) + 0.25 * (socioFit(pol.type, pos) / 10) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}

/** Автосбор «по максимуму» под ВЫБРАННУЮ эпоху.
 *
 *  1) Жадный старт: кресла заполняются по убыванию эффективного веса
 *     эпохи (CONTEXT_WEIGHT), каждое берёт лучшего свободного кандидата
 *     (posFit с надбавками CONTEXT_AXIS + соционика).
 *  2) Локальная оптимизация ПОЛНОГО счёта evaluateCabinet именно этой
 *     эпохи: замена в одном кресле свободным кандидатом и парные обмены,
 *     пока счёт растёт. Сплочённость (30% счёта) тянет к согласованным
 *     квадрам, а вес кресел эпохи — к сильным специалистам на дорогих
 *     местах, поэтому у каждой эпохи свой компромисс и свой расклад:
 *     у войны дороже оборона/МВД/энергетика, у кризиса — финансы и
 *     экономика, у реформ — юстиция, образование и цифра.
 *
 *  Детерминирована: тот же пул и эпоха — тот же кабинет. */
export function optimizeCabinet(
  context: ContextKind,
  pool: Politician[] = Object.values(POLITICIANS),
): Record<string, string | null> {
  const eligible: Record<string, Politician[]> = {}
  for (const pos of POSITIONS) {
    eligible[pos.id] = pool.filter(p => isEligible(p, pos))
  }
  const effW = (pos: Position) => pos.weight * (CONTEXT_WEIGHT[context][pos.id] ?? 1)
  const score = (m: Record<string, string | null>) => evaluateCabinet(m, context, [], pool).total

  // Профессиональный пол кресла: сплочённость (30% счёта) без ограничений
  // выкидывает специалистов и ставит на «цифру» 66-летних менеджеров из
  // налоговой — те самые ляпы, на которые жаловались игроки. Поэтому
  // оптимизация крутит состав только между профессионально равноценными
  // кандидатами: posFit в пределах 0.12 от лучшего по креслу
  // (допущенный из смежной сферы менеджер отстаёт на ≥0.21 — не проходит).
  const cap: Record<string, number> = {}
  const passes = (pos: Position, pol: Politician) =>
    posFit(pol, pos, context) >= cap[pos.id] - 0.12
  for (const pos of POSITIONS) {
    cap[pos.id] = eligible[pos.id].reduce((mx, p) => Math.max(mx, posFit(p, pos, context)), 0)
  }

  // --- 1) жадный старт по эффективному весу эпохи ---
  const members: Record<string, string | null> = {}
  const used = new Set<string>()
  const start = [...POSITIONS].sort((a, b) => effW(b) - effW(a))
  for (const pos of start) {
    const best = eligible[pos.id]
      .map(p => ({ p, s: 0.75 * posFit(p, pos, context) + 0.25 * (socioFit(p.type, pos) / 10) }))
      .sort((a, b) => b.s - a.s)
      .find(c => !used.has(c.p.id))
    if (best) { members[pos.id] = best.p.id; used.add(best.p.id) }
  }

  // --- 2) подъём на холм: меняем, только если полный счёт эпохи растёт ---
  const byId = new Map(pool.map(p => [p.id, p]))
  let cur = score(members)
  for (let iter = 0; iter < 10; iter++) {
    let improved = false
    // (а) замена в одном кресле на лучшего свободного
    for (const pos of POSITIONS) {
      const curId = members[pos.id] ?? null
      let bestId: string | null = null
      let bestSc = cur
      for (const cand of eligible[pos.id]) {
        if (used.has(cand.id)) continue
        if (!passes(pos, cand)) continue
        members[pos.id] = cand.id
        const sc = score(members)
        if (sc > bestSc + 1e-9) { bestSc = sc; bestId = cand.id }
      }
      members[pos.id] = curId
      if (bestId) {
        if (curId) used.delete(curId)
        members[pos.id] = bestId
        used.add(bestId)
        cur = bestSc
        improved = true
      }
    }
    // (б) парный обмен: два кресла меняются людьми, если обоим лучше
    for (let i = 0; i < POSITIONS.length; i++) {
      for (let j = i + 1; j < POSITIONS.length; j++) {
        const A = POSITIONS[i]
        const B = POSITIONS[j]
        const a = members[A.id]
        const b = members[B.id]
        if (!a || !b) continue
        const pa = byId.get(a)
        const pb = byId.get(b)
        if (!pa || !pb) continue
        if (!passes(A, pb) || !passes(B, pa)) continue
        if (!isEligible(pb, A) || !isEligible(pa, B)) continue
        members[A.id] = b
        members[B.id] = a
        const sc = score(members)
        if (sc > cur + 1e-9) { cur = sc; improved = true }
        else { members[A.id] = a; members[B.id] = b }
      }
    }
    if (!improved) break
  }
  return members
}
