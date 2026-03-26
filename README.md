# Report Runner Config Builder

A web-based tool for building `runner.json` configuration files that control the CUL Automation report runner. The generated JSON defines report schedules, SQL queries, output destinations, and email notifications.

Deployed to GitHub Pages via GitHub Actions on push to `main`.

## Features

- **Editor** with form-based configuration for all report runner fields
- **JSON tab** with formatted preview and copy-to-clipboard
- **Flow chart tab** (Mermaid) that visualizes the report execution pipeline
- **Validation** with inline field errors, required field markers, and a summary panel
- **Undo/redo** with keyboard shortcuts (Cmd+Z / Cmd+Shift+Z) and toolbar buttons
- **Open Existing** to load and edit a previously exported `runner.json` file
- **Unsaved changes warning** when closing the browser tab before downloading
- **Build footer** showing the commit hash for deployment verification

## Report Config Structure

Each `runner.json` file contains:

- **Report Definition**: ID, enabled flag, and optional metadata (name, description, owner, tags)
- **Configured Reports**: one or more reports, each with:
  - SQL file and database (METADB)
  - Schedule (daily, weekly, monthly, or specific dates) with timezone-aware time entry
  - SQL parameters as key-value pairs, passed to the query via psycopg named parameters (`%(key)s`)
  - Output destinations (Box or S3) with filename templates and file extension (xlsx, xls, csv, tsv)
  - Email notifications with subject, message, recipients, and notify-on condition (always, on completion, on error)

## Template Variables

The following variables can be used in output filenames, email subjects, and email messages:

| Variable | Description |
|---|---|
| `{id}` | Report definition ID |
| `{name}` | Configured report name |
| `{metadata_name}` | Name from the report definition metadata |
| `{current_datetime}` | Timestamp in `YYYY-MM-DD_HH_mm` format |
| `{workflow_id}` | Unique workflow execution identifier |

Email templates also support `{error_msg}` for the error message when a report fails.

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
