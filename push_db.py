import psycopg2

prod_conn = "postgresql://postgres:UcXRNmIJriixCwenlLG3dYJRMdFBEdk7@localhost:5433/postgres"

sql_file = "supabase/migrations/20240326000000_admin_suspension_rpcs.sql"

try:
    print(f"Connecting to database...")
    conn = psycopg2.connect(prod_conn)
    conn.autocommit = True
    cur = conn.cursor()
    
    print(f"Reading SQL file...")
    with open(sql_file, 'r') as file:
        sql = file.read()
        
    print(f"Executing SQL commands...")
    cur.execute(sql)
    print("Database updated successfully!")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"An error occurred: {e}")
