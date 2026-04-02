# Minecraft AWS EC2 Manager

This repository contains two main components to help manage and reduce costs for a Minecraft server hosted on AWS EC2.

1. **Discord Bot (`discord-bot/`)**: A Node.js application that listens to Discord slash commands (`/mc start`, `/mc stop`, `/mc status`) to allow users to start, stop, and check the status of the EC2 instance hosting the Minecraft server. It uses `@aws-sdk/client-ec2` to interact with AWS.
2. **Auto-Shutdown Script (`ec2-scripts/`)**: A Python script designed to run continuously (via cron) on the EC2 instance itself. It monitors the local Minecraft server using `mcstatus` and will automatically shut down the EC2 instance if the server is empty for 15 minutes, ensuring you don't pay for idle time.

## Usage Flow

1.  **Start:** In your Discord server, type `/mc action:start`. Wait a minute for the server to power on.
2.  **Status:** Type `/mc action:status` to get the public IP address.
3.  **Play:** Connect to your Minecraft server and play.
4.  **Stop:** If you want to manually stop the server, type `/mc action:stop`.
5.  **Auto-Stop:** Otherwise, when everyone leaves, the cron job on the server will detect it. After 15 minutes of being empty, the EC2 instance will automatically stop, saving you money!

## Advanced Setup

### 1. Discord Bot Setup
Please refer to `discord-bot/README.md` for full instructions on setting up Discord tokens, IAM permissions, and deploying the bot to Discloud or locally.

### 2. Auto-Shutdown Script Setup
Please refer to `ec2-scripts/README.md` for detailed instructions on deploying the Python script to your EC2 instance, setting up the cron job, and configuring permissions.
