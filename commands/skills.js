const Discord = require('discord.js');

const app = require('../app');
const dbinfo = require('../dbinfo');
const vex = require('../vex');

const db = app.db;

const rankEmojis = ['🥇', '🥈', '🥉'];

module.exports = (message, args) => {
	const teamId = vex.getTeamId(message, args);
	if (vex.validTeamId(teamId)) {
		vex.getTeam(teamId).then(team => {
			if (team) {
			} else {
				message.reply('That team ID has never been registered.');
			}
		}).catch(console.error);
	} else {
		message.reply('Please provide a valid team ID.');
	}
};
