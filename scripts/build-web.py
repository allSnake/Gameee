#!/usr/bin/env python3
"""Baut eine eigenständige Web-Version nach dist/: Seite ohne Importmap, Imports auf relative Pfade umgeschrieben.
Aufruf: python3 scripts/build-web.py"""
import re, shutil, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
dist = root / 'dist'
shutil.rmtree(dist, ignore_errors=True)
(dist / 'vendor/three').mkdir(parents=True)
for f in (root / 'vendor/three').glob('*.js'):
    shutil.copy(f, dist / 'vendor/three' / f.name)
for name in ['game.js', 'data.js', 'sim.js', 'layout.js', 'models.js', 'audio.js', 'thumbs.js']:
    src = (root / name).read_text(encoding='utf-8')
    (dist / name).write_text(src.replace("from 'three'", "from './vendor/three/three.module.js'"), encoding='utf-8')
html = (root / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<script type="importmap">.*?</script>\s*', '', html, flags=re.S)
(dist / 'index.html').write_text(html, encoding='utf-8')
print('dist/ gebaut')
