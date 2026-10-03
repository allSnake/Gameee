// Reine Spieldaten: Items, Gebäude, Rezepte, Kapitel. Keine Logik, kein Rendering.

// shape: sphere | box | cyl | cone, s = Skalierung (x, y, z) relativ zu 0,3, t = durchsichtig
export const ITEMS = {
  weizen:         { name: 'Weizen',          shape: 'cone',   color: 0xe9c46a, s: [0.5, 1.1, 0.5] },
  mehl:           { name: 'Mehl',            shape: 'box',    color: 0xf7f3e8, s: [1, 1, 1] },
  brot:           { name: 'Bauernbrot',      shape: 'box',    color: 0xc98a3d, s: [1.5, 0.9, 1] },
  milch:          { name: 'Milch',           shape: 'cyl',    color: 0xe8f1ff, s: [0.7, 1.1, 0.7] },
  butter:         { name: 'Butter',          shape: 'box',    color: 0xffe27a, s: [1.1, 0.6, 0.8] },
  wasser:         { name: 'Wasser',          shape: 'sphere', color: 0x4aa3ff, s: [0.9, 0.9, 0.9], t: true },
  zuckerruebe:    { name: 'Zuckerrübe',      shape: 'cone',   color: 0xf0e2cf, s: [0.7, 1.2, 0.7] },
  zucker:         { name: 'Zucker',          shape: 'box',    color: 0xffffff, s: [0.7, 0.7, 0.7] },
  hefe:           { name: 'Hefe',            shape: 'sphere', color: 0xd8c38f, s: [0.8, 0.8, 0.8] },
  teig:           { name: 'Teig',            shape: 'sphere', color: 0xf2dfb0, s: [1.2, 0.8, 1.2] },
  toastbrot:      { name: 'Toastbrot',       shape: 'box',    color: 0xe3b77a, s: [1.5, 1, 1] },
  toastscheibe:   { name: 'Toastscheibe',    shape: 'box',    color: 0xf0d39c, s: [1.1, 0.25, 1.1] },
  kaese:          { name: 'Käse',            shape: 'box',    color: 0xf6d55c, s: [1.2, 0.7, 1.2] },
  schwein:        { name: 'Schwein',         shape: 'sphere', color: 0xf3a6b8, s: [1.3, 1, 1] },
  fleisch:        { name: 'Bauchfleisch',    shape: 'box',    color: 0xd9665b, s: [1.1, 0.5, 0.9] },
  holz:           { name: 'Holz',            shape: 'cyl',    color: 0x8b5a2b, s: [0.6, 1.5, 0.6] },
  speck:          { name: 'Speck',           shape: 'box',    color: 0xc0504a, s: [1.4, 0.2, 0.8] },
  salatkopf:      { name: 'Salatkopf',       shape: 'sphere', color: 0x6abf4b, s: [1.1, 1.1, 1.1] },
  salat:          { name: 'Salat (gewaschen)', shape: 'box',  color: 0x8fdc6a, s: [1.3, 0.25, 1.3] },
  tomate:         { name: 'Tomate',          shape: 'sphere', color: 0xe04646, s: [1, 1, 1] },
  tomatenscheibe: { name: 'Tomatenscheibe',  shape: 'cyl',    color: 0xf0605a, s: [1.1, 0.25, 1.1] },
  ei:             { name: 'Ei',              shape: 'sphere', color: 0xfff4e0, s: [0.8, 1.05, 0.8] },
  raps:           { name: 'Raps',            shape: 'cone',   color: 0xf5d300, s: [0.6, 1, 0.6] },
  oel:            { name: 'Rapsöl',          shape: 'cyl',    color: 0xf2c94c, s: [0.6, 1.2, 0.6], t: true },
  mayo:           { name: 'Mayo',            shape: 'cyl',    color: 0xfff8dc, s: [0.8, 0.8, 0.8] },
  haehnchen:      { name: 'Hähnchen',        shape: 'sphere', color: 0xf5f0e6, s: [1.1, 1, 1] },
  haehnchenbrust: { name: 'Hähnchenbrust',   shape: 'box',    color: 0xf2c4a8, s: [1.2, 0.5, 0.9] },
  grillhaehnchen: { name: 'Grillhähnchen',   shape: 'box',    color: 0xb5763a, s: [1.2, 0.5, 0.9] },
  apfel:          { name: 'Apfel',           shape: 'sphere', color: 0x8fcf3c, s: [0.9, 0.9, 0.9] },
  apfelsaft:      { name: 'Apfelsaft',       shape: 'cyl',    color: 0xf5c542, s: [0.7, 1.1, 0.7] },
  essig:          { name: 'Essig',           shape: 'cyl',    color: 0xc9a227, s: [0.6, 1.2, 0.6] },
  salzbrocken:    { name: 'Salzbrocken',     shape: 'box',    color: 0xd9d4e6, s: [0.9, 0.8, 0.9] },
  salz:           { name: 'Salz',            shape: 'sphere', color: 0xffffff, s: [0.6, 0.6, 0.6] },
  gurke:          { name: 'Gurke',           shape: 'cyl',    color: 0x3f8f3a, s: [0.5, 1.4, 0.5] },
  essiggurke:     { name: 'Essiggurke',      shape: 'cyl',    color: 0x7aa83a, s: [0.5, 1.3, 0.5] },
  zahnstocher:    { name: 'Zahnstocher',     shape: 'cyl',    color: 0xe8d4a8, s: [0.15, 1.6, 0.15] },
  senfsaat:       { name: 'Senfsaat',        shape: 'sphere', color: 0xc89b3c, s: [0.6, 0.6, 0.6] },
  senfmehl:       { name: 'Senfmehl',        shape: 'box',    color: 0xe7c35a, s: [0.8, 0.8, 0.8] },
  senf:           { name: 'Senf',            shape: 'cyl',    color: 0xf2c230, s: [0.8, 0.9, 0.8] },
  ketchup:        { name: 'Ketchup',         shape: 'cyl',    color: 0xd6281f, s: [0.8, 0.9, 0.8] },
  kraut:          { name: 'Kräuter',         shape: 'cone',   color: 0x3f8f4a, s: [0.7, 1, 0.7] },
  gewuerz:        { name: 'Gewürz',          shape: 'box',    color: 0xd9822b, s: [0.7, 0.7, 0.7] },
  papier:         { name: 'Papier',          shape: 'box',    color: 0xfafafa, s: [1.3, 0.12, 1.3] },
  sandwichbox:    { name: 'Sandwichbox',     shape: 'box',    color: 0xf2e6c9, s: [1.3, 1, 1.3] },
  kohle:          { name: 'Kohle',           shape: 'box',    color: 0x2b2b2e, s: [0.8, 0.7, 0.8] },
  erz:            { name: 'Eisenerz',        shape: 'box',    color: 0x8a5a44, s: [0.9, 0.8, 0.9] },
  eisen:          { name: 'Eisen',           shape: 'box',    color: 0xaab4c2, s: [1.3, 0.4, 0.7] },
  // Bonus: Quietscheente
  rohoel:         { name: 'Rohöl',           shape: 'sphere', color: 0x1c1c22, s: [1, 1, 1] },
  plastik:        { name: 'Plastik',         shape: 'box',    color: 0xdfe6ee, s: [1.1, 0.8, 1.1] },
  pigment:        { name: 'Pigment',         shape: 'sphere', color: 0xff3fa4, s: [0.9, 0.9, 0.9] },
  sand:           { name: 'Sand',            shape: 'sphere', color: 0xe6d29a, s: [1, 0.8, 1] },
  glas:           { name: 'Glas',            shape: 'box',    color: 0x9be7f5, s: [1, 1, 1], t: true },
  gummi:          { name: 'Gummi',           shape: 'sphere', color: 0x4a5160, s: [1, 1, 1] },
  koerper:        { name: 'Entenkörper',     shape: 'sphere', color: 0xffd23f, s: [1.5, 1.2, 1.2] },
  kopf:           { name: 'Entenkopf',       shape: 'sphere', color: 0xffd23f, s: [1, 1, 1] },
  schnabel:       { name: 'Schnabel',        shape: 'cone',   color: 0xff8c1a, s: [0.8, 1.2, 0.8] },
  augen:          { name: 'Augen',           shape: 'sphere', color: 0x15151a, s: [0.7, 0.7, 0.7] },
  quietscher:     { name: 'Quietscher',      shape: 'cyl',    color: 0xb0b6c2, s: [0.8, 0.8, 0.8] },
  farbe:          { name: 'Farbe',           shape: 'cyl',    color: 0xffd23f, s: [0.9, 1, 0.9] },
  lack:           { name: 'Lack',            shape: 'cyl',    color: 0x6fe3ff, s: [0.9, 1, 0.9], t: true },
};

