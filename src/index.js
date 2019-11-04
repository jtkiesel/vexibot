import { CronJob } from 'cron';
import { Client, MessageEmbed } from 'discord.js';
import { MongoClient } from 'mongodb';
import { inspect } from 'util';

const client = new Client();
const token = process.env.VEXIBOT_TOKEN;
const dbUri = process.env.VEXIBOT_DB;
const mongoOptions = {
  retryWrites: true,
  reconnectTries: Number.MAX_VALUE,
  useNewUrlParser: true,
  useUnifiedTopology: true
};
const prefix = '^';
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
const commands = {};

let helpDescription = `\`${prefix}help\`: Provides information about all commands.`;
let db, events, vexdata;

const clean = text => {
  if (typeof text === 'string') {
    return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203)).slice(0, 1990);
  }
  return text;
};

const handleCommand = async message => {
  const slice = message.content.indexOf(' ');
  const cmd = message.content.slice(prefix.length, (slice < 0) ? message.content.length : slice);
  let args = (slice < 0) ? '' : message.content.slice(slice);

  if (commands[cmd]) {
    commands[cmd](message, args);
  } else if (cmd === 'help') {
    const embed = new MessageEmbed()
      .setColor('RANDOM')
      .setTitle('Commands')
      .setDescription(helpDescription);
    message.channel.send({embed})
      .then(reply => addFooter(message, reply))
      .catch(console.error);
  } else if (cmd === 'eval') {
    if (message.author.id === '197781934116569088') {
      try {
        let evaled = /\s*await\s+/.test(args) ? (await eval(`const f = async () => {\n${args}\n};\nf();`)) : eval(args);
        if (typeof evaled !== 'string') {
          evaled = inspect(evaled);
        }
        message.channel.send(clean(evaled), {code: 'xl'}).catch(console.error);
      } catch (error) {
        message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(error)}\`\`\``).catch(console.error);
      }
    } else {
      message.reply(`you don't have permission to run ${cmd}.`).catch(console.error);
    }
  }
};

const addFooter = (message, reply) => {
  const author = message.member ? message.member.displayName : message.author.username;
  const embed = reply.embeds[0].setFooter(`Triggered by ${author}`, message.author.displayAvatarURL())
    .setTimestamp(message.createdAt);
  reply.edit({embed});
};

const login = () => client.login(token).catch(console.error);

const restart = () => {
  client.destroy();
  login();
};

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({status: 'online', activity: {name: `${prefix}help`, type: 'PLAYING'}});
});

client.on('resume', () => console.log('Resume.'));

client.on('message', message => {
  if (message.content.startsWith(prefix)) {
    handleCommand(message);
  }
});

client.on('disconnect', event => {
  console.error('Disconnect.');
  console.error(JSON.stringify(event));
  restart();
});

client.on('reconnecting', () => console.log('Reconnecting.'));

client.on('error', console.error);

client.on('warn', console.warn);

MongoClient.connect(dbUri, mongoOptions).then(mongoClient => {
  db = mongoClient.db('vexdata');
  module.exports.db = db;

  db.collection('teams').createIndex({'_id.id': 'text'}).catch(console.error);

  Object.keys(commandInfo).forEach(name => commands[name] = require('./commands/' + name).default);
  Object.entries(commandInfo).forEach(([name, desc]) => helpDescription += `\n\`${prefix}${name}\`: ${desc}`);

  events = require('./events');
  vexdata = require('./vexdata');

  login();

  const { updateEvents, updateTeams, updateMaxSkills, updateCurrentEvents, updateProgramsAndSeasons } = vexdata;
  updateProgramsAndSeasons();
  if (process.env.NODE_ENV === 'production') {
    const timezone = 'America/New_York';
    new CronJob('00 00 08 * * *', updateEvents, null, true, timezone);
    new CronJob('00 10 08 * * *', updateTeams, null, true, timezone);
    new CronJob('00 20 08 * * *', updateMaxSkills, null, true, timezone);
    new CronJob('00 */2 * * * *', updateCurrentEvents, null, true, timezone);
  }
}).catch(console.error);

export {
  client,
  addFooter
};
