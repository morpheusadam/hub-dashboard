#!/usr/bin/env python3
"""Optional host-side exporter for the Trends page.

The hub PHP container usually cannot reach a project database on another network
or your local git checkouts. This script runs on the HOST, gathers that data and
writes it to app/data/projects.json, which the projects.php endpoint serves.

Run it on a schedule (for example every 15 minutes via cron). Adapt the DB query
and the repo discovery to your own setup. Nothing here is required for the hub to
run; without projects.json the Trends widgets simply show "not configured".

Environment variables (all optional):
  HUB_DATA_DIR   Path to app/data (default: ../app/data next to this script)
  PROJECTS_DIR   Directory to scan for git repositories (default: ~/projects)
  PG_CONTAINER   Docker container name of a Postgres DB to query (default: none)
  PG_USER        Postgres user
  PG_DB          Postgres database
"""
import json, os, subprocess, time

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("HUB_DATA_DIR", os.path.join(HERE, "..", "app", "data"))
OUT = os.path.join(DATA_DIR, "projects.json")
PROJECTS_DIR = os.path.expanduser(os.environ.get("PROJECTS_DIR", "~/projects"))
PG_CONTAINER = os.environ.get("PG_CONTAINER", "")
PG_USER = os.environ.get("PG_USER", "")
PG_DB = os.environ.get("PG_DB", "")


def sh(args, timeout=20):
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=timeout).stdout.strip()
    except Exception:
        return ""


def task_stats():
    """Return {started, notStarted, done, total} from your project tool, or None.

    The example below queries a Postgres kanban with a `cards` table. Change the
    SQL and columns to match your schema, or replace this with an HTTP API call.
    """
    if not (PG_CONTAINER and PG_USER and PG_DB):
        return None
    sql = ("select "
           "count(*) filter (where start_date is not null and not is_completed and archived_at is null),"
           "count(*) filter (where start_date is null and not is_completed and archived_at is null),"
           "count(*) filter (where is_completed and archived_at is null),"
           "count(*) filter (where archived_at is null) "
           "from cards;")
    out = sh(["docker", "exec", PG_CONTAINER, "psql", "-U", PG_USER, "-d", PG_DB, "-t", "-A", "-c", sql])
    if out and "|" in out:
        try:
            a, b, c, d = (int(x) for x in out.split("|"))
            return {"started": a, "notStarted": b, "done": c, "total": d}
        except Exception:
            return None
    return None


def repo_info(worktree, name):
    epoch = sh(["git", "-C", worktree, "log", "-1", "--format=%ct"])
    if not epoch.isdigit():
        return None
    return {
        "name": name,
        "branch": sh(["git", "-C", worktree, "rev-parse", "--abbrev-ref", "HEAD"]) or "?",
        "updated": int(epoch),
        "subject": sh(["git", "-C", worktree, "log", "-1", "--format=%s"])[:80],
    }


def repos():
    found = sh(["find", PROJECTS_DIR, "-maxdepth", "3", "-type", "d", "-name", ".git",
                "-not", "-path", "*/node_modules/*"])
    out = {}
    for g in [l for l in found.splitlines() if l.strip()]:
        wt = os.path.dirname(g)
        ri = repo_info(wt, os.path.basename(wt))
        if ri:
            out[ri["name"]] = ri
    return sorted(out.values(), key=lambda r: r["updated"], reverse=True)


def main():
    repo_list = repos()
    data = {
        "generated": int(time.time()),
        # The Trends UI reads these numbers as the task summary; the key name is
        # historical and can hold stats from any project tool.
        "solova": task_stats(),
        "repos": repo_list,
        "lavzenUpdated": repo_list[0]["updated"] if repo_list else None,
    }
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, OUT)
    try:
        os.chmod(OUT, 0o644)
    except Exception:
        pass
    print(json.dumps(data, ensure_ascii=False))


if __name__ == "__main__":
    main()