// cat: logistik | quelle | maschine. Quellen erzeugen alle `ticks` Takte ein Item und geben es nach vorn ab.
export const BUILDINGS = {
  belt:       { cat: 'logistik', name: 'Förderband', color: '#4a5666', info: 'Transportiert Items in Pfeilrichtung. Nimmt von hinten und von den Seiten an.' },
  splitter:   { cat: 'logistik', name: 'Verteiler',  color: '#7d8fa3', info: 'Verteilt Items abwechselnd nach vorn, links und rechts.' },
  bruecke:    { cat: 'logistik', name: 'Brücke',     color: '#c08552', info: 'Items springen bis zu 4 Felder weit zur nächsten Brücke mit gleicher Richtung – über alles drüber.' },
  sortierer:  { cat: 'logistik', name: 'Sortierer',  color: '#3fb6c8', info: 'Eine Item-Sorte geht zur Seite (blauer Pfeil), alles andere geradeaus. Lernt die Sorte vom ersten Item, F ändert den Filter.' },
  muelleimer: { cat: 'logistik', name: 'Mülleimer',  color: '#6b6f78', info: 'Vernichtet alles, was hineinfällt. Gegen Stau.' },
  sink:       { cat: 'logistik', name: 'Endmontage', color: '#ffb703', info: 'Nimmt alle Teile fürs Endprojekt an. Überschüssige Teile verschwinden.' },
  lager:      { cat: 'logistik', name: 'Materiallager', color: '#9aa7b8', info: 'Nimmt Eisen an und legt es auf dein Baukonto. Damit bezahlst du neue Gebäude.' },

  weizenfeld:       { cat: 'quelle', name: 'Weizenfeld',      out: 'weizen',      ticks: 6, color: '#e9c46a' },
  kuhweide:         { cat: 'quelle', name: 'Kuhweide',        out: 'milch',       ticks: 5, color: '#f2f2f2' },
  brunnen:          { cat: 'quelle', name: 'Brunnen',         out: 'wasser',      ticks: 4, color: '#4aa3ff' },
  zuckerruebenfeld: { cat: 'quelle', name: 'Zuckerrübenfeld', out: 'zuckerruebe', ticks: 6, color: '#f0e2cf' },
  schweinestall:    { cat: 'quelle', name: 'Schweinestall',   out: 'schwein',     ticks: 8, color: '#f3a6b8' },
  wald:             { cat: 'quelle', name: 'Wald',            out: 'holz',        ticks: 6, color: '#8b5a2b' },
  salatbeet:        { cat: 'quelle', name: 'Salatbeet',       out: 'salatkopf',   ticks: 6, color: '#6abf4b' },
  gewaechshaus:     { cat: 'quelle', name: 'Gewächshaus',     out: 'tomate',      ticks: 6, color: '#e04646' },
  huehnerstall:     { cat: 'quelle', name: 'Hühnerstall',     out: 'ei',          ticks: 6, color: '#fff4e0' },
  rapsfeld:         { cat: 'quelle', name: 'Rapsfeld',        out: 'raps',        ticks: 6, color: '#f5d300' },
  haehnchenfarm:    { cat: 'quelle', name: 'Hähnchenfarm',    out: 'haehnchen',   ticks: 8, color: '#f5f0e6' },
  salzmine:         { cat: 'quelle', name: 'Salzmine',        out: 'salzbrocken', ticks: 6, color: '#d9d4e6' },
  apfelbaum:        { cat: 'quelle', name: 'Apfelbaum',       out: 'apfel',       ticks: 6, color: '#8fcf3c' },
  gurkenbeet:       { cat: 'quelle', name: 'Gurkenbeet',      out: 'gurke',       ticks: 6, color: '#3f8f3a' },
  senffeld:         { cat: 'quelle', name: 'Senffeld',        out: 'senfsaat',    ticks: 6, color: '#c89b3c' },
  kraeutergarten:   { cat: 'quelle', name: 'Kräutergarten',   out: 'kraut',       ticks: 6, color: '#3f8f4a' },
  oelquelle:        { cat: 'quelle', name: 'Ölquelle',        out: 'rohoel',      ticks: 5, color: '#2a2a33' },
  pigmentmine:      { cat: 'quelle', name: 'Pigmentmine',     out: 'pigment',     ticks: 6, color: '#ff3fa4' },
  sandgrube:        { cat: 'quelle', name: 'Sandgrube',       out: 'sand',        ticks: 5, color: '#e6d29a' },
  gummibaum:        { cat: 'quelle', name: 'Gummibaum',       out: 'gummi',       ticks: 7, color: '#4a5160' },
  kohlemine:        { cat: 'quelle', name: 'Kohlemine',       out: 'kohle',       ticks: 5, color: '#2b2b2e' },
  erzmine:          { cat: 'quelle', name: 'Erzmine',         out: 'erz',         ticks: 6, color: '#8a5a44' },

  muehle:         { cat: 'maschine', name: 'Mühle',          color: '#b8b8c0' },
  ofen:           { cat: 'maschine', name: 'Ofen',           color: '#d9534f' },
  butterfass:     { cat: 'maschine', name: 'Butterfass',     color: '#a0703c' },
  zuckerfabrik:   { cat: 'maschine', name: 'Zuckerfabrik',   color: '#e8e4f0' },
  gaerfass:       { cat: 'maschine', name: 'Gärfass',        color: '#7a5230' },
  knetmaschine:   { cat: 'maschine', name: 'Knetmaschine',   color: '#c9ced8' },
  schneider:      { cat: 'maschine', name: 'Schneider',      color: '#9fb4c7' },
  kaeserei:       { cat: 'maschine', name: 'Käserei',        color: '#f1c453' },
  metzgerei:      { cat: 'maschine', name: 'Metzgerei',      color: '#e9eef2' },
  raeucherei:     { cat: 'maschine', name: 'Räucherei',      color: '#5a4030' },
  waschanlage:    { cat: 'maschine', name: 'Waschanlage',    color: '#5fa8d3' },
  oelpresse:      { cat: 'maschine', name: 'Ölpresse',       color: '#8aa04a' },
  mixer:          { cat: 'maschine', name: 'Mixer',          color: '#8f95a3' },
  grill:          { cat: 'maschine', name: 'Grill',          color: '#2d2d33' },
  saftpresse:     { cat: 'maschine', name: 'Saftpresse',     color: '#f08a24' },
  einmachstation: { cat: 'maschine', name: 'Einmachstation', color: '#7aa83a' },
  schnitzerei:    { cat: 'maschine', name: 'Schnitzerei',    color: '#b07a45' },
  kochtopf:       { cat: 'maschine', name: 'Kochtopf',       color: '#c0392b' },
  papierfabrik:   { cat: 'maschine', name: 'Papierfabrik',   color: '#7f8c9a' },
  faltmaschine:   { cat: 'maschine', name: 'Faltmaschine',   color: '#d8b98a' },
  raffinerie:     { cat: 'maschine', name: 'Raffinerie',     color: '#555b66' },
  formpresse:     { cat: 'maschine', name: 'Formpresse',     color: '#f08a24' },
  schmelze:       { cat: 'maschine', name: 'Schmelzofen',    color: '#c4552b' },
};

