# Discord Bot Setup (Local / Heroku)

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

## Heroku Deployment

1.  Create a new app on Heroku.
2.  In the app Settings > Config Vars, add all the variables from your `.env` file (`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `INSTANCE_ID`).
3.  Ensure your `package.json` has a "start" script: `"start": "node index.js"`.
4.  Deploy your GitHub repository (or use Heroku CLI) to push the `discord-bot` folder.
5.  In the Heroku Resources tab, ensure the `worker` dyno is turned ON and `web` is turned OFF (since this is not a web server). Note: You might need a `Procfile` containing `worker: node index.js`.
