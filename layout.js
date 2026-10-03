// Baut automatisch eine funktionierende Fabrik für ein Kapitel (Demo-Modus und Tests).
//
// Jedes Teil bekommt einen eigenen Baum: die Maschine steht rechts, ihre Zutaten-Teilbäume links davon,
// übereinander gestapelt. Die mittlere Zutat kommt von hinten, die obere/untere über ein senkrechtes Band
// von oben bzw. unten.

function measure(item, producer) {
  const p = producer[item];
  if (!p) throw new Error(`Kein Hersteller für ${item}`);
  if (p.source) return { item, kind: p.source, w: 1, h: 1, root: 0, kids: [] };
  const inputs = Object.keys(p.recipe.in).map(i => measure(i, producer));
  // Reihenfolge: [oben, mitte, unten]; die erste Zutat kommt von hinten (Mitte)
  const kids = inputs.length === 1 ? [null, inputs[0], null]
    : inputs.length === 2 ? [inputs[1], inputs[0], null]
    : [inputs[1], inputs[0], inputs[2]];
  const present = kids.filter(Boolean);
  const h = present.reduce((s, k) => s + k.h, 0);
  const w = Math.max(...present.map(k => k.w)) + 2;
  const root = (kids[0] ? kids[0].h : 0) + kids[1].root;
  return { item, kind: p.machine, w, h, root, kids };
}

// Setzt einen gemessenen Baum so, dass seine Wurzel bei (xr, z0 + root) steht und nach +x ausgibt.
function place(node, xr, z0, out) {
  const zr = z0 + node.root;
  out.push([node.kind, xr, zr, 0]);
  if (!node.kids.length) return;
  const [top, mid, bot] = node.kids;
  let z = z0;
  if (top) {
    place(top, xr - 2, z, out);
    const zt = z + top.root;
    out.push(['belt', xr - 1, zt, 0]);
    for (let y = zt; y < zr; y++) out.push(['belt', xr, y, 1]);
    z += top.h;
  }
  place(mid, xr - 2, z, out);
  out.push(['belt', xr - 1, zr, 0]);
  z += mid.h;
  if (bot) {
    place(bot, xr - 2, z, out);
    const zb = z + bot.root;
    out.push(['belt', xr - 1, zb, 0]);
    for (let y = zb; y > zr; y--) out.push(['belt', xr, y, 3]);
  }
}

// Liefert [[kind, x, z, dir], ...] oder null, wenn es nicht ins Raster passt.
// Jedes Teil endet in einer eigenen Endmontage – alle zählen fürs selbe Endprojekt.
export function planChapter(content, N) {
  const trees = content.parts.map(p => measure(p.item, content.producer));
  const xr = Math.max(...trees.map(t => t.w));   // Wurzelspalte (Spalte 0 bleibt frei)
  if (xr + 2 >= N) return null;
  for (const gap of [1, 0]) {
    const total = trees.reduce((s, t) => s + t.h, 0) + gap * (trees.length - 1);
    if (total > N) continue;
    const out = [];
    let z = Math.floor((N - total) / 2);
    for (const t of trees) {
      place(t, xr, z, out);
      out.push(['belt', xr + 1, z + t.root, 0]);
      out.push(['sink', xr + 2, z + t.root, 0]);
      z += t.h + gap;
    }
    return out;
  }
  return null;
}
