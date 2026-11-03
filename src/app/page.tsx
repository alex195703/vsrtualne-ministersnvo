'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  POSITIONS, POLITICIANS, CABINETS, EARLIER_GOVTS, CONTEXT_INFO, COMP_INFO, FIELD_INFO,
  isEligible, surnameFirst,
  type ContextKind, type Cabinet, type CompKey, type FieldId, type Politician, type Position,
} from '@/lib/ministry-data'
import {
  evaluateCabinet, rankAll, topForPosition, socioFit, compFit, quadraOf,
  optimizeCabinet,
  typeByRu, CONTEXT_WEIGHT, type CabinetEval, type RankedCabinet, type PairNote,
} from '@/lib/ministry-engine'
import { QUADRA_COLORS, RELATION_NAME, type RelationKind } from '@/lib/relations'
import { QUADRAS, TYPES, type QuadraId } from '@/lib/socionics-data'
import { useL, useBi, useLang, setLang, type Lang, type Bi } from '@/lib/i18n'

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

function LangSwitcher() {
  const lang = useLang()
  const btn = (active: boolean) =>
    `rounded-md px-2 py-1 text-[11px] font-bold transition-colors ${
      active
        ? 'bg-[#f5b942] text-[#0d1730]'
        : 'text-[#8fa0c2] hover:bg-[#141e3d] hover:text-[#e8edf7]'
    }`
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-lg border border-[#223050] bg-[#0d1730] p-0.5"
      role="group"
      aria-label="Мова / Язык"
    >
      <button type="button" onClick={() => setLang('uk')} className={btn(lang === 'uk')} aria-pressed={lang === 'uk'}>
        УКР
      </button>
      <button type="button" onClick={() => setLang('ru')} className={btn(lang === 'ru')} aria-pressed={lang === 'ru'}>
        РУС
      </button>
    </span>
  )
}

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
  const B = useBi()
  const L = useL()
  return (
    <div className={`grid grid-cols-2 gap-x-3 gap-y-1 w-full ${compact ? '' : 'min-w-[240px]'}`}>
      {COMP_KEYS.map(k => {
        const lack = req && comp[k] < req[k]
        return (
          <div key={k} className="flex items-center gap-1.5" title={B(COMP_INFO[k].hint) + (lack ? ` · ${L('потрібно', 'требуется')} ${req![k]}` : '')}>
            <span className="text-[10px] text-[#8fa0c2] w-[84px] shrink-0 truncate">{B(COMP_INFO[k].name)}</span>
            <Bar v={comp[k] * 10} color={lack ? '#fb923c' : '#34d399'} h={5} />
            <span className="text-[10px] w-6 text-right text-[#c7d2e8] tabular-nums">{comp[k]}</span>
          </div>
        )
      })}
    </div>
  )
}

function TypeChip({ ru, small }: { ru: string; small?: boolean }) {
  const L = useL()
  const t = typeByRu(ru)
  const c = QUADRA_COLORS[t.quadra]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 whitespace-nowrap"
      style={{ background: c.fill + '14', color: c.stroke, borderColor: c.stroke + '44', fontSize: small ? 10 : 11 }}
      title={`${L('Квадра', 'Квадра')} ${QUADRAS[t.quadra].name}: ${QUADRAS[t.quadra].motto}`}
    >
      <b>{ru}</b> {t.name}
    </span>
  )
}

function QuadraChips({ quadras }: { quadras: Record<QuadraId, number> }) {
  const B = useBi()
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(quadras) as QuadraId[]).map(q => {
        const n = quadras[q]
        if (!n) return null
        const c = QUADRA_COLORS[q]
        return (
          <span key={q} className="rounded-md border px-2 py-0.5 text-[11px]"
            style={{ background: c.fill + '14', color: c.stroke, borderColor: c.stroke + '44' }}
            title={B(QUADRAS[q].description)}>
            {B(QUADRAS[q].name)}: {n}
          </span>
        )
      })}
    </div>
  )
}

function ContextChip({ ctx }: { ctx: ContextKind }) {
  const B = useBi()
  const info = CONTEXT_INFO[ctx]
  return (
    <span className="rounded-md border px-2 py-0.5 text-[11px] whitespace-nowrap"
      style={{ background: info.color + '14', color: info.color, borderColor: info.color + '44' }}
      title={B(info.hint)}>{B(info.name)}</span>
  )
}

