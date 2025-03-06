from sqlalchemy import Column, Integer, String, Enum
import enum
from database import Base
from database import engine

class UserRole(str, enum.Enum):
    ISSUER = "issuer"
    BUYER = "buyer"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.BUYER, nullable=False)

# Create the database tables if they don't exist

User.metadata.create_all(bind=engine)
