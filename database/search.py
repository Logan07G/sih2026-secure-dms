from typing import Optional, List, Dict
from .database import SessionLocal
from .models import Document


def search_documents(
    fir_number: Optional[str] = None,
    case_number: Optional[str] = None,
    officer_name: Optional[str] = None,
    document_type: Optional[str] = None,
    section: Optional[str] = None,
) -> List[Dict]:
    db = SessionLocal()
    try:
        q = db.query(Document)
        if fir_number:
            q = q.filter(Document.fir_number.ilike(f"%{fir_number}%"))
        if case_number:
            q = q.filter(Document.case_number.ilike(f"%{case_number}%"))
        if officer_name:
            q = q.filter(Document.officer_name.ilike(f"%{officer_name}%"))
        if document_type:
            q = q.filter(Document.document_type.ilike(f"%{document_type}%"))
        if section:
            q = q.filter(Document.section.ilike(f"%{section}%"))
        return [_to_dict(r) for r in q.order_by(Document.id.asc()).all()]
    finally:
        db.close()


def get_by_id(doc_id: int) -> Optional[Dict]:
    db = SessionLocal()
    try:
        row = db.query(Document).filter(Document.id == doc_id).first()
        return _to_dict(row) if row else None
    finally:
        db.close()


def list_all() -> List[Dict]:
    db = SessionLocal()
    try:
        rows = db.query(Document).order_by(Document.id.asc()).all()
        return [_to_dict(r) for r in rows]
    finally:
        db.close()


def _to_dict(doc: Document) -> Dict:
    return {
        "id": doc.id,
        "fir_number": doc.fir_number,
        "case_number": doc.case_number,
        "officer_name": doc.officer_name,
        "document_type": doc.document_type,
        "document_date": doc.document_date.isoformat() if doc.document_date else None,
        "section": doc.section,
        "file_path": doc.file_path,
        "sha256_hash": doc.sha256_hash,
        "uploaded_by": doc.uploaded_by,
        "size_bytes": doc.size_bytes,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }
