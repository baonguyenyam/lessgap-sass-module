# Phase briefs

The roadmap says *what* each phase delivers. A brief says *how*, as a list of
tasks small enough for one agent session and one pull request each.

## Workflow

1. **Write the brief.** At the start of a phase, an agent copies
   [TEMPLATE.md](./TEMPLATE.md) to `phase-N.md`, fills it from the roadmap,
   the linked spec documents and the test-case catalogue, and opens a PR with
   the brief only. No code.
2. **Review.** A human approves the brief (scope, order, open questions
   answered). Status becomes `approved`.
3. **One task at a time.** For each task, in order: branch
   `pN/<task-id>-<slug>`, implement exactly the task, write its tests, run the
   task's checks, open a PR that links the task id, tick the task in the brief
   in the same PR.
4. **Stop on surprises.** If a task cannot be done as written (a wrong
   assumption, a missing decision, a spec contradiction), stop, write what was
   found under "Findings" in the brief, and propose a change. Do not improvise.
5. **Close the phase.** When every task is ticked and the exit criteria in
   the roadmap pass, set the brief to `done`, update the roadmap status and
   record anything that shipped differently.

## Task rules

- One task = one PR = one reviewable change, typically under ~400 changed
  lines excluding generated files and lockfiles.
- Every task lists: goal, files it creates or changes, tests (with catalogue
  ids from [testing.md](../11-testing.md)), checks to run, done-when.
- Tasks are ordered so `main` stays deployable after each one.
- A task never changes code outside its listed files without updating the brief first.

## Briefs

| Phase | Brief | Status |
| --- | --- | --- |
| 0 | [phase-0.md](./phase-0.md) | draft |
| 1 | [phase-1.md](./phase-1.md) | draft |
| 2–8 | written when the previous phase closes | — |
