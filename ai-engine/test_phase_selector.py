
from src.analytics.phase_selector import PhaseSelector

selector = PhaseSelector()

traffic_data = {
    "bottom_left": {"waiting": 14, "arrival_rate": 15},
    "top_center": {"waiting": 8, "arrival_rate": 8},
    "left_side": {"waiting": 3, "arrival_rate": 0},
    "right_side": {"waiting": 17, "arrival_rate": 20},
    "bottom_right_slip": {"waiting": 1, "arrival_rate": 0},
}

next_phase = selector.select_next_phase(traffic_data)

print("Selected next phase:", next_phase)

# Test excluding the current phase
next_phase = selector.select_next_phase(
    traffic_data,
    current_phase="right_side"
)

print("Selected after right_side:", next_phase)
