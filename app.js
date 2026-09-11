// Энциклопедия правил — чисто статичное расширение, без бэкенда и без ИИ.
// Вся база (открытый SRD 5e 2014, источник — 5e-bits/5e-database, Open
// Gaming License 1.0a) лежит рядом, в data/*.json, целиком грузится в
// память при открытии попапа, и дальше поиск/фильтрация — обычный JS-код
// по массиву в памяти, без сети.

// name — русское имя (когда есть перевод из датасета), nameEn — оригинал.
// Для категорий без готового русского перевода (заклинания, монстры,
// снаряжение, магические предметы, черты, особенности, архетипы, разделы
// правил) показываем английское имя и как основное — переводить вручную
// весь корпус (тысячи записей) нереально сделать надёжно за один присест,
// зато классы/состояния/навыки/характеристики и т.п. — с переводом.
const CATEGORIES = [
  { slug: "classes", label: "Классы", file: "classes.json", ruFile: "classes.ru.json", color: "#6a9bd8" },
  { slug: "spells", label: "Заклинания", file: "spells.json", ruFile: "spells.ru.json", color: "#9b7fd4" },
  { slug: "monsters", label: "Монстры", file: "monsters.json", ruFile: "monsters.ru.json", color: "#d16b66" },
  { slug: "conditions", label: "Состояния", file: "conditions.json", ruFile: "conditions.ru.json", color: "#d1953f" },
  { slug: "feats", label: "Черты", file: "feats.json", ruFile: "feats.ru.json", color: "#c97ba0" },
  { slug: "equipment", label: "Снаряжение", file: "equipment.json", ruFile: "equipment.ru.json", color: "#a98a63" },
  { slug: "magic-items", label: "Магические предметы", file: "magic-items.json", ruFile: "magic-items.ru.json", color: "#4fb8a8" },
  { slug: "races", label: "Расы", file: "races.json", ruFile: "races.ru.json", color: "#5fae72" },
  { slug: "subraces", label: "Подрасы", file: "subraces.json", ruFile: "subraces.ru.json", color: "#7ec48f" },
  { slug: "backgrounds", label: "Предыстории", file: "backgrounds.json", ruFile: "backgrounds.ru.json", color: "#bfa15a" },
  { slug: "skills", label: "Навыки", file: "skills.json", ruFile: "skills.ru.json", color: "#5bb0c2" },
  { slug: "ability-scores", label: "Характеристики", file: "ability-scores.json", ruFile: "ability-scores.ru.json", color: "#9a94ab" },
  { slug: "alignments", label: "Мировоззрения", file: "alignments.json", ruFile: "alignments.ru.json", color: "#8f8fc0" },
  { slug: "damage-types", label: "Типы урона", file: "damage-types.json", ruFile: "damage-types.ru.json", color: "#c9603f" },
  { slug: "languages", label: "Языки", file: "languages.json", ruFile: "languages.ru.json", color: "#7fbf9e" },
  { slug: "magic-schools", label: "Школы магии", file: "magic-schools.json", ruFile: "magic-schools.ru.json", color: "#a874c9" },
  { slug: "weapon-properties", label: "Свойства оружия", file: "weapon-properties.json", ruFile: "weapon-properties.ru.json", color: "#8c98a4" },
  { slug: "rule-sections", label: "Разделы правил", file: "rule-sections.json", ruFile: "rule-sections.ru.json", color: "#c9a96e" },
  { slug: "rules", label: "Главы правил", file: "rules.json", ruFile: "rules.ru.json", color: "#c9a96e" },
  { slug: "subclasses", label: "Архетипы", file: "subclasses.json", ruFile: "subclasses.ru.json", color: "#7fb0e0" },
  { slug: "traits", label: "Особенности рас", file: "traits.json", ruFile: "traits.ru.json", color: "#6bbf82" },
  { slug: "features", label: "Классовые умения", file: "features.json", ruFile: "features.ru.json", color: "#6f9fc0" },
];

