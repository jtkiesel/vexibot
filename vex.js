const app = require('./app');

const getTeamId = (message, args) => {
	if (args) {
		return args.split(' ')[0].toUpperCase();
	} else if (message.member) {
		return message.member.nickname.split(' | ', 2)[1];
	}
	return '';
};

const validTeamId = teamId => /^([0-9]{1,5}[A-Z]?|[A-Z]{2,6}[0-9]{0,2})$/.test(teamId);

const getTeam = teamId => app.db.collection('reTeams').findOne({'_id.id': teamId});

module.exports = {
	getTeamId: getTeamId,
	validTeamId: validTeamId,
	getTeam: getTeam
};
