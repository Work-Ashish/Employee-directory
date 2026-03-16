"""
Tenant Configuration
====================
Per-tenant customization for every agent and pipeline in the HiringNow platform.

Usage
-----
Load a saved config (from Redis or JSON file):
    from tenant_config import load_tenant_config
    cfg = await load_tenant_config("acme_corp")

Run an agent with tenant config:
    from ai_service.capabilities.agents.voice_screen_agent import evaluate_audio_resume
    score = await evaluate_audio_resume(..., tenant_config=cfg)

Create a new tenant config:
    from tenant_config import TenantConfig, BrandingConfig, ScoringConfig
    cfg = TenantConfig(
        tenant_id="acme_corp",
        branding=BrandingConfig(
            agent_name="Jordan",
            company_name="Acme Corp",
            tts_voice="Polly.Joanna",
        ),
        scoring=ScoringConfig(
            voice_weights={"content_relevance": 0.40, "experience_match": 0.35,
                           "communication_clarity": 0.15, "delivery_confidence": 0.10},
            voice_trigger_threshold=65.0,
        ),
    )
    await save_tenant_config(cfg)

All fields have sensible defaults — only override what you need.
"""

from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator


# ══════════════════════════════════════════════════════════════════════════════
# SUB-CONFIGS
# ══════════════════════════════════════════════════════════════════════════════

class BrandingConfig(BaseModel):
    """Controls how the AI agent presents itself to candidates."""
    agent_name: str = "Alex"
    company_name: str = "HiringNow"
    tts_voice: str = "Polly.Amy"             # Amazon Polly voice identifier
    tts_language: str = "en-US"
    # Template vars: {agent_name}, {company_name}, {candidate_name}, {role_title}
    opening_template: str = (
        "Hi {candidate_name}, this is {agent_name} calling from {company_name} "
        "regarding the {role_title} position. Is this a good time for a quick screening call?"
    )
    closing_positive_template: str = (
        "Thank you so much, {candidate_name}! It was a real pleasure speaking with you. "
        "Our team will be in touch within 2 business days. Have a wonderful day!"
    )
    closing_neutral_template: str = (
        "Thank you for your time today, {candidate_name}. We appreciate you speaking with us. "
        "Our team will be in touch if there's a strong match. Have a great day!"
    )
    zoom_meeting_topic_template: str = (
        "{company_name} — {role_title} Interview: {candidate_name}"
    )


class ScoringConfig(BaseModel):
    """
    Scoring dimension weights and routing thresholds.
    All weight dicts must sum to 1.0 — validated automatically.
    """
    # Voice Interview Agent scoring weights
    voice_weights: dict[str, float] = Field(default_factory=lambda: {
        "content_relevance":     0.35,
        "experience_match":      0.30,
        "communication_clarity": 0.20,
        "delivery_confidence":   0.15,
    })
    # Video Interview Agent scoring weights (no code challenge)
    video_weights: dict[str, float] = Field(default_factory=lambda: {
        "communication":   0.20,
        "technical_depth": 0.30,
        "experience_fit":  0.25,
        "culture_fit":     0.10,
        "non_verbal":      0.15,
    })
    # Video Interview Agent scoring weights (with code challenge)
    video_weights_technical: dict[str, float] = Field(default_factory=lambda: {
        "communication":   0.15,
        "technical_depth": 0.25,
        "experience_fit":  0.25,
        "culture_fit":     0.10,
        "non_verbal":      0.10,
        "code_eval":       0.15,
    })
    # Audio resume evaluator weights
    audio_resume_weights: dict[str, float] = Field(default_factory=lambda: {
        "content_relevance":     0.35,
        "experience_match":      0.30,
        "communication_clarity": 0.20,
        "delivery_confidence":   0.15,
    })
    # Video resume evaluator weights
    video_resume_weights: dict[str, float] = Field(default_factory=lambda: {
        "content_relevance":     0.30,
        "experience_match":      0.25,
        "visual_presentation":   0.20,
        "communication_clarity": 0.15,
        "delivery_confidence":   0.10,
    })
    # 14-dimension screening pipeline composite scoring weights
    pipeline_weights: dict[str, float] = Field(default_factory=lambda: {
        "jd_match":                0.25,
        "paper_score":             0.10,
        "career_health":           0.10,
        "genuineness":             0.08,
        "plagiarism":              0.05,
        "ai_content":              0.05,
        "consistency":             0.07,
        "gap_analysis":            0.03,
        "company_tier":            0.05,
        "seniority":               0.05,
        "skills_adjacency":        0.05,
        "project_depth":           0.07,
        "compensation_trajectory": 0.03,
        "version_tracker":         0.02,
    })
    # Pipeline routing thresholds
    voice_trigger_threshold: float = Field(default=60.0, ge=0, le=100,
        description="Minimum composite score to trigger voice screening")
    video_trigger_threshold: float = Field(default=65.0, ge=0, le=100,
        description="Minimum voice score (YES/STRONG_YES) to trigger video screening")
    shortlist_threshold:      float = Field(default=75.0, ge=0, le=100)
    manual_review_threshold:  float = Field(default=55.0, ge=0, le=100)

    @field_validator("voice_weights", "video_weights", "video_weights_technical",
                     "audio_resume_weights", "video_resume_weights", "pipeline_weights",
                     mode="before")
    @classmethod
    def weights_sum_to_one(cls, v: dict) -> dict:
        total = sum(v.values())
        if not (0.99 <= total <= 1.01):
            raise ValueError(f"Scoring weights must sum to 1.0, got {total:.3f}")
        return v


