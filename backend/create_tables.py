import sys
sys.path.append(".")
from app.core.database import engine
from app.models import School, User, Student, Teacher, Subject, ClassSection
from app.core.database import Base
Base.metadata.create_all(bind=engine)
print("✅ Tables created!")
