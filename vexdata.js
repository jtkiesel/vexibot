const Discord = require('discord.js');
const request = require('request-promise-native');
const cron = require('cron');

const app = require('./app');
const vex = require('./vex');
const dbinfo = require('./dbinfo');

const CronJob = cron.CronJob;
const client = app.client;
const db = app.db;
const decodeSeason = dbinfo.decodeSeason;
const idToSeasonUrl = dbinfo.idToSeasonUrl;

const timezone = 'America/New_York';

const updateEvents = () => updateCollectionFromResource('events', 'get_events', formatEvent);
const updateTeams = () => updateCollectionFromResource('teams', 'get_teams', formatTeam);
const updateMatches = () => updateCollectionFromResource('matches', 'get_matches', formatMatch);
const updateRankings = () => updateCollectionFromResource('rankings', 'get_rankings', formatRanking);
const updateAwards = () => updateCollectionFromResource('awards', 'get_awards', formatAward);
const updateSkills = () => updateCollectionFromResource('skills', 'get_skills', formatSkill);

const updateReTeams = () => {
	updateTeamsForSeason(1, 119);
	updateTeamsForSeason(4, 120);
	/*[{_id: 1, seasons: [119, 115, 110, 102, 92, 85, 73, 7, 1]},
		{_id: 4, seasons: [120, 116, 111, 103, 93, 88, 76, 10, 4]}].forEach(program => {
		const seasons = program.seasons.sort((a, b) => a - b);
		for (let i = 0; i < seasons.length; i++) {
			updateTeamsForSeason(program, seasons[i]);
		}
	});*/
};

const updateReEvents = () => {
	updateEventsForSeason(119);
	updateEventsForSeason(120);
	/*[{_id: 1, seasons: [119, 115, 110, 102, 92, 85, 73, 7, 1]},
		{_id: 4, seasons: [120, 116, 111, 103, 93, 88, 76, 10, 4]}].forEach(program => {
		const seasons = program.seasons.sort((a, b) => a - b);
		for (let i = 0; i < seasons.length; i++) {
			updateEventsForSeason(seasons[i]);
		}
	});*/
}

const updateMaxSkills = () => {
	updateMaxSkillsForSeason(119);
	updateMaxSkillsForSeason(120);
	/*db.collection('programs').find().project({_id: 0, seasons: 1}).forEach(program => {
		program.seasons.forEach(season => updateMaxSkillsForSeason(season));
	});*/
};

const eventsJob = new CronJob('00 00 08 * * *', updateEvents, null, true, timezone);
const reEventsJob = new CronJob('00 05 08 * * *', updateReEvents, null, true, timezone);
const teamsJob = new CronJob('00 10 08 * * *', updateReTeams, null, true, timezone);
const matchesJob = new CronJob('00 20 08 * * *', updateMatches, null, true, timezone);
const rankingsJob = new CronJob('00 30 08 * * *', updateRankings, null, true, timezone);
const awardsJob = new CronJob('00 40 08 * * *', updateAwards, null, true, timezone);
const skillsJob = new CronJob('00 50 08 * * *', updateMaxSkills, null, true, timezone);

const update = () => {
	//updateReTeams();
	//updateReEvents();
	//updateMaxSkills();
	//updateEvents();
	//updateTeams();
	//updateMatches();
	//updateRankings();
	//updateAwards();
	//updateSkills();
};

const subscribedChannels = [
	'352003193666011138',
	'329477820076130306'  // Dev server.
];

const sendToSubscribedChannels = (content, options) => {
	subscribedChannels.forEach(id => {
		const channel = client.channels.get(id);
		if (channel) {
			channel.send(content, options);
		}
	});
};

