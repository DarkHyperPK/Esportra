
import psycopg2
import json

def get_row_counts(conn_string):
    conn = psycopg2.connect(conn_string)
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
    tables = [row[0] for row in cur.fetchall()]
    counts = {}
    for table in tables:
        cur.execute(f'SELECT count(*) FROM "{table}"')
        counts[table] = cur.fetchone()[0]
    cur.close()
    conn.close()
    return counts

local_conn = "postgresql://postgres:postgres@localhost:54322/postgres"
prod_conn = "postgresql://postgres:UcXRNmIJriixCwenlLG3dYJRMdFBEdk7@localhost:54323/postgres"

print("Fetching Local counts...")
local_counts = get_row_counts(local_conn)
print("Fetching Prod counts...")
prod_counts = get_row_counts(prod_conn)

all_tables = sorted(set(local_counts.keys()) | set(prod_counts.keys()))

print("| Table | Local Row Count | Prod Row Count | Status |")
print("|-------|-----------------|----------------|--------|")
for table in all_tables:
    l = local_counts.get(table, "Missing")
    p = prod_counts.get(table, "Missing")
    status = "✅" if l == p else "❌"
    print(f"| {table} | {l} | {p} | {status} |")
