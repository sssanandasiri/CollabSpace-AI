import os
import re
from pathlib import Path
from typing import List, Dict, Any
import requests
from django.conf import settings
from .models import Document, DocumentChunk


def extract_and_chunk_document(doc: Document) -> int:
    """
    Extracts text from the uploaded document preserving page numbers where possible,
    splits it into overlapping chunks, and creates DocumentChunk records in MySQL.
    Returns the total number of chunks created.
    """
    file_path = doc.file.path
    ext = Path(file_path).suffix.lower()
    chunks_data = []

    try:
        if ext == ".pdf":
            import pypdf
            reader = pypdf.PdfReader(file_path)
            doc.page_count = len(reader.pages)
            for page_idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                page_num = page_idx + 1
                if not page_text.strip():
                    continue
                # Split page text into chunks (~600 chars with 100 char overlap)
                sub_chunks = split_into_chunks(page_text, max_chars=600, overlap=100)
                for chunk_text in sub_chunks:
                    chunks_data.append({
                        "page_number": page_num,
                        "content": chunk_text.strip(),
                    })

        elif ext in [".docx", ".doc"]:
            import docx
            docx_file = docx.Document(file_path)
            full_text = []
            for para in docx_file.paragraphs:
                text = para.text.strip()
                if text:
                    full_text.append(text)
            combined = "\n\n".join(full_text)
            doc.page_count = max(1, len(combined) // 2500)
            sub_chunks = split_into_chunks(combined, max_chars=600, overlap=100)
            for idx, chunk_text in enumerate(sub_chunks):
                # Approximate page numbers for docx
                approx_page = (idx * 500 // 2500) + 1
                chunks_data.append({
                    "page_number": approx_page,
                    "content": chunk_text.strip(),
                })

        else:  # txt, md, csv, etc.
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            doc.page_count = max(1, len(content) // 2500)
            sub_chunks = split_into_chunks(content, max_chars=600, overlap=100)
            for idx, chunk_text in enumerate(sub_chunks):
                approx_page = (idx * 500 // 2500) + 1
                chunks_data.append({
                    "page_number": approx_page,
                    "content": chunk_text.strip(),
                })

        # Save chunks
        chunk_objects = []
        for i, c in enumerate(chunks_data):
            chunk_objects.append(
                DocumentChunk(
                    document=doc,
                    team=doc.team,
                    chunk_index=i,
                    page_number=c["page_number"],
                    content=c["content"],
                )
            )

        # Bulk create for fast MySQL insertion
        DocumentChunk.objects.bulk_create(chunk_objects)
        doc.processing_status = Document.ProcessingStatus.READY
        doc.save()
        return len(chunk_objects)

    except Exception as e:
        doc.processing_status = Document.ProcessingStatus.FAILED
        doc.summary = f"Error during parsing: {str(e)}"
        doc.save()
        raise e


def split_into_chunks(text: str, max_chars: int = 600, overlap: int = 100) -> List[str]:
    """Helper to split a long string into overlapping chunks on sentence/word boundaries."""
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_chars:
        return [text] if text else []

    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chars
        if end >= len(text):
            chunks.append(text[start:])
            break
        # Try finding a period, newline, or space to break cleanly
        break_point = text.rfind(". ", start, end)
        if break_point == -1 or break_point < start + (max_chars // 2):
            break_point = text.rfind(" ", start, end)
        if break_point == -1 or break_point < start + (max_chars // 2):
            break_point = end
        else:
            break_point += 1

        chunks.append(text[start:break_point].strip())
        start = max(start + 1, break_point - overlap)
    return chunks


def retrieve_relevant_chunks(team_id: int, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Retrieves the top_k relevant chunks for a specific team, strictly respecting team boundaries.
    Uses multi-term scoring, phrase matching, and keyword density.
    """
    chunks = DocumentChunk.objects.filter(team_id=team_id).select_related("document")
    if not chunks.exists():
        return []

    # Clean query into keywords
    stop_words = {
        "what", "is", "the", "in", "our", "and", "to", "a", "an", "of", "for", "on", "with",
        "are", "we", "do", "how", "should", "about", "this", "that", "it", "my", "your",
        "can", "could", "would", "which", "who", "whom", "where", "when", "why", "assignment", "project"
    }
    raw_words = re.findall(r"\w+", query.lower())
    keywords = [w for w in raw_words if len(w) > 2 and w not in stop_words]
    query_phrase = " ".join(raw_words)

    scored_chunks = []
    for chunk in chunks:
        content_lower = chunk.content.lower()
        doc_title_lower = chunk.document.title.lower()
        score = 0.0

        # Exact phrase match bonus
        if len(query_phrase) > 5 and query_phrase in content_lower:
            score += 15.0

        # Title keyword match
        for kw in keywords:
            if kw in doc_title_lower:
                score += 4.0

        # Keyword frequency and position in chunk
        for kw in keywords:
            count = content_lower.count(kw)
            if count > 0:
                score += (count * 2.0)
                # Extra boost if it looks like a requirement, rubric, objective, or deliverable
                if kw in ["requirement", "deliverable", "architecture", "database", "design", "testing", "objective", "deadline", "submission", "rubric"]:
                    score += 3.0

        # Extra heuristic for requirements/steps if query asks about what to do or requirements
        if any(term in query.lower() for term in ["requirement", "next", "what should", "todo", "do next", "steps"]):
            if any(term in content_lower for term in ["objective", "requirement", "task", "milestone", "step", "deliverable", "specification", "rubric", "submission"]):
                score += 5.0
            # Look for numbered or bullet lists in content
            if re.search(r"(\d+\.|\*|-)\s+[A-Z]", chunk.content):
                score += 3.0

        if score > 0:
            scored_chunks.append({
                "chunk_id": chunk.id,
                "document_id": chunk.document.id,
                "document_title": chunk.document.title,
                "page_number": chunk.page_number,
                "content": chunk.content,
                "score": score,
            })

    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    return scored_chunks[:top_k]


def answer_project_question(team_id: int, query: str) -> Dict[str, Any]:
    """
    Answers a question grounded strictly in team's authorized documents.
    If GEMINI_API_KEY is available in environment or settings, calls the Gemini API.
    Otherwise uses our smart built-in grounded synthesis engine with citations.
    """
    relevant_chunks = retrieve_relevant_chunks(team_id=team_id, query=query, top_k=5)

    if not relevant_chunks:
        has_any_doc = Document.objects.filter(team_id=team_id).exists()
        if not has_any_doc:
            return {
                "answer": "Your team has not uploaded any documents yet. Please upload your assignment brief, lecture notes, or project resources in the Documents tab so I can assist you with your project.",
                "sources": [],
            }
        return {
            "answer": "Based on your team's uploaded project documents, I could not find information regarding your question. Please ensure relevant files (such as the assignment brief or specifications) are uploaded, or try phrasing your question with specific project terms.",
            "sources": [],
        }

    # Format sources for citation
    sources_summary = []
    seen_sources = set()
    for rc in relevant_chunks:
        source_key = f"{rc['document_title']}:{rc['page_number']}"
        if source_key not in seen_sources:
            seen_sources.add(source_key)
            sources_summary.append({
                "document_id": rc["document_id"],
                "document_title": rc["document_title"],
                "page_number": rc["page_number"],
                "excerpt": rc["content"][:200] + ("..." if len(rc["content"]) > 200 else ""),
            })

    # Try Gemini API if API key is provided
    gemini_key = os.getenv("GEMINI_API_KEY", getattr(settings, "GEMINI_API_KEY", None))
    if gemini_key:
        try:
            answer = generate_gemini_answer(query, relevant_chunks, gemini_key)
            if answer:
                return {
                    "answer": answer,
                    "sources": sources_summary,
                }
        except Exception:
            # Fall back smoothly to grounded extractor
            pass

    # Built-in grounded extractive synthesis engine
    answer = synthesize_grounded_answer(query, relevant_chunks)
    return {
        "answer": answer,
        "sources": sources_summary,
    }


def generate_gemini_answer(query: str, chunks: List[Dict[str, Any]], api_key: str) -> str:
    """Invokes Google Gemini API with strict grounding prompt."""
    context_text = "\n\n".join([
        f"--- Source: {c['document_title']} (Page {c['page_number']}) ---\n{c['content']}"
        for c in chunks
    ])

    system_instruction = (
        "You are CollabSpace AI, an intelligent student collaboration assistant. "
        "Your role is to answer questions strictly grounded in the provided project documents.\n"
        "Rules:\n"
        "1. Only answer based on the provided context excerpts.\n"
        "2. If the context does not contain the answer, explicitly state: 'Based on the uploaded documents, I could not find information about...'\n"
        "3. Provide clear structured responses (e.g. numbered requirements or bullet points).\n"
        "4. Include suggested next steps if relevant to student tasks.\n"
        "5. Explicitly cite the document name and page number at the end."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": f"{system_instruction}\n\nContext:\n{context_text}\n\nStudent Question:\n{query}"
                    }
                ]
            }
        ]
    }

    resp = requests.post(url, json=payload, timeout=20)
    if resp.status_code == 200:
        data = resp.json()
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts and "text" in parts[0]:
                return parts[0]["text"]
    return ""


def synthesize_grounded_answer(query: str, chunks: List[Dict[str, Any]]) -> str:
    """
    Built-in smart grounded extractive response synthesizer.
    Generates structured, professional answers with citations even without an external API key.
    """
    primary_chunk = chunks[0]
    all_content = "\n".join([c["content"] for c in chunks])

    # Extract bullet points, numbered lists, and key sentences
    sentences = re.split(r"(?<=[.!?])\s+", all_content)
    relevant_sentences = []
    query_words = set(re.findall(r"\w+", query.lower()))

    for s in sentences:
        s_clean = s.strip()
        if len(s_clean) < 15:
            continue
        s_words = set(re.findall(r"\w+", s_clean.lower()))
        overlap = query_words.intersection(s_words)
        if len(overlap) >= 1 or any(k in s_clean.lower() for k in ["require", "deliver", "must", "design", "system", "report", "objective"]):
            relevant_sentences.append(s_clean)

    # Format source citation line
    pages_by_doc = {}
    for c in chunks:
        pages_by_doc.setdefault(c["document_title"], set()).add(str(c["page_number"]))
    sources_text = "; ".join([
        f"{doc_title}, page {', '.join(sorted(pages, key=int))}"
        for doc_title, pages in pages_by_doc.items()
    ])

    # Detect if query asks for requirements / tasks / next steps
    is_requirements_query = any(w in query.lower() for w in ["requirement", "brief", "what are", "tasks", "next", "what to do", "objective"])

    lines = []
    if is_requirements_query:
        lines.append(f"Based on your team's uploaded **{primary_chunk['document_title']}**, here are the key findings and requirements:\n")

        # Pick top sentences as numbered items
        picked = relevant_sentences[:5] if relevant_sentences else [chunks[0]["content"][:300]]
        for idx, item in enumerate(picked, 1):
            cleaned_item = item.strip("-* 1234567890.").strip()
            lines.append(f"{idx}. {cleaned_item}")

        lines.append("\n**Suggested Next Steps for the Team:**")
        lines.append("- Assign specific members to each primary requirement on the Task Board.")
        lines.append("- Create actionable tasks with realistic deadlines before the milestone.")
        lines.append("- Review architecture and deliverables in a team sync.")
    else:
        lines.append(f"Based on your team's uploaded **{primary_chunk['document_title']}** (page {primary_chunk['page_number']}):\n")
        picked = relevant_sentences[:4] if relevant_sentences else [chunks[0]["content"][:350]]
        for sentence in picked:
            lines.append(f"- {sentence}")

    lines.append(f"\n*Sources: {sources_text}. Suggestions are grounded in uploaded team documents.*")
    return "\n".join(lines)
