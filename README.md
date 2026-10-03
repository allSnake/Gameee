# Absurd Industries

Automatisierungsspiel in 3D: Du baust riesige Fabriken für absurde Endprojekte
(Kapitel 1: das perfekte Sandwich, Kapitel 2: die Riesen-Quietscheente).

## Prototyp starten

Kein Build nötig, Three.js liegt unter `vendor/three/`.

    python3 -m http.server 8000

Dann `http://localhost:8000` öffnen (`?demo` lädt direkt die Demo-Fabrik).

## Bedienung

- Linksklick: bauen (Förderband: gedrückt ziehen)
- R: drehen · Shift+Klick: abreißen · Tasten 1–5: Werkzeug, 0: Abriss
- Rechte Maustaste: Kamera drehen · Mausrad: Zoom

## Stand

Prototyp-Kette für Teil 1 (Brot): Weizenfarm → Mühle → Ofen → Endmontage.
8 gelieferte Brote ergeben ein Sandwich.
