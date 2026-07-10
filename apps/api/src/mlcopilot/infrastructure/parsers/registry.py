"""Registry mapping document extensions to their respective DocumentParser implementations."""

from mlcopilot.domain import DocumentParser
from mlcopilot.infrastructure.parsers.docx import DocxParser
from mlcopilot.infrastructure.parsers.markdown import MarkdownParser
from mlcopilot.infrastructure.parsers.pdf import PdfParser
from mlcopilot.infrastructure.parsers.text import TextParser

_PARSER_REGISTRY: dict[str, type[DocumentParser]] = {
    ".pdf": PdfParser,
    ".docx": DocxParser,
    ".md": MarkdownParser,
    ".txt": TextParser,
}


def get_parser_for_extension(extension: str) -> DocumentParser:
    """Return an instance of DocumentParser for the given extension.

    Args:
        extension: The file extension starting with a dot (e.g. '.pdf').

    Raises:
        ValueError: If no parser is registered for the extension.
    """
    ext = extension.lower()
    parser_cls = _PARSER_REGISTRY.get(ext)
    if not parser_cls:
        msg = f"No document parser registered for extension: {extension}"
        raise ValueError(msg)
    return parser_cls()
