from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime
from .database import Base


class Document(Base):
    __tablename__ = "documents"

    id              = Column(Integer, primary_key=True, index=True)
    fir_number      = Column(String(50), unique=True, index=True, nullable=False)
    case_number     = Column(String(50), index=True)
    officer_name    = Column(String(100))
    document_type   = Column(String(50))
    document_date   = Column(Date, default=datetime.utcnow().date)
    section         = Column(String(100))
    file_path       = Column(String(255))
    original_name   = Column(String(255))
    sha256_hash     = Column(String(64), index=True)
    uploaded_by     = Column(String(100), default="Admin User")
    size_bytes      = Column(Integer, default=0)
    created_at      = Column(DateTime, default=datetime.utcnow)


class LedgerEntry(Base):
    __tablename__ = "ledger"

    seq                 = Column(Integer, primary_key=True, autoincrement=True)
    doc_id              = Column(Integer, index=True)
    action              = Column(String(50))
    actor               = Column(String(100))
    sha256_hash         = Column(String(64))
    previous_block_hash = Column(String(64))
    block_hash          = Column(String(64))
    timestamp           = Column(DateTime, default=datetime.utcnow)