// Небольшой ручной словарь для поиска по-русски там, где в датасете нет
// готового перевода, но термин настолько стандартный, что ошибиться сложно
// (12 базовых классов + самые частые в "Проклятии Страда" монстры). Не
// претендует на полноту — это подсказки для поиска, не замена переводу.
const RU_ALIASES = {
  classes: {
    Barbarian: "варвар", Bard: "бард", Cleric: "жрец", Druid: "друид",
    Fighter: "воин", Monk: "монах", Paladin: "паладин", Ranger: "следопыт",
    Rogue: "плут", Sorcerer: "чародей", Warlock: "колдун", Wizard: "волшебник",
  },
  monsters: {
    Commoner: "обыватель", Scout: "разведчик", Bandit: "разбойник",
    "Bandit Captain": "капитан разбойников", "Dire Wolf": "лютый волк",
    Wolf: "волк", Berserker: "берсерк", Druid: "друид",
    "Twig Blight": "ветвистая зараза", "Needle Blight": "игольчатая зараза",
    Scarecrow: "пугало", Werewolf: "вервольф", Zombie: "зомби",
    Skeleton: "скелет", "Swarm of Bats": "рой летучих мышей",
    "Swarm of Rats": "рой крыс", "Swarm of Ravens": "рой воронов",
    "Will-O-Wisp": "блуждающий огонёк", Revenant: "ревенант", Ghost: "привидение",
    Cat: "кошка", "Flying Sword": "летающий меч", "Crawling Claw": "ползающая рука",
    Shadow: "тень", Thug: "головорез", Wight: "умертвие",
    "Giant Spider": "гигантский паук", "Giant Rat": "гигантская крыса",
    Cultist: "культист", Mage: "маг", Priest: "жрец", Guard: "страж",
    Noble: "дворянин", Spy: "шпион", Ghoul: "упырь", "Giant Wolf Spider": "гигантский волчий паук",
  },
};

const CAT_BY_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]));

let DB = []; // {category, index, name, nameEn, entry, search}
let loaded = false;
let activeFilter = null;
let lastQuery = "";

// index "category:index" -> русское имя, собирается при загрузке из всех
// файлов *.ru.json — используется, чтобы переводить и перекрёстные ссылки
// (школа заклинания, класс, тип урона и т.п.), не только сам объект.
const RU_NAME_INDEX = new Map();

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function refCategoryFromUrl(url) {
  const m = /\/api\/2014\/([^/]+)\//.exec(url || "");
  return m ? m[1] : null;
}

// ---------- перевод коротких служебных полей (дистанция, длительность,
// скорость, чувства, мировоззрение) — не полные предложения, а фиксированные
// шаблоны/словари D&D-статблоков, поэтому переводим их отдельно от общего
// текста описаний (там переводит уже сам датасет .ru.json).

function trUnits(s) {
  return String(s)
    .replace(/\bfeet\b/gi, "футов")
    .replace(/\bfoot\b/gi, "фут")
    .replace(/\bft\.?/gi, "фт.")
    .replace(/\bmiles\b/gi, "миль")
    .replace(/\bmile\b/gi, "миля");
}

const TIME_WORD = { minute: "минута", minutes: "минут", hour: "час", hours: "часов", round: "раунд", rounds: "раунда", day: "день", days: "дней" };

function trDuration(s) {
  if (!s) return s;
  let t = s.trim();
  if (/^instantaneous$/i.test(t)) return "Мгновенная";
  if (/^until dispelled$/i.test(t)) return "До снятия";
  if (/^until dispelled or triggered$/i.test(t)) return "До снятия или срабатывания";
  if (/^special$/i.test(t)) return "Особая";
  const m = /^(concentration,\s*)?up to (\d+)\s*(minute|minutes|hour|hours|round|rounds|day|days)$/i.exec(t);
  if (m) return `${m[1] ? "Концентрация, " : ""}до ${m[2]} ${TIME_WORD[m[3].toLowerCase()]}`;
  const m2 = /^(\d+)\s*(minute|minutes|hour|hours|round|rounds|day|days)$/i.exec(t);
  if (m2) return `${m2[1]} ${TIME_WORD[m2[2].toLowerCase()]}`;
  return s;
}

