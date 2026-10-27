# Business modules

Each business capability lives in its own folder and declares its public
contract in `module.ts`. The kernel loads the generated registry from
`registry.ts`; do not edit that file by hand. See the [module system
specification](../../spec/15-module-system.md) for the manifest, lifecycle,
dependencies and boundaries.

Run `node scripts/generate-module-registry.mjs` after adding or removing a
module manifest.
