const Discord = require('discord.js');
const mongodb = require('mongodb');

const messages = require('./messages');
const vexdata = require('./vexdata');

const client = new Discord.Client();
const MongoClient = new mongodb.MongoClient();
const token = process.env.DISCORD_TOKEN;
const [username, password, host, port, database] = process.env.MONGODB_URI.match(/^(?:mongodb:\/\/)(.+):(.+)@(.+):(.+)\/(.+)$/);
const db = new mongodb.Db(database, new mongodb.Server(host, Number(port)));
const prefix = '^';
const commandInfo = {
	ping: 'Pong!',
	uptime: 'Time since bot last restarted.',
	leaderboard: 'Get users with the most messages on the server.',
	team: 'Get general information about a VEX team.',
	awards: 'Get awards earned by a VEX team.'
};
let helpDescription = `\`${prefix}help\`: Provides information about all commands.`;
Object.entries(commandInfo).forEach(([name, desc]) => {
	helpDescription += `\n\`${prefix}${name}\`: ${desc}`;
});
let commands = {};
Object.keys(commandInfo).forEach(name => commands[name] = require('./commands/' + name));

client.on('ready', () => {
	console.log('Ready!');
	messages.update();
	vexdata.update();
});

client.on('error', console.error);

client.on('message', message => {
	if (message.content.startsWith(prefix)) {
		handleCommand(message);
	}
	messages.upsertMessageInDb(message, false);
});

client.on('messageUpdate', message => {
	messages.upsertMessageInDb(message, false);
});

client.on('messageDelete', message => {
	messages.upsertMessageInDb(message, true);
});

client.on('messageDeleteBulk', messageCollection => {
	messageCollection.forEach(message => messages.upsertMessageInDb(message, true));
});

db.open()
	.then(db => db.authenticate(username, password))
	.then(db => client.login(token))
	.catch(console.error);

const handleCommand = message => {
	const [cmd, args] = message.content.substring(prefix.length).split(' ', 2);

	if (commands.hasOwnProperty(cmd)) {
		commands[cmd](message, args);
	} else if (cmd == 'help') {
		const embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setTitle('Commands')
			.setDescription(helpDescription);
		message.channel.send({embed});
	}
}

module.exports.client = client;
module.exports.db = db;
