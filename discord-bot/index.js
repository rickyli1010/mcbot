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

// Eradicated heavy AWS SDK. Using lightweight native fetch + aws4 signatures!
const aws4 = require('aws4');

async function ec2Fetch(action) {
  // Aggressively strip both leading/trailing spaces AND accidental quotes from the Discloud dashboard
  const awsAccessKey = (process.env.AWS_ACCESS_KEY_ID || '')
    .replace(/['"]/g, '')
    .trim();
  const awsSecretKey = (process.env.AWS_SECRET_ACCESS_KEY || '')
    .replace(/['"]/g, '')
    .trim();

  // Guard rails
  if (!awsAccessKey || !awsSecretKey) {
    console.error('CRITICAL ERROR: AWS Keys missing!');
    throw new Error('AWS Keys missing on server');
  }

  const host = `ec2.${AWS_REGION}.amazonaws.com`;
  const queryPath = `/?Action=${action}&InstanceId.1=${INSTANCE_ID}&Version=2016-11-15`;

  const opts = {
    host: host,
    path: queryPath,
    service: 'ec2',
    region: AWS_REGION,
    method: 'GET'
  };

  // Generate AWS SigV4 Headers natively
  aws4.sign(opts, { accessKeyId: awsAccessKey, secretAccessKey: awsSecretKey });

  // Execute standard lightweight Node Fetch
  const url = `https://${host}${queryPath}`;
  const response = await fetch(url, { headers: opts.headers });
  return await response.text(); // AWS natively returns XML text
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

async function getInstanceState() {
  try {
    const xml = await ec2Fetch('DescribeInstances');

    // Parse instance state using precise regex extraction to avoid loading a heavy XML parser
    const safeStateMatch = xml.match(
      /<instanceState>[\s\S]*?<name>(.*?)<\/name>/
    );
    const ipMatch = xml.match(/<ipAddress>(.*?)<\/ipAddress>/);

    return {
      state: safeStateMatch ? safeStateMatch[1] : 'unknown',
      publicIp: ipMatch ? ipMatch[1] : null
    };
  } catch (err) {
    console.error('Fetch Failed:', err);
    return { state: 'network_error', publicIp: null };
  }
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

          await ec2Fetch('StartInstances');

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
          await ec2Fetch('StopInstances');

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
