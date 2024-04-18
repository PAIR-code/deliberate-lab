# Development guide

## Initial setup
1. Download `npm`. Install Angular with `npm install -g @angular/cli`.
1. Copy `./src/environments/gcloud_env.template.ts` to `./src/environments/gcloud_env.ts`.
1. Contact a member of the team directly (either cjqian@ or iislucas@) for access to the API key values.

## Development server

Run `npm run start` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Recommended editor setup

This code is being developed using [Visual Studio Code](https://code.visualstudio.com/). Make sure to install the angular extension.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `npm run test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page. This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.7; it was then updated to Angular 17.

## Deploy a mock up (no backend service) on github pages
1. clone [this repo](https://github.com/LSIR/recommendation-rudders)

Note: for some reason, assets (images) are not rendered correctly when the app is deployed on GitHub pages. Compared to the PAIR repo, I had to prepend `/recommendation-rudders` to paths pointing to `/assets/*`. For instance: `/assets/avatars/she.png` becomes `/recommendation-rudders/assets/avatars/she.png`. 

2. run `git remote add origin https://github.com/LSIR/recommendation-rudders.git`
3. run `git branch -M main`
4. run `git checkout -b gh-pages`
5. run `git push -u origin main`
6. run `cd recommendation-rudders`
7. run `npm install`
8. run `ng build --output-path docs --base-href /recommendation-rudders/`
9. When the build is complete, make a copy of `docs/index.html` and name it `docs/404.html`.
10. Commit and push
11. On the GitHub project page, go to Settings and select the Pages option from the left sidebar to configure the site to [publish from the docs folder and gh-pages branch](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#choosing-a-publishing-source).
12. Click Save
13. Hopefully at this step, the app is live and running as expected at https://[<user_name>].github.io/recommendation-rudders/#/experimenter/

Here is a [quick video tutorial](https://mail.google.com/mail/u/0/#inbox/QgrcJHsTfQgVhDSJBNQBGTzQNLwzGBhqxbv?projector=1) on how to use the app.

More info on the deployment on Github-pages [there](https://angular.io/guide/deployment#deploy-to-github-pages).
