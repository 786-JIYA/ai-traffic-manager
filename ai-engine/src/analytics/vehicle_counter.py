
class VehicleCounter:
    """
    Counts tracked vehicles crossing configured virtual lines.

    Each line has:
      - id
      - start: [x, y]
      - end: [x, y]
      - positive_to_negative: event direction label
      - negative_to_positive: event direction label
    """

    def __init__(self, line_config):
        self.lines = line_config

        # Previous signed side for each vehicle and line
        self.previous_sides = {}

        # Previous center for each vehicle
        self.previous_positions = {}

        # Prevent duplicate counting
        self.counted_events = set()

        # Cumulative counts
        self.counts = {}

        for approach_id, approach_lines in self.lines.items():
            self.counts[approach_id] = {}

            for line in approach_lines:
                self.counts[approach_id][line["id"]] = {
                    "positive_to_negative": 0,
                    "negative_to_positive": 0,
                }

    @staticmethod
    def signed_side(point, start, end):
        """
        Positive or negative value indicates
        which side of the line the point occupies.
        """
        px, py = point
        x1, y1 = start
        x2, y2 = end

        return (
            (x2 - x1) * (py - y1)
            - (y2 - y1) * (px - x1)
        )

    @staticmethod
    def segments_intersect(p1, p2, q1, q2):
        """Check whether two finite line segments intersect."""

        def orientation(a, b, c):
            value = (
                (b[0] - a[0]) * (c[1] - a[1])
                - (b[1] - a[1]) * (c[0] - a[0])
            )

            if abs(value) < 1e-8:
                return 0

            return 1 if value > 0 else -1

        def on_segment(a, b, c):
            return (
                min(a[0], b[0]) - 1e-8
                <= c[0]
                <= max(a[0], b[0]) + 1e-8
                and min(a[1], b[1]) - 1e-8
                <= c[1]
                <= max(a[1], b[1]) + 1e-8
            )

        o1 = orientation(p1, p2, q1)
        o2 = orientation(p1, p2, q2)
        o3 = orientation(q1, q2, p1)
        o4 = orientation(q1, q2, p2)

        if o1 != o2 and o3 != o4:
            return True

        if o1 == 0 and on_segment(p1, p2, q1):
            return True

        if o2 == 0 and on_segment(p1, p2, q2):
            return True

        if o3 == 0 and on_segment(q1, q2, p1):
            return True

        if o4 == 0 and on_segment(q1, q2, p2):
            return True

        return False

    def update(self, approach_id, track_id, center):
        """
        Process one tracked vehicle position.

        Returns crossing events detected in this update.
        """

        events = []

        approach_lines = self.lines.get(approach_id, [])

        for line in approach_lines:
            line_id = line["id"]
            start = tuple(line["start"])
            end = tuple(line["end"])

            key = (approach_id, line_id, track_id)

            current_side = self.signed_side(
                center, start, end
            )

            previous = self.previous_positions.get(key)

            self.previous_positions[key] = center

            # Ignore the first observation
            if previous is None:
                self.previous_sides[key] = current_side
                continue

            previous_side = self.previous_sides.get(key, 0)
            self.previous_sides[key] = current_side

            # Ignore points too close to the line
            if abs(previous_side) < 1e-6 or abs(current_side) < 1e-6:
                continue

            # No side change means no crossing
            if (previous_side > 0) == (current_side > 0):
                continue

            # Confirm the vehicle movement intersects
            # the finite virtual line, not its extension.
            if not self.segments_intersect(
                previous,
                center,
                start,
                end,
            ):
                continue

            direction = (
                "positive_to_negative"
                if previous_side > 0
                else "negative_to_positive"
            )

            event_key = (approach_id, line_id, track_id)

            if event_key in self.counted_events:
                continue

            self.counted_events.add(event_key)

            self.counts[approach_id][line_id][direction] += 1

            events.append({
                "approach_id": approach_id,
                "line_id": line_id,
                "track_id": track_id,
                "direction": direction,
                "event_type": line.get("event_type", "crossing"),
            })

        return events

    def get_counts(self):
        return self.counts
