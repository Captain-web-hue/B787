# B787 Toolbox

An offline-first Boeing 787 flight crew toolbox designed for iPhone, iPad and desktop use.

The first module is a fuel jettison calculator with automatic maximum-landing-weight and manual fuel-to-remain modes.

## Live app

[Open B787 Toolbox](https://b787-toolbox.julien-daviron.chatgpt.site)

## Fuel jettison module

- Current gross weight and total fuel inputs in kilograms x 1,000
- MLW and manual fuel-to-remain modes
- Estimated jettison time, fuel jettisoned and gross weight after jettison
- MTOW, MLW, MZFW and fuel-capacity checks
- Protection of 3,900 kg in each main tank
- Offline operation after the first online load
- Local input persistence
- Installable on iPhone and iPad from Safari

## Calculation basis

| Item | Value |
| --- | ---: |
| MTOW | 252,650 kg |
| MLW | 192,776 kg |
| MZFW | 181,436 kg |
| Main tanks total capacity | 33,552 kg |
| Center tank capacity | 67,899 kg |
| Total fuel capacity | 101,451 kg |
| Jettison rate with center fuel available | 1,360 kg/min |
| Jettison rate with center tank empty | 570 kg/min |
| Protected minimum in each main tank | 3,900 kg |

Tank distribution is estimated by filling the main tanks first and then the center tank. Jettison times are estimates based on the published QRH rates.

## Install on iPhone or iPad

1. Open the live app in Safari.
2. Tap the Share button.
3. Select **Add to Home Screen**.

## Development

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Run the automated calculation and production-render tests:

```bash
npm test
```

Create a production build:

```bash
npm run build
```

## Operational notice

This software is a planning aid. It is not an approved aircraft system or a substitute for current approved FCOM/QRH material, company procedures, aircraft indications, operational judgement or actual conditions.

No Boeing or operator manuals are included in this repository.
