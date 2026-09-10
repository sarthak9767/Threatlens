def build_graph(parsed_data, geolocation_data):
    nodes = []
    edges = []

    nodes.append({
        "id": "email",
        "type": "email",
        "label": "Analyzed Email"
    })

    for email in parsed_data.get("emails", []):
        node_id = f"email_{email}"

        nodes.append({
            "id": node_id,
            "type": "sender",
            "label": email
        })

        edges.append({
            "source": "email",
            "target": node_id,
            "relation": "contains_sender"
        })

    for url in parsed_data.get("urls", []):
        node_id = f"url_{url}"

        nodes.append({
            "id": node_id,
            "type": "url",
            "label": url
        })

        edges.append({
            "source": "email",
            "target": node_id,
            "relation": "contains_url"
        })

    for ip in parsed_data.get("ips", []):
        node_id = f"ip_{ip}"

        nodes.append({
            "id": node_id,
            "type": "ip",
            "label": ip
        })

        edges.append({
            "source": "email",
            "target": node_id,
            "relation": "contains_ip"
        })

    for geo in geolocation_data:
        ip = geo["ip"]
        location = geo["location"]

        location_name = f'{location["city"]}, {location["country"]}'
        location_id = f"location_{ip}"

        nodes.append({
            "id": location_id,
            "type": "location",
            "label": location_name
        })

        edges.append({
            "source": f"ip_{ip}",
            "target": location_id,
            "relation": "located_at"
        })

    return {
        "nodes": nodes,
        "edges": edges
    }