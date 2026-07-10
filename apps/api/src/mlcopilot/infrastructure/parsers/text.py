"""Plain text document parser implementation."""

from mlcopilot.domain import DocumentParser
from mlcopilot.domain.upload import ExtractedChunk


class TextParser(DocumentParser):
    """Extracts text from plain text files, chunking along paragraph boundaries."""

    def parse(self, data: bytes) -> list[ExtractedChunk]:
        """Parse plain text document and extract text in chunks.

        Args:
            data: Raw text file bytes.

        Returns:
            A list of ExtractedChunk objects.
        """
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            text = data.decode("utf-8", errors="ignore")

        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk: list[str] = []
        current_length = 0

        for p in paragraphs:
            p = p.strip()
            if not p:
                continue

            if current_length + len(p) > 1500 and current_chunk:
                chunks.append(
                    ExtractedChunk(
                        content="\n\n".join(current_chunk),
                        metadata={"paragraph_count": len(current_chunk)},
                    )
                )
                current_chunk = [p]
                current_length = len(p)
            else:
                current_chunk.append(p)
                current_length += len(p) + 2

        if current_chunk:
            chunks.append(
                ExtractedChunk(
                    content="\n\n".join(current_chunk),
                    metadata={"paragraph_count": len(current_chunk)},
                )
            )

        return chunks
