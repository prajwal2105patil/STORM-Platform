---
name: sql-partitions
description: The immutable law of data querying for DREADNOUGHT to prevent capital drain.
---

**THE PARTITION LAW:**
You are strictly forbidden from generating, approving, or executing any `SELECT` statement that does not explicitly filter on the exact partition keys.

**MANDATORY CLAUSE:** `WHERE year = [Y] AND month IN ([M])`

**WHY:** BigQuery charges by bytes scanned. Scanning 80GB instead of 500MB because of a missing partition filter will drain the pilot capital instantly. Reject any query lacking this.
