# Example Invocation

Use the skill with the mandatory inputs first, then add company context and credentials if available.

```text
Please run competitor-research-to-figma.

feature_description:
Create payment link and manage payment links.

figma_destination_url:
https://www.figma.com/design/EXAMPLEFILEKEY/Payments-Benchmark?node-id=0-1

company_name:
Northstar Commerce

competitor_allowlist:
["Square"]

locale:
es-ES

catalog_path:
./.agents/skills/competitor-research-to-figma/examples/competitor-catalog.example.json

credential_registry_path:
./.agents/skills/competitor-research-to-figma/examples/competitor-credentials.example.json

evidence_import_path:
./input/manual-evidence.square.json
```

Expected skill behavior:
- ask for any missing mandatory input before doing anything else
- validate Figma and browser setup
- allow single-competitor runs through `competitor_allowlist`
- respect locale-specific catalog variants such as `es-ES`
- allow a custom competitor catalog when the default starter catalog is too narrow
- resolve literal credentials or `email_env` and `password_env` pairs from the credential registry
- import manual evidence when `evidence_import_path` is provided and skip live capture for already-covered competitors
- stop automated login after 2 failed attempts and hand the browser to the operator for manual continuation
- stop and ask for manual intervention if verification barriers appear
- allow a rerun to resume from the last blocked checkpoint via `resume_from_run_path`
- generate the reusable HTML research board plus the HTML capture bundle on a page named `Investigación`
- treat the generated HTML board as the final research record that should be sent to Figma
