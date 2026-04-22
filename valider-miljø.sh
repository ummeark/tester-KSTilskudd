#!/bin/bash
# Validerer at TEST-repoet (tilskudd.fiks.test.ks.no) ikke er kontaminert
# av PROD-miljøreferanser. Kjøres som pre-commit hook og i GitHub Actions.

FEIL=0
GRONN=$'\033[0;32m'
ROD=$'\033[0;31m'
GRA=$'\033[0;90m'
RESET=$'\033[0m'

echo "🔍 Validerer miljøseparasjon (TEST – tilskudd.fiks.test.ks.no)..."

TESTFILER="uu-tester.js monkey-tester.js sikkerhet-tester.js negativ-tester.js generer-arkiv.js"

for FIL in $TESTFILER; do
  [ -f "$FIL" ] || continue

  # Korrekt URL: fiks.test.ks.no  –  Feil: tilskudd.fiks.ks.no (PROD)
  if grep -q "tilskudd\.fiks\.ks\.no" "$FIL"; then
    echo "${ROD}❌ $FIL inneholder PROD-URL (tilskudd.fiks.ks.no)${RESET}"
    FEIL=1
  fi

  # Korrekt badge: TEST-MILJØ  –  Feil: PRODUKSJON
  if grep -q "PRODUKSJON" "$FIL"; then
    echo "${ROD}❌ $FIL inneholder PROD-badge (PRODUKSJON)${RESET}"
    FEIL=1
  fi

  # Korrekt sidemeny-farge: #0a1355  –  Feil: #07604f
  if grep -q "\.sidemeny{.*background:#07604f" "$FIL"; then
    echo "${ROD}❌ $FIL har PROD-sidefarge i .sidemeny (#07604f – skal være #0a1355)${RESET}"
    FEIL=1
  fi
done

# Sjekk docs/ (publiserte HTML-filer)
if ls docs/*.html &>/dev/null; then
  KONTAMINERT=$(grep -rl "tilskudd\.fiks\.ks\.no\|PRODUKSJON" docs/*.html 2>/dev/null || true)
  if [ -n "$KONTAMINERT" ]; then
    echo "${ROD}❌ docs/ inneholder PROD-referanser:${RESET}"
    echo "$KONTAMINERT" | while read -r linje; do echo "   ${GRA}$linje${RESET}"; done
    FEIL=1
  fi
fi

if [ $FEIL -eq 0 ]; then
  echo "${GRONN}✅ Miljøvalidering OK – ingen PROD-kontaminering i TEST-repo${RESET}"
  exit 0
else
  echo ""
  echo "${ROD}🚨 Commit avbrutt – TEST-repo er kontaminert av PROD-miljøreferanser!${RESET}"
  echo "   Rett opp feilene over og prøv igjen."
  exit 1
fi
