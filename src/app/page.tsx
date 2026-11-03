'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  POSITIONS, POLITICIANS, CABINETS, EARLIER_GOVTS, CONTEXT_INFO, COMP_INFO, FIELD_INFO,
  isEligible, surnameFirst,
  type ContextKind, type Cabinet, type CompKey, type FieldId, type Politician, type Position,
} from '@/lib/ministry-data'
import {
  evaluateCabinet, rankAll, topForPosition, socioFit, compFit, quadraOf,
  typeByRu, CONTEXT_WEIGHT, type CabinetEval, type RankedCabinet, type PairNote,
} from '@/lib/ministry-engine'
import { QUADRA_COLORS } from '@/lib/relations'
import { QUADRAS, TYPES, type QuadraId } from '@/lib/socionics-data'

const COMP_KEYS: CompKey[] = ['adm', 'econ', 'dip', 'cri']
const STORAGE_KEY = 'vm-builder-v1'
const CUSTOM_KEY = 'vm-custom-v1'
type Tab = 'history' | 'builder' | 'compare'
type Builder = Record<string, string | null>

const CTX_ORDER: ContextKind[] = ['stability', 'reform', 'crisis', 'war']

function scoreColor(v: number): string {
  return v >= 70 ? '#34d399' : v >= 55 ? '#f5b942' : v >= 40 ? '#fb923c' : '#f87171'
}

// ---------- мелкие компоненты ----------

function ScoreRing({ value, size = 88, label }: { value: number; size?: number; label?: string }) {
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1c2947" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={scoreColor(v)} strokeWidth={stroke}
        strokeDasharray={`${(c * v) / 100} ${c}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill="#e8edf7"
        fontSize={size * 0.25} fontWeight={700}>{v.toFixed(1)}</text>
      {label && (
        <text x="50%" y="70%" textAnchor="middle" fill="#8fa0c2" fontSize={size * 0.105}>{label}</text>
      )}
    </svg>
  )
}

function Bar({ v, color = '#f5b942', h = 6 }: { v: number; color?: string; h?: number }) {
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height: h, background: '#1c2947' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, v))}%`, height: h, background: color, borderRadius: 99, transition: 'width .3s' }} />
    </div>
  )
}

