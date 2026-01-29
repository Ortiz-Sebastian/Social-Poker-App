"""
Shared enums used across multiple models.
"""
import enum


class SkillLevel(str, enum.Enum):
    """Poker skill level for users and rooms"""
    BEGINNER = "beginner"        # New to poker, learning the basics
    INTERMEDIATE = "intermediate"  # Understands rules and basic strategy
    ADVANCED = "advanced"        # Experienced player with solid strategy
    EXPERT = "expert"            # Highly skilled, tournament-level player
