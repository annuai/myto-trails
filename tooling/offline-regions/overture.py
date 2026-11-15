#!/usr/bin/env python3
"""Overture Maps places inside a bounding box, as newline-delimited JSON for build.mjs (laptop only).

Usage: python3 overture.py <west> <south> <east> <north> <out.ndjson> [release]
Needs `pip install duckdb`. The release (default: OVERTURE_RELEASE or the one below) must still be published: Overture keeps about two
months of releases, see https://docs.overturemaps.org/release-calendar/. Reads the public S3 bucket directly, only the columns and
the bounding box asked for. Licence: CDLA Permissive 2.0 / CC BY 4.0 per source; attribute Overture Maps Foundation.
"""
import os
import sys

import duckdb

DEFAULT_RELEASE = "2026-10-21.0"


def main() -> None:
    if len(sys.argv) < 6:
        sys.exit(__doc__)
    w, s, e, n = (float(x) for x in sys.argv[1:5])
    out = sys.argv[5]
    release = sys.argv[6] if len(sys.argv) > 6 else os.environ.get("OVERTURE_RELEASE", DEFAULT_RELEASE)
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial; SET s3_region='us-west-2';")
    con.execute(
        f"""
        COPY (
          SELECT names.primary AS name, taxonomy.hierarchy AS h, taxonomy.primary AS cat, confidence,
                 operating_status AS status, addresses[1].locality AS locality, ST_Y(geometry) AS lat, ST_X(geometry) AS lng
          FROM read_parquet('s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*', hive_partitioning=1)
          WHERE bbox.xmin BETWEEN ? AND ? AND bbox.ymin BETWEEN ? AND ? AND names.primary IS NOT NULL
        ) TO '{out}' (FORMAT json)
        """,
        [w, e, s, n],
    )
    print(f"Overture {release}: wrote {out}")


if __name__ == "__main__":
    main()
