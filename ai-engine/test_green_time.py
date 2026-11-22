
from src.analytics.green_time_calculator import GreenTimeCalculator

calculator = GreenTimeCalculator(
    min_green=10,
    max_green=60
)

traffic_data = {
    "bottom_left": {"waiting": 14, "arrival_rate": 15},
    "top_center": {"waiting": 8, "arrival_rate": 8},
    "left_side": {"waiting": 3, "arrival_rate": 0},
    "right_side": {"waiting": 17, "arrival_rate": 20},
    "bottom_right_slip": {"waiting": 1, "arrival_rate": 0},
}

print("\n===== ADAPTIVE GREEN TIME =====")

for approach, data in traffic_data.items():

    green_time = calculator.calculate(
        waiting_vehicles=data["waiting"],
        arrival_rate=data["arrival_rate"]
    )

    print(f"{approach}: {green_time} seconds")
