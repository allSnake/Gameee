# Absurd Industries – Das Sandwich-Imperium

Ein 3D-Automatisierungsspiel im Browser: Du baust vollautomatische Fabriken für völlig unnötige Sandwiches.
Jedes Kapitel ist eine Bestellung, jede Zutat entsteht in einer echten Produktionskette – vom Weizenfeld bis zur Toastscheibe,
vom Schwein bis zum Speck, vom Apfelbaum bis zur selbst eingelegten Essiggurke.

## Kapitel

| # | Kapitel | Bestellung | Neu |
|---|---|---|---|
| 1 | **Das Butterbrot** (Tutorial) | Bauernbrot, Butter | Förderband, Endmontage, Mülleimer, Weizenfeld, Kuhweide, Mühle, Ofen, Butterfass |
| 2 | **Der Käsetoast** | Toastscheiben, Käse, Butter | Verteiler, Brunnen, Zuckerrüben, Zuckerfabrik, Gärfass (Hefe), Knetmaschine (3 Zutaten), Schneider, Käserei |
| 3 | **Das BLT** | Toast, Speck, Salat, Tomate, Mayo | Brücke, Schweinestall, Wald, Salatbeet, Gewächshaus, Hühnerstall, Rapsfeld, Metzgerei, Räucherei, Waschanlage, Ölpresse, Mixer |
| 4 | **Das Club-Sandwich** | 8 Teile inkl. Grillhähnchen, Essiggurken, Zahnstocher | Sortierer, Hähnchenfarm, Salzmine, Apfelbaum, Gurkenbeet, Grill, Saftpresse, Einmachstation, Schnitzerei |
| 5 | **Das Weltrekord-Sandwich** | 14 Teile, über 100 Stück | Senffeld, Kräutergarten, Kochtopf (Ketchup), Papierfabrik, Faltmaschine (Sandwichbox) |
| Bonus | **Die Riesen-Quietscheente** | Körper, Kopf, Schnabel, Augen, Quietscher, Farbe, Lack, Papier | eigener Rezeptsatz mit Öl, Plastik, Glas, Gummi |

Kapitel werden nacheinander freigeschaltet, Gebäude und Rezepte bleiben erhalten. Das Bonus-Kapitel öffnet sich nach Kapitel 1.
Für jedes Kapitel gibt es 1–3 Sterne je nach Spielzeit (ab dem ersten gebauten Gebäude).

## Starten

Kein Build nötig, Three.js liegt unter `vendor/three/`.

    python3 -m http.server 8000      # oder: npm start

Dann `http://localhost:8000` öffnen.

URL-Parameter zum Ausprobieren:
- `?unlock` – alle Kapitel freischalten
- `?chapter=club` – direkt ein Kapitel laden (`butterbrot`, `kaesetoast`, `blt`, `club`, `weltrekord`, `ente`)
- `?fresh` – gespeicherten Stand des Kapitels ignorieren
- `?demo` – die automatisch gebaute Demo-Fabrik laden

## Bedienung

- **Linksklick** bauen, gedrückt ziehen für Bänder (sie richten sich nach der Zugrichtung aus)
- **R** drehen (auch das Gebäude unter der Maus) · **Shift+Klick** oder **0** abreißen · **1–9** Werkzeug im aktuellen Tab
- **Q** kopiert das Gebäude unter der Maus · **F** ändert den Filter eines Sortierers (Shift+F: neu lernen)
- **B** Rezeptbuch · **Leertaste** Pause · **Esc** Menü
- **Rechte Maustaste** Kamera drehen · **WASD** verschieben · **Mausrad** Zoom
- Ein Klick auf ein Teil der Bestellung öffnet dessen Rezeptbaum, ein Klick aufs Schaufenster vergrößert es.

## Mechaniken

- **Quellen** erzeugen Rohstoffe, **Maschinen** verarbeiten sie nach Rezept. Maschinen nehmen Zutaten von allen Seiten an und geben nach vorn ab (weißer Pfeil).
- Rezepte können mehrere Zutaten brauchen (Knetmaschine: Mehl + Wasser + Hefe) und mehrere Stück liefern (Schneider: 1 Toastbrot → 4 Scheiben).
- **Verteiler** teilen Ströme auf, **Sortierer** trennen eine Sorte ab, **Brücken** springen bis zu 4 Felder über andere Bänder, **Mülleimer** schlucken Überlauf.
- Bänder führen Ströme im Reißverschluss zusammen, damit Seitenzuflüsse nicht verhungern.
- Die Info-Box zeigt für jede Maschine Rezepte, Lager und Status (arbeitet / wartet auf … / Ausgang blockiert).
- Mehrere Endmontagen zählen für dasselbe Endprojekt. Das **Schaufenster** zeigt das Endprojekt als Geist und füllt es Schicht für Schicht.
- Spielstand, Sterne und Bestzeiten werden im Browser gespeichert (localStorage).

## Aufbau

| Datei | Inhalt |
|---|---|
| `data.js` | Items, Gebäude, Rezepte, Kapitel – hier werden Inhalte erweitert |
| `sim.js` | Fabrik-Simulation ohne Rendering (läuft auch in Node) |
| `layout.js` | Baut automatisch eine funktionierende Fabrik je Kapitel (Demo + Tests) |
| `models.js` | 3D-Modelle für Gebäude, Items und Endprojekte |
| `game.js` | Rendering, Eingabe, HUD, Menüs, Tutorial, Speichern |
| `audio.js` | Kleine WebAudio-Effekte |
| `tests/run.mjs` | Datenprüfung, Mechanik-Tests und Komplettdurchlauf aller Kapitel |

Tests: `npm test` (Node 18+, keine Abhängigkeiten).

Neues Rezept: Eintrag in `RECIPES` (`data.js`) mit `from` = Kapitel, ab dem es gilt. Neue Maschine: in `BUILDINGS` eintragen,
im Kapitel unter `unlock` freischalten und in `models.js` (`machineDecor`) ein Modell ergänzen. Die Tests prüfen, dass jedes Teil
herstellbar ist und jedes Item pro Kapitel genau einen Hersteller hat.
