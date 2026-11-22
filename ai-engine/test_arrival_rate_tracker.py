
from src.analytics.arrival_rate_tracker import ArrivalRateTracker

tracker = ArrivalRateTracker(window_seconds=60)

# Simulate vehicle observations.
tracker.record_arrival("right_side", 101, 1)
tracker.record_arrival("right_side", 102, 3)
tracker.record_arrival("right_side", 103, 5)

tracker.record_arrival("bottom_left", 201, 10)
tracker.record_arrival("bottom_left", 202, 15)

# Same vehicle observed again: should not count twice.
tracker.record_arrival("right_side", 101, 20)

rates = tracker.calculate(current_time=30)

print("\n===== VIDEO-BASED ARRIVAL RATE TEST =====")

for approach, rate in rates.items():
    print(f"{approach}: {rate} vehicles/minute")
