# LLM Mediation Experiments

<div>
  <img src="https://img.shields.io/badge/Node.js-v18-339933?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black"/>
  <img src="https://img.shields.io/badge/Angular-17-DD0031?style=for-the-badge&logo=angular&logoColor=white"/>
  <img src="https://img.shields.io/badge/prettier-1A2C34?style=for-the-badge&logo=prettier&logoColor=F7BA3E" />
  <img src="https://img.shields.io/badge/eslint-3A33D1?style=for-the-badge&logo=eslint&logoColor=white" />
</div>

This is a repository to support collaboration on using LLMs in behavioral economics experiments. e.g. library of relevant UI components and a library for calling LLMs.

## Project Structure

```bash
├── .vscode    # VSCode configuration
├── firestore  # Firebase Firestore rules
│
├── docs       # Documentation
│
├── emulator_test_config  # Firebase Authentication export with default google accounts for Auth emulator
│
├── firestore  # Firestore rules and indexes
│
├── functions  # Firebase Cloud Functions
│   ├── lib           # Build output
│   ├── node_modules
│   └── src           # Cloud functions source code
│       ├── endpoints   # Cloud functions endpoints
│       ├── seeders     # Model factories
│       ├── utils       # Utilities
│       ├── validation  # TypeBox validation utilities
│       ├── app.ts      # Firebase app initialization
│       └── index.ts    # Cloud functions entrypoint
│
├── scripts    # Seeding scripts
│
├── utils      # Shared types, default values & utilities
│
└── lit     # Lit frontend source code
    ├── node_modules
    └── src               # Frontend source code
        ├── components    # General (home, nav) components
        ├── experiment-components # Experiment stage config/preview components
        ├── services      # MobX state management (with Firebase calls)
        └── shared        # Constants, types, and utilities
```

## Instructions

| Documentation                                        | Description                            |
| ---------------------------------------------------- | -------------------------------------- |
| [Getting Started](./docs/getting-started.md)         | How to get started with the project    |
| [Application Logic](./docs/application-structure.md) | Documentation of the application logic |
| [Deployment](./docs/deployment.md)                   | How to deploy this app to production   |
| [Contributing](./docs/contributing.md)               | How to contribute to this project      |
| [Code of Conduct](./docs/code-of-conduct.md)         | Code of conduct for contributors       |
