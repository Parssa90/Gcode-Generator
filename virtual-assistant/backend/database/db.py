from sqlalchemy import create_engine, Column, String, Text, DateTime, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid

from config import settings

engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_id() -> str:
    return str(uuid.uuid4())


class ConversationLog(Base):
    __tablename__ = "conversation_logs"
    id = Column(String, primary_key=True, default=get_id)
    conversation_id = Column(String, nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    is_voice = Column(Boolean, default=False)
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class TaskDB(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, default=get_id)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String, default="medium")
    status = Column(String, default="pending")
    due_date = Column(DateTime, nullable=True)
    laptop_sync = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class DocumentDB(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True, default=get_id)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)


class MeetingDB(Base):
    __tablename__ = "meetings"
    id = Column(String, primary_key=True, default=get_id)
    title = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    attendees = Column(JSON, default=list)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String, default="scheduled")
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
