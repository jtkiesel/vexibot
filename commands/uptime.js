const Discord = require('discord.js');

const client = require('../app');

module.exports = (message, args) => {
	var milliseconds = new Date(client.uptime);
console.log(milliseconds);
	var seconds = Math.floor(milliseconds / 1000);
	var minutes = Math.floor(seconds / 60);
	var hours = Math.floor(minutes / 60);
	var days = Math.floor(hours / 24);

	seconds %= 60;
	minutes %= 60;
	hours %= 24;

	var uptime = [];
	if (days > 0) {
		uptime.push(formatTime(days, 'day'));
	}
	if (hours > 0) {
		uptime.push(formatTime(hours, 'hour'));
	}
	if (minutes > 0) {
		uptime.push(formatTime(minutes, 'minute'));
	}
	if (seconds > 0) {
		console.log(seconds);
		uptime.push(formatTime(seconds, 'second'));
	}
	var embed = new Discord.RichEmbed()
			.setColor('RANDOM')
			.setDescription(uptime.join(', '));

	message.channel.send({embed});
};

var formatTime = (time, unit) => time + ' ' + unit + ((time == 1) ? '' : 's');
