# storage

`ArtifactStore` — the only place binary run artifacts are written or read. Backs
`snapshots.screenshot_ref` today; `raw_ref` is the same shape when it lands. Config
is `storageConfig` in `core/config` (`STORAGE_DRIVER`, `STORAGE_LOCAL_PATH`, the
`S3_*` set).

## Two drivers, one contract

`local` writes under `STORAGE_LOCAL_PATH`, which must be a mounted volume in
production — the container filesystem is not one. `s3` signs requests with
`aws4fetch` over the platform `fetch`, rather than the AWS SDK: it is a few
kilobytes and it works on any runtime with `fetch`, which matters because this
service is constructed in both processes and they are **not the same runtime** —
the API is Bun and the worker is Node. Anything Bun-only here (`Bun.S3Client`,
`Bun.file`) would work in one process and throw in the other.

Both return the **key**, not a URL. Callers store the key; whoever serves it decides
what URL shape to expose. That keeps a stored reference valid across a driver change
and across a domain change.

## Keys are validated on the way out, not just on the way in

`screenshotKey` builds `screenshots/<monitorId>/<runId>.png` from ids the server
generated, so the value going in is trustworthy. The value coming back out is not:
it arrives from a database column and gets joined onto a filesystem root, which is a
path-traversal sink regardless of who wrote the row. `isSafeKey` therefore
allow-lists each segment (`PATTERN.artifactKeySegment`) rather than blocking `..` —
a deny-list here has to anticipate every encoding, and an allow-list does not.

`localPathFor` then re-checks containment after `path.resolve`, because a prefix
comparison alone treats `/data/snapshots-evil` as inside `/data/snap`. The `+
path.sep` in that check is the whole point of it.

A key that fails validation is `DataCorruption`, not `StorageUnavailable` — the
store is fine, the stored reference is wrong, and a 503 telling the caller to retry
would be false.

## Partitioning

Keys are grouped by monitor so a monitor's artifacts can be swept in one prefix
delete when it is removed, instead of scanning every key for a match.

## The volume has to be writable by uid 10001

`STORAGE_LOCAL_PATH` defaults to `/data/snapshots`, which is a Docker named volume
in production. Docker initialises a fresh named volume from whatever the image has
at that path — and if the image has nothing there, the mount point ends up
`root:root`, so the containers' non-root user cannot `mkdir` and every screenshot
fails with `EACCES`. The run still succeeds, because a failed capture is not
allowed to fail change detection, so this shows up only as a `screenshot.failed`
warning per run.

Both images therefore create `/data/snapshots` and chown it, and **the API mounts
the same volume as the worker**. The worker writes screenshots; the API serves
them from `GET /runs/:id/screenshot`. With the volume on the worker alone — which
is how the compose file started out — every screenshot would be stored and none
could ever be read back.
