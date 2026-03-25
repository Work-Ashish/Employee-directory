import re
import psycopg2
from psycopg2 import sql
from django.conf import settings

# create a new PostgreSQL database for a tenant on the same server as default
def create_tenant_database(db_name):
    if not re.match(r'^[a-z][a-z0-9_]{0,62}$', db_name):
        raise ValueError(f"Invalid database name: {db_name}")

    default = settings.DATABASES['default']
    conn = psycopg2.connect(
        dbname = 'postgres',
        user = default['USER'],
        password = default['PASSWORD'],
        host = default.get('HOST', 'localhost'),
        port = default.get('PORT', '5432'),
    )
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db_name)))
    cur.close()
    conn.close()