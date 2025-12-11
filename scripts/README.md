# Deliberate Lab Python Client

Python client for the Deliberate Lab REST API with fully-typed Pydantic models.

See the [API documentation](https://pair-code.github.io/deliberate-lab/developers/api) for details.

## Installation

Requires Python 3.12+.

```bash
pip install git+https://github.com/PAIR-code/deliberate-lab.git#subdirectory=scripts
```

## Usage

```python
import deliberate_lab as dl

client = dl.Client()  # Uses DL_API_KEY environment variable
experiments = client.list_experiments()
data = client.export_experiment("experiment-id")
```

## Development

```bash
cd scripts
uv sync
uv run pyright deliberate_lab/
```
