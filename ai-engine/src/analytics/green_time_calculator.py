
class GreenTimeCalculator:

    def __init__(self, min_green=10, max_green=60):
        self.min_green = min_green
        self.max_green = max_green

    def calculate(self, waiting_vehicles, arrival_rate):
        demand = waiting_vehicles + (arrival_rate * 0.5)

        green_time = self.min_green + (demand * 1.5)

        green_time = max(self.min_green, green_time)
        green_time = min(self.max_green, green_time)

        return round(green_time, 2)
