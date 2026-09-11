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
  { slug: "classes", label: "Классы", file: "classes.json" },
  { slug: "spells", label: "Заклинания", file: "spells.json" },
  { slug: "monsters", label: "Монстры", file: "monsters.json" },
  { slug: "conditions", label: "Состояния", file: "conditions.json", ruFile: "conditions.ru.json" },
  { slug: "feats", label: "Черты", file: "feats.json" },
  { slug: "equipment", label: "Снаряжение", file: "equipment.json" },
  { slug: "magic-items", label: "Магические предметы", file: "magic-items.json" },
  { slug: "races", label: "Расы", file: "races.json" },
  { slug: "subraces", label: "Подрасы", file: "subraces.json", ruFile: "subraces.ru.json" },
  { slug: "backgrounds", label: "Предыстории", file: "backgrounds.json" },
  { slug: "skills", label: "Навыки", file: "skills.json", ruFile: "skills.ru.json" },
  { slug: "ability-scores", label: "Характеристики", file: "ability-scores.json", ruFile: "ability-scores.ru.json" },
  { slug: "alignments", label: "Мировоззрения", file: "alignments.json", ruFile: "alignments.ru.json" },
  { slug: "damage-types", label: "Типы урона", file: "damage-types.json", ruFile: "damage-types.ru.json" },
  { slug: "languages", label: "Языки", file: "languages.json", ruFile: "languages.ru.json" },
  { slug: "magic-schools", label: "Школы магии", file: "magic-schools.json", ruFile: "magic-schools.ru.json" },
  { slug: "weapon-properties", label: "Свойства оружия", file: "weapon-properties.json", ruFile: "weapon-properties.ru.json" },
  { slug: "rule-sections", label: "Разделы правил", file: "rule-sections.json" },
  { slug: "rules", label: "Главы правил", file: "rules.json" },
  { slug: "subclasses", label: "Архетипы", file: "subclasses.json" },
  { slug: "traits", label: "Особенности рас", file: "traits.json" },
  { slug: "features", label: "Классовые умения", file: "features.json" },
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
        const searchParts = [entry.name, entry.index, nameRu];
        if (Array.isArray(entry.desc)) searchParts.push(...entry.desc.slice(0, 1));
        else if (typeof entry.desc === "string") searchParts.push(entry.desc.slice(0, 200));
        if (entry.type) searchParts.push(entry.type);
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
    "Начни вводить название — например <b>варвар</b>, <b>fireball</b>, <b>обыватель</b> или <b>ослеплён</b>. " +
    "Классы, состояния, навыки, характеристики и похожие категории — с русским переводом; заклинания, монстры, " +
    "снаряжение и магические предметы — пока только на английском (перевод всего корпуса на тысячи записей не " +
    "делали, чтобы не наврать в цифрах). Либо выбери категорию ниже, чтобы просто полистать.";
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
  detailEl.appendChild(el("div", "d-sub", CAT_BY_SLUG[rowData.category]?.label || rowData.category));

  const body = el("div");
  switch (rowData.category) {
    case "classes":
      renderClass(body, rowData.entry);
      break;
    case "spells":
      renderSpell(body, rowData.entry);
      break;
    case "monsters":
      renderMonster(body, rowData.entry);
      break;
    default:
      renderGeneric(body, rowData.entry, rowData.entryRu);
  }
  detailEl.appendChild(body);
}

function renderClass(box, e) {
  [
    row("Кость хитов", `1к${e.hit_die}`),
    row("Спасброски", refName(e.saving_throws)),
    row("Владения", refName(e.proficiencies)),
    row("Архетипы", refName(e.subclasses)),
  ].forEach((r) => r && box.appendChild(r));

  if (e.proficiency_choices?.length) {
    const d = el("div", "d-desc");
    d.textContent = e.proficiency_choices.map((pc) => pc.desc).filter(Boolean).join("\n");
    box.appendChild(d);
  }
}

