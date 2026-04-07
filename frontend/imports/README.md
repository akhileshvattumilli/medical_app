# Content Import Workflow

Use this workflow when questions, notes, and resources arrive as a mixed content batch that still needs grouping into systems, conditions, and case studies.

## Folder Layout

Each batch lives inside `frontend/imports/<batch-name>/` and should contain:

- `source/`
  Raw docs, spreadsheets, PDFs, screenshots, or links.
- `working/`
  Cleaned mapping sheets that the importer can read.
- `output/`
  Generated app-ready JSON.
- `report/`
  Validation issues and unresolved-item reports.

## Required Working Files

The importer reads these files from `working/`:

- `import_batch.json`
- `systems.json`
- `conditions.json`
- `cases.json`
- `case_details.json`
- `source_items.json`

`source_items.json` is the manual mapping sheet used to segregate mixed notes/questions/resources into:

- sections
- quizzes
- checkpoints
- resources
- mechanisms

## Import Steps

1. Copy `template-batch/` to a new batch folder.
2. Drop raw material into `source/`.
3. Fill out the `working/*.json` files.
4. Run:

```bash
npm run import:content -- imports/<batch-name>
```

5. Review:
   - `imports/<batch-name>/output/content-dataset.json`
   - `imports/<batch-name>/report/import-report.md`
6. If the batch looks correct, either:
   - paste `content-dataset.json` into the admin import panel, or
   - sync directly into the local mock dataset with:

```bash
npm run import:content -- imports/<batch-name> --sync-mock
```

## Mapping Rules

- If an item maps to a single case, assign `caseRef`.
- If an item belongs only to a condition, omit `caseRef` and the importer will assign it to that condition's `isFoundationCase: true` case.
- If no case or foundation case can be resolved, the item is written to the report as unresolved.
- Resources are metadata-first in v1. Use `externalUrl` or `assetKey` placeholders until hosted files are wired.
