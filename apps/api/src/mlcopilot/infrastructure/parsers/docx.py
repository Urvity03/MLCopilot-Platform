"""DOCX document parser implementation using built-in zipfile and xml.etree.ElementTree."""

import io
import xml.etree.ElementTree as ET
import zipfile

from mlcopilot.domain import DocumentParser
from mlcopilot.domain.upload import ExtractedChunk


class DocxParser(DocumentParser):
    """Extracts text from DOCX files by unzipping and parsing the document XML."""

    def parse(self, data: bytes) -> list[ExtractedChunk]:
        """Parse DOCX document and extract text in chunks.

        Args:
            data: DOCX file raw bytes.

        Returns:
            A list of ExtractedChunk objects.
        """
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as docx:
                xml_content = docx.read("word/document.xml")
        except KeyError as e:
            # Not a valid docx, or missing document.xml
            msg = "Invalid DOCX format: missing word/document.xml"
            raise ValueError(msg) from e
        except zipfile.BadZipFile as e:
            msg = "Invalid DOCX format: bad zip archive"
            raise ValueError(msg) from e

        # Secure parsing against external entity injection by default in python 3.9+ ET
        root = ET.fromstring(xml_content)  # noqa: S314

        # Word Document Namespace
        ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

        paragraphs = []
        for p_elem in root.findall(".//w:p", ns):
            text_runs = []
            for t_elem in p_elem.findall(".//w:t", ns):
                if t_elem.text:
                    text_runs.append(t_elem.text)
            p_text = "".join(text_runs).strip()
            if p_text:
                paragraphs.append(p_text)

        # Intelligent chunking: group paragraphs until we reach ~1500 chars limit
        chunks: list[ExtractedChunk] = []
        current_chunk: list[str] = []
        current_length = 0
        chunk_idx = 1

        for p in paragraphs:
            if current_length + len(p) > 1500 and current_chunk:
                chunks.append(
                    ExtractedChunk(
                        content="\n\n".join(current_chunk),
                        metadata={"paragraph_count": len(current_chunk)},
                    )
                )
                chunk_idx += 1
                current_chunk = [p]
                current_length = len(p)
            else:
                current_chunk.append(p)
                current_length += len(p) + 2  # plus newline spacing

        if current_chunk:
            chunks.append(
                ExtractedChunk(
                    content="\n\n".join(current_chunk),
                    metadata={"paragraph_count": len(current_chunk)},
                )
            )

        return chunks
