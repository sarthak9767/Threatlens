import ipaddress


def analyze_ip(ip: str):
    try:
        ip_obj = ipaddress.ip_address(ip)

        return {
            "ip": ip,
            "version": f"IPv{ip_obj.version}",
            "is_private": ip_obj.is_private,
            "is_global": ip_obj.is_global,
            "is_loopback": ip_obj.is_loopback
        }

    except ValueError:
        return {
            "ip": ip,
            "error": "Invalid IP address"
        }