const escapeMarkdown = string => string ? string.replace(/([*^_`~])/g, '\\$1') : '';

const createTeamChangeEmbed = (teamId, field, oldValue, newValue) => {
	return new Discord.RichEmbed()
		.setColor('GREEN')
		.setDescription(`[${teamId}](https://vexdb.io/teams/view/${teamId}) changed its ${field} from **${escapeMarkdown(oldValue)}** to **${escapeMarkdown(newValue)}**.`);
}

const createTeamRemoveEmbed = (teamId, field, oldValue) => {
	return new Discord.RichEmbed()
		.setColor('GREEN')
		.setDescription(`[${teamId}](https://vexdb.io/teams/view/${teamId}) removed its ${field} **${escapeMarkdown(oldValue)}**.`);
}

const updateTeamsInGroup = (program, season, teamGroup) => {
	const url = 'https://www.robotevents.com/api/teams/getTeamsForLatLng';
	const lat = teamGroup.position.lat;
	const lng = teamGroup.position.lng;

	request.post({url: url, form: {when: 'past', programs: [program], season_id: season, lat: lat, lng: lng}, json: true}).then(teams => {
		teams.map(team => formatReTeam(team, program, season == 119 || season == 120)).forEach(team => {
			db.collection('teams').findOneAndUpdate(
				{_id: team._id},
				{$set: team},
				{upsert: true}
			).then(result => {
				const old = result.value;
				if (!old) {
					delete team.registered;
					sendToSubscribedChannels('New team registered:', {embed: vex.createTeamEmbed(team)});
				} else {
					if (!old.registered) {
						delete old.registered;
						sendToSubscribedChannels('Existing team registered:', {embed: vex.createTeamEmbed(old)});
					}
					const teamId = team._id.id;
					if (team.city != old.city || team.region != old.region) {
						const unset = {country: ''};
						if (!team.region) {
							unset.region = '';
						}
						db.collection('teams').findOneAndUpdate(
							{_id: team._id},
							{$unset: unset}
						).then(result => {
							sendToSubscribedChannels(undefined, {embed: createTeamChangeEmbed(teamId, 'location', vex.getTeamLocation(old), vex.getTeamLocation(team))});
						}).catch(console.error);
					}
					if (team.name != old.name) {
						sendToSubscribedChannels(undefined, {embed: createTeamChangeEmbed(teamId, 'team name', old.name, team.name)});
					}
					if (team.robot != old.robot) {
						if (!team.robot) {
							db.collection('teams').findOneAndUpdate(
								{_id: team._id},
								{$unset: {robot: ''}}
							).then(result => {
								sendToSubscribedChannels(undefined, {embed: createTeamRemoveEmbed(teamId, 'robot name', old.robot)});
							}).catch(console.error);
						} else {
							sendToSubscribedChannels(undefined, {embed: createTeamChangeEmbed(teamId, 'robot name', old.robot, team.robot)});
						}
					}
				}
			}).catch(console.error);
		});
	}).catch(error => {
		console.error(error);
		updateTeamsInGroup(program, season, teamGroup);
	});
};

const updateEventsForSeason = season => {
	const url = 'https://www.robotevents.com/api/events';

	request.post({url: url, form: {when: 'past', season_id: season}, json: true}).then(events => {
		events.map(formatReEvent).forEach(event => {
			db.collection('events').updateOne(
				{_id: event._id},
				{$set: event},
				{upsert: true}
			).then(result => {
				if (result.upsertedCount) {
					console.log(`insert to events: ${JSON.stringify(event)}`);
				} else if (result.modifiedCount) {
					console.log(`update to events: ${JSON.stringify(event)}`);
				}
			}).catch(console.error);
		});
	}).catch(console.error);
}

const updateTeamsForSeason = (program, season) => {
	const url = 'https://www.robotevents.com/api/teams/latLngGrp';

	request.post({url: url, form: {when: 'past', programs: [program], season_id: season}, json: true}).then(teamGroups => {
		teamGroups.forEach(teamGroup => updateTeamsInGroup(program, season, teamGroup));
	}).catch(console.error);
};

const formatReTeam = (team, program, registered) => {
	const document = {
		_id: {
			prog: program,
			id: team.team
		},
		city: team.city
	};
	const region = encodeText(team.name);
	if (region) {
		document.region = region;
	}
	const name = encodeText(team.team_name);
	if (name) {
		document.name = name;
	}
	const robot = encodeText(team.robot_name);
	if (robot) {
		document.robot = robot;
	}
	if (program == encodeProgram('VEXU')) {
		document.grade = encodeGrade('College');
	}
	document.registered = registered;
	return document;
};

const formatReEvent = event => {
	const dates = event.date.match(/^(.+?)(?: - (.+))?$/);
	const document = {
		_id: event.sku,
		prog: event.program_id,
		name: event.name,
		season: event.season_id,
		start: encodeDate(dates[1]),
		end: dates[2] ? encodeDate(dates[2]) : encodeDate(dates[1])
	};
	if (event.email) {
		document.email = event.email;
	}
	document.id = event.id;
	if (event.phone) {
		document.phone = event.phone;
	}
	if (event.webcast_link) {
		document.webcast = event.webcast_link;
	}
	return document;
};

const updateMaxSkillsForSeason = season => {
	const url = `https://www.robotevents.com/api/seasons/${season}/skills?untilSkillsDeadline=0`;

	request.get({url: url, json: true}).then(maxSkills => {
		maxSkills.map(maxSkill => formatMaxSkill(maxSkill, season)).forEach(maxSkill => {
			db.collection('maxSkills').findOneAndUpdate(
				{_id: maxSkill._id},
				{$set: maxSkill},
				{upsert: true}
			).then(result => {
				const old = result.value;
				if (!old || maxSkill.team.grade != old.team.grade) {
					if (!old) {
						console.log(`Insert ${maxSkill} to maxSkills.`);
					}
					db.collection('teams').findOneAndUpdate(
						{_id: maxSkill.team.id},
						{$set: {grade: maxSkill.team.grade}}
					).then(result => {
						const old = result.value;
						if (!old) {
							console.log(`Insert ${maxSkill.team.id} to teams.`);
						} else if (old && maxSkill.team.grade != old.team.grade) {
							console.log(`Update ${maxSkill.team.id} from ${old.team.grade} to ${maxSkill.team.grade}.`);
						}
					}).catch(console.error);
				}
			}).catch(console.error);
		});
	}).catch(console.error);
};

const formatMaxSkill = (maxSkill, season) => {
	const document = {
		_id: {
			season: season,
			rank: maxSkill.rank
		},
		team: {
			id: maxSkill.team.team
		}
	};
	if (maxSkill.team.region) {
		document.team.region = maxSkill.team.region;
	}
	if (maxSkill.team.country) {
		document.team.country = maxSkill.team.country;
	}
	document.team.grade = encodeGrade(maxSkill.team.gradeLevel);
	document.event = {
		sku: maxSkill.event.sku,
		start: encodeDate(maxSkill.event.startDate)
	};
	document.score = maxSkill.scores.score;
	document.prog = maxSkill.scores.programming;
	document.driver = maxSkill.scores.driver;
	document.maxProg = maxSkill.scores.maxProgramming;
	document.maxDriver = maxSkill.scores.maxDriver;
	return document;
};

const updateProgramsAndSeasons = () => {
	request.get({url: 'https://www.robotevents.com/api/programs', json: true}).then(programs => {
		programs.map(formatProgram).forEach(program => {
			const seasons = JSON.parse(JSON.stringify(program.seasons));
			const seasonIds = program.seasons.map(season => season._id);
			delete program.seasons;
			db.collection('programs').updateOne(
				{_id: program._id},
				{$set: program, $addToSet: {seasons: {$each: seasonIds}}},
				{upsert: true}
			).then(result => {
				if (result.upsertedCount) {
					console.log(`insert to programs: ${JSON.stringify(program)}`);
				} else if (result.modifiedCount) {
					console.log(`update to programs: ${JSON.stringify(program)}`);
				}
				seasons.forEach(season => {
					db.collection('seasons').updateOne(
						{_id: season._id},
						season,
						{upsert: true}
					).then(result => {
						if (result.upsertedCount) {
							console.log(`insert to seasons: ${JSON.stringify(season)}`);
						} else if (result.modifiedCount) {
							console.log(`update to seasons: ${JSON.stringify(season)}`);
						}
					}).catch(console.error);
				});
			}).catch(console.error);
		});
	}).catch(console.error);
};

const formatProgram = program => {
	const document = {
		_id: program.id,
		abbr: program.abbr,
		name: program.name,
		slug: program.slug,
		active: program.active,
		sortOrder: program.sort_order
	}
	if (program.description) {
		document.description = program.description;
	}
	if (program.filename) {
		document.filename = program.filename;
	}
	document.updatedAt = encodeDate(program.updated_at);
	document.seasons = program.seasons.map(formatSeason);
	return document;
};

const formatSeason = season => {
	const document = {
		_id: season.id,
		programId: season.program_id,
		name: encodeSeasonName(season.name),
		years: season.years,
		active: season.active,
		current: season.current
	};
	if (season.skills_deadline) {
		document.skillsDeadline = encodeDate(season.skills_deadline);
	}
	if (season.skills_deadline_rc) {
		document.skillsDeadlineRc = encodeDate(season.skills_deadline_rc);
	}
	if (season.top_x_skills) {
		document.topNSkills = season.top_x_skills;
	}
	document.updatedAt = encodeDate(season.updated_at);
	if (season.game_information_url) {
		document.gameInformationUrl = season.game_information_url;
	}
	return document;
};

const encodeSeasonName = name => name.match(/^(?:.+: )?(.+?)(?: [0-9]{4}-[0-9]{4})?$/)[1];

const formatEvent = event => {
	const document = {
		_id: event.sku,
		prog: encodeProgram(event.program),
		name: event.name,
		venue: event.loc_venue
	};
	if (event.loc_address1) {
		document.addr1 = event.loc_address1;
	}
	if (event.loc_address2) {
		document.addr2 = event.loc_address2;
	}
	document.city = event.loc_city;
	if (event.loc_region && event.loc_region != 'N/A') {
		document.region = event.loc_region;
	}
	if (event.loc_postalcode) {
		document.postal = event.loc_postalcode;
	}
	document.country = event.loc_country;
	document.season = encodeSeason(event.season);
	document.start = encodeDate(event.start);
	document.end = encodeDate(event.end);
	document.divs = event.divisions;
	return document;
};
const formatTeam = team => {
	const document = {
		_id: {
			prog: encodeProgram(team.program),
			id: team.number
		},
		name: team.team_name
	};
	if (team.robot_name) {
		document.robot = team.robot_name
	}
	const org = encodeText(team.organisation);
	if (org) {
		document.org = org;
	}
	const city = encodeText(team.city);
	if (city) {
		document.city = city;
	}
	const region = encodeText(team.region);
	if (region && region != 'N/A' && region != 'Not Applicable or Not Listed') {
		document.region = region;
	}
	const country = encodeText(team.country);
	if (country) {
		document.country = country;
	}
	document.grade = encodeGrade(team.grade);
	document.registered = encodeBoolean(team.is_registered);
	return document;
};
const formatMatch = match => {
	const document = {
		_id: {
			sku: match.sku,
			div: match.division,
			round: match.round,
			instance: match.instance,
			num: match.matchnum
		}
	};
	if (match.field) {
		document.field = match.field;
	}
	document.red1 = match.red1;
	if (match.red2) {
		document.red2 = match.red2;
	}
	if (match.red3) {
		document.red3 = match.red3;
	}
	if (match.redsit) {
		document.redSit = match.redsit;
	}
	document.blue1 = match.blue1;
	if (match.blue2) {
		document.blue2 = match.blue2;
	}
	if (match.blue3) {
		document.blue3 = match.blue3;
	}
	if (match.bluesit) {
		document.blueSit = match.bluesit;
	}
	if (match.scored) {
		document.redScore = match.redscore;
		document.blueScore = match.bluescore;
	}
	document.scored = encodeBoolean(match.scored);
	const start = encodeDate(match.scheduled);
	if (start) {
		document.start = start;
	}
	return document;
};
const formatRanking = ranking => ({
	_id: {
		sku: ranking.sku,
		div: ranking.division,
		team: ranking.team
	},
	rank: ranking.rank,
	wins: ranking.wins,
	losses: ranking.losses,
	ties: ranking.ties,
	wp: ranking.wp,
	ap: ranking.ap,
	sp: ranking.sp,
	trsp: ranking.trsp,
	maxScore: ranking.max_score,
	opr: ranking.opr,
	dpr: ranking.dpr,
	ccwm: ranking.ccwm
});
const formatAward = award => {
	const document = {
		_id: {
			sku: award.sku,
			name: award.name,
			team: award.team
		}
	};
	if (award.qualifies.length) {
		document.quals = award.qualifies;
	}
	return document;
};
const formatSkill = skill => ({
	_id: {
		sku: skill.sku,
		type: skill.type,
		team: skill.team
	},
	rank: skill.rank,
	prog: encodeProgram(skill.program),
	attempts: skill.attempts,
	score: skill.score
});

const vexDbProgramToId = {
	'VRC': 1,
	'VEXU': 4,
	'WORKSHOP': 37,
	'CREATE': 40,
	'VIQC': 41
};

const vexDbSeasonToId = {
	'Bridge Battle': -4,
	'Elevation': -3,
	'Clean Sweep': 1,
	'Round Up': 7,
	'Gateway': 73,
	'Sack Attack': 85,
	'Toss Up': 92,
	'Skyrise': 102,
	'Nothing But Net': 110,
	'Starstruck': 115,
	'In The Zone': 119
};

const encodeProgram = program => vexDbProgramToId[program];
const encodeSeason = season => vexDbSeasonToId[season];
const encodeGrade = grade => dbinfo.grades.indexOf(grade);
const encodeDate = date => Date.parse(date);
const encodeBoolean = number => Boolean(number);
const encodeText = text => text ? text.trim() : text;

const updateCollectionFromResource = (collection, resource, formatFunc) => {
	updateCollectionFromResourceBatch(collection, resource, formatFunc, 0);
};

const updateCollectionFromResourceBatch = (collection, resource, formatFunc, startIndex) => {
	request.get({url: `https://api.vexdb.io/v1/${resource}?limit_start=${startIndex}`, json: true}).then(body => {
		if (body.status) {
			if (body.size) {
				body.result.map(formatFunc).forEach(document => {
					db.collection(collection).updateOne(
						{_id: document._id},
						{$set: document},
						{upsert: true}
					).then(result => {
						if (result.upsertedCount) {
							console.log(`insert to ${collection}: ${JSON.stringify(document)}`);
						} else if (result.modifiedCount) {
							console.log(`update to ${collection}: ${JSON.stringify(document)}`);
						}
						//console.log('.');
					}).catch(console.error);
				});
				updateCollectionFromResourceBatch(collection, resource, formatFunc, startIndex + body.size);
			}
		} else {
			console.error(`Error: VEXDB_ERROR: ${body.error_text} errno: ${body.error_code}`);
		}
	}).catch(console.error);
};

module.exports = {
	update: update,
	updateProgramsAndSeasons: updateProgramsAndSeasons,
	updateMaxSkills: updateMaxSkills,
	updateReTeams: updateReTeams
};
