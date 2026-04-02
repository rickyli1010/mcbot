require('dotenv').config();
const { Client, GatewayIntentBits, Options } = require('discord.js');
// Environment variables, trimmed to prevent accidental invisible spaces from copy/pasting in Render
const DISCORD_TOKEN = (process.env.DISCORD_TOKEN || '').trim();
const DISCORD_CLIENT_ID = (process.env.DISCORD_CLIENT_ID || '').trim(); // Application ID
const AWS_REGION = (process.env.AWS_REGION || 'us-east-1').trim();
const INSTANCE_ID = (process.env.INSTANCE_ID || '').trim();

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !INSTANCE_ID) {
  console.error(
    'Missing required environment variables. Please check your .env file.'
  );
  process.exit(1);
}

// Initialize Discord Client with absolutely ZERO internal caching to survive 100MB Discloud limit
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  makeCache: Options.cacheWithLimits({
    MessageManager: 0,
    ThreadManager: 0,
    UserManager: 0,
    GuildMemberManager: 0,
    GuildEmojiManager: 0,
    GuildRolesManager: 0,
    PresenceManager: 0,
    ReactionManager: 0,
    VoiceStateManager: 0,
    GuildChannelManager: 0,
    ApplicationCommandManager: 0
  })
});

// Lazy load AWS EC2 dependencies to completely shield RAM from massive 25MB SDK during websocket handshake
let awsComponents = null;

function getAWS() {
  if (!awsComponents) {
    console.log('[AWS SDK] Dynamically compiling and loading massive SDK components into RAM...');
    const aws = require('./aws-service.js');
    
    // Aggressively strip both leading/trailing spaces AND accidental quotes from the Discloud dashboard
    const awsAccessKey = (process.env.AWS_ACCESS_KEY_ID || '').replace(/['"]/g, '').trim();
    const awsSecretKey = (process.env.AWS_SECRET_ACCESS_KEY || '').replace(/['"]/g, '').trim();

    console.log(`[AWS DEBUG] Detected Access Key ID: Length ${awsAccessKey.length}, Starts with: ${awsAccessKey.substring(0, 4)}`);
    console.log(`[AWS DEBUG] Detected Secret Key: Length ${awsSecretKey.length}`);
    
    if (!awsAccessKey || !awsSecretKey) {
      console.warn('[AWS WARNING] Access Key or Secret Key is completely empty! You must configure these in the Discloud dashboard Environment Variables.');
    }
    
    // Explicitly pass trimmed credentials rather than trusting the SDK's raw process.env parser to survive copy-paste spaces
    awsComponents = {
      ec2: new aws.EC2Client({ 
        region: AWS_REGION,
        credentials: {
          accessKeyId: awsAccessKey,
          secretAccessKey: awsSecretKey
        }
      }),
      DescribeInstancesCommand: aws.DescribeInstancesCommand,
      StartInstancesCommand: aws.StartInstancesCommand,
      StopInstancesCommand: aws.StopInstancesCommand
    };
    console.log('[AWS SDK] Booted!');
  }
  return awsComponents;
}

// Define slash commands
const commands = [
  {
    name: 'mc',
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

// Register slash commands (already registered previously, no need to boot the heavy REST client on every start)
// const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
/*
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
*/

async function getInstanceState() {
  const { ec2, DescribeInstancesCommand } = getAWS();
  const command = new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] });
  const response = await ec2.send(command);
  const instance = response.Reservations[0].Instances[0];
  return {
    state: instance.State.Name,
    publicIp: instance.PublicIpAddress
  };
}

// -------------------------------------------------------------
// Discord Bot Logic
// -------------------------------------------------------------
client.on('debug', (info) => {
  console.log(`[DISCORD DEBUG] ${info}`);
});

client.on('error', (error) => {
  console.error('An error occurred with the Discord client:', error);
});

client.on('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // registerCommands(); // Bypassed to save RAM
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'mc') {
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
          const { ec2, StartInstancesCommand } = getAWS();
          const startCommand = new StartInstancesCommand({
            InstanceIds: [INSTANCE_ID]
          });
          await ec2.send(startCommand);

          // Optionally, we could poll until it's running to get the IP, but for now we just confirm it's starting
          await interaction.followUp(
            'Start command sent! Use `/mc action:status` in a few moments to get the IP address.'
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
          const { ec2, StopInstancesCommand } = getAWS();
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

console.log('Sending login request to Discord...');
client.login(DISCORD_TOKEN).catch((error) => {
  console.error('Failed to log in to Discord!', error);
});
