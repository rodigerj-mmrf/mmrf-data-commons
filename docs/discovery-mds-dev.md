# Dev Discovery MDS Migration Runbook

This runbook publishes the discovery entries for the dev commons MDS using the upstream Gen3 SDK.

## Prerequisites

- Python 3.9+ available locally
- Gen3 SDK installed:

```bash
pip install gen3
```

- A valid credentials file (refresh token JSON), for example `credentials.json`
- Account permission to write through `mds` (without this, publish returns `403 Forbidden`)

## Source Data

Discovery records are stored in:

- `config/gen3/discovery.mds.seed.json`

Each record is published under:

- `_guid_type = discovery_metadata`
- `gen3_discovery` metadata block
- GUID field `_hdp_uid`

## 1) Backup Current Dev Discovery MDS

```bash
python3 scripts/discovery_mds_sync.py \
  --mode backup \
  --api "https://dev-virtuallab.themmrf.org/" \
  --credentials "/absolute/path/to/credentials.json"
```

Backup files are written to:

- `backups/mds/discovery/`

## 2) Preview Publish (Dry Run)

```bash
python3 scripts/discovery_mds_sync.py \
  --mode publish \
  --dry-run \
  --api "https://dev-virtuallab.themmrf.org/" \
  --credentials "/absolute/path/to/credentials.json" \
  --records-file "config/gen3/discovery.mds.seed.json"
```

## 3) Publish to Dev MDS

```bash
python3 scripts/discovery_mds_sync.py \
  --mode both \
  --api "https://dev-virtuallab.themmrf.org/" \
  --credentials "/absolute/path/to/credentials.json" \
  --records-file "config/gen3/discovery.mds.seed.json"
```

`--mode both` performs backup first, then publishes.

## 4) Verify Records in MDS

Use either the browser or SDK:

- Browser:
  - `https://dev-virtuallab.themmrf.org/mds/metadata/NCT01454297`
  - `https://dev-virtuallab.themmrf.org/mds/metadata/s43018-025-01072-4`
