# DPP4ALL

Platformă pentru pașapoarte digitale de produs (DPP), pentru importatorii de produse fabricate în afara UE. Prima categorie complet acoperită: baterii (Reg. (UE) 2023/1542).

## Pornire

```bash
npm install
npm run dev
```

Se deschide la http://localhost:5180.

- `/`: site public (Acasă, verificatorul „Am nevoie de DPP?”, calendar de termene)
- `/panou`: aplicația (demo, autentificare cu orice e-mail din echipă)
- `/machete/...`: machete de design (navbar, butoane, logo)

Datele demo sunt inventate și se salvează în browser (localStorage). Backend-ul (API + PostgreSQL) urmează.

## Structură

- `src/site/`: site-ul public
- `src/pages/`: ecranele aplicației
- `src/api/`: stratul de date (store local + acțiuni, aceeași formă ca viitorul API REST)
- `src/data/`: catalogul de câmpuri (`fields.json`) și catalogul de reglementări (`regulations.ts`)
- `src/lib/`: validare, GS1 (GTIN, EAN-14, Digital Link), export EN 18223
- `cli/`: scriptul de import/validare din Excel/CSV (`node cli/dpp.mjs`)

## Comenzi

```bash
npm run build       # build de producție
npm run typecheck   # verificare tipuri
node cli/dpp.mjs template --out sablon.xlsx
node cli/dpp.mjs validate produse.xlsx
```