function renderSpell(box, e) {
  [
    row("Уровень", e.level === 0 ? "заговор" : e.level),
    row("Школа", refName(e.school)),
    row("Время накладывания", e.casting_time),
    row("Дистанция", e.range),
    row("Компоненты", `${(e.components || []).join(", ")}${e.material ? ` (${e.material})` : ""}`),
    row("Длительность", `${e.duration || ""}${e.concentration ? " (концентрация)" : ""}`),
    row("Ритуал", e.ritual ? "да" : "нет"),
    row("Классы", refName(e.classes)),
  ].forEach((r) => r && box.appendChild(r));

  const desc = el("div", "d-desc", joinDesc(e.desc));
  box.appendChild(desc);

  if (e.higher_level?.length) {
    box.appendChild(el("div", "d-block-title", "На более высоких уровнях"));
    box.appendChild(el("div", "d-desc", joinDesc(e.higher_level)));
  }
  if (e.damage?.damage_at_slot_level) {
    const txt = Object.entries(e.damage.damage_at_slot_level).map(([lvl, dmg]) => `${lvl} ур. — ${dmg}`).join(", ");
    box.appendChild(row("Урон по уровню ячейки", `${txt} (${refName(e.damage.damage_type)})`));
  }
  if (e.dc) box.appendChild(row("Спасбросок", `${refName(e.dc.dc_type)}, при успехе: ${e.dc.dc_success}`));
}

function renderMonster(box, e) {
  const ac = Array.isArray(e.armor_class) ? e.armor_class.map((a) => `${a.value}${a.type ? ` (${a.type})` : ""}`).join(", ") : e.armor_class;
  [
    row("Тип", `${e.size || ""} ${e.type || ""}${e.subtype ? ` (${e.subtype})` : ""}`),
    row("Мировоззрение", e.alignment),
    row("КД", ac),
    row("Хиты", `${e.hit_points} (${e.hit_points_roll || e.hit_dice || "?"})`),
    row("Скорость", Object.entries(e.speed || {}).map(([k, v]) => `${k} ${v}`).join(", ")),
    row("Характеристики", `СИЛ ${e.strength} ЛОВ ${e.dexterity} ТЕЛ ${e.constitution} ИНТ ${e.intelligence} МДР ${e.wisdom} ХАР ${e.charisma}`),
    row("Иммунитет к урону", (e.damage_immunities || []).join(", ")),
    row("Сопротивление урону", (e.damage_resistances || []).join(", ")),
    row("Уязвимость к урону", (e.damage_vulnerabilities || []).join(", ")),
    row("Иммунитет к состояниям", refName(e.condition_immunities)),
    row("Чувства", Object.entries(e.senses || {}).map(([k, v]) => `${k} ${v}`).join(", ")),
    row("Языки", e.languages),
    row("Опасность (CR)", `${e.challenge_rating} (${e.xp ?? "?"} опыта)`),
  ].forEach((r) => r && box.appendChild(r));

  if (e.special_abilities?.length) {
    box.appendChild(el("div", "d-block-title", "Особенности"));
    for (const sa of e.special_abilities) {
      const p = el("div", "d-entry");
      p.innerHTML = `<b>${sa.name}.</b> `;
      p.appendChild(document.createTextNode(sa.desc));
      box.appendChild(p);
    }
  }
  if (e.actions?.length) {
    box.appendChild(el("div", "d-block-title", "Действия"));
    for (const a of e.actions) {
      const p = el("div", "d-entry");
      p.innerHTML = `<b>${a.name}.</b> `;
      p.appendChild(document.createTextNode(a.desc));
      box.appendChild(p);
    }
  }
  if (e.legendary_actions?.length) {
    box.appendChild(el("div", "d-block-title", "Легендарные действия"));
    for (const a of e.legendary_actions) {
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
      const r = row(k, String(v));
      if (r) box.appendChild(r);
    }
  }

  if (Array.isArray(e.subsections) && e.subsections.length) {
    box.appendChild(el("div", "d-block-title", "Разделы внутри"));
    for (const s of e.subsections) box.appendChild(el("div", "d-entry", s.name));
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
