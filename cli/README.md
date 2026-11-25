# Script `dpp`: date din Excel/CSV către pașapoarte

Scriptul transformă fișierele Excel sau CSV (din ERP sau completate manual) în pașapoarte pentru platformă. Le verifică înainte și poate lucra automat pe un folder.

Are nevoie de Node.js 18+ și de pachetele deja instalate în proiect (`npm install`). Comenzile se rulează din folderul `platforma`.

## Comenzi

| Comandă | Ce face |
|---|---|
| `node cli/dpp.mjs template --out sablon.xlsx` | Șablon Excel doar cu coloanele obligatorii (marcate cu `*`) plus o foaie de referință cu toate câmpurile |
| `node cli/dpp.mjs template --all --out sablon.csv` | Șablon cu toate câmpurile |
| `node cli/dpp.mjs validate produse.xlsx` | Verifică fișierul. Codul de ieșire e `1` dacă găsește erori, ca să poată fi folosit în alte scripturi |
| `node cli/dpp.mjs convert produse.xlsx --out pasapoarte.json` | Produce JSON-ul care se încarcă în platformă, la **Import → Pașapoarte** |
| `node cli/dpp.mjs convert produse.xlsx --force` | Ca mai sus, dar sare peste rândurile cu erori |
| `node cli/dpp.mjs watch D:\DPP\intrare` | Urmărește un folder și procesează automat fiecare fișier nou |
| `node cli/dpp.mjs push produse.xlsx --api https://dpp.firma.ro --key dpp_live_…` | Trimite pașapoartele prin API |

## Cum recunoaște coloanele

Fiecare coloană se potrivește după:
- numele câmpului (`gtin`, `battery_mass`);
- eticheta în română („Masa bateriei”);
- eticheta în engleză;
- denumiri uzuale: `nume`, `ean`, `categorie`, `model`.

Diacriticele, majusculele și `*` de la final nu contează. Coloanele nerecunoscute sunt ignorate și apar în raport. Dacă rândul 2 conține etichetele, e sărit automat.

## Ce valori acceptă

| Tip de câmp | Exemple acceptate |
|---|---|
| Numere | `12,5`, `12.5`, `1.234,5`, `2,8 kg` (textul e ignorat) |
| Da / nu | `da`, `nu`, `yes`, `no`, `1`, `0`, `x` |
| Liste de opțiuni | valoarea tehnică sau eticheta: `Staționară`, `industrial_stationary`, `LMT` |
| Mai multe opțiuni | separate cu `;` sau `|` |
| Luni | `2026-11`, `11/2026`, `15.11.2026` |

Codurile de țară și EORI sunt trecute automat cu majuscule. GTIN-ul e verificat cu cifra de control GS1, iar dacă e greșită scriptul propune varianta corectă.

## Ce se verifică

- **Erori** (rândul nu intră în JSON):
  - GTIN invalid sau duplicat în fișier;
  - valori care nu pot fi citite;
  - lipsa denumirii produsului sau a categoriei bateriei.
- **Avertismente** (rândul intră, ca ciornă):
  - câmpuri obligatorii pentru publicare care lipsesc.

Câmpurile obligatorii abia din 18.02.2027 nu sunt raportate înainte de acea dată.

## Folder urmărit

```
node cli/dpp.mjs watch D:\DPP\intrare --out D:\DPP\procesate --errors D:\DPP\erori
```

1. ERP-ul sau colegii salvează CSV / Excel în `intrare`.
2. Scriptul așteaptă să se termine copierea fișierului, apoi îl verifică.
3. Dacă nu are erori, fișierul original ajunge în `procesate/`, alături de JSON-ul gata de import și un raport cu avertismentele.
4. Dacă are erori, fișierul ajunge în `erori/`, alături de un `.raport.txt` cu rândul, câmpul și problema.

Fișierele mutate primesc în nume data și ora procesării. Scriptul poate rula permanent, de exemplu ca task în Windows Task Scheduler la pornirea calculatorului.

## API (`push`)

`push` trimite fiecare pașaport cu `POST {api}/api/v1/passports`, cu antetul `Authorization: Bearer <cheie>` și o cheie `Idempotency-Key`. Cheia se creează în **Integrări și API**.

API-ul REST vine odată cu backend-ul. Până atunci:
- `--dry-run` arată ce s-ar trimite;
- `convert` + **Import** în platformă duc la același rezultat.

`--api` și `--key` pot fi date și prin variabilele de mediu `DPP_API` și `DPP_KEY`.

## Exemplu

`cli/exemple/exemplu.csv` are 3 rânduri, iar unul are intenționat două erori: un GTIN cu cifra de control greșită și o tensiune `abc`.

```
node cli/dpp.mjs validate cli/exemple/exemplu.csv
node cli/dpp.mjs convert cli/exemple/exemplu.csv --force --out pasapoarte.json
```
