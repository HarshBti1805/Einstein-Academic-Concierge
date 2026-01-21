# Auto-Registration System
# Core modules
from .scoring import ScoringEngine, ScoringWeights
from .waitlist import WaitlistManager
from .allocation import AllocationEngine, AllocationStrategy, BatchAllocationConfig

# Services
from .registration_service import RegistrationService, create_registration_service, RegistrationConfig