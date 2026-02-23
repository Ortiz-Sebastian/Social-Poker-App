"""
Shared enums used across multiple models.
"""
import enum


class SkillLevel(str, enum.Enum):
    """Poker skill level for users and rooms"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class GameType(str, enum.Enum):
    """Poker game variant"""
    TEXAS_HOLDEM = "texas_holdem"
    POT_LIMIT_OMAHA = "pot_limit_omaha"
    OMAHA_HI_LO = "omaha_hi_lo"
    STUD = "stud"
    MIXED = "mixed"
    OTHER = "other"


class GameFormat(str, enum.Enum):
    """Cash game vs tournament"""
    CASH = "cash"
    TOURNAMENT = "tournament"
