// ============================================================
// ВИРТУАЛЬНОЕ МИНИСТЕРСТВО — ДАННЫЕ
// Реальные правительства Украины 2005–2026 (составы — публичные
// данные: Википедия, kmu.gov.ua).
//
// ВАЖНО: профессиональные компетенции (0–10) и соционические
// типы политиков — ЭКСПЕРТНЫЕ ИГРОВЫЕ ОЦЕНКИ для симулятора,
// а не научные факты. Реальная соционика публичных лиц всегда
// спекулятивна: школы типируют одних и тех же людей по-разному.
// Составы кабинетов и хроника — факты; оценки — игра.
// ============================================================

import type { QuadraId } from './socionics-data'

// ---------- Компетенции (0–10) ----------

export type CompKey = 'adm' | 'econ' | 'dip' | 'cri'

export const COMP_INFO: Record<CompKey, { name: string; hint: string }> = {
  adm: { name: 'Управление', hint: 'организация аппарата, исполнение решений, кадры' },
  econ: { name: 'Экономика', hint: 'финансы, бюджет, экономическая экспертиза' },
  dip: { name: 'Дипломатия', hint: 'переговоры, внешние связи, публичные коммуникации' },
  cri: { name: 'Криз-менеджмент', hint: 'стойкость под давлением, действия в войне и кризисе' },
}

// ---------- Позиции в кабинете ----------

export type DichoKey = 'ei' | 'ns' | 'tf' | 'rat'
export type DichoVal = 'extravert' | 'introvert' | 'intuition' | 'sensing' | 'logic' | 'ethics' | 'rational' | 'irrational'

// ---------- Сферы деятельности (допустимость на должности) ----------

export type FieldId = 'gov' | 'mil' | 'fin' | 'biz' | 'law' | 'en' | 'it' | 'med' | 'edu' | 'soc'

export const FIELD_INFO: Record<FieldId, { name: string; icon: string }> = {
  gov: { name: 'Госуправление и политика', icon: '🏛' },
  mil: { name: 'Армия и силовой блок', icon: '🎖' },
  fin: { name: 'Финансы и экономика', icon: '🏦' },
  biz: { name: 'Бизнес и менеджмент', icon: '💼' },
  law: { name: 'Право', icon: '⚖️' },
  en: { name: 'Энергетика и ТЭК', icon: '⚡' },
  it: { name: 'IT и цифровизация', icon: '💻' },
  med: { name: 'Медицина', icon: '🏥' },
  edu: { name: 'Образование и наука', icon: '🎓' },
  soc: { name: 'СМИ, культура, социум', icon: '📣' },
}

const ALL_FIELDS: FieldId[] = ['gov', 'mil', 'fin', 'biz', 'law', 'en', 'it', 'med', 'edu', 'soc']

export interface Position {
  id: string
  icon: string
  title: string
  /** вес позиции в общей оценке кабинета */
  weight: number
  /** требуемый уровень компетенций 0–10 */
  req: Record<CompKey, number>
  /** соционические предпочтения должности */
  prefs: Partial<Record<DichoKey, { val: DichoVal; w: number }>>
  /** эталонные типы (русские аббревиатуры) */
  ideal: string[]
  /** требования к должности — человеческим языком */
  demand: string
  /** сферы, специалисты которых допустимы на должность;
   *  министр — политическая должность, поэтому бизнес-управленцы
   *  допущены почти везде (как Резников и Умёров в жизни),
   *  а вот врач не назначается обороной, и наоборот */
  allow: FieldId[]
  /** профильная сфера должности: её специалисты — первый выбор
   *  в автосборе и подсказках; остальные допущенные — запас.
   *  Без этого Ульяна Супрун обгоняет Михаила Фёдорова на цифре,
   *  а Анатолий Кинах — энергетиков */
  core: FieldId
}

export const POSITIONS: Position[] = [
  {
    id: 'pm', icon: '🏛', title: 'Премьер-министр', weight: 2.0,
    allow: ALL_FIELDS,
    core: 'gov',
    req: { adm: 9, econ: 7, dip: 7, cri: 8 },
    prefs: { tf: { val: 'logic', w: 1 }, rat: { val: 'rational', w: 0.6 }, ei: { val: 'extravert', w: 0.3 } },
    ideal: ['ЛСЭ', 'СЛЭ', 'ЛИЭ'],
    demand: 'управляет всей машиной правительства, держит коалицию, отвечает за всё',
  },
  {
    id: 'vicepm', icon: '🗂', title: 'Первый вице-премьер', weight: 1.1,
    allow: ALL_FIELDS,
    core: 'gov',
    req: { adm: 8, econ: 6, dip: 5, cri: 6 },
    prefs: { ei: { val: 'extravert', w: 0.4 }, tf: { val: 'logic', w: 0.5 } },
    ideal: ['ЛСЭ', 'СЭЭ'],
    demand: 'координирует блоки министерств, замещает премьера',
  },
  {
    id: 'finance', icon: '💰', title: 'Министр финансов', weight: 1.4,
    allow: ['fin', 'biz', 'law'],
    core: 'fin',
    req: { adm: 7, econ: 9, dip: 3, cri: 5 },
    prefs: { tf: { val: 'logic', w: 1 }, rat: { val: 'rational', w: 0.7 } },
    ideal: ['ЛСИ', 'ЛИЭ'],
    demand: 'бюджет, МВФ, налоги — тут нужны структура и точность',
  },
  {
    id: 'economy', icon: '📈', title: 'Министр экономики', weight: 1.1,
    allow: ['fin', 'biz'],
    core: 'fin',
    req: { adm: 6, econ: 8, dip: 5, cri: 4 },
    prefs: { tf: { val: 'logic', w: 1 }, ns: { val: 'intuition', w: 0.6 } },
    ideal: ['ЛИЭ', 'ЛИИ'],
    demand: 'рост, торговля, инвестиции — выгода и варианты',
  },
  {
    id: 'defense', icon: '🛡', title: 'Министр обороны', weight: 1.4,
    allow: ['mil', 'law', 'biz'],
    core: 'mil',
    req: { adm: 7, econ: 2, dip: 4, cri: 9 },
    prefs: { ns: { val: 'sensing', w: 1 }, tf: { val: 'logic', w: 0.8 }, rat: { val: 'rational', w: 0.3 } },
    ideal: ['СЛЭ', 'ЛСЭ'],
    demand: 'сила, воля, тыловая дисциплина; в войне — позиция №1',
  },
  {
    id: 'mfa', icon: '🌐', title: 'Министр иностранных дел', weight: 1.1,
    allow: ['gov', 'law', 'soc', 'biz'],
    core: 'gov',
    req: { adm: 5, econ: 4, dip: 9, cri: 4 },
    prefs: { tf: { val: 'ethics', w: 1 }, ns: { val: 'intuition', w: 0.7 }, ei: { val: 'extravert', w: 0.4 } },
    ideal: ['ЭИЭ', 'ИЭЭ', 'ЭИИ'],
    demand: 'дипломатия, партнёрство, репутация страны',
  },
  {
    id: 'mvd', icon: '👮', title: 'Министр внутренних дел', weight: 1.1,
    allow: ['mil', 'law', 'biz'],
    core: 'mil',
    req: { adm: 6, econ: 1, dip: 3, cri: 8 },
    prefs: { ns: { val: 'sensing', w: 1 }, tf: { val: 'logic', w: 0.6 }, ei: { val: 'extravert', w: 0.3 } },
    ideal: ['СЛЭ', 'ЛСЭ'],
    demand: 'полиция, внутренняя стабильность, жёсткость в кризисе',
  },
  {
    id: 'justice', icon: '⚖️', title: 'Министр юстиции', weight: 0.7,
    allow: ['law'],
    core: 'law',
    req: { adm: 7, econ: 3, dip: 3, cri: 3 },
    prefs: { tf: { val: 'logic', w: 0.8 }, rat: { val: 'rational', w: 0.8 } },
    ideal: ['ЛСИ', 'ЭСИ'],
    demand: 'право, регистры, реформы судебной системы',
  },
  {
    id: 'energy', icon: '⚡', title: 'Министр энергетики', weight: 1.0,
    allow: ['en', 'fin', 'biz'],
    core: 'en',
    req: { adm: 7, econ: 5, dip: 3, cri: 6 },
    prefs: { tf: { val: 'logic', w: 0.8 }, ns: { val: 'sensing', w: 0.6 } },
    ideal: ['ЛСЭ', 'СЛИ'],
    demand: 'генерация, сети, зимняя стойкость, газ и уголь',
  },
  {
    id: 'health', icon: '🏥', title: 'Министр здравоохранения', weight: 0.6,
    allow: ['med'],
    core: 'med',
    req: { adm: 6, econ: 3, dip: 3, cri: 5 },
    prefs: { tf: { val: 'ethics', w: 0.7 }, rat: { val: 'rational', w: 0.5 } },
    ideal: ['ЭСЭ', 'ЭИЭ'],
    demand: 'медицина массового уровня, эпидемии, гуманитарный блок',
  },
  {
    id: 'education', icon: '🎓', title: 'Министр образования', weight: 0.6,
    allow: ['edu', 'soc'],
    core: 'edu',
    req: { adm: 6, econ: 2, dip: 4, cri: 3 },
    prefs: { ns: { val: 'intuition', w: 1 }, rat: { val: 'rational', w: 0.4 } },
    ideal: ['ИЛЭ', 'ЛИИ', 'ИЭЭ'],
    demand: 'школа и наука, горизонты и реформы',
  },
  {
    id: 'digital', icon: '💻', title: 'Министр цифровой трансформации', weight: 0.7,
    allow: ['it', 'biz', 'fin'],
    core: 'it',
    req: { adm: 7, econ: 3, dip: 4, cri: 3 },
    prefs: { ns: { val: 'intuition', w: 1 }, ei: { val: 'extravert', w: 0.5 }, tf: { val: 'logic', w: 0.4 } },
    ideal: ['ИЛЭ', 'ЛИЭ'],
    demand: 'государство в смартфоне, IT-индустрия, цифра войны',
  },
]

