# Report Runner Config Builder

A web-based tool for building `runner.json` configuration files that control the CUL Automation report runner. The generated JSON defines report schedules, SQL queries, output destinations, and email notifications.

Deployed to GitHub Pages via GitHub Actions on push to `main`.

## Features

- **Editor** with form-based configuration for all report runner fields
- **JSON tab** with real-time preview (CodeMirror), copy-to-clipboard, and download
- **Flow chart tab** (Mermaid) visualizing the report execution pipeline (schedule, outputs, notifications)
- **SQL preview** with embedded editor, CTE-to-mustache auto-conversion, parameter highlighting, and missing/extra param warnings
- **Dynamic date parameters** using mustache `{{keyword}}` syntax with offsets (e.g., `{{today - 30d}}`)
- **Validation** with inline field errors, required field markers, error count badge, and a grouped summary panel
- **Undo/redo** with keyboard shortcuts (Cmd+Z / Cmd+Shift+Z) and toolbar buttons
- **Open Existing** to load and edit a previously exported `runner.json` file
- **Unsaved changes warning** when closing the browser tab before downloading
- **Build footer** showing the commit hash for deployment verification

## Report Config Structure

Each `runner.json` file contains:

- **Report Definition**: ID, enabled flag, and optional metadata (name, description, owner, tags)
- **Configured Reports**: one or more reports, each with:
  - SQL file path and database (METADB)
  - Schedule (daily, weekly, monthly, or specific dates) with timezone-aware time entry
  - SQL parameters as key-value pairs using mustache template syntax (`{{key}}`) — supports static values and dynamic date expressions
  - Output destinations (Box or S3) with filename templates, file extension (xlsx, xls, csv, tsv), and optional SSM key for S3
  - Email notifications with subject, message, recipients, and notify-on condition (always, on completion, on error)

## SQL Parameters

Parameters use **mustache template syntax** (`{{param_name}}`). Each parameter can be either:

- **Static**: a plain string value
- **Dynamic**: a date expression with optional offset

### Dynamic Date Keywords

`today`, `yesterday`, `start_of_fiscal_year`, `end_of_fiscal_year`, `start_of_month`, `end_of_month`, `start_of_quarter`, `end_of_quarter`, `start_of_year`, `end_of_year`

Offsets can be applied with `+` or `-` followed by a number and unit: **d** (days), **w** (weeks), **m** (months), **y** (years). Example: `{{today - 30d}}`

### CTE Auto-Conversion

The SQL preview can detect legacy CTE parameter blocks (`WITH parameters AS (SELECT ...)`) and automatically convert them to mustache template format, extracting default values and descriptions from SQL comments.

## Template Variables

The following variables can be used in output filenames, email subjects, and email messages:

| Variable | Description |
|---|---|
| `{id}` | Report definition ID |
| `{name}` | Configured report name |
| `{metadata_name}` | Name from the report definition metadata |
| `{current_datetime}` | Timestamp in `YYYY-MM-DD_HH_mm` format |
| `{workflow_id}` | Unique workflow execution identifier |
| `{error_msg}` | Error message if the report failed (email only) |
| `{box_urls}` | Box URLs for uploaded report files (email only) |

An autocomplete dropdown appears when typing `{` in template-enabled fields.

## Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

## Build

```sh
bun run build
```

The build injects the current git commit hash into the app footer. The output goes to `dist/`.

## Deployment

Deployment is handled automatically by the GitHub Actions workflow (`.github/workflows/deploy.yml`). On push to `main`, it builds with Bun and deploys to GitHub Pages.

To enable: go to the repo Settings > Pages and set the source to "GitHub Actions".
