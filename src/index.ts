import {LogLevel, SapphireClient} from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
import path from 'path';
import {discordToken, environment, robotEventsToken} from './config';
import {RobotEventsClient} from './robot-events';
import {RobotEventsV1Client} from './robot-events/v1';

export const robotEventsClient = new RobotEventsClient({
  token: robotEventsToken,
});

export const robotEventsV1Client = new RobotEventsV1Client({});

const client = new SapphireClient({
  baseUserDirectory:
    environment === 'production' ? path.resolve('build') : path.resolve('src'),
  caseInsensitiveCommands: true,
  defaultPrefix: '^',
  logger: {level: LogLevel.Debug},
  intents: [
    'GUILDS',
    'GUILD_MESSAGES',
    'GUILD_MESSAGE_REACTIONS',
    'DIRECT_MESSAGES',
    'DIRECT_MESSAGE_REACTIONS',
  ],
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
  }
};

main();