function PairList({ title, pairs, color, empty }: { title: string; pairs: PairNote[]; color: string; empty: string }) {
  const B = useBi()
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color }}>{title} ({pairs.length})</div>
      {pairs.length === 0 ? (
        <div className="text-[11px] text-[#8fa0c2]">{empty}</div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {pairs.map((p, i) => {
            const rk = RELATION_NAME[p.kind as RelationKind]
            return (
              <div key={i} className="text-[11px] text-[#c7d2e8]">
                {B(p.a)} <span style={{ color }}>— {rk ? B(rk) : p.kind} —</span> {B(p.b)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------- карточка кабинета (детально) ----------

function CabinetDetail({ cab }: { cab: Cabinet }) {
  const ev = useMemo(() => evaluateCabinet(cab.members, cab.context, cab.na ?? []), [cab])
  const info = CONTEXT_INFO[cab.context]
  const B = useBi()
  const L = useL()
  return (
    <div className="mt-3 rounded-xl border border-[#223050] bg-[#0d1730] p-4">
      <div className="flex flex-wrap items-start gap-4">
        <ScoreRing value={ev.total} size={92} label={L('ефективність', 'эффективность')} />
        <div className="flex-1 min-w-[260px]">
          <div className="grid grid-cols-3 gap-3 mb-2">
            {([[L('Компетентність', 'Компетентность'), ev.comp, '#f5b942'], [L('Соціоніка', 'Соционика'), ev.socio, '#7dd3fc'], [L('Згуртованість', 'Сплочённость'), ev.cohesion, '#a78bfa']] as [string, number, string][]).map(([n, v, c]) => (
              <div key={n}>
                <div className="flex justify-between text-[11px] text-[#8fa0c2] mb-1"><span>{n}</span><span className="tabular-nums">{v.toFixed(1)}</span></div>
                <Bar v={v} color={c} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <ContextChip ctx={cab.context} />
            <span className="text-[11px] text-[#8fa0c2]">{B(info.hint)} · {L('працював', 'отработал')} {cab.months} {L('міс.', 'мес.')}</span>
          </div>
          <p className="text-[12px] text-[#c7d2e8] mt-2 leading-relaxed">{B(cab.fate)}</p>
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
                  <b>{B(pos.title)}</b>
                </span>
                {pol ? (
                  <span className="flex gap-2 shrink-0">
                    <span className="text-[11px] tabular-nums" style={{ color: scoreColor(pe.compPct) }} title={L('професійна посадка', 'профессиональная посадка')}>{pe.compPct}%</span>
                    <span className="text-[11px] tabular-nums text-[#7dd3fc]" title={L('соціонічна посадка (0–10)', 'соционическая посадка (0–10)')}>{pe.socioScore.toFixed(1)}/10</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-[#8fa0c2]">{L('немає в наборі', 'нет в наборе')}</span>
                )}
              </div>
              {pol ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-semibold text-[#e8edf7]">{B(pol.name)}</span>
                  <TypeChip ru={pol.type} small />
                </div>
              ) : (
                <div className="text-[11px] text-[#67789c]">{B(pos.demand)}</div>
              )}
              {pol && <div className="mt-1.5"><CompBars comp={pol.comp} req={pos.req} compact /></div>}
              {note && <div className="mt-1.5 text-[10px] text-[#8fa0c2]">↻ {B(note)}</div>}
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <PairList title={L('Дуальні пари', 'Дуальные пары')} pairs={ev.dyads} color="#34d399" empty={L('дуальних пар немає', 'дуальных пар нет')} />
        <PairList title={L('Конфлікти', 'Конфликты')} pairs={ev.conflicts} color="#f87171" empty={L('конфліктних пар немає — рідка розкіш', 'конфликтных пар нет — редкая роскошь')} />
        <PairList title={L('Напружені', 'Напряжённые')} pairs={ev.tense} color="#fb923c" empty={L('напружених пар немає', 'напряжённых пар нет')} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-[#8fa0c2]">{L('Квадри:', 'Квадры:')}</span>
        <QuadraChips quadras={ev.quadras} />
      </div>
    </div>
  )
}

// ---------- вкладка «История» ----------

function HistoryTab() {
  const [open, setOpen] = useState<string | null>(null)
  const B = useBi()
  const L = useL()
  const ranked = useMemo(
    () => CABINETS.map(c => ({ c, ev: evaluateCabinet(c.members, c.context, c.na ?? []) }))
      .sort((a, b) => b.ev.total - a.ev.total),
    [],
  )
  return (
    <div>
      <p className="text-[13px] text-[#8fa0c2] mb-4">
        {L(
          'Усі 13 урядів 2005–2026 прогнано через один алгоритм: компетенції проти вимог посад, соціонічна посадка, повна таблиця інтертипних відносин і квадровий баланс. Кожен уряд оцінюється у контексті своєї епохи — у війні вага оборони й МВС вища, у кризі — фінансів та економіки.',
          'Все 13 кабинетов 2005–2026 прогнаны через один алгоритм: компетенции против требований должностей, соционическая посадка, полная таблица интертипных отношений и квадровый баланс. Каждый кабинет оценивается в контексте своей эпохи — в войне вес обороны и МВД выше, в кризисе — финансов и экономики.',
        )}
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
                  {c.ord}. {B(c.name)}
                </div>
                <div className="text-[11px] text-[#8fa0c2] mt-0.5 flex flex-wrap gap-2 items-center">
                  <span>{B(c.period)}</span>·<span>{c.months} {L('міс.', 'мес.')}</span>·<ContextChip ctx={c.context} />
                </div>
              </div>
              <span className="text-[#67789c] text-lg">{open === c.id ? '▾' : '▸'}</span>
            </button>
            {open === c.id && <div className="px-4 pb-4"><CabinetDetail cab={c} /></div>}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-[#1c2947] bg-[#0d1730] p-4">
        <div className="text-[12px] uppercase tracking-wide text-[#8fa0c2] mb-2">{L('Доісторія: уряди 1991–2004', 'Доистория: правительства 1991–2004')}</div>
        <div className="grid gap-1.5 md:grid-cols-2">
          {EARLIER_GOVTS.map(g => (
            <div key={g.name.uk} className="text-[12px] text-[#c7d2e8]">
              <b className="text-[#e8edf7]">{B(g.name)}</b> <span className="text-[#8fa0c2]">{B(g.period)}</span> — {B(g.note)}
            </div>
          ))}
        </div>
        <div className="text-[11px] text-[#67789c] mt-2">
          {L(
            'Ранню епоху не оцінюємо за членами: систематичних даних про десятки фігурантів тих урядів у наборі немає.',
            'Раннюю эпоху не оцениваем по членам: систематических данных о десятках фигурантов тех кабинетов в наборе нет.',
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- группы кандидатов и свои кандидатуры ----------

const GROUPS_META: { key: 'classic' | 'manager' | 'rising' | 'custom'; label: Bi }[] = [
  { key: 'classic', label: { uk: 'Політики і держслужбовці', ru: 'Политики и госслужащие' } },
  { key: 'manager', label: { uk: 'Менеджери і експерти', ru: 'Менеджеры и эксперты' } },
  { key: 'rising', label: { uk: 'Нові обличчя', ru: 'Новые лица' } },
  { key: 'custom', label: { uk: 'Ваші кандидати', ru: 'Ваши кандидаты' } },
]

/** Допустимые кандидаты должности, сгруппированные по происхождению,
 *  внутри группы — по фамилии */
function candidateGroups(pool: Politician[], custom: Politician[], pos: Position, lang: Lang) {
  const eligible = pool.filter(p => isEligible(p, pos))
  const customIds = new Set(custom.map(c => c.id))
  return GROUPS_META.map(g => ({
    ...g,
    items: eligible
      .filter(p => g.key === 'custom'
        ? customIds.has(p.id)
        : !customIds.has(p.id) && (p.group ?? 'classic') === g.key)
      .sort((a, b) => surnameFirst(a.name[lang]).localeCompare(surnameFirst(b.name[lang]), lang)),
  }))
}

/** Личные кандидаты из localStorage — с проверкой полей */
function sanitizeCustom(raw: unknown): Politician[] {
  if (!Array.isArray(raw)) return []
  const ruTypes = new Set(TYPES.map(t => t.ru))
  const cl = (v: unknown) => Math.max(0, Math.min(10, Math.round(Number(v)) || 0))
  const toBi = (v: unknown): Bi =>
    v && typeof v === 'object' && typeof (v as Bi).uk === 'string' && typeof (v as Bi).ru === 'string'
      ? { uk: (v as Bi).uk, ru: (v as Bi).ru }
      : { uk: String(v ?? ''), ru: String(v ?? '') }
  const out: Politician[] = []
  for (const c of raw) {
    if (!c || typeof c.id !== 'string' || !ruTypes.has(c.type)) continue
    const comp = (c.comp ?? {}) as Record<string, unknown>
    const nameBi = typeof c.name === 'string'
      ? { uk: (c.name as string).slice(0, 60), ru: (c.name as string).slice(0, 60) }
      : toBi(c.name)
    out.push({
      id: c.id, name: nameBi, type: c.type,
      comp: { adm: cl(comp.adm), econ: cl(comp.econ), dip: cl(comp.dip), cri: cl(comp.cri) },
      fields: Array.isArray(c.fields) ? c.fields.filter((f: unknown) => FIELD_INFO[f as FieldId]) : ['gov'],
      bio: { uk: 'Власна кандидатура гравця.', ru: 'Личная кандидатура игрока.' },
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
  const B = useBi()
  const L = useL()

  const inp = 'rounded-lg border border-[#223050] bg-[#0d1730] px-2 py-1.5 text-[12px] text-[#e8edf7]'

  const add = () => {
    const nm = name.trim().replace(/\s+/g, ' ')
    if (nm.split(' ').length < 2) { setErr(L('Потрібні прізвище та імʼя', 'Нужны фамилия и имя')); return }
    if (custom.some(c => c.name.uk.toLowerCase() === nm.toLowerCase() || c.name.ru.toLowerCase() === nm.toLowerCase())) { setErr(L('Такий кандидат уже є', 'Такой кандидат уже есть')); return }
    const cl = (v: number) => Math.max(0, Math.min(10, Math.round(v) || 0))
    setCustom([...custom, {
      id: 'c' + Date.now().toString(36), name: { uk: nm, ru: nm }, type,
      comp: { adm: cl(comp.adm), econ: cl(comp.econ), dip: cl(comp.dip), cri: cl(comp.cri) },
      fields: f2 ? [f1, f2 as FieldId] : [f1],
      bio: { uk: 'Власна кандидатура гравця.', ru: 'Личная кандидатура игрока.' },
    }])
    setName(''); setErr('')
  }

  return (
    <div className="rounded-xl border border-[#223050] bg-[#111a33] p-4">
      <div className="text-[11px] uppercase tracking-wide text-[#8fa0c2] mb-2">➕ {L('Свій кандидат', 'Свой кандидат')}</div>
      <div className="flex flex-col gap-1.5">
        <input className={inp} placeholder={L('Прізвище Імʼя', 'Фамилия Имя')} value={name} maxLength={60}
          onChange={e => { setName(e.target.value); setErr('') }} />
        <div className="grid grid-cols-2 gap-1.5">
          <select className={inp} style={{ colorScheme: 'dark' }} value={type} onChange={e => setType(e.target.value)} title={L('соціонічний тип', 'соционический тип')}>
            {TYPE_OPTIONS.map(ru => <option key={ru} value={ru}>{ru}</option>)}
          </select>
          <select className={inp} style={{ colorScheme: 'dark' }} value={f1} onChange={e => setF1(e.target.value as FieldId)} title={L('сфера', 'сфера')}>
            {(Object.keys(FIELD_INFO) as FieldId[]).map(f => <option key={f} value={f}>{B(FIELD_INFO[f].name)}</option>)}
          </select>
        </div>
        <select className={inp} style={{ colorScheme: 'dark' }} value={f2} onChange={e => setF2(e.target.value as FieldId | '')} title={L('друга сфера', 'вторая сфера')}>
          <option value="">{L('— друга сфера не потрібна —', '— вторая сфера не нужна —')}</option>
          {(Object.keys(FIELD_INFO) as FieldId[]).map(f => <option key={f} value={f}>{B(FIELD_INFO[f].name)}</option>)}
        </select>
        <div className="grid grid-cols-4 gap-1.5">
          {COMP_KEYS.map(k => (
            <label key={k} className="text-[9px] text-[#8fa0c2]">
              {B(COMP_INFO[k].name).slice(0, 4)}.
              <input type="number" min={0} max={10} value={comp[k]}
                onChange={e => setComp({ ...comp, [k]: Number(e.target.value) })}
                className={`${inp} w-full mt-0.5`} />
            </label>
          ))}
        </div>
        {err && <div className="text-[11px] text-[#f87171]">{err}</div>}
        <button onClick={add}
          className="rounded-lg border border-[#f5b942]55 px-3 py-1.5 text-[12px] text-[#f5b942] hover:bg-[#f5b94218]">
          {L('Додати до списку', 'Добавить в список')}
        </button>
        {custom.length > 0 && (
          <div className="mt-1 flex flex-col gap-1 border-t border-[#1c2947] pt-2">
            {custom.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-[#c7d2e8] truncate">{surnameFirst(B(c.name))} · {c.type}</span>
                <button onClick={() => setCustom(custom.filter(x => x.id !== c.id))}
                  className="shrink-0 text-[#67789c] hover:text-[#f87171]" title={L('видалити', 'удалить')}>✕</button>
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
  const B = useBi()
  const L = useL()
  const lang = useLang()

  const setPos = (posId: string, polId: string | null) => {
    const nb = { ...builder, [posId]: polId || null }
    setBuilder(nb)
  }

  const pool = useMemo(() => [...Object.values(POLITICIANS), ...custom], [custom])

  const autoFill = () => {
    // «По максимуму» = жадный старт по эффективному весу эпохи + подъём
    // на холм: полный счёт evaluateCabinet этой эпохи (вес кресел эпохи
    // × сплочённость) растёт, пока есть выгодные замены и обмены.
    // У каждой эпохи свой компромисс — свой расклад.
    setBuilder(optimizeCabinet(context, pool))
  }

  const ev = useMemo(() => evaluateCabinet(builder, context, [], custom), [builder, context, custom])
  const chosenIds = Object.values(builder).filter(Boolean) as string[]

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[12px] text-[#8fa0c2]">{L('Епоха уряду:', 'Эпоха кабинета:')}</span>
          {CTX_ORDER.map(ctx => (
            <button key={ctx} onClick={() => setContext(ctx)}
              className="rounded-lg border px-3 py-1.5 text-[12px] transition-colors"
              style={context === ctx
                ? { background: CONTEXT_INFO[ctx].color + '22', borderColor: CONTEXT_INFO[ctx].color, color: CONTEXT_INFO[ctx].color }
                : { background: '#111a33', borderColor: '#223050', color: '#8fa0c2' }}>
              {B(CONTEXT_INFO[ctx].name)}
            </button>
          ))}
          <div className="grow" />
          <button onClick={autoFill} className="rounded-lg border border-[#f5b942]55 px-3 py-1.5 text-[12px] text-[#f5b942] hover:bg-[#f5b94218]">⚡ {L('Зібрати по максимуму', 'Собрать по максимуму')}</button>
          <button onClick={() => setBuilder({})} className="rounded-lg border border-[#223050] px-3 py-1.5 text-[12px] text-[#8fa0c2] hover:bg-[#141e3d]">{L('Очистити', 'Очистить')}</button>
        </div>

        <p className="text-[11.5px] text-[#67789c] mb-3 leading-relaxed">
          {L(
            'У списках — лише профільні кандидати: силовики на оборону й МВС, юристи на юстицію, медики на охорону здоровʼя. Менеджери допущені до міністерств — як Резников і Умёров у житті. Зростаючі політики — у групі «Нові обличчя», власних кандидатів додавайте в панелі праворуч. Автозбір оптимізує повний рахунок уряду під обрану епоху: у війні дорожчі оборона, МВС і енергетика, у кризі — фінанси та економіка, у реформах — юстиція й цифра. Змінили епоху — тисніть «Зібрати по максимуму» знову: розклад перезбереться.',
            'В списках — только профильные кандидаты: силовики на оборону и МВД, юристы на юстицию, медики на здравоохранение. Менеджеры допущены на министерства — как Резников и Умёров в жизни. Растущие политики — в группе «Новые лица», своих кандидатов добавляйте в панели справа. Автосбор оптимизирует полный счёт кабинета под выбранную эпоху: в войне дороже оборона, МВД и энергетика, в кризисе — финансы и экономика, в реформах — юстиция и цифра. Сменили эпоху — жмите «Собрать по максимуму» заново: расклад пересоберётся.',
          )}
        </p>
        <div className="grid gap-2.5 md:grid-cols-2">
          {POSITIONS.map(pos => {
            const polId = builder[pos.id] ?? null
            const pol = polId ? (pool.find(p => p.id === polId) ?? null) : null
            const picks = topForPosition(pos.id, 4, pool, context)
            const groups = candidateGroups(pool, custom, pos, lang)
            const cFit = pol ? Math.round(compFit(pol, pos) * 100) : null
            const sFit = pol ? socioFit(pol.type, pos) : null
            const effW = pos.weight * (CONTEXT_WEIGHT[context][pos.id] ?? 1)
            return (
              <div key={pos.id} className="rounded-xl border border-[#1c2947] bg-[#111a33] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-[#e8edf7]">
                    <span className="mr-1.5">{pos.icon}</span>{B(pos.title)}
                  </span>
                  <span className="text-[10px] text-[#67789c]" title={L('вага позиції × множник епохи', 'вес позиции × множитель эпохи')}>
                    {L('вага', 'вес')} {effW.toFixed(2)}
                  </span>
                </div>
                <select
                  className="w-full rounded-lg border border-[#223050] bg-[#0d1730] px-2.5 py-2 text-[12px] text-[#e8edf7]"
                  style={{ colorScheme: 'dark' }}
                  value={polId ?? ''}
                  onChange={e => setPos(pos.id, e.target.value || null)}
                >
                  <option value="">{L('— вакансія —', '— вакансия —')}</option>
                  {pol && !isEligible(pol, pos) && (
                    <option value={pol.id}>{surnameFirst(B(pol.name))} · {pol.type} · {L('поза профілем', 'вне профиля')}</option>
                  )}
                  {groups.filter(g => g.items.length > 0).map(g => (
                    <optgroup key={g.key} label={B(g.label)}>
                      {g.items.map(p => (
                        <option key={p.id} value={p.id}>{surnameFirst(B(p.name))} · {p.type}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {pol && (
                  <div className="mt-2">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <TypeChip ru={pol.type} small />
                      <span className="text-[11px] tabular-nums" style={{ color: scoreColor(cFit!) }}>{cFit}%</span>
                      <span className="text-[11px] text-[#7dd3fc] tabular-nums" title={L('соціонічна посадка', 'соционическая посадка')}>{L('соц.', 'соц.')} {sFit!.toFixed(1)}/10</span>
                    </div>
                    <CompBars comp={pol.comp} req={pos.req} compact />
                  </div>
                )}
                {!pol && (
                  <div className="mt-2">
                    <div className="text-[10px] text-[#67789c] mb-1">{B(pos.demand)}. {L('Підходять:', 'Подходят:')}</div>
                    <div className="flex flex-wrap gap-1">
                      {picks.map(p => (
                        <button key={p.pol.id} onClick={() => setPos(pos.id, p.pol.id)}
                          className="rounded-md border border-[#223050] bg-[#0d1730] px-2 py-0.5 text-[10px] text-[#8fa0c2] hover:border-[#f5b942] hover:text-[#f5b942]">
                          {B(p.pol.name)} · {Math.round(p.score * 100)}
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
            <ScoreRing value={ev.total} size={96} label={L('ефективність', 'эффективность')} />
            <div className="flex-1 grid gap-2">
              {([[L('Компетентність', 'Компетентность'), ev.comp, '#f5b942'], [L('Соціоніка', 'Соционика'), ev.socio, '#7dd3fc'], [L('Згуртованість', 'Сплочённость'), ev.cohesion, '#a78bfa']] as [string, number, string][]).map(([n, v, c]) => (
                <div key={n}>
                  <div className="flex justify-between text-[10px] text-[#8fa0c2] mb-0.5"><span>{n}</span><span className="tabular-nums">{v.toFixed(1)}</span></div>
                  <Bar v={v} color={c} h={5} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 text-[11px] text-[#8fa0c2]">
            {L('Призначено', 'Назначено')}: {chosenIds.length} {L('з', 'из')} {POSITIONS.length} · {L('епоха:', 'эпоха:')} <b style={{ color: CONTEXT_INFO[context].color }}>{B(CONTEXT_INFO[context].name)}</b>
          </div>
        </div>

        <div className="rounded-xl border border-[#223050] bg-[#111a33] p-4">
          <div className="text-[11px] uppercase tracking-wide text-[#8fa0c2] mb-2">{L('Квадри', 'Квадры')}</div>
          <QuadraChips quadras={ev.quadras} />
        </div>

        <CustomPolForm custom={custom} setCustom={setCustom} />

        <div className="rounded-xl border border-[#223050] bg-[#111a33] p-4 flex flex-col gap-3">
          <PairList title={L('Дуальні пари', 'Дуальные пары')} pairs={ev.dyads} color="#34d399" empty={L('дуальних пар немає', 'дуальных пар нет')} />
          <PairList title={L('Конфлікти', 'Конфликты')} pairs={ev.conflicts} color="#f87171" empty={L('конфліктних пар немає', 'конфликтных пар нет')} />
          <PairList title={L('Напружені', 'Напряжённые')} pairs={ev.tense} color="#fb923c" empty={L('напружених пар немає', 'напряжённых пар нет')} />
          {ev.warnings.length > 0 && (
            <div className="text-[11px] text-[#fb923c]">{ev.warnings.map(w => B(w)).join(' · ')}</div>
          )}
        </div>

        <div className="rounded-xl border border-[#1c2947] bg-[#0d1730] p-4 text-[11px] text-[#8fa0c2] leading-relaxed">
          {L(
            'Уряд зберігається в браузері автоматично. Одна людина не може обіймати дві посади — як і в реальному Кабміні.',
            'Кабинет сохраняется в браузере автоматически. Один человек не может занимать две должности — как и в реальном Кабмине.',
          )}
        </div>
      </div>
    </div>
  )
}

// ---------- вкладка «Сравнение» ----------

function CompareTab({ builder, context, custom }: { builder: Builder; context: ContextKind; custom: Politician[] }) {
  const B = useBi()
  const L = useL()
  const ranked = useMemo(() => rankAll(builder, context, custom), [builder, context, custom])
  const player = ranked.find(r => r.isPlayer)
  const hist = ranked.filter(r => !r.isPlayer)
  const best = hist[0]
  const worst = hist[hist.length - 1]

  const insights = useMemo(() => {
    if (!player) return []
    const lines: string[] = []
    const place = ranked.findIndex(r => r.isPlayer) + 1
    lines.push(
      L(
        `Ваш уряд: місце ${place} з ${ranked.length} за сукупною ефективністю (${player.eval.total.toFixed(1)}).`,
        `Ваш кабинет: ${place}-е место из ${ranked.length} по совокупной эффективности (${player.eval.total.toFixed(1)}).`,
      ),
    )
    if (best) {
      const d = player.eval.total - best.eval.total
      const compD = player.eval.comp - best.eval.comp
      const cohD = player.eval.cohesion - best.eval.cohesion
      const socD = player.eval.socio - best.eval.socio
      lines.push(
        L(
          `Лідер історії — ${B(best.name)} (${best.eval.total.toFixed(1)}): відрив ${d >= 0 ? '+' : ''}${d.toFixed(1)}. ` +
          `Компетентність ${compD >= 0 ? '+' : ''}${compD.toFixed(1)}, соціоніка ${socD >= 0 ? '+' : ''}${socD.toFixed(1)}, згуртованість ${cohD >= 0 ? '+' : ''}${cohD.toFixed(1)}.`,
          `Лидер истории — ${B(best.name)} (${best.eval.total.toFixed(1)}): разрыв ${d >= 0 ? '+' : ''}${d.toFixed(1)}. ` +
          `Компетентность ${compD >= 0 ? '+' : ''}${compD.toFixed(1)}, соционика ${socD >= 0 ? '+' : ''}${socD.toFixed(1)}, сплочённость ${cohD >= 0 ? '+' : ''}${cohD.toFixed(1)}.`,
        ),
      )
    }
    // ближайший сосед
    let near: RankedCabinet | null = null
    let nd = Infinity
    for (const r of hist) {
      const d = Math.abs(r.eval.total - player.eval.total)
      if (d < nd) { nd = d; near = r }
    }
    if (near) lines.push(L(`За рівнем ви найближче до ${B(near.name)} (Δ${nd.toFixed(1)}).`, `По уровню вы ближе всего к ${B(near.name)} (Δ${nd.toFixed(1)}).`))
    if (player.eval.conflicts.length > 0) {
      lines.push(
        L(
          `Конфліктні пари у вашому уряді: ${player.eval.conflicts.map(p => `${B(p.a)} ↔ ${B(p.b)}`).join('; ')}.`,
          `Конфликтные пары в вашем кабинете: ${player.eval.conflicts.map(p => `${B(p.a)} ↔ ${B(p.b)}`).join('; ')}.`,
        ),
      )
    } else if (chosenCount(builder) >= 4) {
      lines.push(L('Конфліктних пар немає — рідкісний випадок для українського Кабміну.', 'Конфликтных пар нет — редкий случай для украинского Кабмина.'))
    }
    return lines
  }, [B, L, player, ranked, best, builder])

  if (!player) {
    return (
      <div>
        <p className="text-[13px] text-[#8fa0c2] mb-4">
          {L(
            'Уряд ще не зібрано — заповніть хоча б пару посад у вкладці «Конструктор», і ваш проект стане в загальний рейтинг з історичними урядами.',
            'Кабинет пока не собран — заполните хотя бы пару должностей во вкладке «Конструктор», и ваш проект встанет в общий рейтинг с историческими правительствами.',
          )}
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
  const B = useBi()
  const L = useL()
  return (
    <div className="rounded-xl border bg-[#111a33] px-4 py-3 flex items-center gap-3"
      style={{ borderColor: isP ? '#f5b942' : '#1c2947', boxShadow: isP ? '0 0 24px #f5b94222' : undefined }}>
      <span className="text-[13px] w-7 text-center font-bold" style={{ color: place <= 3 ? '#f5b942' : '#67789c' }}>{place}</span>
      <ScoreRing value={r.eval.total} size={54} />
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-semibold truncate ${isP ? 'text-[#f5b942]' : 'text-[#e8edf7]'}`}>
          {isP ? '★ ' : ''}{r.ord}. {B(r.name)}
        </div>
        <div className="text-[11px] text-[#8fa0c2] mt-0.5 flex flex-wrap gap-2 items-center">
          <span>{B(r.period)}</span>·<ContextChip ctx={r.context} />
        </div>
      </div>
      <div className="hidden sm:grid gap-1.5 w-[190px] shrink-0">
        {([[L('комп.', 'комп.'), r.eval.comp, '#f5b942'], [L('соц.', 'соц.'), r.eval.socio, '#7dd3fc'], [L('згур.', 'спл.'), r.eval.cohesion, '#a78bfa']] as [string, number, string][]).map(([n, v, c]) => (
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
  const L = useL()

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
                {L('Віртуальне', 'Виртуальное')} <span className="text-[#f5b942]">{L('міністерство', 'министерство')}</span>
              </h1>
              <p className="text-[13px] text-[#8fa0c2] mt-1.5 max-w-[640px]">
                {L(
                  'Симулятор Кабміну України: реальні уряди 2005–2026 прогнано через алгоритм «Пульсу мережі» — компетентність, соціонічні типи, інтертипні відносини. Зберіть свій уряд і порівняйте його з історією.',
                  'Симулятор Кабмина Украины: реальные правительства 2005–2026 прогнаны через алгоритм «Пульса сети» — компетентность, соционические типы, интертипные отношения. Соберите свой кабинет и сравните его с историей.',
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <div className="stat-chip"><b>13</b><span>{L('урядів', 'кабинетов')}</span></div>
                <div className="stat-chip"><b>{Object.keys(POLITICIANS).length + custom.length}</b><span>{L('кандидатів', 'кандидатов')}</span></div>
                <div className="stat-chip"><b>12</b><span>{L('посад', 'должностей')}</span></div>
              </div>
              <LangSwitcher />
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-[#223050] bg-[#0d1730] px-3 py-2 text-[11px] text-[#8fa0c2] leading-relaxed">
            ⚠️ {L(
              'Склади урядів і хроніка — публічні факти (Вікіпедія, kmu.gov.ua). Професійні компетенції (0–10) і соціонічні типи політиків —',
              'Составы кабинетов и хроника — публичные факты (Википедия, kmu.gov.ua). Профессиональные компетенции (0–10) и соционические типы политиков —',
            )}{' '}
            <b>{L('експертні ігрові оцінки', 'экспертные игровые оценки')}</b>{' '}
            {L(
              'для симулятора, а не наукові дані: публічна соціоніка завжди спекулятивна.',
              'для симулятора, а не научные данные: публичная соционика всегда спекулятивна.',
            )}
          </div>
        </header>

        {/* табы */}
        <nav className="flex gap-2 mb-6">
          {([['history', `🏛 ${L('Історія урядів', 'История кабинетов')}`], ['builder', `⚙️ ${L('Конструктор', 'Конструктор')}`], ['compare', `📊 ${L('Порівняння', 'Сравнение')}`]] as [Tab, string][]).map(([id, label]) => (
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
            <summary className="cursor-pointer text-[13px] font-semibold text-[#e8edf7]">{L('Як рахується ефективність', 'Как считается эффективность')}</summary>
            <div className="mt-3 flex flex-col gap-2">
              <div>
                <b className="text-[#c7d2e8]">{L('Підсумок = 55% компетентність + 15% соціоніка + 30% згуртованість.', 'Итог = 55% компетентность + 15% соционика + 30% сплочённость.')}</b>
                {' '}
                {L(
                  'Компетентність: по кожній посаді — фактичні компетенції проти вимог (перевиконання однієї осі не закриває провал іншої). Соціоніка: дихотомії типу проти уподобань посади + бонус еталонним типам. Згуртованість: середнє по всіх парах з повної таблиці 14 інтертипних відносин (від +3 дуальність до −2.5 конфлікт), мінус штраф за змішування ворожих квадр (Альфа+Гамма, Бета+Дельта).',
                  'Компетентность: по каждой должности — фактические компетенции против требований (перевыполнение одной оси не закрывает провал другой). Соционика: дихотомии типа против предпочтений должности + бонус эталонным типам. Сплочённость: среднее по всем парам из полной таблицы 14 интертипных отношений (от +3 дуальность до −2.5 конфликт), минус штраф за смешение враждующих квадр (Альфа+Гамма, Бета+Дельта).',
                )}
              </div>
              <div>
                <b className="text-[#c7d2e8]">{L('Вага посад × епоха.', 'Вес должностей × эпоха.')}</b>
                {' '}
                {L(
                  'Премʼєр 2.0, фінанси й оборона 1.4, перший віце-премʼєр 1.1, економіка/МЗС/МВС 1.1, енергетика 1.0, юстиція і цифра 0.7, охорона здоровʼя й освіта 0.6. У контексті «війна» оборона ×1.6, МВС ×1.5, енергетика ×1.4; у «кризі» фінанси ×1.5, економіка ×1.4; у «реформах» юстиція й економіка ×1.3.',
                  'Премьер 2.0, финансы и оборона 1.4, первый вице-премьер 1.1, экономика/МИД/МВД 1.1, энергетика 1.0, юстиция и цифра 0.7, здравоохранение и образование 0.6. В контексте «война» оборона ×1.6, МВД ×1.5, энергетика ×1.4; в «кризис» финансы ×1.5, экономика ×1.4; в «реформы» юстиция и экономика ×1.3.',
                )}
              </div>
              <div>
                <b className="text-[#c7d2e8]">{L('Хто допустимий на посаду.', 'Кто допустим на должность.')}</b>
                {' '}
                {L(
                  'У кожної посади — список сфер: армія і силовий блок — на оборону й МВС, юристи — на юстицію, медики — на охорону здоровʼя, енергетики — на ПЕК. Міністр — політична посада, тому видатні менеджери з бізнесу допущені майже всюди — як Резников і Умёров у житті. Група «Нові обличчя» — зростаючі політики, а своїх кандидатів гравець додає в конструкторі (зберігаються в браузері).',
                  'У каждой должности — список сфер: армия и силовой блок — на оборону и МВД, юристы — на юстицию, медики — на здравоохранение, энергетики — на ТЭК. Министр — политическая должность, поэтому выдающиеся менеджеры из бизнеса допущены почти везде — как Резников и Умёров в жизни. Группа «Новые лица» — растущие политики, а своих кандидатов игрок добавляет в конструкторе (сохраняются в браузере).',
                )}
              </div>
              <div>
                <b className="text-[#c7d2e8]">{L('Історична перевірка.', 'Историческая проверка.')}</b>
                {' '}
                {L(
                  'Кожен уряд оцінюється в контексті своєї епохи; тривалість роботи уряду показана окремо як факт, а не в оцінці. Дані: Вікіпедія («Уряди України»), kmu.gov.ua.',
                  'Каждый кабинет оценивается в контексте своей эпохи; длительность работы правительства показана отдельно как факт, а не в оценке. Данные: Википедия («Уряди України»), kmu.gov.ua.',
                )}
              </div>
              <div>
                {L('Серія:', 'Серия:')}{' '}
                <a className="text-[#f5b942] underline" href="https://bravo-amber.vercel.app" target="_blank" rel="noreferrer">{L('«Пульс мережі» (Браво)', '«Пульс сети» (Браво)')}</a> ·
                {L(' вітрина:', ' витрина:')}{' '}
                <a className="text-[#f5b942] underline" href="https://github.com/alex195703/igroteka" target="_blank" rel="noreferrer">{L('Ігротека', 'Игротека')}</a> ·
                {L(' код:', ' код:')}{' '}
                <a className="text-[#f5b942] underline" href="https://github.com/alex195703/vsrtualne-ministersnvo" target="_blank" rel="noreferrer">GitHub</a>
              </div>
            </div>
          </details>
        </footer>
      </div>
    </main>
  )
}
