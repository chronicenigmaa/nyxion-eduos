import sys
sys.path.append(".")
from app.core.database import engine
from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text("TRUNCATE users, students, schools RESTART IDENTITY CASCADE"))
    conn.commit()
print("✅ Wiped")
