# Discord Bot Setup (Local / Discloud)

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

## Discloud Deployment (100MB Free Tier Optimization)

Node.js is naturally a memory hog and struggles to fit inside a 100MB RAM limit if it has to parse the thousands of external files in `node_modules/`. To fix this, we bundle and split the application into separate highly-optimized chunks inside the `dist/` folder.

1.  Run `npm run build` on your local machine. This will use `esbuild` to split your bot into multiple files inside a `dist/` folder. The heavy AWS SDK is placed in a totally separate chunk so it doesn't needlessly load into memory on startup!
2.  Make sure your `discloud.config` is pointing to the `dist` folder:
    ```
    NAME=mcbot
    TYPE=bot
    MAIN=dist/index.js
    RAM=100
    VERSION=latest
    START=node --max-old-space-size=45 dist/index.js
    ```
3.  Compress the `discord-bot` folder into a `.zip` file (using `discloud zip`). **Important:** The `.discloudignore` will prevent `node_modules` from uploading, which saves massive memory allocation on Discloud's server!
4.  Upload the `.zip` file to Discloud.
5.  Configure your environment variables in the Discloud panel.
6.  **CRITICAL:** In the Discloud Dashboard, ensure the **Start Command** is explicitly set to:
    `node --max-old-space-size=45 dist/index.js`
    *(If you leave it as `npm run start`, it will launch NPM which silently consumes 30MB of RAM in the background and causes the bot to immediately crash due to lack of RAM!)*
7.  Start the bot! It will connect cleanly using only ~30-40MB of RAM. Validating AWS queries will execute seamlessly when someone runs the slash command.
