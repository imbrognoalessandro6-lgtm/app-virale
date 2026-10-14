# 🍝 Che Pasta Sei? — quiz virale

Un quiz di personalità di 7 domande: alla fine l'utente scopre "che pasta è" e lo condivide.
È un sito statico (HTML/CSS/JS, niente server, niente database): ospitarlo su GitHub Pages è **gratis**.

## Perché può diventare virale

- **Immagine pronta per le storie** (1080×1920): un tocco e si condivide su Instagram/TikTok/WhatsApp.
- **Link "Sfida un amico"** (`?amico=carbonara`): chi apre il link vede il risultato dell'amico e vuole confrontarsi.
- **Un tema che scatena discussioni** ("panna nella carbonara?"), ottimo per i commenti.
- Quiz brevissimo (meno di un minuto), pensato per il telefono.

## Come guadagna

Tutto si configura in [`config.js`](config.js), senza toccare il resto del codice:

| Fonte | Cosa inserire | Note |
|---|---|---|
| Google AdSense | `adsenseClient`, `adSlots` | Serve approvazione: di solito richiede un dominio tuo e un po' di traffico. |
| Amazon Affiliazione | `amazonTag` | Ogni risultato mostra un prodotto a tema con il tuo link. Iscrizione: programma-affiliazione.amazon.it |
| Donazioni | `supportUrl` | Ko-fi, Buy Me a Coffee o PayPal.me |

Finché un campo è vuoto, lo spazio corrispondente resta nascosto.

## Pubblicazione (gratis)

1. Unisci questo branch in `main`.
2. Su GitHub: **Settings → Pages → Source: GitHub Actions**.
3. A ogni push su `main` il workflow `.github/workflows/pages.yml` pubblica il sito su
   `https://<tuo-utente>.github.io/app-virale/`.
4. (Consigliato) Collega un dominio tuo: aiuta per l'approvazione AdSense.

## Personalizzare

- Domande e risultati: [`data.js`](data.js). Puoi cambiare tema (che città sei, che personaggio sei…) modificando solo quel file.
- Grafica: [`style.css`](style.css).

## Aspettative realistiche

"Passivo" vale solo dopo il lancio: il traffico non arriva da solo. Il modo più efficace è
pubblicare video brevi (TikTok/Reels/Shorts) che mostrano il quiz e i risultati, con il link in bio.
Con annunci e affiliazioni i guadagni crescono col traffico: poche visite = pochi centesimi;
un quiz che diventa virale può rendere molto di più, ma non è garantito.

Prova in locale: `python3 -m http.server` e apri http://localhost:8000
