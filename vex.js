const Discord = require('discord.js');
const he = require('he');

const app = require('./app');
const dbinfo = require('./dbinfo');

const decodeGrade = dbinfo.decodeGrade;

const getTeamId = (message, args) => {
	const arg = args.replace(/\s/g, '');
	if (arg) {
		return arg.toUpperCase();
	} else if (message.member) {
		return message.member.nickname.split(' | ', 2)[1];
	}
	return '';
};

const validTeamId = teamId => /^([0-9]{1,5}[A-Z]?|[A-Z]{2,6}[0-9]{0,2})$/.test(teamId);

const getTeam = teamId => app.db.collection('teams').findOne({'_id.id': teamId});

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
	const name = he.decode(team.name);
	const robot = team.robot ? he.decode(team.robot) : '';
	const org = team.org ? he.decode(team.org) : '';
	const grade = team.grade ? decodeGrade(team.grade) : '';
	const registered = team.registered ? 'Yes' : 'No';
	const location = getTeamLocation(team);

	const embed = new Discord.RichEmbed()
		.setColor('GREEN')
		.setTitle(team._id.id)
		.setURL(`https://vexdb.io/teams/view/${team._id.id}`)
		.addField('Team Name', name, true);
	if (robot) {
		embed.addField('Robot Name', robot, true);
	}
	if (org) {
		embed.addField('Organization', org, true);
	}
	embed.addField('Location', location, true);
	if (grade) {
		embed.addField('Grade', grade, true);
	}
	if (team.hasOwnProperty('registered')) {
		embed.addField('Registered?', registered, true);
	}
	return embed;
};

module.exports = {
	getTeamId: getTeamId,
	validTeamId: validTeamId,
	getTeam: getTeam,
	getTeamLocation: getTeamLocation,
	createTeamEmbed: createTeamEmbed
};