class RecommendationThresholds(BaseModel):
    """Score cutoffs that map numeric scores to STRONG_YES/YES/MAYBE/NO."""
    strong_yes: float = Field(default=80.0, ge=0, le=100)
    yes:        float = Field(default=65.0, ge=0, le=100)
    maybe:      float = Field(default=50.0, ge=0, le=100)
    # Below maybe threshold → NO
    # Red flag penalty: -5 per flag, max -15 (applied before threshold check)
    red_flag_penalty_per_flag: float = Field(default=5.0, ge=0)
    max_red_flag_penalty:      float = Field(default=15.0, ge=0)


class QuestionConfig(BaseModel):
    """Controls question selection behaviour."""
    min_questions: int = Field(default=8, ge=3, le=30)
    max_questions: int = Field(default=12, ge=3, le=30)
    always_start_with: list[str] = Field(
        default_factory=lambda: ["gen_intro_1"],
        description="Question IDs always placed first",
    )
    always_end_with: list[str] = Field(
        default_factory=lambda: ["gen_avail_1", "gen_comp_1"],
        description="Question IDs always placed last",
    )
    # Tenant-supplied custom question bank: role_type → list of question dicts
    custom_question_bank: dict[str, list[dict[str, Any]]] = Field(
        default_factory=dict,
        description="Role-specific questions uploaded by the tenant",
    )
    max_probes_per_question: int = Field(default=2, ge=0, le=5)
    max_consecutive_no_response: int = Field(default=2, ge=1, le=5)


class FallbackConfig(BaseModel):
    """Controls which failure scenarios trigger a warm human transfer."""
    transfer_to_human_scenarios: list[str] = Field(
        default_factory=lambda: [
            "language_barrier",
            "candidate_requests_human",
            "low_confidence",
        ],
        description="FallbackScenario values that route to a human recruiter",
    )
    confidence_threshold: float = Field(
        default=0.70, ge=0.0, le=1.0,
        description="Running confidence below this triggers automatic transfer",
    )
    # Custom fallback responses: scenario_value → speech text
    # If empty, defaults from the agent are used
    custom_responses: dict[str, str] = Field(
        default_factory=dict,
        description="Override the default scripted fallback response per scenario",
    )


class ComplianceConfig(BaseModel):
    """Data governance and consent settings."""
    record_call: bool = Field(
        default=True,
        description="Whether to record voice/video calls",
    )
    require_consent_message: bool = Field(
        default=False,
        description="Speak a consent/recording-notice message at call start",
    )
    consent_message: str = Field(
        default=(
            "This call may be recorded for quality and recruitment purposes. "
            "By continuing, you consent to this recording."
        ),
    )
    anonymize_transcript: bool = Field(
        default=False,
        description="Strip candidate name and contact details from stored transcripts",
    )
    gdpr_mode: bool = Field(
        default=False,
        description="Auto-delete recordings and transcripts after data_retention_days",
    )
    data_retention_days: int = Field(default=90, ge=1)
    pii_redaction: bool = Field(
        default=False,
        description="Redact emails, phone numbers, and addresses from transcripts",
    )


