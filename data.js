// Reine Spieldaten: Items, Quellen, Maschinen, Kapitel. Keine Logik, kein Rendering.

// shape: sphere | box | cyl | cone, s = Skalierung (x, y, z) relativ zu 0,3
export const ITEMS = {
  // Kapitel 1
  weizen:         { name: 'Weizen',         shape: 'cone',   color: 0xe9c46a, s: [0.5, 1.1, 0.5] },
  mehl:           { name: 'Mehl',           shape: 'box',    color: 0xf7f3e8, s: [1, 1, 1] },
  brot:           { name: 'Brot',           shape: 'box',    color: 0xc98a3d, s: [1.4, 0.9, 1] },
  milch:          { name: 'Milch',          shape: 'cyl',    color: 0xe8f1ff, s: [0.7, 1.1, 0.7] },
  kaese:          { name: 'Käse',           shape: 'box',    color: 0xf6d55c, s: [1.2, 0.7, 1.2] },
  salatkopf:      { name: 'Salatkopf',      shape: 'sphere', color: 0x6abf4b, s: [1.1, 1.1, 1.1] },
  salat:          { name: 'Salat',          shape: 'box',    color: 0x8fdc6a, s: [1.3, 0.25, 1.3] },
  tomate:         { name: 'Tomate',         shape: 'sphere', color: 0xe04646, s: [1, 1, 1] },
  tomatenscheibe: { name: 'Tomatenscheibe', shape: 'cyl',    color: 0xf0605a, s: [1.1, 0.25, 1.1] },
  schwein:        { name: 'Schwein',        shape: 'sphere', color: 0xf3a6b8, s: [1.3, 1, 1] },
  wurst:          { name: 'Wurst',          shape: 'cyl',    color: 0xa5453d, s: [0.6, 1.4, 0.6] },
  kraut:          { name: 'Kraut',          shape: 'cone',   color: 0x3f8f4a, s: [0.7, 1, 0.7] },
  gewuerz:        { name: 'Gewürz',         shape: 'box',    color: 0xd9822b, s: [0.7, 0.7, 0.7] },
  sosse:          { name: 'Soße',           shape: 'cyl',    color: 0xd23f2c, s: [0.8, 0.9, 0.8] },
  holz:           { name: 'Holz',           shape: 'cyl',    color: 0x8b5a2b, s: [0.6, 1.5, 0.6] },
  papier:         { name: 'Papier',         shape: 'box',    color: 0xfafafa, s: [1.3, 0.12, 1.3] },
  // Kapitel 2
  oel:            { name: 'Öl',             shape: 'sphere', color: 0x1c1c22, s: [1, 1, 1] },
  plastik:        { name: 'Plastik',        shape: 'box',    color: 0xdfe6ee, s: [1.1, 0.8, 1.1] },
  pigment:        { name: 'Pigment',        shape: 'sphere', color: 0xff3fa4, s: [0.9, 0.9, 0.9] },
  sand:           { name: 'Sand',           shape: 'sphere', color: 0xe6d29a, s: [1, 0.8, 1] },
  glas:           { name: 'Glas',           shape: 'box',    color: 0x9be7f5, s: [1, 1, 1] },
  gummi:          { name: 'Gummi',          shape: 'sphere', color: 0x4a5160, s: [1, 1, 1] },
  koerper:        { name: 'Körper',         shape: 'sphere', color: 0xffd23f, s: [1.5, 1.2, 1.2] },
  kopf:           { name: 'Kopf',           shape: 'sphere', color: 0xffd23f, s: [1, 1, 1] },
  schnabel:       { name: 'Schnabel',       shape: 'cone',   color: 0xff8c1a, s: [0.8, 1.2, 0.8] },
  augen:          { name: 'Augen',          shape: 'sphere', color: 0x15151a, s: [0.7, 0.7, 0.7] },
  quietscher:     { name: 'Quietscher',     shape: 'cyl',    color: 0xb0b6c2, s: [0.8, 0.8, 0.8] },
  farbe:          { name: 'Farbe',          shape: 'cyl',    color: 0xffd23f, s: [0.9, 1, 0.9] },
  lack:           { name: 'Lack',           shape: 'cyl',    color: 0x6fe3ff, s: [0.9, 1, 0.9] },
};

// Quellen erzeugen ein Item in fester Taktung und geben es nach vorn ab.
export const SOURCES = {
  weizenfeld:     { name: 'Weizenfeld',     out: 'weizen',    ticks: 6, color: '#e9c46a' },
  kuhstall:       { name: 'Kuhstall',       out: 'milch',     ticks: 8, color: '#f2f2f2' },
  salatbeet:      { name: 'Salatbeet',      out: 'salatkopf', ticks: 6, color: '#6abf4b' },
  gewaechshaus:   { name: 'Gewächshaus',    out: 'tomate',    ticks: 6, color: '#e04646' },
  schweinestall:  { name: 'Schweinestall',  out: 'schwein',   ticks: 8, color: '#f3a6b8' },
  kraeutergarten: { name: 'Kräutergarten',  out: 'kraut',     ticks: 6, color: '#3f8f4a' },
  wald:           { name: 'Wald',           out: 'holz',      ticks: 6, color: '#8b5a2b' },
  oelquelle:      { name: 'Ölquelle',       out: 'oel',       ticks: 5, color: '#2a2a33' },
  pigmentmine:    { name: 'Pigmentmine',    out: 'pigment',   ticks: 6, color: '#ff3fa4' },
  sandgrube:      { name: 'Sandgrube',      out: 'sand',      ticks: 5, color: '#e6d29a' },
  gummibaum:      { name: 'Gummibaum',      out: 'gummi',     ticks: 7, color: '#4a5160' },
};

