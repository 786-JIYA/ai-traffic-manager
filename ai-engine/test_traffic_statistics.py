
from src.analytics.traffic_statistics import TrafficStatistics


traffic_statistics = TrafficStatistics()

sample_data = {
    "bottom_left": {
        "total": 20,
        "waiting": 12,
        "moving": 8,
    },
    "top_center": {
        "total": 10,
        "waiting": 5,
        "moving": 5,
    },
    "left_side": {
        "total": 5,
        "waiting": 1,
        "moving": 4,
    },
    "right_side": {
        "total": 0,
        "waiting": 0,
        "moving": 0,
    },
    "bottom_right_slip": {
        "total": 15,
        "waiting": 8,
        "moving": 7,
    },
}

result = traffic_statistics.calculate(sample_data)

print("\nTRAFFIC STATISTICS TEST")
print("-----------------------")

print("Total vehicles:", result["total_vehicles"])
print("Waiting vehicles:", result["waiting_vehicles"])
print("Moving vehicles:", result["moving_vehicles"])

print(
    "Overall congestion:",
    result["congestion_level"],
)

print(
    "Overall congestion percentage:",
    result["congestion_percentage"],
    "%",
)

print("\nAPPROACH-WISE RESULTS")

for approach, data in result["approaches"].items():

    print(
        f"{approach}: "
        f"Total={data['total_vehicles']}, "
        f"Waiting={data['waiting_vehicles']}, "
        f"Moving={data['moving_vehicles']}, "
        f"Congestion={data['congestion_level']}, "
        f"Percentage={data['congestion_percentage']}%"
    )

# Verify count consistency.
assert result["total_vehicles"] == 50
assert result["waiting_vehicles"] == 26
assert result["moving_vehicles"] == 24

assert (
    result["total_vehicles"]
    == result["waiting_vehicles"] + result["moving_vehicles"]
)

assert result["congestion_percentage"] == 52.0

print("\nAll traffic statistics tests passed!")
