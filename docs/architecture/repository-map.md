# Repository map

```text
elva-erp/
├── apps/                  # Deployable entry points, if needed
├── platform/              # Shared platform capabilities/contracts
├── modules/
│   └── hr/                # Current active module
├── packages/              # Reusable SDKs, shared UI/types (only when justified)
├── contracts/             # API/event schemas and conventions
├── infra/                 # Deployment, observability, infrastructure code
├── tools/                 # Developer scripts and repository automation
├── docs/
│   ├── architecture/
│   ├── decisions/
│   ├── security/
│   └── operations/
└── .github/               # PR templates, issue templates, workflows
```

This is a logical map, not a requirement to create all implementation directories immediately. Keep a module's source tree close to the conventions of its chosen framework.
