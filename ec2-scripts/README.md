# EC2 Auto-Shutdown Script Setup

This directory contains `auto_shutdown.py`, a script that needs to run on your Minecraft EC2 instance. It checks the server status using `mcstatus`. If 0 players are online for 15 minutes, it automatically shuts down the instance to save you money.

## Installation on EC2

1.  SSH into your EC2 instance.
2.  Ensure Python 3 and pip are installed:
    ```bash
    sudo apt update
    sudo apt install python3 python3-pip -y
    ```
3.  Install the `mcstatus` library (using the override flag for Ubuntu 24.04+):
    ```bash
    pip3 install mcstatus --break-system-packages
    ```
4.  Copy `auto_shutdown.py` to your home directory (`/home/ubuntu/auto_shutdown.py`).
5.  Make the script executable:
    ```bash
    chmod +x /home/ubuntu/auto_shutdown.py
    ```

## Configure Cron Job

We'll use cron to run this script every 5 minutes.

1.  Open the crontab editor:
    ```bash
    crontab -e
    ```
2.  Add the following line at the end:
    ```bash
    */5 * * * * /usr/bin/python3 /home/ubuntu/auto_shutdown.py >> /home/ubuntu/auto_shutdown.log 2>&1
    ```
    _Note: Adjust `/usr/bin/python3` and `/home/ubuntu` if your paths are different._

## Ensure Passwordless Sudo for Shutdown

The script runs `sudo shutdown -h now`. The ubuntu user needs to run this without a password. (This is generally the default on AWS Ubuntu AMIs).
You can verify this by running `sudo -l` and checking for `NOPASSWD: ALL`.

## Run Minecraft Automatically on Boot

To ensure your Minecraft server starts automatically every time your EC2 instance powers on (such as when the Discord bot starts the instance):

1.  Upload `minecraft.service` to your EC2 instance.
2.  Move it to the systemd directory:
    ```bash
    sudo mv minecraft.service /etc/systemd/system/
    ```
3.  Reload the system manager and enable the service:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable minecraft.service
    ```
4.  Start the server immediately:
    ```bash
    sudo systemctl start minecraft.service
    ```


