#!/usr/bin/env python3
import time
import os
import subprocess
import sys
try:
    from mcstatus import BedrockServer
except ImportError:
    print("mcstatus not found. Please install with: pip3 install mcstatus")
    sys.exit(1)

# Configuration
SERVER_HOST = "localhost"
SERVER_PORT = 19132
MAX_EMPTY_MINUTES = 15
CRON_INTERVAL_MINUTES = 5

# Calculated
THRESHOLD = MAX_EMPTY_MINUTES // CRON_INTERVAL_MINUTES
STATE_FILE = "/tmp/minecraft_empty_count.txt"

def get_player_count():
    try:
        server = BedrockServer.lookup(f"{SERVER_HOST}:{SERVER_PORT}")
        status = server.status()
        return status.players.online
    except Exception as e:
        print(f"Error querying server: {e}")
        return 0 # If server is down, we consider it empty, eventually it will shut down

def read_empty_count():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            try:
                return int(f.read().strip())
            except ValueError:
                return 0
    return 0

def write_empty_count(count):
    with open(STATE_FILE, "w") as f:
        f.write(str(count))

def main():
    players = get_player_count()
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Players online: {players}")

    if players == 0:
        count = read_empty_count()
        count += 1
        print(f"Server is empty. Consecutive empty checks: {count}/{THRESHOLD}")

        if count >= THRESHOLD:
            print(f"Server has been empty for {MAX_EMPTY_MINUTES} minutes. Initiating shutdown...")
            write_empty_count(0) # Reset before shutdown just in case

            # Execute shutdown command
            # Using sudo shutdown -h now requires the user running the cron to have sudo privileges without password for shutdown
            subprocess.run(["sudo", "shutdown", "-h", "now"])
        else:
            write_empty_count(count)
    else:
        # Reset count if players are online
        if read_empty_count() > 0:
            print("Players are online. Resetting empty count.")
            write_empty_count(0)

if __name__ == "__main__":
    main()