export const POSITION_BY_ID: Record<string, Position> = Object.fromEntries(POSITIONS.map(p => [p.id, p]))

// ---------- Политики ----------

export interface Politician {
  id: string
  name: string
  /** русская аббревиатура типа из socionics-data */
  type: string
  comp: Record<CompKey, number>
  /** одна строка-досье */
  bio: string
  /** сферы компетентности; не указано — «gov» (политик/госслужащий) */
  fields?: FieldId[]
  /** группа в списках конструктора: менеджеры/эксперты или новые лица */
  group?: 'manager' | 'rising'
}

export const POLITICIANS: Record<string, Politician> = {
  // --- «оранжевая» команда 2005 ---
  tymoshenko: { id: 'tymoshenko', name: 'Юлия Тимошенко', type: 'СЭЭ',
    comp: { adm: 8, econ: 7, dip: 7, cri: 8 },
    bio: 'Премьер 2005 и 2007–2010; газовые переговоры с РФ 2009, «кактус» приватизаций, одна из самых энергичных фигур эпохи.' },
  turchynov: { id: 'turchynov', name: 'Александр Турчинов', type: 'ЛИИ',
    comp: { adm: 7, econ: 5, dip: 4, cri: 7 },
    bio: 'Первый вице-премьер 2007–2010, и.о. президента 2014; «профессор» в политике.' },
  pynzenyk: { id: 'pynzenyk', name: 'Виктор Пинзеник', type: 'ЛИЭ',
    comp: { adm: 6, econ: 9, dip: 4, cri: 6 },
    bio: 'Дважды министр финансов; либеральный реформатор программ МВФ.' },
  teryokhin: { id: 'teryokhin', name: 'Сергей Терёхин', type: 'ЛИЭ',
    comp: { adm: 5, econ: 7, dip: 4, cri: 4 },
    bio: 'Министр экономики 2005; дерегуляция и внешняя торговля.' },
  grytsenko: { id: 'grytsenko', name: 'Анатолий Гриценко', type: 'ЛСЭ',
    comp: { adm: 8, econ: 3, dip: 5, cri: 7 },
    bio: 'Министр обороны 2005–2007 при двух премьерах; военная реформа, потом жёсткий критик всех правительств.' },
  tarasyuk: { id: 'tarasyuk', name: 'Борис Тарасюк', type: 'ЭИИ',
    comp: { adm: 5, econ: 3, dip: 9, cri: 5 },
    bio: 'Дважды глава МИД; курс на НАТО и жёсткие переговоры с РФ.' },
  lutsenko: { id: 'lutsenko', name: 'Юрий Луценко', type: 'СЛЭ',
    comp: { adm: 6, econ: 2, dip: 6, cri: 7 },
    bio: 'МВД 2005–2010; яркий реформатор милиции и не менее яркий скандалист.' },
  zvarych: { id: 'zvarych', name: 'Роман Зварыч', type: 'ЭСИ',
    comp: { adm: 5, econ: 2, dip: 4, cri: 4 },
    bio: 'Министр юстиции 2005 и 2006; юридическая рамка новой власти.' },
  plachkov: { id: 'plachkov', name: 'Иван Плачков', type: 'СЛИ',
    comp: { adm: 6, econ: 5, dip: 4, cri: 5 },
    bio: 'Топливно-энергетический блок 2005–2006; выдержал первый газовый конфликт.' },
  polishchuk: { id: 'polishchuk', name: 'Николай Полищук', type: 'ЭИИ',
    comp: { adm: 5, econ: 2, dip: 3, cri: 4 },
    bio: 'Академик-медик, министр здравоохранения 2005.' },
  nikolaenko: { id: 'nikolaenko', name: 'Станислав Николаенко', type: 'ЛИИ',
    comp: { adm: 6, econ: 2, dip: 4, cri: 3 },
    bio: 'Министр образования 2005–2007; независимая экспертиза учебников.' },
  kinakh: { id: 'kinakh', name: 'Анатолий Кинах', type: 'ЛСЭ',
    comp: { adm: 8, econ: 6, dip: 6, cri: 6 },
    bio: 'Премьер 2001–2002, первый вице-премьер 2005, экономика 2007; промышленный лоббист-переговорщик.' },

  // --- Ехануров и второй Янукович ---
  yekhanurov: { id: 'yekhanurov', name: 'Юрий Ехануров', type: 'ЛСЭ',
    comp: { adm: 8, econ: 5, dip: 5, cri: 6 },
    bio: 'Премьер 2005–2006; технократ-управленец, позже министр обороны 2007–2009.' },
  stashevsky: { id: 'stashevsky', name: 'Станислав Сташевский', type: 'ЛСЭ',
    comp: { adm: 6, econ: 6, dip: 4, cri: 4 },
    bio: 'Первый вице-премьер 2005–2006, банкир по происхождению.' },
  shlapak: { id: 'shlapak', name: 'Александр Шлапак', type: 'ЛСИ',
    comp: { adm: 6, econ: 8, dip: 3, cri: 5 },
    bio: 'Министр финансов 2005–2006 и 2014; бюджетный технократ.' },
  yatsenyuk: { id: 'yatsenyuk', name: 'Арсений Яценюк', type: 'ЛИЭ',
    comp: { adm: 7, econ: 7, dip: 7, cri: 7 },
    bio: 'Экономика 2005–06, МИД 2007, премьер 2014–2016; «заяц»-переговорщик в любой коалиции.' },
  makukha: { id: 'makukha', name: 'Владимир Макуха', type: 'ЛИЭ',
    comp: { adm: 5, econ: 7, dip: 4, cri: 4 },
    bio: 'Министр экономики 2006; госструктуры и прогнозы.' },
  tsushko: { id: 'tsushko', name: 'Василий Цушко', type: 'СЭЭ',
    comp: { adm: 6, econ: 4, dip: 4, cri: 5 },
    bio: 'МВД 2006, экономика 2010; одесский тяжеловес соцпартии.' },
  lavrinovich: { id: 'lavrinovich', name: 'Александр Лавринович', type: 'ЛСИ',
    comp: { adm: 6, econ: 3, dip: 4, cri: 4 },
    bio: 'Министр юстиции 2006–07 и 2010–12; юртушковец-системщик.' },
  boyko: { id: 'boyko', name: 'Юрий Бойко', type: 'ЛСЭ',
    comp: { adm: 6, econ: 5, dip: 5, cri: 4 },
    bio: 'Топливно-энергетический блок в кабинетах 2006–07 и 2010–12; газовые схемы регионалов.' },
  polyachenko: { id: 'polyachenko', name: 'Юрий Поляченко', type: 'ЭСЭ',
    comp: { adm: 5, econ: 2, dip: 4, cri: 4 },
    bio: 'Генерал и врач, министр здравоохранения 2006–2007.' },

  // --- Вторая Тимошенко ---
  danylyshyn: { id: 'danylyshyn', name: 'Богдан Данилишин', type: 'ЛИЭ',
    comp: { adm: 6, econ: 8, dip: 4, cri: 5 },
    bio: 'Министр экономики 2007–2010; кризисный прогнозист 2008 года.' },
  ohryzko: { id: 'ohryzko', name: 'Владимир Огрызко', type: 'ЛИЭ',
    comp: { adm: 5, econ: 3, dip: 8, cri: 5 },
    bio: 'Глава МИД 2007–2009; жёсткая линия по НАТО и России.' },
  poroshenko: { id: 'poroshenko', name: 'Пётр Порошенко', type: 'СЭЭ',
    comp: { adm: 8, econ: 7, dip: 9, cri: 6 },
    bio: 'МЗС 2009–10, экономика 2012, президент 2014–19; «шоколадный король» дипломатии.' },
  onishchuk: { id: 'onishchuk', name: 'Николай Онищук', type: 'ЛСИ',
    comp: { adm: 5, econ: 2, dip: 3, cri: 4 },
    bio: 'Министр юстиции 2007–2010.' },
  prodan: { id: 'prodan', name: 'Юрий Продан', type: 'СЛИ',
    comp: { adm: 6, econ: 5, dip: 4, cri: 5 },
    bio: 'Энергетика 2007–10 и 2014; профессионал газового баланса.' },
  knyazevich: { id: 'knyazevich', name: 'Василий Князевич', type: 'ЭСЭ',
    comp: { adm: 5, econ: 2, dip: 3, cri: 4 },
    bio: 'Министр здравоохранения 2007–2010.' },
  vakarchuk: { id: 'vakarchuk', name: 'Иван Вакарчук', type: 'ЛИИ',
    comp: { adm: 6, econ: 2, dip: 5, cri: 3 },
    bio: 'Физик, ректор, министр образования 2007–2010; авторитет академической среды.' },
  denisova: { id: 'denisova', name: 'Людмила Денисова', type: 'ЭСЭ',
    comp: { adm: 5, econ: 3, dip: 4, cri: 4 },
    bio: 'Соцполитика 2007–10, омбудсмен 2018+; соцвыплаты под давлением кризиса.' },

  // --- Кабинеты Азарова ---
  azarov: { id: 'azarov', name: 'Николай Азаров', type: 'ЛСИ',
    comp: { adm: 8, econ: 7, dip: 3, cri: 4 },
    bio: 'Премьер 2010–2014; налоговый технократ «стабильности», отца налогового кодекса и конца «детей кристальных».' },
  klyuev: { id: 'klyuev', name: 'Андрей Клюев', type: 'ЛСЭ',
    comp: { adm: 8, econ: 6, dip: 4, cri: 5 },
    bio: 'Первый вице-премьер 2010–2012; донецкий координатор экономики.' },
  yaroshenko: { id: 'yaroshenko', name: 'Фёдор Ярошенко', type: 'ЛИЭ',
    comp: { adm: 6, econ: 8, dip: 4, cri: 5 },
    bio: 'Министр финансов 2010–2012; налоговая реформа и сокращение НДС.' },
  kolobov: { id: 'kolobov', name: 'Юрий Колобов', type: 'ЛСИ',
    comp: { adm: 5, econ: 7, dip: 3, cri: 4 },
    bio: 'Министр финансов 2012–2014; заёмное финансирование дефицита.' },
  yezhel: { id: 'yezhel', name: 'Михаил Ежель', type: 'ЛСЭ',
    comp: { adm: 6, econ: 3, dip: 4, cri: 6 },
    bio: 'Адмирал, министр обороны 2010–2012; реформа ВС на бумаге.' },
  salamatin: { id: 'salamatin', name: 'Дмитрий Саламатин', type: 'ЛСЭ',
    comp: { adm: 5, econ: 3, dip: 4, cri: 5 },
    bio: 'Министр обороны 2012; «полторашка» оборонзаказа и громкие обещания.' },
  gryshchenko: { id: 'gryshchenko', name: 'Константин Грищенко', type: 'ЛИЭ',
    comp: { adm: 6, econ: 4, dip: 9, cri: 5 },
    bio: 'Двукратный глава МИД; харьковские соглашения 2010.' },
  mohylyov: { id: 'mohylyov', name: 'Анатолий Могилёв', type: 'СЛЭ',
    comp: { adm: 6, econ: 2, dip: 3, cri: 6 },
    bio: 'МВД 2010–2011; милиция эпохи «стабильности».' },
  zakharchenko: { id: 'zakharchenko', name: 'Виталий Захарченко', type: 'СЛЭ',
    comp: { adm: 6, econ: 2, dip: 2, cri: 5 },
    bio: 'МВД 2011–2014; символ силового евромайданского противостояния.' },
  tabachnyk: { id: 'tabachnyk', name: 'Дмитрий Табачник', type: 'СЭЭ',
    comp: { adm: 6, econ: 3, dip: 6, cri: 4 },
    bio: 'Министр образования 2010–2014; историк-политтехнолог, вечный фигурант протестов.' },
  bogatyryova: { id: 'bogatyryova', name: 'Раиса Богатырёва', type: 'ЭСЭ',
    comp: { adm: 5, econ: 3, dip: 5, cri: 4 },
    bio: 'Врач-официальлица; вице-премьер и министр здравоохранения 2012–2014.' },
  lebedev: { id: 'lebedev', name: 'Павел Лебедев', type: 'СЛИ',
    comp: { adm: 5, econ: 3, dip: 3, cri: 5 },
    bio: 'Банкир, министр обороны 2012–2014; «обещал никому не воевать».' },
  kozhara: { id: 'kozhara', name: 'Леонид Кожара', type: 'ЭИИ',
    comp: { adm: 5, econ: 3, dip: 8, cri: 4 },
    bio: 'Глава МИД 2012–2014; многовекторность на финише Януковича.' },
  arbuzov: { id: 'arbuzov', name: 'Сергей Арбузов', type: 'ЛИЭ',
    comp: { adm: 6, econ: 7, dip: 4, cri: 4 },
    bio: 'Первый вице-премьер 2012–2014, экс-глава Нацбанка.' },
  prasolov: { id: 'prasolov', name: 'Игорь Прасолов', type: 'ЛСЭ',
    comp: { adm: 6, econ: 7, dip: 3, cri: 4 },
    bio: 'Министр экономразвития 2012–2014.' },
  stavitsky: { id: 'stavitsky', name: 'Эдуард Ставицкий', type: 'СЭЭ',
    comp: { adm: 4, econ: 4, dip: 3, cri: 4 },
    bio: 'Энергетика и уголь 2012–2014; «схемный» сектор регионалов.' },
  lukash: { id: 'lukash', name: 'Елена Лукаш', type: 'ЭСИ',
    comp: { adm: 5, econ: 3, dip: 5, cri: 4 },
    bio: 'Министр юстиции 2013–2014; юрист-нормативист старой школы.' },
  korolevska: { id: 'korolevska', name: 'Наталья Королевская', type: 'ЭСЭ',
    comp: { adm: 5, econ: 4, dip: 4, cri: 4 },
    bio: 'Министр соцполитики 2012–2014; программы занятости.' },

  // --- Яценюк I и II (война и реформы) ---
  yarema: { id: 'yarema', name: 'Виталий Ярема', type: 'СЛЭ',
    comp: { adm: 6, econ: 2, dip: 3, cri: 6 },
    bio: 'Первый вице-премьер и генпрокурор 2014; силовой блок Майдана.' },
  sheremeta: { id: 'sheremeta', name: 'Павло Шеремета', type: 'ЛИЭ',
    comp: { adm: 6, econ: 6, dip: 5, cri: 4 },
    bio: 'Министр экономики 2014; консультант McKinsey, ушёл из-за «неформальных схем».' },
  musiy: { id: 'musiy', name: 'Олег Мусий', type: 'ЛСЭ',
    comp: { adm: 6, econ: 2, dip: 3, cri: 5 },
    bio: 'Военный врач, министр здравоохранения 2014.' },
  deshchytsia: { id: 'deshchytsia', name: 'Андрей Дещица', type: 'СЭЭ',
    comp: { adm: 5, econ: 3, dip: 7, cri: 5 },
    bio: 'И.о. министра иностранных дел весной 2014; «Путин — хуйло» с трибуны Рады.' },
  klimkin: { id: 'klimkin', name: 'Павел Климкин', type: 'ИЛЭ',
    comp: { adm: 6, econ: 3, dip: 9, cri: 6 },
    bio: 'Глава МИД 2014–2019; Ассоциация с ЕС, безвиз, физик-дипломат.' },
  avakov: { id: 'avakov', name: 'Арсен Аваков', type: 'СЛЭ',
    comp: { adm: 8, econ: 4, dip: 6, cri: 8 },
    bio: 'МВД 2014–2021; Нацполиция, батальоны, «полицейский» секс-скандалы — бессменный силовик шести лет.' },
  petrenko: { id: 'petrenko', name: 'Павел Петренко', type: 'ЛСИ',
    comp: { adm: 6, econ: 3, dip: 4, cri: 5 },
    bio: 'Министр юстиции 2014–2019; регистрация бизнеса, электронные суды.' },
  poltorak: { id: 'poltorak', name: 'Степан Полторак', type: 'ЛСЭ',
    comp: { adm: 7, econ: 3, dip: 4, cri: 8 },
    bio: 'Министр обороны 2014–2019; rebuilding армии после 2014, «недообеспеченные» волонтёры.' },
  kvit: { id: 'kvit', name: 'Сергей Квит', type: 'ЭИИ',
    comp: { adm: 5, econ: 2, dip: 4, cri: 4 },
    bio: 'Дважды министр образования; ректор КНУ, болонский процесс.' },
  zubko: { id: 'zubko', name: 'Геннадий Зубко', type: 'ЛСЭ',
    comp: { adm: 6, econ: 5, dip: 4, cri: 5 },
    bio: 'Вице-премьер по регионам и ЖКХ 2014–2019.' },
  yaresko: { id: 'yaresko', name: 'Наталия Яресько', type: 'ЛСЭ',
    comp: { adm: 6, econ: 8, dip: 6, cri: 6 },
    bio: 'Министр финансов 2014–2016 (гражданка США); реструктуризация долга 2015.' },
  abromavicius: { id: 'abromavicius', name: 'Айварас Абромавичюс', type: 'ЛИЭ',
    comp: { adm: 7, econ: 8, dip: 5, cri: 5 },
    bio: 'Министр экономики 2014–2016; дерегуляция, уход с отставкой «против коррупции».' },
  demchyshyn: { id: 'demchyshyn', name: 'Владимир Демчишин', type: 'ЛСЭ',
    comp: { adm: 6, econ: 5, dip: 4, cri: 4 },
    bio: 'Энергетика 2014–2016; «национализация» частных облэнерго — в планах.' },
  kvitashvili: { id: 'kvitashvili', name: 'Александр Квиташвили', type: 'ЛИЭ',
    comp: { adm: 6, econ: 4, dip: 4, cri: 5 },
    bio: 'Грузинский реформатор, министр здравоохранения 2014–2016; госзакупки лекарств через международников.' },

  // --- Гройсман ---
  groysman: { id: 'groysman', name: 'Владимир Гройсман', type: 'ЛСЭ',
    comp: { adm: 8, econ: 6, dip: 6, cri: 6 },
    bio: 'Премьер 2016–2019; рост экономики, повышение минималки в 2 раза, безвиз 2017.' },
  danylyuk: { id: 'danylyuk', name: 'Александр Данилюк', type: 'ЛИЭ',
    comp: { adm: 6, econ: 8, dip: 5, cri: 5 },
    bio: 'Министр финансов 2016–2018; налоговый майдан 2015 — соавтор, ProZorro-финансы.' },
  stepaniv: { id: 'stepaniv', name: 'Татьяна Стефанив', type: 'ЛИЭ',
    comp: { adm: 6, econ: 8, dip: 5, cri: 4 },
    bio: 'Министр экономики 2017–2019; экспортная стратегия, индикативные планы.' },
  nasalyk: { id: 'nasalyk', name: 'Игорь Насалик', type: 'СЛИ',
    comp: { adm: 5, econ: 4, dip: 4, cri: 4 },
    bio: 'Энергетика 2016–2019; «пешка на газовой доске».' },
  suprun: { id: 'suprun', name: 'Ульяна Супрун', type: 'ИЛЭ',
    comp: { adm: 7, econ: 3, dip: 6, cri: 5 },
    bio: 'И.о. министра здравоохранения 2016–2019; медреформа, цифровизация врача, безграничный пиар.' },
  grynevych: { id: 'grynevych', name: 'Лилия Гриневич', type: 'ЭИИ',
    comp: { adm: 6, econ: 2, dip: 4, cri: 4 },
    bio: 'Министр образования 2016–2019; НУШ (новая украинская школа), децентрализация.' },
  klympush: { id: 'klympush', name: 'Иванна Климпуш-Цинцадзе', type: 'ИЭЭ',
    comp: { adm: 5, econ: 4, dip: 8, cri: 4 },
    bio: 'Вице-премьер по евроинтеграции 2016–2019; безвизовый пакет.' },

  // --- Гончарук ---
  honcharuk: { id: 'honcharuk', name: 'Алексей Гончарук', type: 'ЛИИ',
    comp: { adm: 6, econ: 6, dip: 5, cri: 4 },
    bio: 'Премьер 2019–2020 в 35 лет; юрист-консультант, «дропай головы» и утечка аудио.' },
  mylovanov: { id: 'mylovanov', name: 'Тимофей Милованов', type: 'ЛИИ',
    comp: { adm: 5, econ: 9, dip: 5, cri: 4 },
    bio: 'Профессор-экономист; министр экономики 2019–20, сделки с США и Китай.' },
  zahorodniuk: { id: 'zahorodniuk', name: 'Андрей Загороднюк', type: 'ЛИЭ',
    comp: { adm: 7, econ: 5, dip: 4, cri: 6 },
    bio: 'Министр обороны 2019–2020; инвест-банкир, споры о закупках Javelin.' },
  markarova: { id: 'markarova', name: 'Оксана Маркарова', type: 'ЛИЭ',
    comp: { adm: 7, econ: 9, dip: 5, cri: 6 },
    bio: 'Министр финансов 2018–2020; налоговая реформа, устойчивость бюджета.' },
  prystaiko: { id: 'prystaiko', name: 'Вадим Пристайко', type: 'ЛСЭ',
    comp: { adm: 6, econ: 3, dip: 8, cri: 5 },
    bio: 'Глава МИД 2019–2020, потом посол; спокойный переговорщик.' },
  maliuska: { id: 'maliuska', name: 'Денис Малюська', type: 'ИЛЭ',
    comp: { adm: 6, econ: 3, dip: 5, cri: 5 },
    bio: 'Министр юстиции 2020–2026; судебная реформа, рынок земли, штабы военного права.' },
  orzhel: { id: 'orzhel', name: 'Алексей Оржел', type: 'ЛСЭ',
    comp: { adm: 5, econ: 5, dip: 4, cri: 4 },
    bio: 'Энергетика 2019–2020; реформа рынка электроэнергии.' },
  skaletska: { id: 'skaletska', name: 'Зоряна Скалецкая', type: 'ЛСЭ',
    comp: { adm: 5, econ: 2, dip: 4, cri: 4 },
    bio: 'Профессор права; министр здравоохранения 2019–2020 (начало COVID).' },
  novosad: { id: 'novosad', name: 'Анна Новосад', type: 'ИЭЭ',
    comp: { adm: 6, econ: 2, dip: 5, cri: 4 },
    bio: 'Министр образования 2019–2020; реформа ЗНО в пандемию.' },
  kuleba_d: { id: 'kuleba_d', name: 'Дмитрий Кулеба', type: 'ЭИЭ',
    comp: { adm: 6, econ: 3, dip: 9, cri: 6 },
    bio: 'Вице-премьер по евроинтеграции 2019–20, глава МИД 2020–2024; «Рамштайн» дипломатии и-twitter-война.' },
  fedorov: { id: 'fedorov', name: 'Михаил Фёдоров', type: 'ИЛЭ',
    comp: { adm: 8, econ: 5, dip: 7, cri: 6 },
    bio: 'Министр цифры 2019–2026, первый вице-премьер, с 01.2026 — министр обороны; Дiя, дрон-война, отставка-скандал 2026.' },

  // --- Шмыгаль (COVID и война) ---
  shmyhal: { id: 'shmyhal', name: 'Денис Шмыгаль', type: 'ЛСЭ',
    comp: { adm: 8, econ: 6, dip: 5, cri: 7 },
    bio: 'Премьер 2020–2025 — рекорд длительности; затем министр обороны (01.2026) и первый вице-премьер — энергетика (07.2026).' },
  stefanyshina: { id: 'stefanyshina', name: 'Ольга Стефанишина', type: 'ИЭЭ',
    comp: { adm: 5, econ: 3, dip: 8, cri: 5 },
    bio: 'Вице-премьер по евроинтеграции 2020–2025; переговоры о вступлении в ЕС.' },
  marchenko: { id: 'marchenko', name: 'Сергей Марченко', type: 'ЛСИ',
    comp: { adm: 7, econ: 9, dip: 4, cri: 7 },
    bio: 'Министр финансов с 03.2020 — рекордист военного бюджета.' },
  reznikov: { id: 'reznikov', name: 'Алексей Резников', type: 'ИЛЭ',
    comp: { adm: 7, econ: 3, dip: 9, cri: 8 },
    bio: 'Министр обороны 2020–2023; «Рамштайн», переговоры о поставках, юмор под бронёй.' },
  umerov: { id: 'umerov', name: 'Рустем Умёров', type: 'СЭИ',
    comp: { adm: 7, econ: 5, dip: 7, cri: 6 },
    bio: 'Министр обороны 2023–2025; крымскотатарский активист, корпоративный менеджер.' },
  monastyrsky: { id: 'monastyrsky', name: 'Игорь Монастырский', type: 'СЛЭ',
    comp: { adm: 6, econ: 2, dip: 3, cri: 6 },
    bio: 'МВД 2021–2023; погиб в авиакатастрофе в Броварах в январе 2023.' },
  klymenko: { id: 'klymenko', name: 'Игорь Клименко', type: 'СЛЭ',
    comp: { adm: 6, econ: 2, dip: 4, cri: 6 },
    bio: 'МВД с 2023; внутренняя безопасность войны, отказался поста министра обороны в 2026.' },
  liashko: { id: 'liashko', name: 'Виктор Ляшко', type: 'ЭСЭ',
    comp: { adm: 6, econ: 3, dip: 4, cri: 6 },
    bio: 'Министр здравоохранения с 05.2021; эпидемиолог, медицина войны.' },
  halushchenko: { id: 'halushchenko', name: 'Герман Галущенко', type: 'ЛСЭ',
    comp: { adm: 6, econ: 5, dip: 5, cri: 6 },
    bio: 'Энергетика 2021–2025; физзащита подстанций, «теневые километры».' },
  shkarlet: { id: 'shkarlet', name: 'Сергей Шкарлет', type: 'ЛСИ',
    comp: { adm: 5, econ: 2, dip: 3, cri: 3 },
    bio: 'И.о., затем министр образования 2020–2023.' },
  lisovyi: { id: 'lisovyi', name: 'Оксен Лисовой', type: 'ИЛЭ',
    comp: { adm: 6, econ: 2, dip: 5, cri: 4 },
    bio: 'Министр образования с 03.2023; онлайн-школа войны, «Мислово».' },
  kachka: { id: 'kachka', name: 'Тарас Качка', type: 'ЛИЭ',
    comp: { adm: 6, econ: 7, dip: 8, cri: 5 },
    bio: 'Замминистра экономики по торговле ЕС, вице-премьер 2025–26; Соглашение о торговле с ЕС.' },
  kuleba_a: { id: 'kuleba_a', name: 'Алексей Кулеба', type: 'ЛСЭ',
    comp: { adm: 6, econ: 4, dip: 6, cri: 6 },
    bio: 'Дипломат-управленец; вице-премьер по восстановлению 2024–2026 (не путать с Дмитрием Кулебой).' },
  berezhna: { id: 'berezhna', name: 'Татьяна Бережная', type: 'ЭСЭ',
    comp: { adm: 5, econ: 2, dip: 5, cri: 4 },
    bio: 'Вице-премьер по гуманитарной политике — министр культуры с 10.2025.' },

  // --- Свириденко ---
  svirydenko: { id: 'svirydenko', name: 'Юлия Свириденко', type: 'ЛИЭ',
    comp: { adm: 8, econ: 8, dip: 6, cri: 6 },
    bio: 'Вице-премьер по экономике 2021–25, премьер 07.2025–07.2026; первая «премьер-женщина» после Тимошенко, курс «оружие и восстановление».' },
  sobolev: { id: 'sobolev', name: 'Алексей Соболев', type: 'ЛИЭ',
    comp: { adm: 6, econ: 7, dip: 5, cri: 5 },
    bio: 'Антикоррупционный экономист; министр экономики, экологии и агрополитики 2025–26.' },
  hrynchuk: { id: 'hrynchuk', name: 'Светлана Гринчук', type: 'ЛСЭ',
    comp: { adm: 6, econ: 5, dip: 5, cri: 6 },
    bio: 'Министр энергетики 07–11.2025; первая женщина на этом посту, зима ударов по энергообъектам.' },

  // --- Корецкий (действующий) ---
  koretsky: { id: 'koretsky', name: 'Сергей Корецкий', type: 'СЛЭ',
    comp: { adm: 8, econ: 6, dip: 5, cri: 8 },
    bio: 'Глава СБУ 2024–2026, премьер с 16.07.2026; назначение сопровождалось протестами из-за отставки Фёдорова.' },
  sybiga: { id: 'sybiga', name: 'Андрей Сибига', type: 'ЛСЭ',
    comp: { adm: 6, econ: 3, dip: 8, cri: 6 },
    bio: 'Глава МИД с 09.2024; дипломатия военного времени, переговорные пакеты.' },
  hmara: { id: 'hmara', name: 'Евгений Хмара', type: 'СЛЭ',
    comp: { adm: 6, econ: 2, dip: 4, cri: 7 },
    bio: 'Военный юрист; министр обороны с 16.07.2026.' },
  vyhivsky: { id: 'vyhivsky', name: 'Иван Выговский', type: 'СЛЭ',
    comp: { adm: 6, econ: 2, dip: 3, cri: 6 },
    bio: 'Генерал полиции; министр внутренних дел с 16.07.2026.' },
  maslov: { id: 'maslov', name: 'Денис Маслов', type: 'ЛСИ',
    comp: { adm: 6, econ: 2, dip: 3, cri: 4 },
    bio: 'Министр юстиции с 16.07.2026.' },
  kravchenko: { id: 'kravchenko', name: 'Александр Кравченко', type: 'ЛИЭ',
    comp: { adm: 6, econ: 7, dip: 4, cri: 5 },
    bio: 'Налоговик-экономист; министр экономики и окружающей среды с 16.07.2026.' },
  butenko: { id: 'butenko', name: 'Андрей Бутенко', type: 'ЛСИ',
    comp: { adm: 5, econ: 2, dip: 3, cri: 4 },
    bio: 'Министр образования с 16.07.2026.' },
  ferchuk: { id: 'ferchuk', name: 'Оксана Ферчук', type: 'ИЛЭ',
    comp: { adm: 6, econ: 3, dip: 5, cri: 4 },
    bio: 'Министр цифровой трансформации с 16.07.2026.' },

  // --- Янукович и Головатый (2006–2007) ---
  yanukovich: { id: 'yanukovich', name: 'Виктор Янукович', type: 'СЛИ',
    comp: { adm: 6, econ: 5, dip: 4, cri: 5 },
    bio: 'Премьер 2002–2004 и 2006–2007, президент 2010–2014; вертикаль «стабильности» и финал на Евромайдане.' },
  golovatiy: { id: 'golovatiy', name: 'Сергей Головатый', type: 'ЛСИ',
    comp: { adm: 5, econ: 3, dip: 5, cri: 4 },
    bio: 'Адвокат и дипломат; министр юстиции 2005–2006.' },

  // --- Бонусный пул для конструктора ---
  zaluzhny: { id: 'zaluzhny', name: 'Валерий Залужный', type: 'СЛЭ',
    comp: { adm: 8, econ: 2, dip: 7, cri: 9 },
    bio: 'Главнокомандующий 2021–2024, посол в Великобритании; вечный кандидат в силовой блок.' },
  tyhypko: { id: 'tyhypko', name: 'Сергей Тигипко', type: 'СЭЭ',
    comp: { adm: 7, econ: 7, dip: 5, cri: 5 },
    bio: 'Банкир; вице-премьер 2010–2012, экономблок 2020–21.' },

  // --- Менеджеры и эксперты из других областей ---
  kosyuk: { id: 'kosyuk', name: 'Юрий Косюк', type: 'ЛСЭ',
    comp: { adm: 9, econ: 7, dip: 5, cri: 7 },
    fields: ['biz'], group: 'manager',
    bio: 'Совладелец и многолетний операционный директор сети «АТБ», глава Черкасской ОВА 2020–2022; эталон операционного менеджмента.' },
  pyshnyy: { id: 'pyshnyy', name: 'Андрей Пышный', type: 'ЛСИ',
    comp: { adm: 8, econ: 9, dip: 5, cri: 7 },
    fields: ['fin', 'biz'], group: 'manager',
    bio: 'Банкир: «Укргазбанк», глава НБУ с 07.2022; банковская система под войной и санкциями.' },
  gontareva: { id: 'gontareva', name: 'Валерия Гонтарева', type: 'ЛИЭ',
    comp: { adm: 7, econ: 9, dip: 4, cri: 6 },
    fields: ['fin', 'biz'], group: 'manager',
    bio: 'Инвестбанкир, глава НБУ 2014–2017; плавающий курс и чистка банков — самая спорная реформа эпохи.' },
  stavnitser: { id: 'stavnitser', name: 'Андрей Ставницер', type: 'СЛЭ',
    comp: { adm: 8, econ: 8, dip: 6, cri: 7 },
    fields: ['biz'], group: 'manager',
    bio: 'Совладелец сети WOG, глава «Лиги победы»; логистика топлива в войне, волонтёрская координация.' },

  // --- Новые лица: растущие политики ---
  brovdi: { id: 'brovdi', name: 'Роберт Бровди «Мадяр»', type: 'ЛСЭ',
    comp: { adm: 8, econ: 4, dip: 4, cri: 10 },
    fields: ['mil', 'it'], group: 'rising',
    bio: 'Командующий Силами беспилотных систем (с 2025), создатель батальона «Мадярские птицы»; лицо дроновой армии.' },
  kim: { id: 'kim', name: 'Виталий Ким', type: 'ЭСЭ',
    comp: { adm: 8, econ: 5, dip: 8, cri: 7 },
    fields: ['gov', 'mil'], group: 'rising',
    bio: 'Глава Николаевской ОВА с 2020; прифронтовой администратор нового поколения, острый на язык и хладнокровный в ударах.' },
  fedorov_ivan: { id: 'fedorov_ivan', name: 'Иван Фёдоров', type: 'СЭЭ',
    comp: { adm: 8, econ: 5, dip: 7, cri: 8 },
    fields: ['gov'], group: 'rising',
    bio: 'Мэр Мелитополя, отказавшийся оккупантам (2022) и выменянный из плена; глава Запорожской ОВА.' },
  arakhamia: { id: 'arakhamia', name: 'Давид Арахамия', type: 'СЭЭ',
    comp: { adm: 8, econ: 6, dip: 6, cri: 8 },
    fields: ['gov', 'it', 'mil'], group: 'rising',
    bio: 'Глава фракции «Слуга народа», экс-секретарь СНБО; цифра, оборонные закупки, переговорная платформа.' },
}

