---
name: read-github
description: >
  Read GitHub issues and pull requests via the REST API instead of
  scraping HTML pages.
---

# Read GitHub Issues and PRs

When a user references a GitHub issue or PR URL (e.g.
`https://github.com/PAIR-code/deliberate-lab/issues/NNN` or
`.../pull/NNN`), use the **GitHub REST API** to fetch clean JSON rather
than fetching the HTML page. The HTML is dominated by navigation chrome,
CSS, and JavaScript — making it difficult to extract the actual content.

API endpoints follow the standard pattern:

- **Issues**: `https://api.github.com/repos/{owner}/{repo}/issues/{number}`
- **PRs**: `https://api.github.com/repos/{owner}/{repo}/pulls/{number}`

## Always fetch comments

The issue/PR endpoint does **not** include comments inline — they are
only available via a separate request. Check the `comments` field in the
response. If it is greater than zero, fetch them:

- `https://api.github.com/repos/{owner}/{repo}/issues/{number}/comments`

Issue and PR comments often contain supplementary guidance, research
findings, design decisions, and other context critical to understanding
the work. Do not skip them.
