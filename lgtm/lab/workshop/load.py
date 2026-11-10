"""A tiny load script for the workshop service. Standard library only.

    python load.py                                  2 requests a second until Ctrl+C
    python load.py --rate 5 --duration 60           5 a second for one minute
    python load.py --url http://127.0.0.1:8000 --slow

Each round picks one endpoint: mostly checkouts and inventory reads, some
product lists, some CPU work. --slow makes the CPU work much slower, for the
lessons that look for a slow span. It prints a count of status codes every
ten seconds and at the end.
"""

import argparse
import collections
import json
import random
import time
import urllib.error
import urllib.request

SKUS = [
    "OLJCESPC7Z", "66VCHSJNUP", "1YMWWN1N4O", "L9ECAV7KIM", "2ZYFJ3GM2N",
    "0PUK6V6EV0", "LS4PSXUNUM", "9SIQT8TOJO", "6E92ZMYYFZ", "HQTGWGPNH4",
]


def call(url, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return response.status
    except urllib.error.HTTPError as err:
        return err.code
    except (urllib.error.URLError, TimeoutError, ConnectionError):
        return "unreachable"


def one_round(base, slow):
    choice = random.choices(["checkout", "inventory", "products", "compute", "unknown"], [40, 30, 15, 13, 2])[0]
    if choice == "checkout":
        return choice, call(f"{base}/checkout", "POST", {"sku": random.choice(SKUS), "quantity": random.randint(1, 3)})
    if choice == "inventory":
        return choice, call(f"{base}/inventory/{random.choice(SKUS)}")
    if choice == "products":
        return choice, call(f"{base}/products")
    if choice == "compute":
        n = random.randint(33, 36) if slow else random.randint(15, 25)
        return choice, call(f"{base}/compute?n={n}")
    return choice, call(f"{base}/inventory/NOSUCHSKU")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://127.0.0.1:8000", help="the workshop service")
    parser.add_argument("--rate", type=float, default=2.0, help="requests a second")
    parser.add_argument("--duration", type=float, default=0, help="seconds to run; 0 runs until Ctrl+C")
    parser.add_argument("--slow", action="store_true", help="make the CPU work slow")
    args = parser.parse_args()

    base = args.url.rstrip("/")
    counts = collections.Counter()
    started = last_report = time.monotonic()
    print(f"Calling {base} at {args.rate} requests a second", flush=True)
    try:
        while not args.duration or time.monotonic() - started < args.duration:
            endpoint, status = one_round(base, args.slow)
            counts[f"{endpoint} {status}"] += 1
            if time.monotonic() - last_report >= 10:
                print(dict(sorted(counts.items())), flush=True)
                last_report = time.monotonic()
            time.sleep(1 / args.rate)
    except KeyboardInterrupt:
        pass
    print("Total:", dict(sorted(counts.items())), flush=True)


if __name__ == "__main__":
    main()