// Rezepte: m = Maschine, in = Zutaten, out × n = Ergebnis, t = Takte (1 Takt = 0,25 s), from = Kapitel, ab dem es gilt.
// Innerhalb eines Kapitels hat jedes Item genau einen Hersteller, damit Rezeptbuch und Demo eindeutig sind.
export const RECIPES = [
  // Kapitel 1 – Butterbrot
  { m: 'muehle',       in: { weizen: 1 },                        out: 'mehl',           n: 1, t: 4, from: 'butterbrot' },
  { m: 'ofen',         in: { mehl: 1 },                          out: 'brot',           n: 1, t: 6, from: 'butterbrot' },
  { m: 'butterfass',   in: { milch: 2 },                         out: 'butter',         n: 1, t: 6, from: 'butterbrot' },
  // Kapitel 2 – Käsetoast
  { m: 'zuckerfabrik', in: { zuckerruebe: 1 },                   out: 'zucker',         n: 1, t: 4, from: 'kaesetoast' },
  { m: 'gaerfass',     in: { zucker: 1, wasser: 1 },             out: 'hefe',           n: 1, t: 6, from: 'kaesetoast' },
  { m: 'knetmaschine', in: { mehl: 1, wasser: 1, hefe: 1 },      out: 'teig',           n: 1, t: 5, from: 'kaesetoast' },
  { m: 'ofen',         in: { teig: 1, kohle: 1 },                out: 'toastbrot',      n: 1, t: 8, from: 'kaesetoast' },
  { m: 'schneider',    in: { toastbrot: 1 },                     out: 'toastscheibe',   n: 4, t: 4, from: 'kaesetoast' },
  { m: 'kaeserei',     in: { milch: 2 },                         out: 'kaese',          n: 1, t: 8, from: 'kaesetoast' },
  { m: 'schmelze',     in: { erz: 1, kohle: 1 },                 out: 'eisen',          n: 1, t: 6, from: 'kaesetoast' },
  // Kapitel 3 – BLT
  { m: 'metzgerei',    in: { schwein: 1 },                       out: 'fleisch',        n: 2, t: 6, from: 'blt' },
  { m: 'raeucherei',   in: { fleisch: 1, holz: 1 },              out: 'speck',          n: 1, t: 6, from: 'blt' },
  { m: 'waschanlage',  in: { salatkopf: 1, wasser: 1 },          out: 'salat',          n: 1, t: 4, from: 'blt' },
  { m: 'schneider',    in: { tomate: 1 },                        out: 'tomatenscheibe', n: 2, t: 3, from: 'blt' },
  { m: 'oelpresse',    in: { raps: 1 },                          out: 'oel',            n: 1, t: 5, from: 'blt' },
  { m: 'mixer',        in: { ei: 1, oel: 1 },                    out: 'mayo',           n: 1, t: 5, from: 'blt' },
  // Kapitel 4 – Club-Sandwich
  { m: 'metzgerei',    in: { haehnchen: 1 },                     out: 'haehnchenbrust', n: 2, t: 6, from: 'club' },
  { m: 'muehle',       in: { salzbrocken: 1 },                   out: 'salz',           n: 1, t: 4, from: 'club' },
  { m: 'grill',        in: { haehnchenbrust: 1, salz: 1, kohle: 1 }, out: 'grillhaehnchen', n: 1, t: 6, from: 'club' },
  { m: 'saftpresse',   in: { apfel: 1 },                         out: 'apfelsaft',      n: 1, t: 4, from: 'club' },
  { m: 'gaerfass',     in: { apfelsaft: 1 },                     out: 'essig',          n: 1, t: 8, from: 'club' },
  { m: 'einmachstation', in: { gurke: 1, essig: 1, salz: 1 },    out: 'essiggurke',     n: 1, t: 6, from: 'club' },
  { m: 'schnitzerei',  in: { holz: 1 },                          out: 'zahnstocher',    n: 4, t: 4, from: 'club' },
  // Kapitel 5 – Weltrekord
  { m: 'muehle',       in: { senfsaat: 1 },                      out: 'senfmehl',       n: 1, t: 4, from: 'weltrekord' },
  { m: 'mixer',        in: { senfmehl: 1, essig: 1 },            out: 'senf',           n: 1, t: 5, from: 'weltrekord' },
  { m: 'kochtopf',     in: { tomate: 1, zucker: 1, essig: 1 },   out: 'ketchup',        n: 1, t: 6, from: 'weltrekord' },
  { m: 'muehle',       in: { kraut: 1 },                         out: 'gewuerz',        n: 1, t: 4, from: 'weltrekord' },
  { m: 'papierfabrik', in: { holz: 1, wasser: 1 },               out: 'papier',         n: 1, t: 5, from: 'weltrekord' },
  { m: 'faltmaschine', in: { papier: 2 },                        out: 'sandwichbox',    n: 1, t: 5, from: 'weltrekord' },
  // Bonus – Quietscheente (eigener Rezeptsatz)
  { m: 'schmelze',     in: { erz: 1, kohle: 1 },                 out: 'eisen',          n: 1, t: 6, from: 'ente' },
  { m: 'raffinerie',   in: { rohoel: 1 },                        out: 'plastik',        n: 1, t: 5, from: 'ente' },
  { m: 'formpresse',   in: { plastik: 1 },                       out: 'koerper',        n: 1, t: 5, from: 'ente' },
  { m: 'formpresse',   in: { gummi: 1 },                         out: 'kopf',           n: 1, t: 5, from: 'ente' },
  { m: 'schneider',    in: { holz: 1 },                          out: 'schnabel',       n: 1, t: 4, from: 'ente' },
  { m: 'ofen',         in: { sand: 1, kohle: 1 },                out: 'glas',           n: 1, t: 6, from: 'ente' },
  { m: 'schneider',    in: { glas: 1 },                          out: 'augen',          n: 2, t: 4, from: 'ente' },
  { m: 'mixer',        in: { gummi: 1, plastik: 1 },             out: 'quietscher',     n: 1, t: 5, from: 'ente' },
  { m: 'mixer',        in: { pigment: 1, rohoel: 1 },            out: 'farbe',          n: 1, t: 5, from: 'ente' },
  { m: 'mixer',        in: { glas: 1, rohoel: 1 },               out: 'lack',           n: 1, t: 5, from: 'ente' },
  { m: 'papierfabrik', in: { holz: 1, wasser: 1 },               out: 'papier',         n: 1, t: 5, from: 'ente' },
];

