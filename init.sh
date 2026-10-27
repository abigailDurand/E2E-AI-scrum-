#!/usr/bin/env bash
# init.sh — Atajo para quien venga de la plantilla original. La lógica vive en scripts/init.mjs
# (Node puro, funciona igual en Windows, macOS y Linux).
#   ./init.sh          verificación estándar
#   ./init.sh --fast   solo estructura, specs y trazabilidad
#   ./init.sh --full   además ejecuta toda la suite E2E
exec node scripts/init.mjs "$@"
