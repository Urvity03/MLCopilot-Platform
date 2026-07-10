"""Document parsers package."""

from mlcopilot.infrastructure.parsers.docx import DocxParser
from mlcopilot.infrastructure.parsers.markdown import MarkdownParser
from mlcopilot.infrastructure.parsers.pdf import PdfParser
from mlcopilot.infrastructure.parsers.registry import get_parser_for_extension
from mlcopilot.infrastructure.parsers.text import TextParser

__all__ = [
    "DocxParser",
    "MarkdownParser",
    "PdfParser",
    "TextParser",
    "get_parser_for_extension",
]
