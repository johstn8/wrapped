# Friendship Wrapped Site

Statische, mobile Story-Website für GitHub Pages.

## Dateien

- `index.html`
- `styles.css`
- `script.js`
- `data/friendship_wrapped_data.json`

## Deployment auf GitHub Pages

1. Alle Dateien in ein Repository kopieren.
2. Sicherstellen, dass die JSON unter `data/friendship_wrapped_data.json` liegt.
3. GitHub Pages für den Branch aktivieren.
4. Fertig.

## Lokal testen

Weil die Seite die JSON per `fetch()` lädt, sollte sie nicht direkt per `file://` geöffnet werden.

Einfach lokal mit einem kleinen Server starten, zum Beispiel:

```bash
python3 -m http.server 8000
```

Dann im Browser `http://localhost:8000/` öffnen.
