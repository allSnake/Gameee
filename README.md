# Absurd Industries – Das Sandwich-Imperium

Ein 3D-Automatisierungsspiel im Browser: Du baust vollautomatische Fabriken für völlig unnötige Sandwiches.
Jedes Kapitel ist eine Bestellung, jede Zutat entsteht in einer echten Produktionskette – vom Weizenfeld bis zur Toastscheibe,
vom Schwein bis zum Speck, vom Apfelbaum bis zur selbst eingelegten Essiggurke.

## Epochen und Kapitel

Die Kampagne erzählt die Geschichte der Lebensmittelindustrie: vom Handbetrieb über Dampf und Strom bis zum Chemielabor,
in dem Weizen, Milch und Fleisch aus Luft, Wasser und Strom entstehen.

| Epoche | # | Kapitel | Bestellung | Neu |
|---|---|---|---|---|
| **Handwerk** | 1 | Das Butterbrot (Tutorial) | Bauernbrot, Butter | Förderband, Endmontage, Weizenfeld, Kuhweide, Mühle, Ofen, Butterfass |
| | 2 | Der Käsetoast | Toast, Käse, Butter | Kohle, Eisen & Baukosten, Verteiler, Hefe, Knetmaschine, Schneider, Käserei |
| **Industrialisierung** | 3 | Das BLT | Toast, Speck, Salat, Tomate, Mayo | **Dampfkessel**, Aufrüsten auf Dampfbetrieb, Brücke, Schweine, Räucherei, Mixer … |
| | 4 | Das Club-Sandwich | 8 Teile inkl. Grillhähnchen, Essiggurken, Zahnstocher | Sortierer, Grill, Einmachstation, Schnitzerei … |
| **Elektrifizierung** | 5 | Das Weltrekord-Sandwich | 14 Teile, über 100 Stück | **Kohlekraftwerk**, Aufrüsten auf Elektrobetrieb, Senf, Ketchup, Sandwichbox |
| | 6 | Das Weltraum-Sandwich | … + Trockensalat, Alufolie, Raumpaket | Bauxit, Elektrolyse, Walzwerk, Gefriertrockner, Vakuumierer |
| **Chemie & Lebensmittelindustrie** | 7 | Das Labor-Sandwich | Toast, Käse, Butter, Speck, Aroma | Felder/Ställe fallen weg: Luftansauger, N₂-/CO₂-Abscheider, H₂-Elektrolyseur, Haber-Bosch, Photosynthese-Reaktor, Stärke-, Bio- und Fettreaktor, Getreide-Synthesizer, Milch-Fermenter, Zellkultur, Aroma-Labor, **Solarpark** |
| | 8 | Das Sandwich aus dem Nichts | 7 Teile, alles synthetisch | Kristallisator (Zucker), Blatt- und Frucht-Synthesizer, Ei-Fermenter, Fett-Raffinerie |
| Bonus | – | Die Riesen-Quietscheente | 8 Teile | eigener Rezeptsatz mit Öl, Plastik, Glas, Gummi |

Beispiel Chemie-Ära: Luft → CO₂ + Wasser → **Glukose** → Stärke; Luft → N₂ + Wasser → H₂ → **Ammoniak** → mit Glukose → **Protein**;
Stärke + Protein → **Weizen**. Danach läuft die bekannte Kette weiter: Mühle → Mehl → Teig → Toastbrot → Toastscheiben.

Kapitel werden nacheinander freigeschaltet, Gebäude und Rezepte bleiben erhalten. Das Bonus-Kapitel öffnet sich nach Kapitel 1.
Für jedes Kapitel gibt es 1–3 Sterne je nach Spielzeit (ab dem ersten gebauten Gebäude).

## Starten

Kein Build nötig, Three.js liegt unter `vendor/three/`.

    python3 -m http.server 8000      # oder: npm start

Dann `http://localhost:8000` öffnen.

URL-Parameter zum Ausprobieren:
- `?unlock` – alle Kapitel freischalten
- `?chapter=club` – direkt ein Kapitel laden (`butterbrot`, `kaesetoast`, `blt`, `club`, `weltrekord`, `weltraum`, `labor`, `nichts`, `ente`)
- `?fresh` – gespeicherten Stand des Kapitels ignorieren
- `?demo` – die automatisch gebaute Demo-Fabrik laden

## Bedienung

- **Linksklick** bauen, gedrückt ziehen für Bänder (sie richten sich nach der Zugrichtung aus)
- **R** drehen (auch das Gebäude unter der Maus) · **Shift+Klick** oder **0** abreißen · **1–9** Werkzeug im aktuellen Tab
- **Q** kopiert das Gebäude unter der Maus · **F** ändert den Filter eines Sortierers (Shift+F: neu lernen)
- **E** aufrüsten · **B** Rezeptbuch · **U** Werkstatt · **P** Produktion · **Strg+Z** rückgängig · **Leertaste** Pause · **Esc** Menü
- **Rechte Maustaste** Kamera drehen · **WASD** verschieben · **Mausrad** Zoom
- Ein Klick auf ein Teil der Bestellung öffnet dessen Rezeptbaum, ein Klick aufs Schaufenster vergrößert es.

## Mechaniken

- **Baukosten:** Jedes Gebäude kostet Eisen (Band 1, Quelle 6, Maschine 12 …), Abreißen erstattet alles. Jedes Kapitel startet mit einem Baukonto;
  ab Kapitel 2 füllst du es selbst auf: Erzmine + Kohlemine → Schmelzofen → Materiallager.
- **Energie:** Dampfkessel (Kohle + Wasser, 6), Kohlekraftwerke (Kohle, 12) und Solarparks (ohne Brennstoff, 5) speisen ein gemeinsames Netz.
  Angetriebene Gebäude (⚡) laufen anteilig langsamer, wenn der Bedarf das Angebot übersteigt. Oben steht Angebot/Bedarf.
- **Aufrüsten (E):** Quellen und Maschinen lassen sich je nach Epoche auf Dampfbetrieb (×2 Tempo, ⚡2, 8 Eisen) und Elektrobetrieb
  (×3 Tempo, ⚡3, 15 Eisen) umstellen. Man sieht es am Gebäude: Messing und Schornstein bzw. blaues Leuchtband.
- **Werkstatt (U):** Turbo-Quellen und Turbo-Maschinen in drei Stufen (je +25 %), bezahlt mit Eisen.
- **Rückgängig (Strg+Z):** nimmt den letzten Bau- oder Abriss-Strich zurück, inklusive Eisen.
- **Produktion (P):** Tabelle aller hergestellten Items mit Rate pro Minute.
- **Kohle als Brennstoff:** Ab Kapitel 2 braucht der Ofen fürs Toastbrot Kohle, der Grill ebenso (in der Ente auch der Glasofen).
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
