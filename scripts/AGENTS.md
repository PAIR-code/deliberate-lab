# AGENTS.md — `scripts` (Python Client)

This directory contains the **Deliberate Lab Python client** — a
pip-installable SDK for the REST API — plus a standalone Node.js
diagnostic script.

## Package structure

| File | Purpose |
|------|---------|
| `deliberate_lab/client.py` | `Client` class — full REST API client |
| `deliberate_lab/types.py` | ⚠️ **Auto-generated** Pydantic models — do not edit by hand |
| `deliberate_lab/__init__.py` | Public API surface (`Client`, `APIError`, all types) |
| `doctor.js` | Node.js diagnostic script (not part of the Python package) |

## ⚠️ `types.py` is auto-generated

`types.py` is generated from JSON schemas produced by the `utils` workspace.
The full pipeline:

```
utils/src/export-schemas.ts  →  docs/assets/api/schemas.json  →  types.py
```

To regenerate, run from the **repository root**:

```sh
npm run update-schemas
```

This builds `utils`, exports JSON schemas, then runs `datamodel-codegen`
to produce Pydantic v2 models. **Never edit `types.py` manually** — your
changes will be overwritten.

## Development

Requires **Python 3.12+** and uses **uv** for dependency management:

```sh
cd scripts
uv sync                          # Install dependencies
uv run pyright deliberate_lab/   # Type check
```

## Installation (as a user)

```sh
pip install git+https://github.com/PAIR-code/deliberate-lab.git#subdirectory=scripts
```

## Usage

```python
import deliberate_lab as dl

client = dl.Client()  # Uses DL_API_KEY environment variable
experiments = client.list_experiments()
data = client.export_experiment("experiment-id")
```

The `Client` class supports `env="prod"` or `env="dev"` (default) to
target production or local emulator endpoints.
