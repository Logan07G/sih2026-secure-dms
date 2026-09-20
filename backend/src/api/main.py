"""
CaseVault API — FastAPI backend for the Secure DMS.
Wires the crypto modules, the DB, and the endpoints together.
"""
from datetime import date
from pathlib import Path
import hashlib

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from database.database import Base, engine, SessionLocal
from database.models import Document, LedgerEntry
from database.search import search_documents, get_by_id, list_all
from database.seed import seed_if_empty
from backend.src.crypto.crypto_engine import encrypt_document, generate_key
from backend.src.crypto.integrity import generate_hash


app = FastAPI(
    title="CaseVault API",
    description="Secure Digital Document Management (SIH26190)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    seed_if_empty()


@app.get("/")
def root():
    return {
        "service": "CaseVault API",
        "status": "operational",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "casevault-api"}


@app.get("/api/docs")
def api_list_docs():
    rows = list_all()
    return {"results": rows, "count": len(rows)}


@app.get("/api/docs/search")
def api_search_docs(
    fir_number: str | None = None,
    case_number: str | None = None,
    officer_name: str | None = None,
    document_type: str | None = None,
    section: str | None = None,
):
    rows = search_documents(
        fir_number=fir_number,
        case_number=case_number,
        officer_name=officer_name,
        document_type=document_type,
        section=section,
    )
    return {"results": rows, "count": len(rows)}


@app.get("/api/docs/{doc_id}")
def api_get_doc(doc_id: int):
    row = get_by_id(doc_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    return row


@app.post("/api/docs/upload")
async def api_upload(
    file: UploadFile = File(...),
    fir_number: str = Form(...),
    case_number: str = Form(""),
    officer_name: str = Form("Admin User"),
    document_type: str = Form("FIR"),
    section: str = Form(""),
):
    contents = await file.read()
    sha = generate_hash(contents)

    db = SessionLocal()
    try:
        if db.query(Document).filter(Document.fir_number == fir_number).first():
            raise HTTPException(status_code=409, detail=f"FIR {fir_number} already exists")

        storage_dir = Path("database/storage")
        storage_dir.mkdir(parents=True, exist_ok=True)
        blob_path = storage_dir / f"{fir_number}.enc"
        key = generate_key()
        encrypted = encrypt_document(contents, key, document_id=fir_number)
        blob_path.write_bytes(encrypted)

        doc = Document(
            fir_number=fir_number,
            case_number=case_number or "CASE-UNSET",
            officer_name=officer_name,
            document_type=document_type,
            document_date=date.today(),
            section=section or "—",
            file_path=str(blob_path),
            original_name=file.filename,
            sha256_hash=sha,
            uploaded_by=officer_name,
            size_bytes=len(contents),
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        _append_ledger(db, doc_id=doc.id, action="UPLOAD", actor=officer_name, sha=sha)

        return {
            "id": doc.id,
            "fir_number": doc.fir_number,
            "sha256_hash": doc.sha256_hash,
            "size_bytes": doc.size_bytes,
            "message": "Document uploaded and secured",
        }
    finally:
        db.close()


def _append_ledger(db, doc_id: int, action: str, actor: str, sha: str):
    last = db.query(LedgerEntry).order_by(LedgerEntry.seq.desc()).first()
    prev = last.block_hash if last else "0" * 64
    block_hash = hashlib.sha256(f"{doc_id}|{action}|{actor}|{sha}|{prev}".encode()).hexdigest()
    db.add(LedgerEntry(
        doc_id=doc_id, action=action, actor=actor,
        sha256_hash=sha, previous_block_hash=prev, block_hash=block_hash,
    ))
    db.commit()


@app.get("/api/verify-chain")
def api_verify_chain():
    db = SessionLocal()
    try:
        entries = db.query(LedgerEntry).order_by(LedgerEntry.seq.asc()).all()
        prev = "0" * 64
        for e in entries:
            if e.previous_block_hash != prev:
                return {"valid": False, "reason": f"Chain break at seq {e.seq}"}
            recomputed = hashlib.sha256(
                f"{e.doc_id}|{e.action}|{e.actor}|{e.sha256_hash}|{e.previous_block_hash}".encode()
            ).hexdigest()
            if recomputed != e.block_hash:
                return {"valid": False, "reason": f"Hash mismatch at seq {e.seq}"}
            prev = e.block_hash
        return {"valid": True, "message": f"Chain intact ({len(entries)} blocks)"}
    finally:
        db.close()


@app.get("/api/ledger")
def api_ledger():
    db = SessionLocal()
    try:
        entries = db.query(LedgerEntry).order_by(LedgerEntry.seq.desc()).all()
        return {
            "results": [
                {
                    "seq": e.seq,
                    "doc_id": e.doc_id,
                    "action": e.action,
                    "actor": e.actor,
                    "sha256_hash": e.sha256_hash,
                    "previous_block_hash": e.previous_block_hash,
                    "block_hash": e.block_hash,
                    "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                }
                for e in entries
            ],
            "count": len(entries),
        }
    finally:
        db.close()
