---
title: Developing
layout: default
---

## Formatting
We now have a pre-commit hook that automatically runs Prettier (see configuration at `./.prettierrc.json`) and ESLint (see configuration at `./eslint.config.mjs`). This is set up with `lint-staged` under the root directory's `./package.json`.

You can also run Prettier and/or ESLint from the command line, e.g.:

```bash
npx prettier --write --list-different "**/*.ts" # runs on all TypeScript files
npx eslint --quiet "**/*.ts" # runs on all TypeScript files
```

These will be run automatically on PRs before they can be merged. You may also
want to run eslint without `--quiet` on files you've changed to surface
warnings, but this isn't enforced.

## Typechecking

To ensure that your change passes typechecking, you can run `npm run typecheck`
in the `utils` or `functions` package. This is particularly useful in
`functions`, where the normal build won't typecheck for you. `frontend` doesn't
have `npm run typecheck`, but the build process will also do typechecking there.

As of time of writing, `functions` has a lot of typechecking errors: you may
want to `npm run typecheck 2>&1 | grep src/file.you.changed.ts`.