/** Сферы для тех, у кого не заданы явно: почти все — политики и госслужащие.
 *  Разметка — та же экспертная игровая модель, что и компетенции. */
const FIELD_OVERRIDES: Record<string, FieldId[]> = {
  // финансы и экономика
  tymoshenko: ['gov', 'fin'], pynzenyk: ['gov', 'fin'], teryokhin: ['gov', 'fin'],
  stashevsky: ['gov', 'fin'], shlapak: ['gov', 'fin'], yatsenyuk: ['gov', 'law', 'fin'],
  makukha: ['gov', 'fin'], azarov: ['gov', 'fin'], klyuev: ['gov', 'fin', 'biz'],
  yaroshenko: ['gov', 'fin'], kolobov: ['gov', 'fin'], lebedev: ['fin', 'mil'],
  arbuzov: ['gov', 'fin'], prasolov: ['gov', 'fin'], danylyshyn: ['gov', 'fin'],
  yaresko: ['fin', 'biz'], abromavicius: ['biz', 'fin'], danylyuk: ['gov', 'fin'],
  stepaniv: ['gov', 'fin'], markarova: ['fin', 'law'], marchenko: ['gov', 'fin'],
  kachka: ['gov', 'fin'], svirydenko: ['gov', 'fin'], sobolev: ['gov', 'fin'],
  kravchenko: ['gov', 'fin'], tyhypko: ['biz', 'fin'], skaletska: ['fin', 'med'],
  shmyhal: ['gov', 'en', 'fin'], zahorodniuk: ['biz', 'fin'],
  // силовой блок
  grytsenko: ['gov', 'mil'], lutsenko: ['gov', 'mil', 'law'], tsushko: ['gov', 'mil'],
  polyachenko: ['gov', 'mil'], yezhel: ['mil'], salamatin: ['mil'], mohylyov: ['mil'],
  zakharchenko: ['mil', 'law'], yarema: ['law', 'mil'], poltorak: ['mil'],
  monastyrsky: ['law'], klymenko: ['mil', 'law'], koretsky: ['gov', 'mil'],
  hmara: ['mil', 'law'], vyhivsky: ['mil', 'law'], prystaiko: ['gov', 'mil'],
  zaluzhny: ['mil'],
  // юристы
  zvarych: ['law'], lavrinovich: ['law'], onishchuk: ['law'], lukash: ['law'],
  petrenko: ['law'], maliuska: ['law'], golovatiy: ['law'], stefanyshina: ['law', 'gov'],
  reznikov: ['law', 'biz'], sybiga: ['gov', 'law'], halushchenko: ['law', 'en'],
  maslov: ['law'], tarasyuk: ['gov', 'law'],
  // энергетика
  plachkov: ['gov', 'en'], prodan: ['gov', 'en'], boyko: ['gov', 'en'],
  stavitsky: ['gov', 'en'], demchyshyn: ['gov', 'en'], nasalyk: ['gov', 'en'],
  orzhel: ['gov', 'en'], hrynchuk: ['gov', 'en'],
  // медицина
  polishchuk: ['med'], musiy: ['med'], bogatyryova: ['gov', 'med'], kvitashvili: ['med'],
  suprun: ['med', 'biz'], liashko: ['med', 'gov'],
  // образование, наука, социум
  nikolaenko: ['gov', 'edu'], vakarchuk: ['edu'], kvit: ['edu', 'law'],
  grynevych: ['edu'], shkarlet: ['edu', 'fin'], lisovyi: ['edu'], butenko: ['gov', 'edu'],
  tabachnyk: ['gov', 'edu'], sheremeta: ['edu', 'biz'], mylovanov: ['fin', 'edu'],
  novosad: ['edu', 'soc'], korolevska: ['gov', 'soc'], denisova: ['gov', 'soc'],
  berezhna: ['gov', 'soc'], kuleba_d: ['gov', 'soc'],
  // IT и бизнес
  fedorov: ['it', 'biz'], umerov: ['biz', 'it'], klympush: ['gov', 'biz', 'it'],
  ferchuk: ['gov', 'it'], poroshenko: ['gov', 'biz'], groysman: ['gov', 'biz'],
  kinakh: ['gov', 'biz'], yekhanurov: ['gov', 'fin', 'biz'], avakov: ['biz', 'gov'],
  yanukovich: ['gov', 'biz'],
}

