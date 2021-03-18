import { CronJob } from 'cron';
import { Client, Constants, Message, MessageEmbed, Permissions } from 'discord.js';
import { Db, MongoClient } from 'mongodb';
import { URL } from 'url';
import { inspect } from 'util';

import updatesChannel from './adminCommands/updatesChannel';
import updatesFilter from './adminCommands/updatesFilter';
import Awards from './persistence/awards';
import Cache from './persistence/cache';
import Events from './persistence/events';
import Matches from './persistence/matches';
import Programs from './persistence/programs';
import Rankings from './persistence/rankings';
import Seasons from './persistence/seasons';
import Skills from './persistence/skills';
import Teams from './persistence/teams';
import { ReApiClient } from './robotevents/re-api';
import { ReApiV2Client } from './robotevents/re-api-v2';
import * as vex from './vex';

export interface Command {
  execute(message: Message, args: string): Promise<Message>;
}

export type ServerSettings = {
  _id: string;
  updatesChannel?: string;
  updatesFilter?: {
    id: string;
    program: number;
  }[];
};

export const client = new Client();
const production = process.env.NODE_ENV === 'production';
const token = process.env.VEXIBOT_TOKEN;
const dbUri = production ? process.env.VEXIBOT_DB : process.env.VEXIBOT_DEV_DB;
const ownerId = process.env.DISCORD_ID;
const mongoOptions = {
  retryWrites: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
};
export const prefix = '^';
const commandInfo = {
  ping: 'Pong!',
  uptime: 'Time since bot last restarted.',
  sub: 'Manage team update subscriptions.',
  team: 'General information about a team.',
  awards: 'Awards earned by a team.',
  skills: 'Skills scores achieved by a team.',
  topskills: 'Official Robot Skills rankings for a grade.',
  predict: 'Predict a theoretical match outcome.'
};
const commands: { [key: string]: Command } = {};

let helpDescription = `\`${prefix}help\`: Provides information about all commands.`;
let _db: Db;

export const db = (): Db => _db;

export const sleep = (milliseconds: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

const clean = (text: string): string => {
  return text.replace(/`/g, `\`${String.fromCharCode(8203)}`)
    .replace(/@/g, `@${String.fromCharCode(8203)}`)
    .slice(0, 1990);
};

export const addFooter = (message: Message, reply: Message): Promise<Message> => {
  const author = message.member?.displayName || message.author.username;
  const embed = reply.embeds[0]
    .setFooter(`Triggered by ${author}`, message.author.displayAvatarURL())
    .setTimestamp(message.createdAt);
  return reply.edit(embed);
};

const restart = (): Promise<string> => {
  client.destroy();
  return client.login(token);
};

const handleCommand = async (message: Message): Promise<void> => {
  const slice = message.content.indexOf(' ');
  const cmd = message.content
    .slice(prefix.length, (slice < 0) ? message.content.length : slice)
    .toLowerCase();
  const args = (slice < 0) ? '' : message.content.slice(slice);

  if (commands[cmd]) {
    await commands[cmd].execute(message, args);
  } else if (cmd === 'help') {
    const embed = new MessageEmbed()
      .setColor('RANDOM')
      .setTitle('Commands')
      .setDescription(helpDescription);
    const reply = await message.channel.send(embed);
    await addFooter(message, reply);
  } else if (message.author.id === ownerId) {
    if (cmd === 'eval') {
      let evaledString: string;
      try {
        const evaled = /\s*await\s+/.test(args) ? (await eval(`const f = async () => {\n${args}\n};\nf();`)) : eval(args);
        evaledString = (typeof evaled === 'string') ? evaled : inspect(evaled);
      } catch (error) {
        await message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(error)}\`\`\``);
      }
      await message.channel.send(clean(evaledString), {code: 'xl'});
    } else if (cmd === 'restart') {
      await restart();
    }
  } else if (message.member?.hasPermission(Permissions.FLAGS.ADMINISTRATOR) || message.author.id === ownerId) {
    if (cmd === 'updatesfilter') {
      await updatesFilter.execute(message, args);
    } else if (cmd === 'updateschannel') {
      await updatesChannel.execute(message);
    }
  }
};

client.on(Constants.Events.CLIENT_READY, () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    status: 'online',
    activity: {
      type: 'PLAYING',
      name: `${prefix}help`
    }
  }).catch(console.error);
});

client.on(Constants.Events.MESSAGE_CREATE, message => {
  if (message.content.startsWith(prefix)) {
    handleCommand(message).catch(console.error);
  }
});

client.on(Constants.Events.DISCONNECT, event => {
  console.error(`Disconnect: ${JSON.stringify(event)}`);
  restart().catch(console.error);
});

client.on(Constants.Events.ERROR, console.error);

client.on(Constants.Events.WARN, console.warn);

MongoClient.connect(dbUri, mongoOptions).then(async mongoClient => {
  _db = mongoClient.db('vex');

  Object.entries(commandInfo).forEach(([name, desc]) => {
    commands[name.toLowerCase()] = require(`./commands/${name}`).default;
    helpDescription += `\n\`${prefix}${name}\`: ${desc}`;
  });

  const settings = await db().collection('settings')
    .find({ updatesChannel: { $exists: true } })
    .toArray();
  settings.forEach(guild => vex.subscribedChannels[guild._id] = guild.updatesChannel);

  await client.login(token);

  const reApiClient = new ReApiClient(new URL('https://www.robotevents.com/api'));
  const reApiV2Client = new ReApiV2Client(new URL('https://www.robotevents.com/api/v2'), process.env.VEXIBOT_RE_TOKEN);

  const programs = new Programs(new Cache(), db().collection('programs'), reApiV2Client);
  const seasons = new Seasons(new Cache(), db().collection('seasons'), reApiV2Client);
  await programs.upsertAll();
  await seasons.upsertAll();

  const teams = new Teams(new Cache(100), db().collection('teams'), reApiClient, reApiV2Client, seasons);
  const events = new Events(new Cache(100), db().collection('events'), reApiV2Client);
  const awards = new Awards(new Cache(100), db().collection('awards'), reApiV2Client, events);
  const matches = new Matches(new Cache(100), db().collection('matches'), reApiV2Client, events);
  const rankings = new Rankings(new Cache(100), db().collection('rankings'), reApiV2Client, teams);
  const skills = new Skills(new Cache(100), db().collection('skills'), reApiV2Client, teams);

  teams.upsertAll().then(() => {
    rankings.upsertAll();
    skills.upsertAll();
  });
  events.upsertAll().then(() => {
    awards.upsertAll();
    matches.upsertAll();
  });

  /*await vexdata.updateProgramsAndSeasons();

  const timezone = 'America/New_York';
  new CronJob('00 00 08 * * *', vexdata.updateEvents, null, true, timezone);
  new CronJob('00 10 08 * * *', vexdata.updateTeams, null, true, timezone);
  new CronJob('00 20 08 * * *', vexdata.updateMaxSkills, null, true, timezone);*/
  //new CronJob('00 */2 * * * *', vexdata.updateCurrentEvents, null, true, timezone);
}).catch(console.error);
