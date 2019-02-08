const { Client, MessageEmbed } = require('discord.js');
const { MongoClient } = require('mongodb');
const { inspect } = require('util');
const { CronJob } = require('cron');

const client = new Client();
const token = process.env.VEXIBOT_TOKEN;
const dbUri = process.env.VEXIBOT_DB;
const mongoOptions = {
	reconnectTries: Number.MAX_VALUE,
	keepAlive: true,
	useNewUrlParser: true
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
let db, vexdata;

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

	if (commands.hasOwnProperty(cmd)) {
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
				const match = args.match(/^\s*await\s+(.*)$/);
				let evaled = match ? (await eval(match[1])) : eval(args);
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

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}`);
	client.user.setPresence({status: 'online', activity: {name: `${prefix}help`, type: 'PLAYING'}});
});

client.on('error', console.error);

client.on('message', message => {
	if (message.content.startsWith(prefix)) {
		handleCommand(message);
	}
});

MongoClient.connect(dbUri, mongoOptions).then(mongoClient => {
	db = mongoClient.db(dbUri.match(/\/([^/]+)$/)[1]);
	module.exports.db = db;

	Object.keys(commandInfo).forEach(name => commands[name] = require('./commands/' + name));
	Object.entries(commandInfo).forEach(([name, desc]) => helpDescription += `\n\`${prefix}${name}\`: ${desc}`);

	client.login(token).catch(console.error);

	vexdata = require('./vexdata');
	const { updateEvents, updateTeams, updateMaxSkills, updateCurrentEvents } = vexdata;
	const timezone = 'America/New_York';
	new CronJob('00 00 08 * * *', updateEvents, null, true, timezone);
	new CronJob('00 10 08 * * *', updateTeams, null, true, timezone);
	new CronJob('00 20 08 * * *', updateMaxSkills, null, true, timezone);
	new CronJob('00 */2 * * * *', updateCurrentEvents, null, true, timezone);
}).catch(console.error);

module.exports = {
	client,
	addFooter
};
