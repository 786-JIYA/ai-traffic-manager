
from src.analytics.arrival_rate import ArrivalRate

tracker = ArrivalRate()

# Simulate new vehicle arrivals.
for _ in range(15):
    tracker.record_arrival("bottom_left")

for _ in range(8):
    tracker.record_arrival("top_center")

for _ in range(20):
    tracker.record_arrival("right_side")

rates = tracker.calculate(elapsed_seconds=60)

print("\n===== ARRIVAL RATE =====")

for approach, rate in rates.items():
    print(f"{approach}: {rate} vehicles/minute")
