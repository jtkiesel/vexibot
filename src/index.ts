import {SapphireClient} from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
import {discordToken, logLevel, robotEventsToken} from './lib/config';
import {RobotEventsClient} from './lib/robot-events';
import {RobotEventsV1Client} from './lib/robot-events/v1';

export const robotEventsClient = new RobotEventsClient({
  token: robotEventsToken,
});

export const robotEventsV1Client = new RobotEventsV1Client({});

const client = new SapphireClient({
  caseInsensitiveCommands: true,
  defaultPrefix: '^',
  logger: {level: logLevel},
  intents: ['GUILDS', 'GUILD_MESSAGES', 'DIRECT_MESSAGES'],
  presence: {activities: [{name: 'for ^help', type: 'LISTENING'}]},
  shards: 'auto',
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