class N8nWebhooksConfig(BaseModel):
    """Per-tenant n8n webhook URLs. Overrides env var defaults when set."""
    ingestion_complete: str = ""
    candidate_scored:   str = ""
    voice_complete:     str = ""
    video_complete:     str = ""
    pipeline_complete:  str = ""

    def get_url(self, event_type: str) -> str:
        """Return the configured URL for an event type, or empty string."""
        return getattr(self, event_type.replace("-", "_"), "")


class RoleOverride(BaseModel):
    """
    Role-specific overrides applied on top of tenant defaults.
    Only non-None fields override the parent TenantConfig.
    """
    scoring: Optional[ScoringConfig] = None
    questions: Optional[QuestionConfig] = None
    recommendation_thresholds: Optional[RecommendationThresholds] = None
    branding: Optional[BrandingConfig] = None


# ══════════════════════════════════════════════════════════════════════════════
# MAIN TENANT CONFIG
# ══════════════════════════════════════════════════════════════════════════════

class TenantConfig(BaseModel):
    """
    Complete per-tenant configuration for all HiringNow agents.

    All sub-configs have sensible defaults. Override only what's needed.

    Example — create and save a tenant config:
        cfg = TenantConfig(
            tenant_id="acme_corp",
            branding=BrandingConfig(agent_name="Jordan", company_name="Acme Corp"),
            scoring=ScoringConfig(voice_trigger_threshold=65.0),
            compliance=ComplianceConfig(record_call=False, require_consent_message=True),
        )
        await save_tenant_config(cfg)
    """
    tenant_id: str

    branding:                BrandingConfig           = Field(default_factory=BrandingConfig)
    scoring:                 ScoringConfig            = Field(default_factory=ScoringConfig)
    recommendation_thresholds: RecommendationThresholds = Field(default_factory=RecommendationThresholds)
    questions:               QuestionConfig           = Field(default_factory=QuestionConfig)
    fallback:                FallbackConfig           = Field(default_factory=FallbackConfig)
    compliance:              ComplianceConfig         = Field(default_factory=ComplianceConfig)
    n8n_webhooks:            N8nWebhooksConfig        = Field(default_factory=N8nWebhooksConfig)

    # Role-type specific overrides: "software_engineer" → RoleOverride(...)
    role_overrides: dict[str, RoleOverride] = Field(default_factory=dict)

    def for_role(self, role_type: str) -> "TenantConfig":
        """
        Return a copy of this config with any role-specific overrides applied.

        Usage:
            cfg = (await load_tenant_config("acme")).for_role("software_engineer")
        """
        override = self.role_overrides.get(role_type)
        if not override:
            return self
        merged = self.model_copy(deep=True)
        if override.scoring:
            merged.scoring = override.scoring
        if override.questions:
            merged.questions = override.questions
        if override.recommendation_thresholds:
            merged.recommendation_thresholds = override.recommendation_thresholds
        if override.branding:
            merged.branding = override.branding
        return merged

    def render_opening(self, candidate_name: str, role_title: str) -> str:
        return self.branding.opening_template.format(
            agent_name=self.branding.agent_name,
            company_name=self.branding.company_name,
            candidate_name=candidate_name,
            role_title=role_title,
        )

    def render_closing_positive(self, candidate_name: str) -> str:
        return self.branding.closing_positive_template.format(
            agent_name=self.branding.agent_name,
            company_name=self.branding.company_name,
            candidate_name=candidate_name,
        )

    def render_closing_neutral(self, candidate_name: str) -> str:
        return self.branding.closing_neutral_template.format(
            agent_name=self.branding.agent_name,
            company_name=self.branding.company_name,
            candidate_name=candidate_name,
        )

    def render_zoom_topic(self, candidate_name: str, role_title: str) -> str:
        return self.branding.zoom_meeting_topic_template.format(
            agent_name=self.branding.agent_name,
            company_name=self.branding.company_name,
            candidate_name=candidate_name,
            role_title=role_title,
        )

    def recommendation_for_score(self, score: float, red_flag_count: int = 0) -> str:
        """Map a numeric score to STRONG_YES/YES/MAYBE/NO using this tenant's thresholds."""
        penalty  = min(red_flag_count * self.recommendation_thresholds.red_flag_penalty_per_flag,
                       self.recommendation_thresholds.max_red_flag_penalty)
        adjusted = max(0.0, score - penalty)

        t = self.recommendation_thresholds
        if adjusted >= t.strong_yes:
            return "STRONG_YES"
        elif adjusted >= t.yes:
            return "YES"
        elif adjusted >= t.maybe:
            return "MAYBE"
        return "NO"

    def next_action_for_recommendation(self, recommendation: str) -> str:
        mapping = {
            "STRONG_YES": "trigger_video_interview",
            "YES":        "schedule_video_or_panel",
            "MAYBE":      "manual_review",
            "NO":         "send_rejection",
        }
        return mapping.get(recommendation, "manual_review")