function trCastingTime(s) {
  if (!s) return s;
  const t = s.trim();
  if (/^1 action$/i.test(t)) return "1 действие";
  if (/^1 bonus action$/i.test(t)) return "1 бонусное действие";
  const m = /^(\d+)\s*(minute|minutes|hour|hours)$/i.exec(t);
  if (m) return `${m[1]} ${TIME_WORD[m[2].toLowerCase()]}`;
  const m2 = /^1 reaction(.*)$/i.exec(t);
  if (m2) return `1 реакция${m2[1]}`;
  return s;
}

function trRange(s) {
  if (!s) return s;
  const t = s.trim();
  if (/^self$/i.test(t)) return "На себя";
  if (/^touch$/i.test(t)) return "Касание";
  if (/^sight$/i.test(t)) return "В пределах видимости";
  if (/^unlimited$/i.test(t)) return "Неограниченная";
  if (/^special$/i.test(t)) return "Особая";
  const m = /^self \((.+)\)$/i.exec(t);
  if (m) return `На себя (${trUnits(m[1])})`;
  if (/^\d+\s*(feet|foot|ft\.?)$/i.test(t)) return trUnits(t);
  return s;
}

const ALIGN_PHRASES = [
  [/\blawful good\b/gi, "законно-добрый"], [/\bneutral good\b/gi, "нейтрально-добрый"], [/\bchaotic good\b/gi, "хаотично-добрый"],
  [/\blawful neutral\b/gi, "законно-нейтральный"], [/\bchaotic neutral\b/gi, "хаотично-нейтральный"],
  [/\blawful evil\b/gi, "законно-злой"], [/\bneutral evil\b/gi, "нейтрально-злой"], [/\bchaotic evil\b/gi, "хаотично-злой"],
  [/\bunaligned\b/gi, "вне мировоззрения"], [/\bany alignment\b/gi, "любое мировоззрение"],
  [/\bany non-good alignment\b/gi, "любое недоброе мировоззрение"], [/\bany evil alignment\b/gi, "любое злое мировоззрение"],
  [/\bany chaotic alignment\b/gi, "любое хаотичное мировоззрение"], [/\bany lawful alignment\b/gi, "любое законопослушное мировоззрение"],
  [/\btypically\b/gi, "обычно"], [/\busually\b/gi, "как правило"], [/\bneutral\b/gi, "нейтральный"],
  [/\blawful\b/gi, "законопослушный"], [/\bchaotic\b/gi, "хаотичный"], [/\bgood\b/gi, "добрый"], [/\bevil\b/gi, "злой"],
  [/\bor\b/gi, "или"], [/\band\b/gi, "и"],
];
function trAlignment(s) {
  if (!s) return s;
  let t = s;
  for (const [re, ru] of ALIGN_PHRASES) t = t.replace(re, ru);
  return t;
}

const SPEED_KEYS = { walk: "ходьба", fly: "полёт", swim: "плавание", climb: "лазание", burrow: "рытьё", hover: "зависание" };
function trSpeed(speedObj) {
  if (!speedObj) return "";
  return Object.entries(speedObj)
    .map(([k, v]) => `${SPEED_KEYS[k] || k} ${trUnits(v)}`)
    .join(", ");
}

const SENSE_KEYS = {
  darkvision: "тёмное зрение", blindsight: "слепое зрение", tremorsense: "чувство вибрации",
  truesight: "истинное зрение", passive_perception: "пассивное восприятие", telepathy: "телепатия",
};
function trSenses(sensesObj) {
  if (!sensesObj) return "";
  return Object.entries(sensesObj)
    .map(([k, v]) => `${SENSE_KEYS[k] || k} ${trUnits(String(v))}`)
    .join(", ");
}

