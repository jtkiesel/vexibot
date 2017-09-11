const Discord = require('discord.js');
const he = require('he');

const app = require('./app');
const dbinfo = require('./dbinfo');

const db = app.db;
const client = app.client;
const decodeProgram = dbinfo.decodeProgram;
const decodeGrade = dbinfo.decodeGrade;

const getTeamId = (message, args) => {
	const arg = args.replace(/\s+/g, '');
	if (arg) {
		return arg.toUpperCase();
	}
	return (message.member ? message.member.displayName : message.author.username).split(' | ', 2)[1];
};

const validTeamId = teamId => /^([0-9]{1,5}[A-Z]?|[A-Z]{2,6}[0-9]{0,2})$/i.test(teamId);

const getTeam = teamId => db.collection('teams').findOne({_id: {prog: (isNaN(teamId.charAt(0)) ? 4 : 1), id: teamId}});

const getTeamLocation = team => {
	let location = [team.city];
	if (team.region) {
		location.push(team.region);
	}
	if (team.country) {
		location.push(team.country);
	}
	return location.join(', ');
};

const createTeamEmbed = team => {
	const teamId = team._id.id;
	const name = team.name ? he.decode(team.name) : '';
	const robot = team.robot ? he.decode(team.robot) : '';
	const org = team.org ? he.decode(team.org) : '';
	const grade = team.grade ? decodeGrade(team.grade) : '';
	const registered = team.registered ? 'Yes' : 'No';
	const location = getTeamLocation(team);

	const embed = new Discord.RichEmbed()
		.setColor('GREEN')
		.setTitle(`${decodeProgram(team._id.prog)} ${teamId}`)
		.setURL(`https://vexdb.io/teams/view/${teamId}`);
	if (name) {
		embed.addField('Team Name', name, true);
	}
	if (robot) {
		embed.addField('Robot Name', robot, true);
	}
	if (org) {
		embed.addField('Organization', org, true);
	}
	if (location) {
		embed.addField('Location', location, true);
	}
	if (grade) {
		embed.addField('Grade', grade, true);
	}
	if (team.hasOwnProperty('registered')) {
		embed.addField('Registered?', registered, true);
	}
	return embed;
};

const subscribedChannels = [
	'352003193666011138',
	'329477820076130306'  // Dev server.
];

const sendToSubscribedChannels = async (content, options, program, teamId) => {
	subscribedChannels.forEach(async id => {
		const channel = client.channels.get(id);
		if (channel) {
			try {
				const teamSub = await db.collection('teamSubs').findOne({_id: {guild: channel.guild.id, team: {prog: program, id: teamId}}});
				let text;
				if (teamSub) {
					text = teamSub.users.map(subscriber => `<@${subscriber}>`).join('');
				}
				if (content) {
					text = text ? `${text}\n${content}` : content;
				}
				channel.send(text ? (text + ':') : undefined, options);
			} catch (err) {
				console.error(err);
			}
		}
	});
};

const escapeMarkdown = string => string ? string.replace(/([*^_`~])/g, '\\$1') : '';

const createTeamChangeEmbed = (program, teamId, field, oldValue, newValue) => {
	let change;
	if (!oldValue) {
		change = `added their ${field} **"**${escapeMarkdown(he.decode(newValue))}**"**`;
	} else if (!newValue) {
		change = `removed their ${field} **"**${escapeMarkdown(he.decode(oldValue))}**"**`;
	} else {
		change = `changed their ${field} from **"**${escapeMarkdown(he.decode(oldValue))}**"** to **"**${escapeMarkdown(he.decode(newValue))}**"**`;
	}
	return new Discord.RichEmbed()
		.setColor('GREEN')
		.setDescription(`[${decodeProgram(program)} ${teamId}](https://vexdb.io/teams/view/${teamId}) ${change}.`);
};

module.exports = {
	getTeamId: getTeamId,
	validTeamId: validTeamId,
	getTeam: getTeam,
	getTeamLocation: getTeamLocation,
	createTeamEmbed: createTeamEmbed,
	createTeamChangeEmbed: createTeamChangeEmbed,
	sendToSubscribedChannels: sendToSubscribedChannels
};
