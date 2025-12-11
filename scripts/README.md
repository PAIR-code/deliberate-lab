# Deliberate Lab Python Client

Python client for the Deliberate Lab REST API with fully-typed Pydantic models.

See the [API documentation](https://pair-code.github.io/deliberate-lab/developers/api) for details.

## Usage

```python
import deliberate_lab as dl

client = dl.Client()  # Uses DL_API_KEY environment variable
experiments = client.list_experiments()
data = client.export_experiment("experiment-id")
```

## Installation

Requires Python 3.12+.

```bash
pip install pydantic requests
```

Or using uv:

```bash
uv sync
```
