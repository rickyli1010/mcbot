require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const {
  EC2Client,
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand
} = require('@aws-sdk/client-ec2');

// Environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID; // Application ID
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const INSTANCE_ID = process.env.INSTANCE_ID;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !INSTANCE_ID) {
  console.error(
    'Missing required environment variables. Please check your .env file.'
  );
  process.exit(1);
}

// Initialize Discord Client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Initialize AWS EC2 Client
// Note: It will use credentials from process.env.AWS_ACCESS_KEY_ID and process.env.AWS_SECRET_ACCESS_KEY automatically
const ec2 = new EC2Client({ region: AWS_REGION });

// Define slash commands
const commands = [
  {
    name: 'ec2',
    description: 'Manage the Minecraft EC2 instance',
    options: [
      {
        name: 'action',
        description: 'The action to perform',
        type: 3, // STRING type
        required: true,
        choices: [
          { name: 'start', value: 'start' },
          { name: 'stop', value: 'stop' },
          { name: 'status', value: 'status' }
        ]
      }
    ]
  }
];

// Register slash commands (run once on startup or via a separate script, simplified here)
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
      body: commands
    });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

async function getInstanceState() {
  const command = new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] });
  const response = await ec2.send(command);
  const instance = response.Reservations[0].Instances[0];
  return {
    state: instance.State.Name,
    publicIp: instance.PublicIpAddress
  };
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  registerCommands();
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ec2') {
    const action = interaction.options.getString('action');

    try {
      if (action === 'status') {
        await interaction.reply('Checking EC2 status...');
        const { state, publicIp } = await getInstanceState();
        let replyMsg = `The Minecraft server is currently **${state}**.`;
        if (state === 'running' && publicIp) {
          replyMsg += `\nIP Address: \`${publicIp}\``;
        }
        await interaction.editReply(replyMsg);
      } else if (action === 'start') {
        await interaction.reply('Checking EC2 status...');
        const { state, publicIp } = await getInstanceState();

        if (state === 'running') {
          await interaction.editReply(
            `The server is already running.\nIP Address: \`${publicIp}\``
          );
        } else if (state === 'stopped') {
          await interaction.editReply(
            'Starting the Minecraft server... Please wait a minute or two for it to fully boot up.'
          );
          const startCommand = new StartInstancesCommand({
            InstanceIds: [INSTANCE_ID]
          });
          await ec2.send(startCommand);

          // Optionally, we could poll until it's running to get the IP, but for now we just confirm it's starting
          await interaction.followUp(
            'Start command sent! Use `/ec2 status` in a few moments to get the IP address.'
          );
        } else {
          await interaction.editReply(
            `The server is currently **${state}**. Please wait until it is fully stopped or running.`
          );
        }
      } else if (action === 'stop') {
        await interaction.reply('Checking EC2 status...');
        const { state } = await getInstanceState();

        if (state === 'stopped') {
          await interaction.editReply('The server is already stopped.');
        } else if (state === 'running') {
          await interaction.editReply('Stopping the Minecraft server...');
          const stopCommand = new StopInstancesCommand({
            InstanceIds: [INSTANCE_ID]
          });
          await ec2.send(stopCommand);

          await interaction.followUp(
            'Stop command sent! The server is now shutting down.'
          );
        } else {
          await interaction.editReply(
            `The server is currently **${state}**. Please wait until it is fully stopped or running.`
          );
        }
      }
    } catch (error) {
      console.error(error);
      const errorMsg =
        'An error occurred while interacting with AWS. Please check the bot logs.';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMsg);
      } else {
        await interaction.reply(errorMsg);
      }
    }
  }
});

client.login(DISCORD_TOKEN);
