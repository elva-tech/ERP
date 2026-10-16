# Business modules

Each module owns its domain behavior and publishes supported APIs/events. Other modules should not depend on its internal tables, classes, or private functions.

A module may use a different implementation technology only when there is a deliberate architecture decision and the operational cost is understood. Prefer a consistent stack initially unless there is a compelling reason to diverge.

Suggested module lifecycle:
1. Proposed
2. Active development
3. Supported
4. Deprecated
