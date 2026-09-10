def get_geolocation(ip: str):
    demo_locations = {
        "8.8.8.8": {
            "country": "United States",
            "city": "Mountain View",
            "organization": "Google"
        },
        "1.1.1.1": {
            "country": "Australia",
            "city": "Sydney",
            "organization": "Cloudflare"
        }
    }

    if ip in demo_locations:
        return {
            "ip": ip,
            "location": demo_locations[ip]
        }

    return {
        "ip": ip,
        "location": {
            "country": "Unknown",
            "city": "Unknown",
            "organization": "Unknown"
        }
    }