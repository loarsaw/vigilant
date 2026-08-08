# vigilant-jobs-client

Framework-agnostic JS/TS client for browsing job postings and applying to
them via the Vigilant API. No React/Vue dependency — works in plain
JS/TS, Node, or as the base for framework wrappers.

This core package is meant to be the foundation for `@vigilant/react`
(hooks: `usePositions`, `usePosition`, `useApply`) and a Vue composables
package, both wrapping this client rather than reimplementing fetch logic.
