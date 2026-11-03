// ============================================================
// ТЕСТ ДАННЫХ И ДВИЖКА «ВИРТУАЛЬНОГО МИНИСТЕРСТВА»
//   1) каждый член кабинета имеет профиль и валидный тип,
//   2) должности в кабинетах известны,
//   3) отношения симметричны по категории вклада,
//   4) печать рейтинга всех кабинетов.
// Запуск: npx tsx scripts/test-ministry.ts
// ============================================================

import { POSITIONS, POLITICIANS, CABINETS, type CompKey } from '../src/lib/ministry-data'
import { evaluateCabinet, typeByRu, compFit, socioFit } from '../src/lib/ministry-engine'
import { relationBetween, PAIR_SCORE } from '../src/lib/relations'
import { TYPES } from '../src/lib/socionics-data'

let errors = 0
const fail = (msg: string) => { errors++; console.error('  ✗ ' + msg) }
const ok = (msg: string) => console.log('  ✓ ' + msg)

console.log('— Профили —')
for (const pol of Object.values(POLITICIANS)) {
  try { typeByRu(pol.type) } catch { fail(`тип ${pol.type} у ${pol.name}`) }
  for (const k of ['adm', 'econ', 'dip', 'cri'] as CompKey[]) {
    const v = pol.comp[k]
    if (typeof v !== 'number' || v < 0 || v > 10) fail(`${pol.name}: ${k}=${v}`)
  }
}
ok(`политиков: ${Object.keys(POLITICIANS).length}`)

console.log('— Кабинеты —')
for (const cab of CABINETS) {
  for (const pos of POSITIONS) {
    if (cab.na?.includes(pos.id)) continue
    const pid = cab.members[pos.id]
    if (!pid) { fail(`${cab.name}: ${pos.title} вакантно`); continue }
    if (!POLITICIANS[pid]) fail(`${cab.name}: нет профиля «${pid}» (${pos.title})`)
  }
}
ok(`кабинетов: ${CABINETS.length}`)

console.log('— Отношения —')
let checked = 0
for (const a of TYPES) {
  for (const b of TYPES) {
    const ab = relationBetween(a, b)
    const ba = relationBetween(b, a)
    if (PAIR_SCORE[ab.kind] !== PAIR_SCORE[ba.kind]) fail(`несимметричны ${a.ru}/${b.ru}`)
    checked++
  }
}
ok(`проверено пар: ${checked}`)

console.log('— Рейтинг кабинетов —')
const ranked = CABINETS
  .map(c => ({ c, ev: evaluateCabinet(c.members, c.context, c.na ?? []) }))
  .sort((a, b) => b.ev.total - a.ev.total)
for (const [i, { c, ev }] of ranked.entries()) {
  console.log(
    `${String(i + 1).padStart(2)}. ${ev.total.toFixed(1).padStart(5)}  ` +
    `[К${ev.comp.toFixed(0).padStart(3)} С${ev.socio.toFixed(0).padStart(3)} П${ev.cohesion.toFixed(0).padStart(3)}]  ` +
    `${c.name} (${c.period}, ${c.context})`,
  )
}

console.log('— Сэмпл посадок —')
const pm = POSITIONS.find(p => p.id === 'pm')!
const fin = POSITIONS.find(p => p.id === 'finance')!
const def = POSITIONS.find(p => p.id === 'defense')!
console.log(`  ПМ: ${POLITICIANS.tymoshenko.name} → комп ${Math.round(compFit(POLITICIANS.tymoshenko, pm) * 100)}%, соц ${socioFit(POLITICIANS.tymoshenko.type, pm)}/10`)
console.log(`  Фин: ${POLITICIANS.marchenko.name} → комп ${Math.round(compFit(POLITICIANS.marchenko, fin) * 100)}%, соц ${socioFit(POLITICIANS.marchenko.type, fin)}/10`)
console.log(`  Оборона: ${POLITICIANS.zaluzhny.name} → комп ${Math.round(compFit(POLITICIANS.zaluzhny, def) * 100)}%, соц ${socioFit(POLITICIANS.zaluzhny.type, def)}/10`)

if (errors > 0) { console.error(`\nПРОВАЛЕНО: ${errors} ошибок`); process.exit(1) }
console.log('\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ')
