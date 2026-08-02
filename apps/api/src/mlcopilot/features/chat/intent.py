"""Hybrid Intent Router module featuring fast deterministic routing and fallback LLM classification."""

from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from mlcopilot.core.logging import get_logger

if TYPE_CHECKING:
    from mlcopilot.infrastructure.llm.base import BaseLLMProvider

logger = get_logger("mlcopilot.features.chat.intent")

_FAST_GENERAL_TRIGGERS = [
    "hello", "hi", "hey", "thanks", "thank you", "good morning", "good evening", "good night", "bye",
    "what is docker", "explain docker", "explain cnn", "what is cnn", "what is today's date",
    "current date", "what date", "write bfs", "write python", "write code", "write sql",
    "what is python", "what is machine learning", "explain machine learning", "what is ai",
    "tell me a joke", "explain recursion"
]

_EXPLICIT_DOC_TRIGGERS = [
    "pdf", "resume", "uploaded report", "uploaded file", "uploaded document",
    "section ", "page ", "summarize my uploaded", "compare my uploaded", "search my upload"
]

_INTENT_CLASSIFIER_PROMPT = """You are an intent classifier for an enterprise AI workspace assistant.
Your ONLY job is to classify whether the user's prompt requires searching or reading uploaded workspace documents.

Return EXACTLY one word:
GENERAL
or
DOCUMENT

Examples:
User: Summarize my uploaded PDF.
DOCUMENT

User: Compare my uploaded documents.
DOCUMENT

User: What does section 4 of my report say?
DOCUMENT

User: According to my resume, what skills are missing?
DOCUMENT

User: {question}
Classification:"""


class IntentRouter:
    """Hybrid Intent Router combining fast deterministic rules with zero-temperature LLM classification."""

    def __init__(self, llm_provider: BaseLLMProvider) -> None:
        self._llm_provider = llm_provider

    async def classify_intent(self, question: str, has_documents: bool = True) -> Literal["GENERAL", "DOCUMENT"]:
        """Determine intent via 2-Stage Hybrid Architecture."""
        if not has_documents:
            logger.info("intent_router.decision", stage="Stage 1 Fast Route", decision="GENERAL", reason="zero_uploaded_documents")
            return "GENERAL"

        q_lower = question.strip().lower()

        # STAGE 1: Fast Deterministic Check (0ms LLM overhead)
        if any(d_trig in q_lower for d_trig in _EXPLICIT_DOC_TRIGGERS):
            logger.info("intent_router.decision", stage="Stage 1 Fast Route", decision="DOCUMENT", question=question)
            return "DOCUMENT"

        if any(g_trig in q_lower for g_trig in _FAST_GENERAL_TRIGGERS):
            logger.info("intent_router.decision", stage="Stage 1 Fast Route", decision="GENERAL", question=question)
            return "GENERAL"

        # STAGE 2: LLM Classifier (for ambiguous queries)
        prompt = _INTENT_CLASSIFIER_PROMPT.format(question=question)

        try:
            raw_response = await self._llm_provider.generate(
                system_prompt="You are a strict single-word intent classifier. Output only GENERAL or DOCUMENT.",
                user_prompt=prompt,
                temperature=0.0,
                max_tokens=4,
            )

            decision_str = raw_response.strip().upper()
            decision: Literal["GENERAL", "DOCUMENT"] = "DOCUMENT" if "DOCUMENT" in decision_str else "GENERAL"

            logger.info(
                "intent_router.decision",
                stage="Stage 2 Intent Classifier",
                decision=decision,
                question=question,
                raw_llm_output=raw_response,
            )
            return decision
        except Exception as e:
            logger.error("intent_router.classification_error", error=str(e))
            return "GENERAL"
