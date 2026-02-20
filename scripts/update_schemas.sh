#!/usr/bin/env bash
# update_schemas.sh — Regenerate Python types from TypeScript schemas.
#
# Usage: Run from the repository root:
#   npm run update-schemas
#   # or directly:
#   ./scripts/update_schemas.sh
#
# Prerequisites:
#   - Node.js ≥22
#   - Python 3.12+ with uv (https://docs.astral.sh/uv/)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Step 1: Build utils so exported types are up to date.
echo "==> Building utils..."
npm run build --workspace=utils

# Step 2: Export JSON schemas from TypeScript type definitions.
echo "==> Exporting JSON schemas..."
npx tsx utils/src/export-schemas.ts

# Step 3: Format the exported schema file.
echo "==> Formatting schemas.json..."
npx prettier --write docs/assets/api/schemas.json

# Step 4: Generate Pydantic v2 models from the JSON schemas.
echo "==> Generating Python types..."
cd scripts
uv run datamodel-codegen \
  --input ../docs/assets/api/schemas.json \
  --output deliberate_lab/types.py \
  --input-file-type jsonschema \
  --reuse-model \
  --collapse-root-models \
  --use-union-operator \
  --use-title-as-name \
  --use-one-literal-as-default \
  --use-default \
  --use-annotated \
  --use-standard-collections \
  --target-python-version 3.12 \
  --output-model-type pydantic_v2.BaseModel \
  --allow-population-by-field-name \
  --custom-file-header '# AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
# Regenerate via: npm run update-schemas (from repo root).
#
# pyright: reportInvalidTypeForm=false
# pytype: disable=invalid-function-definition
# pylint: disable=missing-module-docstring,missing-class-docstring,invalid-name,too-few-public-methods'

# Step 5: Format the generated Python code.
echo "==> Formatting Python code..."
uv run black deliberate_lab/

# Step 6: Typecheck the generated Python code.
echo "==> Typechecking Python code..."
uv run pyright deliberate_lab/

echo "==> Done. schemas.json and types.py are up to date."