// Maschinen: mehrere Rezepte möglich, Rezepte mit mehreren Zutaten warten, bis alles da ist.
export const MACHINES = {
  muehle:     { name: 'Mühle',       color: '#b8b8c0', recipes: [
    { in: { weizen: 1 }, out: 'mehl',    ticks: 4 },
    { in: { kraut: 1 },  out: 'gewuerz', ticks: 4 } ] },
  ofen:       { name: 'Ofen',        color: '#d9534f', recipes: [
    { in: { mehl: 1 },    out: 'brot',  ticks: 6 },
    { in: { schwein: 1 }, out: 'wurst', ticks: 6 },
    { in: { sand: 1 },    out: 'glas',  ticks: 6 } ] },
  schneider:  { name: 'Schneider',   color: '#9fb4c7', recipes: [
    { in: { salatkopf: 1 }, out: 'salat',          ticks: 3 },
    { in: { tomate: 1 },    out: 'tomatenscheibe', ticks: 3 },
    { in: { holz: 1 },      out: 'schnabel',       ticks: 4 },
    { in: { glas: 1 },      out: 'augen',          ticks: 4 } ] },
  kaeserei:   { name: 'Käserei',     color: '#f1c453', recipes: [
    { in: { milch: 1 }, out: 'kaese', ticks: 6 } ] },
  presse:     { name: 'Presse',      color: '#4f6d9a', recipes: [
    { in: { holz: 1 }, out: 'papier', ticks: 4 } ] },
  mixer:      { name: 'Mixer',       color: '#8f95a3', recipes: [
    { in: { tomate: 1, gewuerz: 1 }, out: 'sosse',      ticks: 5 },
    { in: { gummi: 1, plastik: 1 },  out: 'quietscher', ticks: 5 },
    { in: { pigment: 1, oel: 1 },    out: 'farbe',      ticks: 5 },
    { in: { glas: 1, oel: 1 },       out: 'lack',       ticks: 5 } ] },
  raffinerie: { name: 'Raffinerie',  color: '#555b66', recipes: [
    { in: { oel: 1 }, out: 'plastik', ticks: 5 } ] },
  formpresse: { name: 'Formpresse',  color: '#f08a24', recipes: [
    { in: { plastik: 1 }, out: 'koerper', ticks: 5 },
    { in: { gummi: 1 },   out: 'kopf',    ticks: 5 } ] },
};

export const LOGISTICS = {
  belt:     { name: 'Förderband', color: '#4a5666', info: 'Transportiert Items in Pfeilrichtung.' },
  splitter: { name: 'Verteiler',  color: '#7d8fa3', info: 'Verteilt Items abwechselnd nach vorn, links und rechts.' },
  sink:     { name: 'Endmontage', color: '#ffb703', info: 'Nimmt alle Teile fürs Endprojekt an. Überschüssige Teile verschwinden.' },
};

// Kapitel: Teile des Endprojekts, verfügbare Bauteile, Rastergröße.
export const CHAPTERS = {
  sandwich: {
    title: 'Das perfekte Sandwich',
    short: 'Sandwich',
    parts: [
      { item: 'brot', need: 2 }, { item: 'kaese', need: 2 }, { item: 'salat', need: 2 },
      { item: 'tomatenscheibe', need: 2 }, { item: 'wurst', need: 2 }, { item: 'sosse', need: 2 },
      { item: 'gewuerz', need: 2 }, { item: 'papier', need: 1 },
    ],
    sources: ['weizenfeld', 'kuhstall', 'salatbeet', 'gewaechshaus', 'schweinestall', 'kraeutergarten', 'wald'],
    machines: ['muehle', 'ofen', 'schneider', 'kaeserei', 'presse', 'mixer'],
  },
  ente: {
    title: 'Die Riesen-Quietscheente',
    short: 'Ente',
    parts: [
      { item: 'koerper', need: 2 }, { item: 'kopf', need: 2 }, { item: 'schnabel', need: 2 },
      { item: 'augen', need: 2 }, { item: 'quietscher', need: 2 }, { item: 'farbe', need: 2 },
      { item: 'lack', need: 2 }, { item: 'papier', need: 1 },
    ],
    sources: ['oelquelle', 'pigmentmine', 'sandgrube', 'gummibaum', 'wald'],
    machines: ['raffinerie', 'formpresse', 'ofen', 'schneider', 'presse', 'mixer'],
  },
};

export const GRID = 24;
