import {LogLevel, SapphireClient} from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
import {discordToken, robotEventsToken} from './config';
import {RobotEventsClient} from './robot-events';
import {RobotEventsV1Client} from './robot-events/v1';

export const robotEventsClient = new RobotEventsClient({
  token: robotEventsToken,
});

export const robotEventsV1Client = new RobotEventsV1Client({});

const client = new SapphireClient({
  defaultPrefix: '^',
  caseInsensitiveCommands: true,
  logger: {level: LogLevel.Debug},
  shards: 'auto',
  intents: [
    'GUILDS',
    'GUILD_MESSAGES',
    'GUILD_MESSAGE_REACTIONS',
    'DIRECT_MESSAGES',
    'DIRECT_MESSAGE_REACTIONS',
  ],
  presence: {activities: [{name: 'for ^help', type: 'LISTENING'}]},
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
