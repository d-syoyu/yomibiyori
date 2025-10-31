"""Pydantic schema exports."""

from app.schemas.auth import (
    SignUpRequest,
    SignUpResponse,
    SessionToken,
    UserProfileResponse,
    OAuthUrlResponse,
    OAuthCallbackRequest,
    OAuthCallbackResponse,
    PasswordResetRequest,
    PasswordResetResponse,
    UpdatePasswordRequest,
    UpdatePasswordResponse,
    VerifyTokenAndUpdatePasswordRequest,
    UpdateProfileRequest,
)
from app.schemas.work import (
    WorkCreate,
    WorkResponse,
    WorkLikeResponse,
    WorkImpressionRequest,
    WorkImpressionResponse,
    WorkDateSummary,
)
from app.schemas.theme import ThemeResponse
from app.schemas.ranking import RankingEntry
from app.schemas.sponsor import (
    SponsorCreate,
    SponsorUpdate,
    SponsorResponse,
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignListResponse,
    SponsorThemeCreate,
    SponsorThemeUpdate,
    SponsorThemeResponse,
    SponsorThemeListResponse,
    ThemeReviewApproveRequest,
    ThemeReviewRejectRequest,
    ThemeReviewResponse,
)

__all__ = [
    # auth
    "SignUpRequest",
    "SignUpResponse",
    "SessionToken",
    "UserProfileResponse",
    "OAuthUrlResponse",
    "OAuthCallbackRequest",
    "OAuthCallbackResponse",
    "PasswordResetRequest",
    "PasswordResetResponse",
    "UpdatePasswordRequest",
    "UpdatePasswordResponse",
    "VerifyTokenAndUpdatePasswordRequest",
    "UpdateProfileRequest",
    # work
    "WorkCreate",
    "WorkResponse",
    "WorkLikeResponse",
    "WorkImpressionRequest",
    "WorkImpressionResponse",
    "WorkDateSummary",
    # theme
    "ThemeResponse",
    # ranking
    "RankingEntry",
    # sponsor
    "SponsorCreate",
    "SponsorUpdate",
    "SponsorResponse",
    "CampaignCreate",
    "CampaignUpdate",
    "CampaignResponse",
    "CampaignListResponse",
    "SponsorThemeCreate",
    "SponsorThemeUpdate",
    "SponsorThemeResponse",
    "SponsorThemeListResponse",
    "ThemeReviewApproveRequest",
    "ThemeReviewRejectRequest",
    "ThemeReviewResponse",
]
