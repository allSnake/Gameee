# Absurd Industries

Automatisierungsspiel in 3D: Du baust riesige Fabriken für absurde Endprojekte.

- **Kapitel 1 – Das perfekte Sandwich:** 8 Teile (Brot, Käse, Salat, Tomate, Wurst, Soße, Gewürz, Verpackung), jedes mit eigener Produktionskette.
- **Kapitel 2 – Die Riesen-Quietscheente:** Körper, Kopf, Schnabel, Augen, Quietscher, Farbe, Lack, Verpackung.

Das Endprojekt wächst auf dem Sockel neben dem Spielfeld, sobald Teile in der Endmontage ankommen.

## Starten

Kein Build nötig, Three.js liegt unter `vendor/three/`.

    python3 -m http.server 8000

Dann `http://localhost:8000` öffnen. Nützliche URL-Parameter: `?demo` (Demo-Fabrik), `?chapter=ente`, `?fresh` (Spielstand ignorieren).

## Bedienung

- Linksklick: bauen (Förderbänder: gedrückt ziehen, sie richten sich nach der Zugrichtung aus)
- R: drehen (auch das Gebäude unter dem Mauszeiger) · Shift+Klick oder 0: abreißen · 1–9: Werkzeug
- Rechte Maustaste: Kamera drehen · WASD: verschieben · Mausrad: Zoom
- Unten links steht, was das gewählte oder überfahrene Gebäude produziert.
- Der Spielstand wird pro Kapitel automatisch im Browser gespeichert.

## Aufbau

| Datei | Inhalt |
|---|---|
| `data.js` | Items, Quellen, Maschinen (mit Rezepten), Kapitel – hier Inhalte erweitern |
| `models.js` | 3D-Modelle für Gebäude, Items und Endprojekte |
| `game.js` | Simulation, Eingabe, HUD, Speichern, Demo-Fabrik |
| `audio.js` | Kleine WebAudio-Effekte |

Neue Maschine oder neues Rezept: Eintrag in `data.js` ergänzen, Modell in `models.js` (`machineDecor`) hinzufügen.