// Kampagne: jedes Kapitel schaltet Gebäude und Rezepte frei, die danach erhalten bleiben.
export const CAMPAIGN = ['butterbrot', 'kaesetoast', 'blt', 'club', 'weltrekord'];

// stars: Spielzeit in Sekunden für ★★★ und ★★ (alles darüber gibt ★)
export const CHAPTERS = {
  butterbrot: {
    budget: 100,
    title: 'Das Butterbrot', short: 'Butterbrot', grid: 16, stars: [240, 480], tutorial: true,
    story: 'Ein Kunde bestellt ein Butterbrot. Ein einziges. Die Firmenleitung hält es für angemessen, dafür eine vollautomatische Fabrik zu errichten.',
    tip: 'Bauen kostet Eisen (oben im Kopf, Abreißen gibt es zurück) – für dieses Kapitel reicht das Startkapital. Folge den Schritten oben. Der weiße Pfeil auf jedem Gebäude zeigt, wohin es seine Produkte abgibt.',
    unlock: ['belt', 'sink', 'muelleimer', 'weizenfeld', 'kuhweide', 'muehle', 'ofen', 'butterfass'],
    parts: [{ item: 'brot', need: 4 }, { item: 'butter', need: 4 }],
  },
  kaesetoast: {
    budget: 120,
    title: 'Der Käsetoast', short: 'Käsetoast', grid: 22, stars: [540, 960],
    story: 'Der Kunde war begeistert und will jetzt einen Käsetoast. Leider weiß niemand, wie man Toastbrot macht. Zeit, Hefe zu züchten.',
    tip: 'Ab jetzt braucht der Ofen Kohle. Und Bauen kostet Eisen: Erzmine + Kohlemine → Schmelzofen → Materiallager füllt dein Baukonto. Ein Verteiler teilt einen Strom auf – praktisch, wenn eine Kuhweide Butterfass und Käserei gleichzeitig beliefern soll. Maschinen mit mehreren Zutaten nehmen sie von allen Seiten an.',
    unlock: ['splitter', 'lager', 'kohlemine', 'erzmine', 'schmelze', 'brunnen', 'zuckerruebenfeld', 'zuckerfabrik', 'gaerfass', 'knetmaschine', 'schneider', 'kaeserei'],
    parts: [{ item: 'toastscheibe', need: 8 }, { item: 'kaese', need: 4 }, { item: 'butter', need: 4 }],
  },
  blt: {
    budget: 140,
    title: 'Das BLT', short: 'BLT', grid: 28, stars: [840, 1500],
    story: 'Bacon, Lettuce, Tomato. Die Marketingabteilung findet, „Speck, Salat, Tomate" klinge nicht international genug. Dafür brauchen wir jetzt Schweine.',
    tip: 'Brücken lassen Items über andere Bänder springen: eine Brücke als Eingang, eine zweite (gleiche Richtung) bis zu 4 Felder weiter als Ausgang.',
    unlock: ['bruecke', 'schweinestall', 'wald', 'salatbeet', 'gewaechshaus', 'huehnerstall', 'rapsfeld', 'metzgerei', 'raeucherei', 'waschanlage', 'oelpresse', 'mixer'],
    parts: [{ item: 'toastscheibe', need: 8 }, { item: 'speck', need: 6 }, { item: 'salat', need: 4 }, { item: 'tomatenscheibe', need: 6 }, { item: 'mayo', need: 4 }],
  },
  club: {
    budget: 170,
    title: 'Das Club-Sandwich', short: 'Club', grid: 34, stars: [1260, 2100],
    story: 'Drei Etagen. Ein Zahnstocher. Null Kompromisse. Der Club-Sandwich-Club hat angefragt und erwartet Perfektion – inklusive selbst eingelegter Gurken.',
    tip: 'Der Sortierer schickt eine Item-Sorte zur Seite und alles andere geradeaus. So kannst du gemischte Bänder trennen. F über einem Sortierer ändert den Filter.',
    unlock: ['sortierer', 'haehnchenfarm', 'salzmine', 'apfelbaum', 'gurkenbeet', 'grill', 'saftpresse', 'einmachstation', 'schnitzerei'],
    parts: [{ item: 'toastscheibe', need: 12 }, { item: 'grillhaehnchen', need: 4 }, { item: 'speck', need: 4 }, { item: 'salat', need: 4 },
      { item: 'tomatenscheibe', need: 4 }, { item: 'essiggurke', need: 4 }, { item: 'mayo', need: 4 }, { item: 'zahnstocher', need: 4 }],
  },
  weltrekord: {
    budget: 220,
    title: 'Das Weltrekord-Sandwich', short: 'Weltrekord', grid: 42, stars: [2100, 3600],
    story: 'Das Rekord-Komitee ist unterwegs. Baue das größte Sandwich der Welt – mit allem, was die Fabrik je gelernt hat, plus Senf, Ketchup und einer Box, die groß genug ist.',
    tip: 'Viel hilft viel: Baue starke Ketten mehrfach und verteile sie. Mülleimer am Ende von Überlauf-Bändern verhindern Staus.',
    unlock: ['senffeld', 'kraeutergarten', 'kochtopf', 'papierfabrik', 'faltmaschine'],
    parts: [{ item: 'toastscheibe', need: 24 }, { item: 'butter', need: 8 }, { item: 'kaese', need: 8 }, { item: 'speck', need: 8 },
      { item: 'grillhaehnchen', need: 6 }, { item: 'salat', need: 8 }, { item: 'tomatenscheibe', need: 8 }, { item: 'essiggurke', need: 6 },
      { item: 'mayo', need: 6 }, { item: 'senf', need: 6 }, { item: 'ketchup', need: 6 }, { item: 'gewuerz', need: 6 },
      { item: 'zahnstocher', need: 4 }, { item: 'sandwichbox', need: 4 }],
  },
  ente: {
    budget: 150,
    title: 'Bonus: Die Riesen-Quietscheente', short: 'Bonus: Ente', grid: 28, stars: [900, 1680], bonus: true,
    story: 'Eine kurze Pause vom Sandwich: Die Badewannen-Abteilung braucht eine Riesen-Quietscheente. Rückfragen werden nicht beantwortet.',
    tip: 'Hier gelten eigene Rezepte. Schau ins Rezeptbuch (B), wenn du nicht weiterweißt.',
    unlock: ['belt', 'sink', 'muelleimer', 'splitter', 'bruecke', 'sortierer', 'oelquelle', 'pigmentmine', 'sandgrube', 'gummibaum', 'wald', 'brunnen', 'lager', 'kohlemine', 'erzmine', 'schmelze',
      'raffinerie', 'formpresse', 'ofen', 'schneider', 'mixer', 'papierfabrik'],
    parts: [{ item: 'koerper', need: 3 }, { item: 'kopf', need: 3 }, { item: 'schnabel', need: 3 }, { item: 'augen', need: 3 },
      { item: 'quietscher', need: 3 }, { item: 'farbe', need: 3 }, { item: 'lack', need: 3 }, { item: 'papier', need: 2 }],
  },
};

