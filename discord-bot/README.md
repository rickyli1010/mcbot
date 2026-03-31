# Discord Bot Setup (Local / Render)

This directory contains a Node.js application that listens for slash commands in Discord (`/mc start`, `/mc stop`, `/mc status`). It uses the AWS SDK to turn on and shut down your EC2 instance.

## Prerequisites

1.  **Discord Bot Token**: Create an application on the [Discord Developer Portal](https://discord.com/developers/applications), add a bot, and get its token.
2.  **AWS IAM User**: Create an IAM user in AWS with programmatic access (Access Key and Secret Key) and attach this inline policy:
    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "ec2:DescribeInstances",
            "ec2:StartInstances",
            "ec2:StopInstances"
          ],
          "Resource": "*"
        }
      ]
    }
    ```
3.  **EC2 Instance ID**: Note down the instance ID (`i-xxxxxxx`) of your Minecraft server.

## Local Deployment

1.  Navigate into this folder: `cd discord-bot`
2.  Run `npm install`.
3.  Copy `.env.example` to `.env` and fill in all the details.
4.  Run `node index.js`. (The first time it runs, it will register the `/mc` slash command).

## Render.com Deployment

Deploying as a **Web Service** on Render is a great option because Render offers a free tier for Web Services! (The bot includes a lightweight dummy web server just so Render detects an open port).

1.  Create a new **Web Service** on [Render.com](https://render.com/).
2.  Connect your GitHub repository containing this bot.
3.  Configure the service:
    - **Root Directory**: `discord-bot` (Important: This tells Render where your code is)
    - **Build Command**: `npm install`
    - **Start Command**: `npm start`
      _(Alternatively, if you leave the Root Directory blank, use `cd discord-bot && npm install` for build, and `cd discord-bot && npm start` for start)_
4.  In the service Settings > Environment (or during creation), add all the environment variables from your `.env` file (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `INSTANCE_ID`).
5.  Save and deploy. The bot should start running automatically!
    _(Tip: Render free tier Web Services spin down after 15 minutes of inbound inactivity. You can use a free ping service like cron-job.org to ping your `https://your-app.onrender.com` URL every 10 minutes to keep your Discord bot awake 24/7!)_
