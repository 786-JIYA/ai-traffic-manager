
from src.analytics.traffic_statistics import TrafficStatistics

sample_data = {
    "bottom_left": {
        "total": 18,
        "waiting": 14,
        "moving": 4,
    },
    "top_center": {
        "total": 10,
        "waiting": 8,
        "moving": 2,
    },
    "left_side": {
        "total": 7,
        "waiting": 3,
        "moving": 4,
    },
    "right_side": {
        "total": 20,
        "waiting": 17,
        "moving": 3,
    },
    "bottom_right_slip": {
        "total": 5,
        "waiting": 1,
        "moving": 4,
    },
}

analyzer = TrafficStatistics()
result = analyzer.calculate(sample_data)

print("\n===== TRAFFIC SUMMARY =====")

for key, value in result.items():
    print(f"{key}: {value}")