/** Сферы кандидата: явные или «gov» по умолчанию */
export function fieldsOf(p: Politician): FieldId[] {
  if (p.fields && p.fields.length) return p.fields
  return FIELD_OVERRIDES[p.id] ?? ['gov']
}

/** Допущен ли кандидат к должности (пересечение сфер) */
export function isEligible(p: Politician, pos: Position): boolean {
  return fieldsOf(p).some(f => pos.allow.includes(f))
}

/** «Арсений Яценюк» → «Яценюк Арсений» — фамилия первой для поиска в списках */
export function surnameFirst(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  let si = parts.length - 1
  while (si > 0 && /^[«(]/.test(parts[si])) si-- // прозвища в кавычках — не фамилия
  if (si === 0) return name
  const rest = [...parts.slice(0, si), ...parts.slice(si + 1)]
  return `${parts[si]} ${rest.join(' ')}`
}

// ---------- Кабинеты ----------

export type ContextKind = 'stability' | 'reform' | 'crisis' | 'war'

export const CONTEXT_INFO: Record<ContextKind, { name: string; color: string; hint: string }> = {
  stability: { name: 'Стабильность', color: '#22c55e', hint: 'мирный рост, политическая устойчивость' },
  reform: { name: 'Реформы', color: '#38bdf8', hint: 'программный реформаторский старт' },
  crisis: { name: 'Кризис', color: '#f59e0b', hint: 'финансовый/политический кризис' },
  war: { name: 'Война', color: '#ef4444', hint: 'оборона и безопасность решают всё' },
}

export interface Cabinet {
  id: string
  ord: number
  name: string
  period: string
  /** месяцев у власти (факт) */
  months: number
  context: ContextKind
  fate: string
  /** positionId → politicianId (последний основной носитель должности) */
  members: Record<string, string | null>
  /** примечания о ротациях */
  notes?: Record<string, string>
  /** позиции, которых у кабинета не было (не штрафуются) */
  na?: string[]
}

export const CABINETS: Cabinet[] = [
  {
    id: 'timoshenko1', ord: 11, name: 'Первый кабинет Тимошенко', period: '02.2005 – 09.2005',
    months: 7, context: 'reform',
    fate: '«Оранжевый» реформаторский штурм: кассовые реформы, роспуск СЭЗ — и раскол команды; после «газовых» скандалов президент Ющенко распустил правительство 08.09.2005.',
    members: {
      pm: 'tymoshenko', vicepm: 'kinakh', finance: 'pynzenyk', economy: 'teryokhin',
      defense: 'grytsenko', mfa: 'tarasyuk', mvd: 'lutsenko', justice: 'zvarych',
      energy: 'plachkov', health: 'polishchuk', education: 'nikolaenko', digital: null,
    },
    na: ['digital'],
  },
  {
    id: 'yekhanurov', ord: 12, name: 'Кабинет Еханурова', period: '09.2005 – 08.2006',
    months: 10, context: 'stability',
    fate: 'Технократическая пауза после раскола: выдержала первый газовый конфликт с РФ (01.2006), но после выборов-2006 «антикризовая коалиция» сделала премьером Януковича.',
    members: {
      pm: 'yekhanurov', vicepm: 'stashevsky', finance: 'shlapak', economy: 'yatsenyuk',
      defense: 'grytsenko', mfa: 'tarasyuk', mvd: 'lutsenko', justice: 'golovatiy',
      energy: 'plachkov', health: 'polyachenko', education: 'nikolaenko', digital: null,
    },
    na: ['digital'],
  },
  {
    id: 'yanukovich2', ord: 13, name: 'Второй кабинет Януковича', period: '08.2006 – 12.2007',
    months: 16, context: 'crisis',
    fate: '«Антикризовая коалиция» с девятью министрами от Ющенко внутри: раскол с самого начала, политкризис 2007, досрочные выборы; полномочия сложены 18.12.2007.',
    members: {
      pm: 'yanukovich', vicepm: 'klyuev', finance: 'azarov', economy: 'kinakh',
      defense: 'grytsenko', mfa: 'yatsenyuk', mvd: 'tsushko', justice: 'lavrinovich',
      energy: 'boyko', health: 'polyachenko', education: 'nikolaenko', digital: null,
    },
    notes: {
      economy: 'с 03.2007 (до того — В. Макуха)',
      mfa: 'с 03.2007 (до того — Б. Тарасюк)',
      mvd: 'с 12.2006 (до того — Ю. Луценко)',
      justice: 'с 11.2006 (до того — Р. Зварыч)',
    },
    na: ['digital'],
  },
  {
    id: 'timoshenko2', ord: 14, name: 'Второй кабинет Тимошенко', period: '12.2007 – 03.2010',
    months: 27, context: 'crisis',
    fate: 'Мировой финансовый кризис 2008–09: девальвация, программа МВФ, газовый договор с РФ (01.2009); после победы Януковича — вотум недоверия 03.03.2010.',
    members: {
      pm: 'tymoshenko', vicepm: 'turchynov', finance: 'pynzenyk', economy: 'danylyshyn',
      defense: 'yekhanurov', mfa: 'ohryzko', mvd: 'lutsenko', justice: 'onishchuk',
      energy: 'prodan', health: 'knyazevich', education: 'vakarchuk', digital: null,
    },
    notes: {
      finance: 'до 02.2009, далее и.о. И. Уманский',
      mfa: 'с 10.2009 — П. Порошенко',
    },
    na: ['digital'],
  },
  {
    id: 'azarov1', ord: 15, name: 'Первый кабинет Азарова', period: '03.2010 – 12.2012',
    months: 33, context: 'stability',
    fate: '«Стабильность»: рост 2010–11, Харковские соглашения, налоговый майдан; после выборов-2012 Азаров сформировал новый кабинет.',
    members: {
      pm: 'azarov', vicepm: 'klyuev', finance: 'yaroshenko', economy: 'tsushko',
      defense: 'yezhel', mfa: 'gryshchenko', mvd: 'mohylyov', justice: 'lavrinovich',
      energy: 'boyko', health: 'bogatyryova', education: 'tabachnyk', digital: null,
    },
    notes: {
      finance: 'с 02.2012 — Ю. Колобов',
      economy: 'с 03.2012 — П. Порошенко',
      defense: 'с 02.2012 — Д. Саламатин',
      mvd: 'с 11.2011 — В. Захарченко',
      health: 'с 02.2012',
    },
    na: ['digital'],
  },
  {
    id: 'azarov2', ord: 16, name: 'Второй кабинет Азарова', period: '12.2012 – 02.2014',
    months: 14, context: 'crisis',
    fate: 'Евромайдан: силовое противостояние Захарченко, побег Януковича; отставка Азарова 28.01.2014, кабинет окончательно сложил полномочия 27.02.2014.',
    members: {
      pm: 'azarov', vicepm: 'arbuzov', finance: 'kolobov', economy: 'prasolov',
      defense: 'lebedev', mfa: 'kozhara', mvd: 'zakharchenko', justice: 'lukash',
      energy: 'stavitsky', health: 'bogatyryova', education: 'tabachnyk', digital: null,
    },
    notes: { justice: 'с 07.2013 (до того — А. Лавринович)' },
    na: ['digital'],
  },
  {
    id: 'yatsenyuk1', ord: 17, name: 'Первый кабинет Яценюка', period: '02.2014 – 11.2014',
    months: 9, context: 'war',
    fate: 'Крым, начало войны на Донбассе, Ассоциация с ЕС, первый транш МВФ; сложил полномочия перед новой Радой 27.11.2014.',
    members: {
      pm: 'yatsenyuk', vicepm: 'yarema', finance: 'shlapak', economy: 'sheremeta',
      defense: 'poltorak', mfa: 'klimkin', mvd: 'avakov', justice: 'petrenko',
      energy: 'prodan', health: 'musiy', education: 'kvit', digital: null,
    },
    notes: {
      defense: 'с 14.10.2014; ранее и.о. Тенюх, Коваль, Гелетей',
      mfa: 'с 19.06.2014 (до того и.о. — А. Дещица)',
    },
    na: ['digital'],
  },
  {
    id: 'yatsenyuk2', ord: 18, name: 'Второй кабинет Яценюка', period: '12.2014 – 04.2016',
    months: 16, context: 'war',
    fate: 'Реструктуризация долга 2015, девальвация, реформы: Нацполиция, ProZorro, налоговый майдан; уход Абромавичюса и отставка Яценюка в апреле 2016.',
    members: {
      pm: 'yatsenyuk', vicepm: 'zubko', finance: 'yaresko', economy: 'abromavicius',
      defense: 'poltorak', mfa: 'klimkin', mvd: 'avakov', justice: 'petrenko',
      energy: 'demchyshyn', health: 'kvitashvili', education: 'kvit', digital: null,
    },
    na: ['digital'],
  },
  {
    id: 'groysman', ord: 19, name: 'Кабинет Гройсмана', period: '04.2016 – 08.2019',
    months: 40, context: 'stability',
    fate: 'Рост экономики, повышение минимальной зарплаты в 2 раза, безвиз с ЕС (2017); рекордно низкие рейтинги к финалу — уход после выборов Рады 2019.',
    members: {
      pm: 'groysman', vicepm: 'klympush', finance: 'danylyuk', economy: 'stepaniv',
      defense: 'poltorak', mfa: 'klimkin', mvd: 'avakov', justice: 'petrenko',
      energy: 'nasalyk', health: 'suprun', education: 'grynevych', digital: null,
    },
    notes: {
      finance: 'до 06.2018, далее — О. Маркарова',
      economy: 'с 08.2017 (до того — С. Кубив)',
      health: 'и.о. министра с 08.2016',
    },
    na: ['digital'],
  },
  {
    id: 'honcharuk', ord: 20, name: 'Кабинет Гончарука', period: '08.2019 – 03.2020',
    months: 6, context: 'reform',
    fate: 'Самое молодое правительство «Слуги народа»: «дропай головы», утечка аудиозаписей и потеря доверия Офиса президента; отставка в марте 2020.',
    members: {
      pm: 'honcharuk', vicepm: 'kuleba_d', finance: 'markarova', economy: 'mylovanov',
      defense: 'zahorodniuk', mfa: 'prystaiko', mvd: 'avakov', justice: 'maliuska',
      energy: 'orzhel', health: 'skaletska', education: 'novosad', digital: 'fedorov',
    },
  },
  {
    id: 'shmyhal', ord: 21, name: 'Кабинет Шмыгаля', period: '03.2020 – 07.2025',
    months: 64, context: 'war',
    fate: 'COVID-19, затем полномасштабная война: самый долгий кабинет Украины (64 месяца); ротации 2021, 2023, 2024; отставка в июле 2025.',
    members: {
      pm: 'shmyhal', vicepm: 'stefanyshina', finance: 'marchenko', economy: 'svirydenko',
      defense: 'reznikov', mfa: 'kuleba_d', mvd: 'monastyrsky', justice: 'maliuska',
      energy: 'halushchenko', health: 'liashko', education: 'lisovyi', digital: 'fedorov',
    },
    notes: {
      economy: 'с 11.2021 (до того — С. Тигипко)',
      defense: 'до 09.2023, далее — Р. Умёров',
      mfa: 'до 09.2024, далее — А. Сибига',
      mvd: 'с 07.2021 после А. Авакова; с 02.2023 — И. Клименко',
      energy: 'с 04.2021',
      health: 'с 05.2021 (до того — М. Степанов)',
      education: 'с 03.2023 (до того — С. Шкарлет)',
    },
  },
  {
    id: 'svyridenko', ord: 22, name: 'Правительство Свириденко', period: '07.2025 – 07.2026',
    months: 12, context: 'war',
    fate: 'Курс «оружие и восстановление», крупные ротации в январе 2026 (оборона и энергия); отставка в июле 2026 на фоне протестов против снятия министра обороны Фёдорова.',
    members: {
      pm: 'svirydenko', vicepm: 'fedorov', finance: 'marchenko', economy: 'sobolev',
      defense: 'shmyhal', mfa: 'sybiga', mvd: 'klymenko', justice: 'maliuska',
      energy: 'hrynchuk', health: 'liashko', education: 'lisovyi', digital: null,
    },
    notes: {
      vicepm: 'первый вице-премьер — цифровой блок; с 14.01.2026 — министр обороны',
      defense: 'с 17.07.2025 до 13.01.2026, далее — М. Фёдоров',
      energy: 'до 11.2025; с 14.01.2026 — Д. Шмыгаль',
    },
    na: ['digital'],
  },
  {
    id: 'koretsky', ord: 23, name: 'Правительство Корецкого', period: 'с 07.2026',
    months: 4, context: 'war',
    fate: 'Действующий кабинет (23-й созыв), назначен 16.07.2026 на фоне протестов; министр обороны — Евгений Хмара, энергетика — под началом первого вице-премьера Шмыгаля.',
    members: {
      pm: 'koretsky', vicepm: 'shmyhal', finance: 'marchenko', economy: 'kravchenko',
      defense: 'hmara', mfa: 'sybiga', mvd: 'vyhivsky', justice: 'maslov',
      energy: null, health: 'liashko', education: 'butenko', digital: 'ferchuk',
    },
    notes: {
      vicepm: 'первый вице-премьер — министр энергетики (с 14.01.2026)',
      energy: 'в ведении первого вице-премьера Д. Шмыгаля',
    },
    na: ['energy'],
  },
]

/** Правительства 1991–2004 — компактная справка (без разбора по членам) */
export const EARLIER_GOVTS: { name: string; period: string; note: string }[] = [
  { name: 'Фокин', period: '1991–1992', note: 'первый премьер независимой Украины; гиперинфляция, реформы не начаты' },
  { name: 'Кучма', period: '1992–1993', note: 'рыночный старт, затем — президентство' },
  { name: 'Звягильский', period: '1993–1994', note: 'и.о. в пик кризиса, «топливные» сделки' },
  { name: 'Масол', period: '1994–1995', note: 'возвращение после «гранита»-1990' },
  { name: 'Марчук', period: '1995–1996', note: 'широкие полномочия, Конституция 1996' },
  { name: 'Лазаренко', period: '1996–1997', note: 'резкие реформы и громкие скандалы' },
  { name: 'Пустовойтенко', period: '1997–1999', note: 'стабилизация после дефолта-1998' },
  { name: 'Ющенко', period: '1999–2001', note: 'банкир во главе: рост после кризиса' },
  { name: 'Кинах', period: '2001–2002', note: 'промышленная стабильность' },
  { name: 'Янукович I', period: '2002–2004', note: '«Единая Украина», финал — Оранжевая революция' },
]
