
from src.analytics.traffic_decision_engine import TrafficDecisionEngine

engine = TrafficDecisionEngine()

traffic_data = {
    "bottom_left": {"waiting": 14, "arrival_rate": 15},
    "top_center": {"waiting": 8, "arrival_rate": 8},
    "left_side": {"waiting": 3, "arrival_rate": 0},
    "right_side": {"waiting": 17, "arrival_rate": 20},
    "bottom_right_slip": {"waiting": 1, "arrival_rate": 0},
}

decision = engine.make_decision(traffic_data)

print("\n===== TRAFFIC DECISION =====")
print(decision)

print("\n===== NEXT DECISION =====")

next_decision = engine.make_decision(
    traffic_data,
    current_phase=decision["selected_phase"]
)

print(next_decision)
