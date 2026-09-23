"""
Rule-based document analyzer — Phase 1 stand-in for InLegalBERT.

Extracts from uploaded text:
  - document_type (classification)
  - ipc_sections (list)
  - dates (list)
  - case_numbers (list)
  - officer_names (list)
  - parties (complainant/accused names)
  - summary (top 3 key sentences)
  - risk_level

Phase 2: replace analyze_text() with an InLegalBERT + Qwen2.5-7B pipeline.
"""

import re
from typing import Dict, List


# -----------------------------------------------------------------
# Keyword lexicon for classification
# -----------------------------------------------------------------

DOC_TYPE_KEYWORDS = {
    "FIR":                 ["first information report", "fir no", "fir number", "register the case"],
    "Charge Sheet":        ["charge sheet", "final report", "final form", "investigation report"],
    "Witness Statement":   ["witness statement", "statement of witness", "deposition", "examined"],
    "Forensic Report":     ["forensic", "fsl", "ballistic", "dna", "fingerprint report", "post mortem", "postmortem"],
    "Judgment":            ["judgment", "order pronounced", "in the matter of", "petition", "hon'ble court"],
    "Court Filing":        ["petition filed", "application", "affidavit", "vakalatnama"],
    "Legal Notice":        ["legal notice", "notice under section", "notice to"],
    "Medical Report":      ["medical report", "injury report", "mlc", "medical examination"],
}

IPC_PATTERN = re.compile(r"\b(?:IPC|BNS|BNSS|BSA|Section)\s*[- ]?(\d+[A-Za-z]?)\b", re.IGNORECASE)
STANDALONE_SECTION = re.compile(r"\b(302|307|376|379|392|395|420|406|409|468|471|498A|506|34|120B)\b")

DATE_PATTERNS = [
    re.compile(r"\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})\b"),
    re.compile(r"\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b", re.IGNORECASE),
]

CASE_PATTERN = re.compile(r"\b(?:FIR|CR|Case)\s*[-/#]?\s*(\d{2,4}[-/]?\d{0,4})\b", re.IGNORECASE)

OFFICER_PATTERN = re.compile(
    r"\b(SHO|SI|AS[II]|PI|DSP|Inspector|Constable|Sub[- ]?Inspector|Station House Officer)\s+"
    r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b"
)

NAME_AFTER_LABEL = re.compile(
    r"\b(?:Complainant|Accused|Victim|Petitioner|Respondent|Applicant|Suspect)\s*[:\-]\s*"
    r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})"
)

SUMMARY_KEYWORDS = [
    "theft", "murder", "assault", "fraud", "cyber", "stolen", "arrest",
    "recovered", "seized", "statement", "confession", "missing", "witness",
    "evidence", "investigation", "sections", "case", "alleged", "committed",
]

RISK_KEYWORDS = {
    "high":   ["murder", "rape", "terror", "killed", "weapon", "firearm", "threat", "kidnap"],
    "medium": ["assault", "robbery", "dacoity", "theft", "fraud", "cyber", "hurt", "stolen"],
    "low":    ["missing", "dispute", "notice", "complaint", "application"],
}


# -----------------------------------------------------------------
# Core analyzer
# -----------------------------------------------------------------

def analyze_text(text: str) -> Dict:
    text = text or ""
    lower = text.lower()

    doc_type, confidence = classify_document(lower)
    sections = extract_sections(text)
    dates = extract_dates(text)
    case_numbers = extract_case_numbers(text)
    officers = extract_officers(text)
    parties = extract_parties(text)
    summary = summarize(text)
    risk = assess_risk(lower, sections)

    return {
        "document_type": doc_type,
        "confidence": round(confidence, 3),
        "ipc_sections": sections,
        "dates": dates,
        "case_numbers": case_numbers,
        "officer_names": officers,
        "parties": parties,
        "summary": summary,
        "risk_level": risk,
        "word_count": len(text.split()),
        "char_count": len(text),
    }


def classify_document(lower: str):
    scores = {}
    for dtype, keywords in DOC_TYPE_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in lower)
        if hits:
            scores[dtype] = hits

    if not scores:
        return "Unclassified", 0.0

    best = max(scores, key=scores.get)
    total = sum(scores.values()) or 1
    return best, scores[best] / total


def extract_sections(text: str) -> List[str]:
    found = set()
    for m in IPC_PATTERN.finditer(text):
        found.add(m.group(1).upper())
    for m in STANDALONE_SECTION.finditer(text):
        found.add(m.group(1).upper())
    return sorted(found, key=lambda x: (len(x), x))


def extract_dates(text: str) -> List[str]:
    found = []
    for pat in DATE_PATTERNS:
        for m in pat.finditer(text):
            found.append(m.group(0))
    # dedupe preserving order
    seen = set()
    out = []
    for d in found:
        if d not in seen:
            seen.add(d)
            out.append(d)
    return out[:10]


def extract_case_numbers(text: str) -> List[str]:
    found = []
    for m in CASE_PATTERN.finditer(text):
        found.append(m.group(0))
    return list(dict.fromkeys(found))[:5]


def extract_officers(text: str) -> List[str]:
    found = []
    for m in OFFICER_PATTERN.finditer(text):
        rank, name = m.group(1), m.group(2)
        found.append(f"{rank} {name}")
    return list(dict.fromkeys(found))[:5]


def extract_parties(text: str) -> List[str]:
    found = []
    for m in NAME_AFTER_LABEL.finditer(text):
        found.append(m.group(1))
    return list(dict.fromkeys(found))[:8]


def _looks_like_garbage(s: str) -> bool:
    """True if a string looks like binary/compressed data rather than prose."""
    if not s or len(s) < 15:
        return True
    # Fraction of non-printable / unusual chars
    odd = sum(1 for c in s if not c.isalnum() and c not in " .,;:!?-'\"()[]/&%\n\t")
    if odd / max(len(s), 1) > 0.25:
        return True
    # Very few real letters
    letters = sum(1 for c in s if c.isalpha())
    if letters / max(len(s), 1) < 0.4:
        return True
    # Common PDF garbage markers
    for marker in ("/Filter", "/FlateDecode", "%PDF", "obj <<", "endobj", "stream"):
        if marker in s:
            return True
    return False


def summarize(text: str, top_n: int = 3) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    sentences = [s for s in sentences if not _looks_like_garbage(s)]
    if not sentences:
        return "No readable text content found — this appears to be a scanned or binary document."

    def score(s: str) -> int:
        return sum(1 for kw in SUMMARY_KEYWORDS if kw in s.lower())

    ranked = sorted(sentences, key=score, reverse=True)[:top_n]
    # preserve original order
    ordered = [s for s in sentences if s in ranked]
    return " ".join(ordered)[:600]


def assess_risk(lower: str, sections: List[str]) -> str:
    if any(kw in lower for kw in RISK_KEYWORDS["high"]):
        return "High"
    # Section 302 (murder), 376 (rape) — high
    if any(s in ("302", "376", "307", "395") for s in sections):
        return "High"
    if any(kw in lower for kw in RISK_KEYWORDS["medium"]):
        return "Medium"
    if any(kw in lower for kw in RISK_KEYWORDS["low"]):
        return "Low"
    return "Unclassified"
