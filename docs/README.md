# Deliberate Lab Docs

This subdirectory contains documentation files for the Deliberate Lab platform,
including Code of Conduct and Contributing guidelines.

All documentation can be viewed at
[pair-code.github.io/deliberate-lab](https://pair-code.github.io/deliberate-lab).

## Development

The Deliberate Lab documentation site is built with
[Jekyll](https://jekyllrb.com/).

To get started,
[follow the Jekyll installation instructions](https://jekyllrb.com/docs/installation/).

Then, view the site locally
(you may want to specify port to avoid collision with any other
Deliberate Lab subdirectories currently running):

```
bundle exec jekyll serve --port 8000 # site will point to http://127.0.0.1:8000
```

You can also build the site (under a created `_site` directory)
without serving:
```
bundle exec jekyll build
```