function CompBars({ comp, req, compact }: { comp: Record<CompKey, number>; req?: Record<CompKey, number>; compact?: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-x-3 gap-y-1 w-full ${compact ? '' : 'min-w-[240px]'}`}>
      {COMP_KEYS.map(k => {
        const lack = req && comp[k] < req[k]
        return (
          <div key={k} className="flex items-center gap-1.5" title={COMP_INFO[k].hint + (lack ? ` · требуется ${req![k]}` : '')}>
            <span className="text-[10px] text-[#8fa0c2] w-[84px] shrink-0 truncate">{COMP_INFO[k].name}</span>
            <Bar v={comp[k] * 10} color={lack ? '#fb923c' : '#34d399'} h={5} />
            <span className="text-[10px] w-6 text-right text-[#c7d2e8] tabular-nums">{comp[k]}</span>
          </div>
        )
      })}
    </div>
  )
}

function TypeChip({ ru, small }: { ru: string; small?: boolean }) {
  const t = typeByRu(ru)
  const c = QUADRA_COLORS[t.quadra]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 whitespace-nowrap"
      style={{ background: c.fill + '14', color: c.stroke, borderColor: c.stroke + '44', fontSize: small ? 10 : 11 }}
      title={`Квадра ${QUADRAS[t.quadra].name}: ${QUADRAS[t.quadra].motto}`}
    >
      <b>{ru}</b> {t.name}
    </span>
  )
}

function QuadraChips({ quadras }: { quadras: Record<QuadraId, number> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(quadras) as QuadraId[]).map(q => {
        const n = quadras[q]
        if (!n) return null
        const c = QUADRA_COLORS[q]
        return (
          <span key={q} className="rounded-md border px-2 py-0.5 text-[11px]"
            style={{ background: c.fill + '14', color: c.stroke, borderColor: c.stroke + '44' }}
            title={QUADRAS[q].description}>
            {QUADRAS[q].name}: {n}
          </span>
        )
      })}
    </div>
  )
}

function ContextChip({ ctx }: { ctx: ContextKind }) {
  const info = CONTEXT_INFO[ctx]
  return (
    <span className="rounded-md border px-2 py-0.5 text-[11px] whitespace-nowrap"
      style={{ background: info.color + '14', color: info.color, borderColor: info.color + '44' }}
      title={info.hint}>{info.name}</span>
  )
}

function PairList({ title, pairs, color, empty }: { title: string; pairs: PairNote[]; color: string; empty: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color }}>{title} ({pairs.length})</div>
      {pairs.length === 0 ? (
        <div className="text-[11px] text-[#8fa0c2]">{empty}</div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {pairs.map((p, i) => (
            <div key={i} className="text-[11px] text-[#c7d2e8]">
              {p.a} <span style={{ color }}>— {p.kind} —</span> {p.b}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- карточка кабинета (детально) ----------

function CabinetDetail({ cab }: { cab: Cabinet }) {
  const ev = useMemo(() => evaluateCabinet(cab.members, cab.context, cab.na ?? []), [cab])
  const info = CONTEXT_INFO[cab.context]
  return (
    <div className="mt-3 rounded-xl border border-[#223050] bg-[#0d1730] p-4">
      <div className="flex flex-wrap items-start gap-4">
        <ScoreRing value={ev.total} size={92} label="эффективность" />
        <div className="flex-1 min-w-[260px]">
          <div className="grid grid-cols-3 gap-3 mb-2">
            {([['Компетентность', ev.comp, '#f5b942'], ['Соционика', ev.socio, '#7dd3fc'], ['Сплочённость', ev.cohesion, '#a78bfa']] as [string, number, string][]).map(([n, v, c]) => (
              <div key={n}>
                <div className="flex justify-between text-[11px] text-[#8fa0c2] mb-1"><span>{n}</span><span className="tabular-nums">{v.toFixed(1)}</span></div>
                <Bar v={v} color={c} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <ContextChip ctx={cab.context} />
            <span className="text-[11px] text-[#8fa0c2]">{info.hint} · отработал {cab.months} мес.</span>
          </div>
          <p className="text-[12px] text-[#c7d2e8] mt-2 leading-relaxed">{cab.fate}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {ev.positions.map(pe => {
          const pos = POSITIONS.find(p => p.id === pe.posId)!
          const pol = pe.polId ? POLITICIANS[pe.polId] : null
          const note = cab.notes?.[pe.posId]
          return (
            <div key={pe.posId} className="rounded-lg border border-[#1c2947] bg-[#111a33] p-2.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[12px] text-[#e8edf7]">
                  <span className="mr-1.5">{pos.icon}</span>
                  <b>{pos.title}</b>
                </span>
                {pol ? (
                  <span className="flex gap-2 shrink-0">
                    <span className="text-[11px] tabular-nums" style={{ color: scoreColor(pe.compPct) }} title="профессиональная посадка">{pe.compPct}%</span>
                    <span className="text-[11px] tabular-nums text-[#7dd3fc]" title="соционическая посадка (0–10)">{pe.socioScore.toFixed(1)}/10</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-[#8fa0c2]">нет в наборе</span>
                )}
              </div>
              {pol ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-semibold text-[#e8edf7]">{pol.name}</span>
                  <TypeChip ru={pol.type} small />
                </div>
              ) : (
                <div className="text-[11px] text-[#67789c]">{pos.demand}</div>
              )}
              {pol && <div className="mt-1.5"><CompBars comp={pol.comp} req={pos.req} compact /></div>}
              {note && <div className="mt-1.5 text-[10px] text-[#8fa0c2]">↻ {note}</div>}
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <PairList title="Дуальные пары" pairs={ev.dyads} color="#34d399" empty="дуальных пар нет" />
        <PairList title="Конфликты" pairs={ev.conflicts} color="#f87171" empty="конфликтных пар нет — редкая роскошь" />
        <PairList title="Напряжённые" pairs={ev.tense} color="#fb923c" empty="напряжённых пар нет" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-[#8fa0c2]">Квадры:</span>
        <QuadraChips quadras={ev.quadras} />
      </div>
    </div>
  )
}

// ---------- вкладка «История» ----------

function HistoryTab() {
  const [open, setOpen] = useState<string | null>(null)
  const ranked = useMemo(
    () => CABINETS.map(c => ({ c, ev: evaluateCabinet(c.members, c.context, c.na ?? []) }))
      .sort((a, b) => b.ev.total - a.ev.total),
    [],
  )
  return (
    <div>
      <p className="text-[13px] text-[#8fa0c2] mb-4">
        Все 13 кабинетов 2005–2026 прогнаны через один алгоритм: компетенции против требований должностей,
        соционическая посадка, полная таблица интертипных отношений и квадровый баланс. Каждый кабинет оценивается
        в контексте своей эпохи — в войне вес обороны и МВД выше, в кризисе — финансов и экономики.
      </p>
      <div className="flex flex-col gap-2">
        {ranked.map(({ c, ev }, i) => (
          <div key={c.id} className="rounded-xl border border-[#1c2947] bg-[#111a33] overflow-hidden">
            <button className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#141e3d] transition-colors"
              onClick={() => setOpen(open === c.id ? null : c.id)}>
              <span className="text-[13px] w-7 text-center font-bold" style={{ color: i < 3 ? '#f5b942' : '#67789c' }}>{i + 1}</span>
              <ScoreRing value={ev.total} size={54} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#e8edf7] truncate">
                  {c.ord}. {c.name}
                </div>
                <div className="text-[11px] text-[#8fa0c2] mt-0.5 flex flex-wrap gap-2 items-center">
                  <span>{c.period}</span>·<span>{c.months} мес.</span>·<ContextChip ctx={c.context} />
                </div>
              </div>
              <span className="text-[#67789c] text-lg">{open === c.id ? '▾' : '▸'}</span>
            </button>
            {open === c.id && <div className="px-4 pb-4"><CabinetDetail cab={c} /></div>}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-[#1c2947] bg-[#0d1730] p-4">
        <div className="text-[12px] uppercase tracking-wide text-[#8fa0c2] mb-2">Доистория: правительства 1991–2004</div>
        <div className="grid gap-1.5 md:grid-cols-2">
          {EARLIER_GOVTS.map(g => (
            <div key={g.name} className="text-[12px] text-[#c7d2e8]">
              <b className="text-[#e8edf7]">{g.name}</b> <span className="text-[#8fa0c2]">{g.period}</span> — {g.note}
            </div>
          ))}
        </div>
        <div className="text-[11px] text-[#67789c] mt-2">
          Раннюю эпоху не оцениваем по членам: систематических данных о десятках фигурантов тех кабинетов в наборе нет.
        </div>
      </div>
    </div>
  )
}

// ---------- группы кандидатов и свои кандидатуры ----------

const GROUPS_META: { key: 'classic' | 'manager' | 'rising' | 'custom'; label: string }[] = [
  { key: 'classic', label: 'Политики и госслужащие' },
  { key: 'manager', label: 'Менеджеры и эксперты' },
  { key: 'rising', label: 'Новые лица' },
  { key: 'custom', label: 'Ваши кандидаты' },
]

/** Допустимые кандидаты должности, сгруппированные по происхождению,
 *  внутри группы — по фамилии */
function candidateGroups(pool: Politician[], custom: Politician[], pos: Position) {
  const eligible = pool.filter(p => isEligible(p, pos))
  const customIds = new Set(custom.map(c => c.id))
  return GROUPS_META.map(g => ({
    ...g,
    items: eligible
      .filter(p => g.key === 'custom'
        ? customIds.has(p.id)
        : !customIds.has(p.id) && (p.group ?? 'classic') === g.key)
      .sort((a, b) => surnameFirst(a.name).localeCompare(surnameFirst(b.name), 'ru')),
  }))
}

/** Личные кандидаты из localStorage — с проверкой полей */
function sanitizeCustom(raw: unknown): Politician[] {
  if (!Array.isArray(raw)) return []
  const ruTypes = new Set(TYPES.map(t => t.ru))
  const cl = (v: unknown) => Math.max(0, Math.min(10, Math.round(Number(v)) || 0))
  const out: Politician[] = []
  for (const c of raw) {
    if (!c || typeof c.id !== 'string' || typeof c.name !== 'string' || !ruTypes.has(c.type)) continue
    const comp = (c.comp ?? {}) as Record<string, unknown>
    out.push({
      id: c.id, name: String(c.name).slice(0, 60), type: c.type,
      comp: { adm: cl(comp.adm), econ: cl(comp.econ), dip: cl(comp.dip), cri: cl(comp.cri) },
      fields: Array.isArray(c.fields) ? c.fields.filter((f: unknown) => FIELD_INFO[f as FieldId]) : ['gov'],
      bio: 'Личная кандидатура игрока.',
    })
  }
  return out
}

const TYPE_OPTIONS = TYPES.map(t => t.ru)

function CustomPolForm({ custom, setCustom }: { custom: Politician[]; setCustom: (c: Politician[]) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('ЛСЭ')
  const [f1, setF1] = useState<FieldId>('gov')
  const [f2, setF2] = useState<FieldId | ''>('')
  const [comp, setComp] = useState<Record<CompKey, number>>({ adm: 6, econ: 5, dip: 5, cri: 5 })
  const [err, setErr] = useState('')

  const inp = 'rounded-lg border border-[#223050] bg-[#0d1730] px-2 py-1.5 text-[12px] text-[#e8edf7]'

  const add = () => {
    const nm = name.trim().replace(/\s+/g, ' ')
    if (nm.split(' ').length < 2) { setErr('Нужны фамилия и имя'); return }
    if (custom.some(c => c.name.toLowerCase() === nm.toLowerCase())) { setErr('Такой кандидат уже есть'); return }
    const cl = (v: number) => Math.max(0, Math.min(10, Math.round(v) || 0))
    setCustom([...custom, {
      id: 'c' + Date.now().toString(36), name: nm, type,
      comp: { adm: cl(comp.adm), econ: cl(comp.econ), dip: cl(comp.dip), cri: cl(comp.cri) },
      fields: f2 ? [f1, f2 as FieldId] : [f1],
      bio: 'Личная кандидатура игрока.',
    }])
    setName(''); setErr('')
  }

  return (
    <div className="rounded-xl border border-[#223050] bg-[#111a33] p-4">
      <div className="text-[11px] uppercase tracking-wide text-[#8fa0c2] mb-2">➕ Свой кандидат</div>
      <div className="flex flex-col gap-1.5">
        <input className={inp} placeholder="Фамилия Имя" value={name} maxLength={60}
          onChange={e => { setName(e.target.value); setErr('') }} />
        <div className="grid grid-cols-2 gap-1.5">
          <select className={inp} style={{ colorScheme: 'dark' }} value={type} onChange={e => setType(e.target.value)} title="соционический тип">
            {TYPE_OPTIONS.map(ru => <option key={ru} value={ru}>{ru}</option>)}
          </select>
          <select className={inp} style={{ colorScheme: 'dark' }} value={f1} onChange={e => setF1(e.target.value as FieldId)} title="сфера">
            {(Object.keys(FIELD_INFO) as FieldId[]).map(f => <option key={f} value={f}>{FIELD_INFO[f].name}</option>)}
          </select>
        </div>
        <select className={inp} style={{ colorScheme: 'dark' }} value={f2} onChange={e => setF2(e.target.value as FieldId | '')} title="вторая сфера">
          <option value="">— вторая сфера не нужна —</option>
          {(Object.keys(FIELD_INFO) as FieldId[]).map(f => <option key={f} value={f}>{FIELD_INFO[f].name}</option>)}
        </select>
        <div className="grid grid-cols-4 gap-1.5">
          {COMP_KEYS.map(k => (
            <label key={k} className="text-[9px] text-[#8fa0c2]">
              {COMP_INFO[k].name.slice(0, 4)}.
              <input type="number" min={0} max={10} value={comp[k]}
                onChange={e => setComp({ ...comp, [k]: Number(e.target.value) })}
                className={`${inp} w-full mt-0.5`} />
            </label>
          ))}
        </div>
        {err && <div className="text-[11px] text-[#f87171]">{err}</div>}
        <button onClick={add}
          className="rounded-lg border border-[#f5b942]55 px-3 py-1.5 text-[12px] text-[#f5b942] hover:bg-[#f5b94218]">
          Добавить в список
        </button>
        {custom.length > 0 && (
          <div className="mt-1 flex flex-col gap-1 border-t border-[#1c2947] pt-2">
            {custom.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-[#c7d2e8] truncate">{surnameFirst(c.name)} · {c.type}</span>
                <button onClick={() => setCustom(custom.filter(x => x.id !== c.id))}
                  className="shrink-0 text-[#67789c] hover:text-[#f87171]" title="удалить">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- вкладка «Конструктор» ----------

function BuilderTab({ builder, setBuilder, context, setContext, custom, setCustom }: {
  builder: Builder
  setBuilder: (b: Builder) => void
  context: ContextKind
  setContext: (c: ContextKind) => void
  custom: Politician[]
  setCustom: (c: Politician[]) => void
}) {
  const setPos = (posId: string, polId: string | null) => {
    const nb = { ...builder, [posId]: polId || null }
    setBuilder(nb)
  }

  const pool = useMemo(() => [...Object.values(POLITICIANS), ...custom], [custom])

  const autoFill = () => {
    const nb: Builder = {}
    const used = new Set<string>()
    const order = [...POSITIONS].sort((a, b) => b.weight - a.weight)
    for (const pos of order) {
      const best = topForPosition(pos.id, 103, pool)
        .find(c => !used.has(c.pol.id))
      if (best) { nb[pos.id] = best.pol.id; used.add(best.pol.id) }
    }
    setBuilder(nb)
  }

  const ev = useMemo(() => evaluateCabinet(builder, context, [], custom), [builder, context, custom])
  const chosenIds = Object.values(builder).filter(Boolean) as string[]

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[12px] text-[#8fa0c2]">Эпоха кабинета:</span>
          {CTX_ORDER.map(ctx => (
            <button key={ctx} onClick={() => setContext(ctx)}
              className="rounded-lg border px-3 py-1.5 text-[12px] transition-colors"
              style={context === ctx
                ? { background: CONTEXT_INFO[ctx].color + '22', borderColor: CONTEXT_INFO[ctx].color, color: CONTEXT_INFO[ctx].color }
                : { background: '#111a33', borderColor: '#223050', color: '#8fa0c2' }}>
              {CONTEXT_INFO[ctx].name}
            </button>
          ))}
          <div className="grow" />
          <button onClick={autoFill} className="rounded-lg border border-[#f5b942]55 px-3 py-1.5 text-[12px] text-[#f5b942] hover:bg-[#f5b94218]">⚡ Собрать по максимуму</button>
          <button onClick={() => setBuilder({})} className="rounded-lg border border-[#223050] px-3 py-1.5 text-[12px] text-[#8fa0c2] hover:bg-[#141e3d]">Очистить</button>
        </div>

        <p className="text-[11.5px] text-[#67789c] mb-3 leading-relaxed">
          В списках — только профильные кандидаты: силовики на оборону и МВД, юристы на юстицию,
          медики на здравоохранение. Менеджеры допущены на министерства — как Резников и Умёров в жизни.
          Растущие политики — в группе «Новые лица», своих кандидатов добавляйте в панели справа.
        </p>
        <div className="grid gap-2.5 md:grid-cols-2">
          {POSITIONS.map(pos => {
            const polId = builder[pos.id] ?? null
            const pol = polId ? (pool.find(p => p.id === polId) ?? null) : null
            const picks = topForPosition(pos.id, 4, pool)
            const groups = candidateGroups(pool, custom, pos)
            const cFit = pol ? Math.round(compFit(pol, pos) * 100) : null
            const sFit = pol ? socioFit(pol.type, pos) : null
            const effW = pos.weight * (CONTEXT_WEIGHT[context][pos.id] ?? 1)
            return (
              <div key={pos.id} className="rounded-xl border border-[#1c2947] bg-[#111a33] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-[#e8edf7]">
                    <span className="mr-1.5">{pos.icon}</span>{pos.title}
                  </span>
                  <span className="text-[10px] text-[#67789c]" title="вес позиции × множитель эпохи">
                    вес {effW.toFixed(2)}
                  </span>
                </div>
                <select
                  className="w-full rounded-lg border border-[#223050] bg-[#0d1730] px-2.5 py-2 text-[12px] text-[#e8edf7]"
                  style={{ colorScheme: 'dark' }}
                  value={polId ?? ''}
                  onChange={e => setPos(pos.id, e.target.value || null)}
                >
                  <option value="">— вакансия —</option>
                  {pol && !isEligible(pol, pos) && (
                    <option value={pol.id}>{surnameFirst(pol.name)} · {pol.type} · вне профиля</option>
                  )}
                  {groups.filter(g => g.items.length > 0).map(g => (
                    <optgroup key={g.key} label={g.label}>
                      {g.items.map(p => (
                        <option key={p.id} value={p.id}>{surnameFirst(p.name)} · {p.type}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {pol && (
                  <div className="mt-2">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <TypeChip ru={pol.type} small />
                      <span className="text-[11px] tabular-nums" style={{ color: scoreColor(cFit!) }}>{cFit}%</span>
                      <span className="text-[11px] text-[#7dd3fc] tabular-nums" title="соционическая посадка">соц. {sFit!.toFixed(1)}/10</span>
                    </div>
                    <CompBars comp={pol.comp} req={pos.req} compact />
                  </div>
                )}
                {!pol && (
                  <div className="mt-2">
                    <div className="text-[10px] text-[#67789c] mb-1">{pos.demand}. Подходят:</div>
                    <div className="flex flex-wrap gap-1">
                      {picks.map(p => (
                        <button key={p.pol.id} onClick={() => setPos(pos.id, p.pol.id)}
                          className="rounded-md border border-[#223050] bg-[#0d1730] px-2 py-0.5 text-[10px] text-[#8fa0c2] hover:border-[#f5b942] hover:text-[#f5b942]">
                          {p.pol.name} · {Math.round(p.score * 100)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* правая панель */}
      <div className="lg:sticky lg:top-4 self-start flex flex-col gap-3">
        <div className="rounded-xl border border-[#223050] bg-[#111a33] p-4">
          <div className="flex items-center gap-3">
            <ScoreRing value={ev.total} size={96} label="эффективность" />
            <div className="flex-1 grid gap-2">
              {([['Компетентность', ev.comp, '#f5b942'], ['Соционика', ev.socio, '#7dd3fc'], ['Сплочённость', ev.cohesion, '#a78bfa']] as [string, number, string][]).map(([n, v, c]) => (
                <div key={n}>
                  <div className="flex justify-between text-[10px] text-[#8fa0c2] mb-0.5"><span>{n}</span><span className="tabular-nums">{v.toFixed(1)}</span></div>
                  <Bar v={v} color={c} h={5} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 text-[11px] text-[#8fa0c2]">
            Назначено: {chosenIds.length} из {POSITIONS.length} · эпоха: <b style={{ color: CONTEXT_INFO[context].color }}>{CONTEXT_INFO[context].name}</b>
          </div>
        </div>

        <div className="rounded-xl border border-[#223050] bg-[#111a33] p-4">
          <div className="text-[11px] uppercase tracking-wide text-[#8fa0c2] mb-2">Квадры</div>
          <QuadraChips quadras={ev.quadras} />
        </div>

        <CustomPolForm custom={custom} setCustom={setCustom} />

        <div className="rounded-xl border border-[#223050] bg-[#111a33] p-4 flex flex-col gap-3">
          <PairList title="Дуальные пары" pairs={ev.dyads} color="#34d399" empty="дуальных пар нет" />
          <PairList title="Конфликты" pairs={ev.conflicts} color="#f87171" empty="конфликтных пар нет" />
          <PairList title="Напряжённые" pairs={ev.tense} color="#fb923c" empty="напряжённых пар нет" />
          {ev.warnings.length > 0 && (
            <div className="text-[11px] text-[#fb923c]">{ev.warnings.join(' · ')}</div>
          )}
        </div>

        <div className="rounded-xl border border-[#1c2947] bg-[#0d1730] p-4 text-[11px] text-[#8fa0c2] leading-relaxed">
          Кабинет сохраняется в браузере автоматически. Один человек не может занимать две должности —
          как и в реальном Кабмине.
        </div>
      </div>
    </div>
  )
}

// ---------- вкладка «Сравнение» ----------

function CompareTab({ builder, context, custom }: { builder: Builder; context: ContextKind; custom: Politician[] }) {
  const ranked = useMemo(() => rankAll(builder, context, custom), [builder, context, custom])
  const player = ranked.find(r => r.isPlayer)
  const hist = ranked.filter(r => !r.isPlayer)
  const best = hist[0]
  const worst = hist[hist.length - 1]

  const insights = useMemo(() => {
    if (!player) return []
    const lines: string[] = []
    const place = ranked.findIndex(r => r.isPlayer) + 1
    lines.push(`Ваш кабинет: ${place}-е место из ${ranked.length} по совокупной эффективности (${player.eval.total.toFixed(1)}).`)
    if (best) {
      const d = player.eval.total - best.eval.total
      const compD = player.eval.comp - best.eval.comp
      const cohD = player.eval.cohesion - best.eval.cohesion
      const socD = player.eval.socio - best.eval.socio
      lines.push(
        `Лидер истории — ${best.name} (${best.eval.total.toFixed(1)}): разрыв ${d >= 0 ? '+' : ''}${d.toFixed(1)}. ` +
        `Компетентность ${compD >= 0 ? '+' : ''}${compD.toFixed(1)}, соционика ${socD >= 0 ? '+' : ''}${socD.toFixed(1)}, сплочённость ${cohD >= 0 ? '+' : ''}${cohD.toFixed(1)}.`,
      )
    }
    // ближайший сосед
    let near: RankedCabinet | null = null
    let nd = Infinity
    for (const r of hist) {
      const d = Math.abs(r.eval.total - player.eval.total)
      if (d < nd) { nd = d; near = r }
    }
    if (near) lines.push(`По уровню вы ближе всего к ${near.name} (Δ${nd.toFixed(1)}).`)
    if (player.eval.conflicts.length > 0) {
      lines.push(`Конфликтные пары в вашем кабинете: ${player.eval.conflicts.map(p => `${p.a} ↔ ${p.b}`).join('; ')}.`)
    } else if (chosenCount(builder) >= 4) {
      lines.push('Конфликтных пар нет — редкий случай для украинского Кабмина.')
    }
    return lines
  }, [player, ranked, best, builder])

  if (!player) {
    return (
      <div>
        <p className="text-[13px] text-[#8fa0c2] mb-4">
          Кабинет пока не собран — заполните хотя бы пару должностей во вкладке «Конструктор», и ваш проект
          встанет в общий рейтинг с историческими правительствами.
        </p>
        {ranked.map((r, i) => (
          <RankRow key={r.id} r={r} place={i + 1} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="rounded-xl border border-[#f5b94255] bg-[#f5b9420d] p-4 mb-4 flex flex-col gap-1.5">
        {insights.map((s, i) => (
          <div key={i} className="text-[12.5px] text-[#e8edf7] leading-relaxed">{s}</div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {ranked.map((r, i) => (
          <RankRow key={r.id} r={r} place={i + 1} />
        ))}
      </div>
    </div>
  )
}

function chosenCount(b: Builder): number {
  return Object.values(b).filter(Boolean).length
}

function RankRow({ r, place }: { r: RankedCabinet; place: number }) {
  const isP = r.isPlayer
  return (
    <div className="rounded-xl border bg-[#111a33] px-4 py-3 flex items-center gap-3"
      style={{ borderColor: isP ? '#f5b942' : '#1c2947', boxShadow: isP ? '0 0 24px #f5b94222' : undefined }}>
      <span className="text-[13px] w-7 text-center font-bold" style={{ color: place <= 3 ? '#f5b942' : '#67789c' }}>{place}</span>
      <ScoreRing value={r.eval.total} size={54} />
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-semibold truncate ${isP ? 'text-[#f5b942]' : 'text-[#e8edf7]'}`}>
          {isP ? '★ ' : ''}{r.ord}. {r.name}
        </div>
        <div className="text-[11px] text-[#8fa0c2] mt-0.5 flex flex-wrap gap-2 items-center">
          <span>{r.period}</span>·<ContextChip ctx={r.context} />
        </div>
      </div>
      <div className="hidden sm:grid gap-1.5 w-[190px] shrink-0">
        {([['комп.', r.eval.comp, '#f5b942'], ['соц.', r.eval.socio, '#7dd3fc'], ['спл.', r.eval.cohesion, '#a78bfa']] as [string, number, string][]).map(([n, v, c]) => (
          <div key={n} className="flex items-center gap-1.5">
            <span className="text-[9px] text-[#8fa0c2] w-8">{n}</span>
            <Bar v={v} color={c} h={4} />
            <span className="text-[9px] tabular-nums w-8 text-right text-[#c7d2e8]">{v.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- главная страница ----------

export default function Page() {
  const [tab, setTab] = useState<Tab>('history')
  const [builder, setBuilder] = useState<Builder>({})
  const [context, setContext] = useState<ContextKind>('war')
  const [custom, setCustom] = useState<Politician[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data = JSON.parse(raw)
        if (data.builder && typeof data.builder === 'object') setBuilder(data.builder)
        if (data.context && CONTEXT_INFO[data.context]) setContext(data.context)
      }
      setCustom(sanitizeCustom(JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]')))
    } catch { /* первый визит */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ builder, context })) } catch { /* приватный режим */ }
  }, [builder, context, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)) } catch { /* приватный режим */ }
  }, [custom, hydrated])

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* шапка */}
        <header className="mb-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#e8edf7]">
                Виртуальное <span className="text-[#f5b942]">министерство</span>
              </h1>
              <p className="text-[13px] text-[#8fa0c2] mt-1.5 max-w-[640px]">
                Симулятор Кабмина Украины: реальные правительства 2005–2026 прогнаны через алгоритм
                «Пульса сети» — компетентность, соционические типы, интертипные отношения. Соберите свой
                кабинет и сравните его с историей.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="stat-chip"><b>13</b><span>кабинетов</span></div>
              <div className="stat-chip"><b>{Object.keys(POLITICIANS).length + custom.length}</b><span>кандидатов</span></div>
              <div className="stat-chip"><b>12</b><span>должностей</span></div>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-[#223050] bg-[#0d1730] px-3 py-2 text-[11px] text-[#8fa0c2] leading-relaxed">
            ⚠️ Составы кабинетов и хроника — публичные факты (Википедия, kmu.gov.ua). Профессиональные
            компетенции (0–10) и соционические типы политиков — <b>экспертные игровые оценки</b> для
            симулятора, а не научные данные: публичная соционика всегда спекулятивна.
          </div>
        </header>

        {/* табы */}
        <nav className="flex gap-2 mb-6">
          {([['history', '🏛 История кабинетов'], ['builder', '⚙️ Конструктор'], ['compare', '📊 Сравнение']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="rounded-lg border px-4 py-2 text-[13px] font-semibold transition-colors"
              style={tab === id
                ? { background: '#f5b94218', borderColor: '#f5b942', color: '#f5b942' }
                : { background: '#111a33', borderColor: '#223050', color: '#8fa0c2' }}>
              {label}
            </button>
          ))}
        </nav>

        {tab === 'history' && <HistoryTab />}
        {tab === 'builder' && (
          <BuilderTab builder={builder} setBuilder={setBuilder} context={context} setContext={setContext}
            custom={custom} setCustom={setCustom} />
        )}
        {tab === 'compare' && <CompareTab builder={builder} context={context} custom={custom} />}

        {/* методология */}
        <footer className="mt-10 rounded-xl border border-[#1c2947] bg-[#0d1730] p-4 text-[12px] text-[#8fa0c2] leading-relaxed">
          <details>
            <summary className="cursor-pointer text-[13px] font-semibold text-[#e8edf7]">Как считается эффективность</summary>
            <div className="mt-3 flex flex-col gap-2">
              <div>
                <b className="text-[#c7d2e8]">Итог = 45% компетентность + 25% соционика + 30% сплочённость.</b>
                Компетентность: по каждой должности — фактические компетенции против требований
                (перевыполнение одной оси не закрывает провал другой). Соционика: дихотомии типа против
                предпочтений должности + бонус эталонным типам. Сплочённость: среднее по всем парам
                из полной таблицы 14 интертипных отношений (от +3 дуальность до −2.5 конфликт),
                минус штраф за смешение враждующих квадр (Альфа+Гамма, Бета+Дельта).
              </div>
              <div>
                <b className="text-[#c7d2e8]">Вес должностей × эпоха.</b> Премьер 2.0, финансы и оборона 1.4,
                первый вице-премьер 1.1, экономика/МИД/МВД 1.1, энергетика 1.0, юстиция и цифра 0.7,
                здравоохранение и образование 0.6. В контексте «война» оборона ×1.6, МВД ×1.5, энергетика ×1.4;
                в «кризис» финансы ×1.5, экономика ×1.4; в «реформы» юстиция и экономика ×1.3.
              </div>
              <div>
                <b className="text-[#c7d2e8]">Кто допустим на должность.</b> У каждой должности — список
                сфер: армия и силовой блок — на оборону и МВД, юристы — на юстицию, медики — на
                здравоохранение, энергетики — на ТЭК. Министр — политическая должность, поэтому
                выдающиеся менеджеры из бизнеса допущены почти везде — как Резников и Умёров в жизни.
                Группа «Новые лица» — растущие политики, а своих кандидатов игрок добавляет в конструкторе
                (сохраняются в браузере).
              </div>
              <div>
                <b className="text-[#c7d2e8]">Историческая проверка.</b> Каждый кабинет оценивается в контексте
                своей эпохи; длительность работы правительства показана отдельно как факт, а не в оценке.
                Данные: Википедия («Уряди України»), kmu.gov.ua.
              </div>
              <div>
                Серия: <a className="text-[#f5b942] underline" href="https://bravo-amber.vercel.app" target="_blank" rel="noreferrer">«Пульс сети» (Браво)</a> ·
                витрина: <a className="text-[#f5b942] underline" href="https://github.com/alex195703/igroteka" target="_blank" rel="noreferrer">Игротека</a> ·
                код: <a className="text-[#f5b942] underline" href="https://github.com/alex195703/vsrtualne-ministersnvo" target="_blank" rel="noreferrer">GitHub</a>
              </div>
            </div>
          </details>
        </footer>
      </div>
    </main>
  )
}
