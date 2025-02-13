---
title: Getting started
layout: default
---

Welcome to Deliberate Lab! To get started, you should have a website
link to the platform. If you're using the Google-hosted platform,
[go here](https://deliberate-lab.appspot.com/). 

> 🎥 [View video tutorials for getting started](https://www.youtube.com/playlist?list=PLpC76pxkGLrBb5R7NViRloBzUkn8UQbr0)

> If you're setting up your own deployment of the platform,
see the Developers section in the sidebar.

## Overview

> A quick overview of concepts/terms referenced across the platform
and this documentation

In Deliberation Lab, `experimenters` (people who can view/edit experiments
on the platform) can create `experiments`, which include a list of
`experiment stages` (or `stages`). Each stage can be configured to include
custom content and options; the experiment also has some top-level settings
(e.g., Prolific integration).

<!-- TODO: Add screenshot -->

To run an experiment, experimenters can create `cohorts`, which is a
bundle of participants who can interact with each other during the experiment.

> Example: if running an experiment where two people play chess with each
other, you might create 10 cohorts and have 2 participants in each cohort.
All data can be downloaded together at the experiment (top) level.

Finally, participants can be manually added to cohorts (via experimenter
dashboard), or they can dynamically join from a cohort landing page.
Experimenters have the ability to transfer participants to different cohorts
(within the same experimenter) or "boot" (kick out) participants from
the cohort/experiment. (Additional participant management options
are covered later in this tutorial.)

## Logging in

Navigate to your provided website link and use the "Experimenter login"
button to log in via Google account.

Anyone with a Google account can "log in" to the platform, but researchers
must be on an "allowlist" (managed in Firebase datastore) to view, create, and
manage experiments.

> If you receive a `403: Participants do not have access`
error, you have not been added to the allowlist and should contact
the person hosting the platform (at the website link you were provided).

Once you're logged in, you should be able to see a home page with
both publicly available experiments and your private experiments.

> Tip: If you plan to set up LLM mediators, add your own
[Gemini API key](https://ai.google.dev/gemini-api/docs/api-key)
on the Settings page now. Your key must be present in order to effectively
run LLM mediators during experiments. We store it in a Firebase document
that only you (and the backend function making the LLM mediator calls
for your experiment) can access. **Note:** LLM calls always use the API key
of the person who created the experiment.

## Next steps
Once you have access to the platform, you can start creating and running
your experiments!