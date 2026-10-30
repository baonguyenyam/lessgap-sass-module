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
| 0 | [phase-0.md](./phase-0.md) | done |
| 1 | [phase-1.md](./phase-1.md) | done |
| 2 | [phase-2.md](./phase-2.md) | done |
| 3 | [phase-3.md](./phase-3.md) | done |
| 4 | [phase-4.md](./phase-4.md) | done |
| 5 | [phase-5.md](./phase-5.md) | done |
| 6 | [phase-6.md](./phase-6.md) | done |
| 7 | [phase-7.md](./phase-7.md) | done |
| 8 | [phase-8.md](./phase-8.md) | done |
| 9 | [phase-9.md](./phase-9.md) | done |
| 10 | [phase-10.md](./phase-10.md) | done |
| 11 | [phase-11.md](./phase-11.md) | done |
| 12 | [phase-12.md](./phase-12.md) | done |
| 13 | [phase-13.md](./phase-13.md) | done |
| 14 | [phase-14.md](./phase-14.md) | done |
| 15 | [phase-15.md](./phase-15.md) | done |
| 16 | [phase-16.md](./phase-16.md) | done |
| 17 | [phase-17.md](./phase-17.md) | in progress |
| 16 | [phase-16.md](./phase-16.md) | approved |