# ══════════════════════════════════════════════════════════════════════════════
# DEFAULT CONFIG (used when no tenant config is found)
# ══════════════════════════════════════════════════════════════════════════════

DEFAULT_CONFIG = TenantConfig(tenant_id="default")


def get_default_config() -> TenantConfig:
    """Return a fresh default TenantConfig."""
    return TenantConfig(tenant_id="default")


# ══════════════════════════════════════════════════════════════════════════════
# HELPER — extract config from LangGraph state
# ══════════════════════════════════════════════════════════════════════════════

def cfg_from_state(state: dict) -> TenantConfig:
    """
    Extract TenantConfig from a LangGraph state dict.
    Returns DEFAULT_CONFIG if no tenant_cfg is set in state.

    Usage inside any LangGraph node:
        from tenant_config import cfg_from_state
        cfg = cfg_from_state(state)
        threshold = cfg.fallback.confidence_threshold
    """
    raw = state.get("tenant_cfg")
    if not raw:
        return DEFAULT_CONFIG
    if isinstance(raw, TenantConfig):
        return raw
    if isinstance(raw, dict):
        return TenantConfig(**raw)
    return DEFAULT_CONFIG


# ══════════════════════════════════════════════════════════════════════════════
# EXAMPLE PRESET CONFIGS (ready-made configs for common use-cases)
# ══════════════════════════════════════════════════════════════════════════════

TECH_STARTUP_PRESET = TenantConfig(
    tenant_id="tech_startup",
    branding=BrandingConfig(agent_name="Sam", tts_voice="Polly.Matthew"),
    scoring=ScoringConfig(
        voice_weights={"content_relevance": 0.30, "experience_match": 0.35,
                       "communication_clarity": 0.20, "delivery_confidence": 0.15},
        voice_trigger_threshold=65.0,
        shortlist_threshold=78.0,
    ),
    questions=QuestionConfig(max_questions=15, min_questions=10),
    recommendation_thresholds=RecommendationThresholds(strong_yes=82.0, yes=68.0, maybe=52.0),
)

SALES_ROLE_PRESET = TenantConfig(
    tenant_id="sales_role",
    branding=BrandingConfig(agent_name="Taylor", tts_voice="Polly.Joanna"),
    scoring=ScoringConfig(
        voice_weights={"content_relevance": 0.25, "experience_match": 0.25,
                       "communication_clarity": 0.35, "delivery_confidence": 0.15},
        voice_trigger_threshold=55.0,
        shortlist_threshold=70.0,
    ),
    questions=QuestionConfig(max_questions=10, min_questions=7),
)

ENTERPRISE_PRESET = TenantConfig(
    tenant_id="enterprise",
    branding=BrandingConfig(agent_name="Morgan", company_name="Enterprise Talent",
                            tts_voice="Polly.Brian"),
    scoring=ScoringConfig(voice_trigger_threshold=70.0, shortlist_threshold=80.0),
    compliance=ComplianceConfig(record_call=True, require_consent_message=True,
                                gdpr_mode=True, data_retention_days=30, pii_redaction=True),
    recommendation_thresholds=RecommendationThresholds(strong_yes=85.0, yes=72.0, maybe=55.0),
)

PRESETS: dict[str, TenantConfig] = {
    "tech_startup": TECH_STARTUP_PRESET,
    "sales_role":   SALES_ROLE_PRESET,
    "enterprise":   ENTERPRISE_PRESET,
    "default":      DEFAULT_CONFIG,
}