// Alles, was in einem Kapitel verfügbar ist: Gebäude (mit "neu"-Markierung), Rezepte, Hersteller je Item.
export function chapterContent(id) {
  const ch = CHAPTERS[id];
  const idx = CAMPAIGN.indexOf(id);
  const scope = idx >= 0 ? CAMPAIGN.slice(0, idx + 1) : [id];
  const buildings = new Set();
  for (const c of scope) for (const b of CHAPTERS[c].unlock) buildings.add(b);
  const recipes = RECIPES.filter(r => scope.includes(r.from));
  const byMachine = {};
  for (const r of recipes) (byMachine[r.m] ||= []).push(r);
  const producer = {};
  for (const b of buildings) if (BUILDINGS[b].cat === 'quelle') producer[BUILDINGS[b].out] = { source: b };
  for (const r of recipes) producer[r.out] = { machine: r.m, recipe: r };
  const isNew = new Set(idx > 0 ? ch.unlock : []);
  const order = ['logistik', 'quelle', 'maschine'];
  const list = [...buildings].sort((a, b) => order.indexOf(BUILDINGS[a].cat) - order.indexOf(BUILDINGS[b].cat));
  return { id, chapter: ch, buildings: list, isNew, recipes, byMachine, producer, parts: ch.parts };
}

// Baukosten in Eisen. Abreißen gibt alles zurück.
const COSTS = { belt: 1, splitter: 3, bruecke: 4, sortierer: 5, muelleimer: 2, sink: 5, lager: 5 };
export function costOf(kind) {
  return COSTS[kind] ?? (BUILDINGS[kind].cat === 'quelle' ? 6 : 12);
}

export const TICK = 0.25; // Sekunden pro Simulationstakt
