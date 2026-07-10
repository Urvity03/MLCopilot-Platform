"""Markdown document parser implementation."""

import re

from mlcopilot.domain import DocumentParser
from mlcopilot.domain.upload import ExtractedChunk


class MarkdownParser(DocumentParser):
    """Extracts text from Markdown files, splitting intelligently on header sections."""

    def parse(self, data: bytes) -> list[ExtractedChunk]:
        """Parse Markdown document and extract text in chunks.

        Args:
            data: Markdown raw bytes.

        Returns:
            A list of ExtractedChunk objects.
        """
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            text = data.decode("utf-8", errors="ignore")

        # Split markdown by ATX headers (# H1, ## H2, etc.) at the start of a line
        header_pattern = re.compile(r"^(#{1,6}\s+.*)$", re.MULTILINE)
        parts = header_pattern.split(text)

        chunks: list[ExtractedChunk] = []
        first_part = parts[0].strip()
        if first_part:
            self._split_and_append_chunks(chunks, first_part, {"header": "Introduction"})

        for i in range(1, len(parts), 2):
            header = parts[i].strip()
            # Clean header symbols from metadata representation
            clean_header = header.lstrip("#").strip()
            content = parts[i + 1].strip() if i + 1 < len(parts) else ""
            if content:
                full_text = f"{header}\n\n{content}"
                self._split_and_append_chunks(chunks, full_text, {"header": clean_header})

        return chunks

    def _split_and_append_chunks(
        self, chunks: list[ExtractedChunk], text: str, metadata: dict[str, str]
    ) -> None:
        """Split text along paragraph boundaries if it exceeds maximum chunk size."""
        max_chunk_size = 2000
        if len(text) <= max_chunk_size:
            chunks.append(ExtractedChunk(content=text, metadata=metadata))
            return

        paragraphs = text.split("\n\n")
        current_chunk: list[str] = []
        current_length = 0

        for p in paragraphs:
            if current_length + len(p) > max_chunk_size and current_chunk:
                chunks.append(
                    ExtractedChunk(content="\n\n".join(current_chunk), metadata=metadata)
                )
                current_chunk = [p]
                current_length = len(p)
            else:
                current_chunk.append(p)
                current_length += len(p) + 2

        if current_chunk:
            chunks.append(
                ExtractedChunk(content="\n\n".join(current_chunk), metadata=metadata)
            )
