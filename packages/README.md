# Shared packages

Add a package only when there is a real reuse case and clear ownership. Avoid a giant shared library that couples all modules. Shared types/SDKs should represent stable contracts, not leak module internals.
