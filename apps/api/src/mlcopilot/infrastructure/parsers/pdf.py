"""PDF document parser implementation using pypdf."""

import io

from pypdf import PdfReader

from mlcopilot.domain import DocumentParser
from mlcopilot.domain.upload import ExtractedChunk


class PdfParser(DocumentParser):
    """Extracts text from PDF documents page by page."""

    def parse(self, data: bytes) -> list[ExtractedChunk]:
        """Parse PDF document and extract text.

        Args:
            data: PDF raw bytes.

        Returns:
            A list of ExtractedChunk objects (one per non-empty page).
        """
        reader = PdfReader(io.BytesIO(data))
        chunks = []
        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                text = text.strip()
                if text:
                    chunks.append(
                        ExtractedChunk(
                            content=text,
                            metadata={"page": page_idx + 1},
                        )
                    )
        return chunks
