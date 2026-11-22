
import time

from src.analytics.signal_phase_manager import SignalPhaseManager

manager = SignalPhaseManager(
    yellow_time=2,
    all_red_time=1,
    min_green=2,
    max_green=10
)

print("Initial:", manager.get_status())

# Wait for initial all-red clearance
time.sleep(1)

print("\nStarting bottom_left:")
print(manager.start_green("bottom_left", duration=2))

time.sleep(2)

print("\nChanging to yellow:")
print(manager.start_yellow())

time.sleep(2)

print("\nChanging to all red:")
print(manager.start_all_red())

time.sleep(1)

print("\nStarting right_side:")
print(manager.start_green("right_side", duration=3))
