# Discord Bot Setup (Local / Discloud)

This directory contains a Node.js application that listens for slash commands in Discord (`/mc start`, `/mc stop`, `/mc status`). It uses the AWS SDK to turn on and shut down your EC2 instance.

## Prerequisites

1.  **Discord Bot Token**: Create an application on the [Discord Developer Portal](https://discord.com/developers/applications), add a bot, and get its token.
2.  **AWS IAM User**: Create an IAM user in AWS with programmatic access (Access Key and Secret Key) and attach this strict inline policy:
    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "AllowListInstances",
          "Effect": "Allow",
          "Action": "ec2:DescribeInstances",
          "Resource": "*"
        },
        {
          "Sid": "AllowStartStopInstances",
          "Effect": "Allow",
          "Action": [
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

## Discloud Deployment (100MB Free Tier Optimization)

Node.js is naturally a memory hog, but by completely eradicating the physical AWS SDK module and replacing it with a custom native 10KB fetch wrapper, we effortlessly guarantee execution within extreme RAM limitations natively!

1.  Make sure your `discloud.config` is perfectly targeting `index.js`:
    ```
    NAME=mcbot
    TYPE=bot
    MAIN=index.js
    RAM=100
    VERSION=latest
    START=node --max-old-space-size=65 index.js
    ```
2.  Compress the `discord-bot` folder into a `.zip` file (using `discloud zip`). **Important:** The `.discloudignore` will correctly prevent your local `node_modules` from uploading.
3.  Upload the `.zip` file to Discloud.
4.  Configure your environment variables in the Discloud panel.
5.  **CRITICAL:** In the Discloud Dashboard, ensure the **Start Command** is explicitly set to:
    `node --max-old-space-size=65 index.js`
    *(If you leave it as `npm run start`, it will launch NPM which silently consumes 30MB of RAM in the background and causes the bot to instantly crash due to lack of RAM!)*
6.  Start the bot! It will cleanly connect and natively execute SigV4 secured HTTP commands silently.