const DAMAGE_TYPE_INDICES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
function trDamagePhrase(s) {
  let t = String(s);
  for (const idx of DAMAGE_TYPE_INDICES) {
    const ru = RU_NAME_INDEX.get(`damage-types:${idx}`);
    if (ru) t = t.replace(new RegExp(`\\b${idx}\\b`, "gi"), ru.toLowerCase());
  }
  return t
    .replace(/\bnonmagical\b/gi, "немагическим")
    .replace(/\bweapons\b/gi, "оружием")
    .replace(/\battacks\b/gi, "атаками")
    .replace(/\bfrom\b/gi, "от")
    .replace(/\bthat aren't silvered\b/gi, "не посеребрённым")
    .replace(/\band\b/gi, "и");
}

function trRefName(ref) {
  if (!ref) return "";
  if (Array.isArray(ref)) return ref.map(trRefName).filter(Boolean).join(", ");
  const cat = refCategoryFromUrl(ref.url);
  const key = cat && ref.index ? `${cat}:${ref.index}` : null;
  const ru = key ? RU_NAME_INDEX.get(key) : null;
  return ru || ref.name || ref.index || "";
}

const searchEl = document.getElementById("search");
const clearBtn = document.getElementById("clear-btn");
const filtersEl = document.getElementById("filters");
const statsEl = document.getElementById("stats");
const resultsEl = document.getElementById("results");
const detailEl = document.getElementById("detail");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function norm(s) {
  return String(s || "").toLowerCase();
}

// ---------- загрузка данных ----------

async function fetchJson(path) {
  const res = await fetch(`./data/${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function loadAll() {
  statsEl.textContent = "Загружаю базу…";
  const rows = [];

  await Promise.all(
    CATEGORIES.map(async (cat) => {
      let list;
      try {
        list = await fetchJson(cat.file);
      } catch (err) {
        console.error("[encyclopedia] не удалось загрузить", cat.file, err);
        return;
      }
      let ruByIndex = null;
      if (cat.ruFile) {
        try {
          const ruList = await fetchJson(cat.ruFile);
          ruByIndex = new Map(ruList.map((r) => [r.index, r]));
        } catch (err) {
          console.warn("[encyclopedia] не удалось загрузить перевод", cat.ruFile, err);
        }
      }
      const aliasMap = RU_ALIASES[cat.slug];

      for (const entry of list) {
        const ru = ruByIndex?.get(entry.index);
        const alias = aliasMap?.[entry.name];
        const nameRu = ru?.name || alias || "";
        if (ru?.name) RU_NAME_INDEX.set(`${cat.slug}:${entry.index}`, ru.name);

        // Полный текст для поиска по содержанию, не только по названию:
        // все абзацы описания (а не первый/первые 200 символов), плюс
        // вложенные описательные поля (особенности монстров, действия,
        // "на более высоких уровнях", подразделы правил и т.п.) — и то же
        // самое из русского перевода, если он уже загружен.
        const searchParts = [entry.name, entry.index, nameRu];
        const pushDesc = (d) => {
          if (Array.isArray(d)) searchParts.push(...d);
          else if (typeof d === "string") searchParts.push(d);
        };
        pushDesc(entry.desc);
        pushDesc(entry.higher_level);
        if (entry.type) searchParts.push(entry.type);
        if (Array.isArray(entry.special_abilities)) {
          for (const sa of entry.special_abilities) searchParts.push(sa.name, sa.desc);
        }
        if (Array.isArray(entry.actions)) {
          for (const a of entry.actions) searchParts.push(a.name, a.desc);
        }
        if (Array.isArray(entry.legendary_actions)) {
          for (const a of entry.legendary_actions) searchParts.push(a.name, a.desc);
        }
        if (Array.isArray(entry.subsections)) searchParts.push(...entry.subsections.map((s) => s.name));
        if (Array.isArray(entry.proficiency_choices)) searchParts.push(...entry.proficiency_choices.map((pc) => pc.desc));
        if (ru) {
          pushDesc(ru.desc);
          pushDesc(ru.higher_level);
          if (Array.isArray(ru.special_abilities)) for (const sa of ru.special_abilities) searchParts.push(sa.name, sa.desc);
          if (Array.isArray(ru.actions)) for (const a of ru.actions) searchParts.push(a.name, a.desc);
          if (Array.isArray(ru.legendary_actions)) for (const a of ru.legendary_actions) searchParts.push(a.name, a.desc);
          if (Array.isArray(ru.subsections)) searchParts.push(...ru.subsections.map((s) => s.name));
        }

        rows.push({
          category: cat.slug,
          index: entry.index,
          name: entry.name,
          nameRu,
          entry,
          entryRu: ru,
          search: norm(searchParts.filter(Boolean).join(" ")),
        });
      }
    }),
  );

  DB = rows;
  loaded = true;
  statsEl.textContent = `${DB.length.toLocaleString("ru-RU")} записей загружено`;
  renderFilters();
  renderBrowseHint();
}

// ---------- фильтры ----------

function renderFilters() {
  filtersEl.innerHTML = "";
  const counts = {};
  for (const row of DB) counts[row.category] = (counts[row.category] || 0) + 1;

  const allChip = el("button", "filter-chip active", "Всё");
  allChip.dataset.slug = "";
  allChip.addEventListener("click", () => setFilter(null));
  filtersEl.appendChild(allChip);

  for (const cat of CATEGORIES) {
    if (!counts[cat.slug]) continue;
    const chip = el("button", "filter-chip", `${cat.label} (${counts[cat.slug]})`);
    chip.dataset.slug = cat.slug;
    chip.addEventListener("click", () => setFilter(cat.slug));
    filtersEl.appendChild(chip);
  }
}

function setFilter(slug) {
  activeFilter = slug;
  for (const chip of filtersEl.querySelectorAll(".filter-chip")) {
    chip.classList.toggle("active", chip.dataset.slug === (slug || ""));
  }
  runSearch();
}

// ---------- поиск ----------

function scoreRow(row, q, words) {
  const name = norm(row.name);
  const nameRu = norm(row.nameRu);
  let score = 0;
  if (name === q || nameRu === q) score += 200;
  else if (name.startsWith(q) || nameRu.startsWith(q)) score += 120;
  else if (name.includes(q) || nameRu.includes(q)) score += 80;
  for (const w of words) {
    if (name.includes(w) || nameRu.includes(w)) score += 15;
    else if (row.search.includes(w)) score += 3;
  }
  return score;
}

function runSearch() {
  const q = norm(searchEl.value).trim();
  lastQuery = q;

  if (!q) {
    renderBrowseHint();
    return;
  }
  if (!loaded) {
    resultsEl.innerHTML = "";
    resultsEl.appendChild(el("div", "", "Загрузка…"));
    return;
  }

  const words = q.split(/\s+/).filter((w) => w.length >= 2);
  const pool = activeFilter ? DB.filter((r) => r.category === activeFilter) : DB;
  const scored = [];
  for (const row of pool) {
    const s = scoreRow(row, q, words);
    if (s > 0) scored.push({ row, s });
  }
  scored.sort((a, b) => b.s - a.s || a.row.name.localeCompare(b.row.name));

  renderResultsList(scored.slice(0, 60).map((x) => x.row), q);
}

function snippetFor(row) {
  const e = row.entry;
  if (row.category === "classes") return `кость хитов 1к${e.hit_die}`;
  if (row.category === "spells") return `${e.level === 0 ? "заговор" : `уровень ${e.level}`} · ${e.school?.name || ""}`;
  if (row.category === "monsters") return `${e.size || ""} ${e.type || ""}, CR ${e.challenge_rating ?? "?"}`.trim();
  const desc = row.entryRu?.desc || e.desc;
  if (Array.isArray(desc)) return (desc[0] || "").replace(/[#*]/g, "").slice(0, 90);
  if (typeof desc === "string") return desc.replace(/[#*\n]/g, " ").slice(0, 90);
  return "";
}

function renderResultsList(rows, q) {
  detailEl.hidden = true;
  resultsEl.hidden = false;
  resultsEl.innerHTML = "";

  if (!rows.length) {
    resultsEl.appendChild(el("div", "", `Ничего не найдено по «${q}».`));
    return;
  }

  for (const row of rows) {
    const item = el("div", "result-row");
    const nameWrap = el("div", "result-name");
    nameWrap.textContent = row.nameRu || row.name;
    if (row.nameRu) {
      const en = el("span", "en", row.name);
      nameWrap.appendChild(en);
    }
    const badge = el("span", "result-badge", CAT_BY_SLUG[row.category]?.label || row.category);
    const color = CAT_BY_SLUG[row.category]?.color;
    if (color) {
      badge.style.color = color;
      badge.style.borderColor = color;
      badge.style.background = hexToRgba(color, 0.14);
    }
    item.append(nameWrap, badge);

    const wrap = el("div");
    wrap.appendChild(item);
    const snip = snippetFor(row);
    if (snip) wrap.appendChild(el("div", "result-snippet", snip));

    wrap.addEventListener("click", () => openDetail(row));
    resultsEl.appendChild(wrap);
  }
}

function renderBrowseHint() {
  detailEl.hidden = true;
  resultsEl.hidden = false;
  resultsEl.innerHTML = "";

  if (!loaded) {
    resultsEl.appendChild(el("div", "", "Загрузка базы…"));
    return;
  }

  const hint = el("div", "hint");
  hint.innerHTML =
    "Начни вводить что угодно — название (<b>варвар</b>, <b>fireball</b>) или кусок содержания " +
    "(<b>укрытие</b>, <b>под водой</b>, <b>преимущество</b>, эффект заклинания и т.п.) — поиск ищет " +
    "не только по названию, но и по всему тексту описаний. Цветной значок справа сразу показывает " +
    "категорию — заклинание, монстр, состояние и т.д. Либо выбери категорию ниже, чтобы просто полистать.";
  resultsEl.appendChild(hint);

  const counts = {};
  for (const row of DB) counts[row.category] = (counts[row.category] || 0) + 1;
  for (const cat of CATEGORIES) {
    if (!counts[cat.slug]) continue;
    const row = el("div", "browse-cat");
    row.appendChild(el("span", "label", cat.label));
    row.appendChild(el("span", "count", String(counts[cat.slug])));
    row.addEventListener("click", () => {
      setFilter(cat.slug);
      searchEl.value = "";
      browseCategory(cat.slug);
    });
    resultsEl.appendChild(row);
  }
}

function browseCategory(slug) {
  const rows = DB.filter((r) => r.category === slug).sort((a, b) => (a.nameRu || a.name).localeCompare(b.nameRu || b.name));
  renderResultsList(rows, "");
}

// ---------- детальный просмотр ----------

function row(k, v) {
  if (v === undefined || v === null || v === "") return null;
  const d = el("div", "d-row");
  d.appendChild(el("div", "k", k));
  const val = el("div", "v");
  val.textContent = v;
  d.appendChild(val);
  return d;
}

function refName(ref) {
  if (!ref) return "";
  if (Array.isArray(ref)) return ref.map(refName).filter(Boolean).join(", ");
  return ref.name || ref.index || "";
}

function joinDesc(desc) {
  if (Array.isArray(desc)) return desc.join("\n\n");
  if (typeof desc === "string") return desc;
  return "";
}

function stripMd(s) {
  return String(s || "").replace(/^#+\s*/gm, "").replace(/\*\*/g, "");
}

function openDetail(rowData) {
  resultsEl.hidden = true;
  detailEl.hidden = false;
  detailEl.innerHTML = "";
  detailEl.scrollTop = 0;

  const back = el("button", "", "← Назад к списку");
  back.id = "detail-back";
  back.addEventListener("click", () => {
    if (lastQuery) runSearch();
    else if (activeFilter) browseCategory(activeFilter);
    else renderBrowseHint();
  });
  detailEl.appendChild(back);

  const title = el("div", "d-title", rowData.nameRu || rowData.name);
  if (rowData.nameRu) title.appendChild(el("span", "en", rowData.name));
  detailEl.appendChild(title);
  const catInfo = CAT_BY_SLUG[rowData.category];
  const sub = el("div", "d-sub", catInfo?.label || rowData.category);
  if (catInfo?.color) sub.style.color = catInfo.color;
  detailEl.appendChild(sub);

  const body = el("div");
  switch (rowData.category) {
    case "classes":
      renderClass(body, rowData.entry, rowData.entryRu);
      break;
    case "spells":
      renderSpell(body, rowData.entry, rowData.entryRu);
      break;
    case "monsters":
      renderMonster(body, rowData.entry, rowData.entryRu);
      break;
    default:
      renderGeneric(body, rowData.entry, rowData.entryRu);
  }
  detailEl.appendChild(body);
}

function renderClass(box, e, ru) {
  [
    row("Кость хитов", `1к${e.hit_die}`),
    row("Спасброски", trRefName(e.saving_throws)),
    row("Владения", trRefName(e.proficiencies)),
    row("Архетипы", trRefName(e.subclasses)),
  ].forEach((r) => r && box.appendChild(r));

  const pc = ru?.proficiency_choices || e.proficiency_choices;
  if (pc?.length) {
    const d = el("div", "d-desc");
    d.textContent = pc.map((x) => x.desc).filter(Boolean).join("\n");
    box.appendChild(d);
  }
}

function renderSpell(box, e, ru) {
  [
    row("Уровень", e.level === 0 ? "заговор" : e.level),
    row("Школа", trRefName(e.school)),
    row("Время накладывания", trCastingTime(e.casting_time)),
    row("Дистанция", trRange(e.range)),
    row("Компоненты", `${(e.components || []).join(", ")}${e.material ? ` (${ru?.material || e.material})` : ""}`),
    row("Длительность", `${trDuration(e.duration) || ""}${e.concentration ? " (концентрация)" : ""}`),
    row("Ритуал", e.ritual ? "да" : "нет"),
    row("Классы", trRefName(e.classes)),
  ].forEach((r) => r && box.appendChild(r));

  const desc = el("div", "d-desc", joinDesc(ru?.desc ?? e.desc));
  box.appendChild(desc);

  const higherLevel = ru?.higher_level ?? e.higher_level;
  if (higherLevel?.length) {
    box.appendChild(el("div", "d-block-title", "На более высоких уровнях"));
    box.appendChild(el("div", "d-desc", joinDesc(higherLevel)));
  }
  if (e.damage?.damage_at_slot_level) {
    const txt = Object.entries(e.damage.damage_at_slot_level).map(([lvl, dmg]) => `${lvl} ур. — ${dmg}`).join(", ");
    box.appendChild(row("Урон по уровню ячейки", `${txt} (${trRefName(e.damage.damage_type)})`));
  }
  if (e.dc) box.appendChild(row("Спасбросок", `${trRefName(e.dc.dc_type)}, при успехе: ${e.dc.dc_success}`));
}

function renderMonster(box, e, ru) {
  const ac = Array.isArray(e.armor_class) ? e.armor_class.map((a) => `${a.value}${a.type ? ` (${a.type})` : ""}`).join(", ") : e.armor_class;
  [
    row("Тип", `${e.size || ""} ${e.type || ""}${e.subtype ? ` (${e.subtype})` : ""}`),
    row("Мировоззрение", trAlignment(ru?.alignment || e.alignment)),
    row("КД", ac),
    row("Хиты", `${e.hit_points} (${e.hit_points_roll || e.hit_dice || "?"})`),
    row("Скорость", trSpeed(e.speed)),
    row("Характеристики", `СИЛ ${e.strength} ЛОВ ${e.dexterity} ТЕЛ ${e.constitution} ИНТ ${e.intelligence} МДР ${e.wisdom} ХАР ${e.charisma}`),
    row("Иммунитет к урону", (ru?.damage_immunities || e.damage_immunities || []).map(trDamagePhrase).join(", ")),
    row("Сопротивление урону", (ru?.damage_resistances || e.damage_resistances || []).map(trDamagePhrase).join(", ")),
    row("Уязвимость к урону", (ru?.damage_vulnerabilities || e.damage_vulnerabilities || []).map(trDamagePhrase).join(", ")),
    row("Иммунитет к состояниям", trRefName(e.condition_immunities)),
    row("Чувства", trSenses(e.senses)),
    row("Языки", ru?.languages || e.languages),
    row("Опасность (CR)", `${e.challenge_rating} (${e.xp ?? "?"} опыта)`),
  ].forEach((r) => r && box.appendChild(r));

  const specialAbilities = ru?.special_abilities ?? e.special_abilities;
  if (specialAbilities?.length) {
    box.appendChild(el("div", "d-block-title", "Особенности"));
    for (const sa of specialAbilities) {
      const p = el("div", "d-entry");
      p.innerHTML = `<b>${sa.name}.</b> `;
      p.appendChild(document.createTextNode(sa.desc));
      box.appendChild(p);
    }
  }
  const actions = ru?.actions ?? e.actions;
  if (actions?.length) {
    box.appendChild(el("div", "d-block-title", "Действия"));
    for (const a of actions) {
      const p = el("div", "d-entry");
      p.innerHTML = `<b>${a.name}.</b> `;
      p.appendChild(document.createTextNode(a.desc));
      box.appendChild(p);
    }
  }
  const legendaryActions = ru?.legendary_actions ?? e.legendary_actions;
  if (legendaryActions?.length) {
    box.appendChild(el("div", "d-block-title", "Легендарные действия"));
    for (const a of legendaryActions) {
      const p = el("div", "d-entry");
      p.innerHTML = `<b>${a.name}.</b> `;
      p.appendChild(document.createTextNode(a.desc));
      box.appendChild(p);
    }
  }
}

function renderGeneric(box, e, ru) {
  const desc = ru?.desc ?? e.desc;
  if (desc !== undefined) box.appendChild(el("div", "d-desc", stripMd(joinDesc(desc))));

  const skip = new Set(["name", "index", "url", "desc", "image", "subsections"]);
  for (const [k, v] of Object.entries(e)) {
    if (skip.has(k)) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      const ruVal = ru && typeof ru[k] === "string" ? ru[k] : null;
      const r = row(k, String(ruVal ?? v));
      if (r) box.appendChild(r);
    }
  }

  const subsections = ru?.subsections ?? e.subsections;
  if (Array.isArray(subsections) && subsections.length) {
    box.appendChild(el("div", "d-block-title", "Разделы внутри"));
    for (const s of subsections) box.appendChild(el("div", "d-entry", s.name));
  }

  // предыстории (backgrounds) хранят основной текст не в desc, а в
  // отдельном объекте feature {name, desc}
  const feature = ru?.feature ?? e.feature;
  if (feature?.name) {
    box.appendChild(el("div", "d-block-title", feature.name));
    box.appendChild(el("div", "d-desc", joinDesc(feature.desc)));
  }
}

// ---------- события ----------

searchEl.addEventListener("input", runSearch);
clearBtn.addEventListener("click", () => {
  searchEl.value = "";
  searchEl.focus();
  runSearch();
});
searchEl.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    searchEl.value = "";
    runSearch();
  }
});

loadAll();
searchEl.focus();

