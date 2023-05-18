import {ProgramId, RobotEventsClient} from '@robotevents/client';
import {RobotEventsV1Client} from '@robotevents/client/v1';
import {SapphireClient} from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
import {GatewayIntentBits, Partials} from 'discord.js';
import {logLevel} from './lib/config.js';
import {SkillsCache} from './lib/skills-cache.js';

export const robotEventsClient = new RobotEventsClient();
export const robotEventsV1Client = new RobotEventsV1Client({});
export const skillsCache = new SkillsCache(
  robotEventsClient,
  robotEventsV1Client
);

const discordClient = new SapphireClient({
  shards: 'auto',
  partials: [Partials.Channel],
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
  logger: {level: logLevel},
});

const main = async () => {
  try {
    discordClient.logger.info('Caching world skills rankings');
    await setupSkillsCache();
    discordClient.logger.info('Cached world skills rankings');
  } catch (error) {
    discordClient.logger.error(error);
  }
  try {
    discordClient.logger.info('Logging in');
    await discordClient.login();
    discordClient.logger.info('Logged in');
  } catch (error) {
    discordClient.logger.fatal(error);
    discordClient.destroy();
    process.exit(1);
  }
};

const setupSkillsCache = async () => {
  await skillsCache.init();
  setInterval(async () => {
    const activeSeasons = await robotEventsClient.seasons
      .findAll(s => s.programIds(ProgramId.VRC, ProgramId.VEXU).active(true))
      .toArray();
    await skillsCache.update(activeSeasons);
  }, 3_600_000);
};

main();
