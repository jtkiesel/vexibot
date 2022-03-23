import {
  ApplicationCommandRegistries,
  RegisterBehavior,
  SapphireClient,
} from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
import {Constants, Intents} from 'discord.js';
import {discordToken, logLevel, robotEventsToken} from './lib/config';
import {RobotEventsClient} from './lib/robot-events';
import {RobotEventsV1Client} from './lib/robot-events/v1';

export const robotEventsClient = new RobotEventsClient({
  token: robotEventsToken,
});

export const robotEventsV1Client = new RobotEventsV1Client({});

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(
  RegisterBehavior.Overwrite
);

const client = new SapphireClient({
  shards: 'auto',
  partials: [Constants.PartialTypes.CHANNEL],
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
  ],
  logger: {level: logLevel},
});

const main = async () => {
  try {
    client.logger.info('Logging in');
    await client.login(discordToken);
    client.logger.info('Logged in');
  } catch (error) {
    client.logger.fatal(error);
    client.destroy();
    throw error;
  }
};

main();
