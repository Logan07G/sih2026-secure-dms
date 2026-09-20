from datetime import date
from .database import SessionLocal, engine, Base
from .models import Document


MOCK_DOCS = [
    {"fir_number":"FIR001","case_number":"CASE101","officer_name":"Rahul Sharma","document_type":"FIR","document_date":date(2026,1,10),"section":"IPC 302","file_path":"/docs/fir001.pdf","sha256_hash":"a1"*32},
    {"fir_number":"FIR002","case_number":"CASE102","officer_name":"Amit Verma","document_type":"Investigation Report","document_date":date(2026,1,12),"section":"IPC 379","file_path":"/docs/inv002.pdf","sha256_hash":"a2"*32},
    {"fir_number":"FIR003","case_number":"CASE103","officer_name":"Priya Singh","document_type":"Witness Statement","document_date":date(2026,1,15),"section":"IPC 420","file_path":"/docs/wit003.pdf","sha256_hash":"a3"*32},
    {"fir_number":"FIR004","case_number":"CASE104","officer_name":"Raj Patel","document_type":"Charge Sheet","document_date":date(2026,1,18),"section":"IPC 307","file_path":"/docs/charge004.pdf","sha256_hash":"a4"*32},
    {"fir_number":"FIR005","case_number":"CASE105","officer_name":"Neha Gupta","document_type":"Forensic Report","document_date":date(2026,1,20),"section":"IPC 302","file_path":"/docs/forensic005.pdf","sha256_hash":"a5"*32},
    {"fir_number":"FIR006","case_number":"CASE106","officer_name":"Vikas Jain","document_type":"Court Filing","document_date":date(2026,1,22),"section":"IPC 376","file_path":"/docs/court006.pdf","sha256_hash":"a6"*32},
    {"fir_number":"FIR007","case_number":"CASE107","officer_name":"Ankit Singh","document_type":"Legal Notice","document_date":date(2026,1,25),"section":"IPC 420","file_path":"/docs/notice007.pdf","sha256_hash":"a7"*32},
    {"fir_number":"FIR008","case_number":"CASE108","officer_name":"Pooja Sharma","document_type":"Judgment","document_date":date(2026,1,27),"section":"IPC 307","file_path":"/docs/judgment008.pdf","sha256_hash":"a8"*32},
    {"fir_number":"FIR009","case_number":"CASE109","officer_name":"Rohit Mehta","document_type":"FIR","document_date":date(2026,2,1),"section":"IPC 379","file_path":"/docs/fir009.pdf","sha256_hash":"a9"*32},
    {"fir_number":"FIR010","case_number":"CASE110","officer_name":"Sneha Verma","document_type":"Investigation Report","document_date":date(2026,2,5),"section":"IPC 302","file_path":"/docs/inv010.pdf","sha256_hash":"aa"*32},
]


def seed_if_empty():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = db.query(Document).count()
        if count > 0:
            print(f"[seed] documents table already has {count} rows — skipping seed")
            return
        for row in MOCK_DOCS:
            db.add(Document(**row))
        db.commit()
        print(f"[seed] inserted {len(MOCK_DOCS)} sample documents")
    finally:
        db.close()
