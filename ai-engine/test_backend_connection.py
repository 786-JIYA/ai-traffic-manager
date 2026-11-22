from src.communication.backend_client import BackendClient

client = BackendClient()

test_payload = {
    "intersection_id": "intersection_01",
    "approaches": {
        "bottom_left": {
            "total_vehicles": 12,
            "waiting_vehicles": 8,
            "moving_vehicles": 4
        }
    }
}

response = client.send_analytics(test_payload)

if response:
    print("Backend response:", response)
else:
    print("Could not send analytics.")