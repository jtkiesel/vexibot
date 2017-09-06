const request = require('request-promise-native');
const cron = require('cron');

const app = require('./app');
const vex = require('./vex');
const dbinfo = require('./dbinfo');
const events = require('./events');

const CronJob = cron.CronJob;
const client = app.client;
const db = app.db;
const decodeSeason = dbinfo.decodeSeason;
const encodeProgram = dbinfo.encodeProgram;
const encodeGrade = dbinfo.encodeGrade;
const idToSeasonUrl = dbinfo.idToSeasonUrl;

const timezone = 'America/New_York';

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
/*
	[{_id: 1, seasons: [119, 115, 110, 102, 92, 85, 73, 7, 1]},
		{_id: 4, seasons: [120, 116, 111, 103, 93, 88, 76, 10, 4]}].forEach(program => {
		program.seasons.forEach(updateEventsForSeason);
	});*/
}

const updateMaxSkills = () => {
	updateMaxSkillsForSeason(1, 119);
	updateMaxSkillsForSeason(4, 120);
	/*db.collection('programs').find().project({_id: 0, seasons: 1}).forEach(program => {
		program.seasons.forEach(season => updateMaxSkillsForSeason(season));
	});*/
};

const eventsJob = new CronJob('00 00 08 * * *', updateReEvents, null, true, timezone);
const teamsJob = new CronJob('00 10 08 * * *', updateReTeams, null, true, timezone);
const skillsJob = new CronJob('00 20 08 * * *', updateMaxSkills, null, true, timezone);

const update = () => {
	//updateReTeams();
	//updateReEvents();
	//updateMaxSkills();
};

const updateTeamsInGroup = (program, season, teamGroup) => {
	const url = 'https://www.robotevents.com/api/teams/getTeamsForLatLng';
	const lat = teamGroup.position.lat;
	const lng = teamGroup.position.lng;

	request.post({url: url, form: {when: 'past', programs: [program], season_id: season, lat: lat, lng: lng}, json: true}).then(teams => {
		const registered = season === 119 || season === 120;
		console.log(registered);
		teams.map(team => formatReTeam(team, program, registered)).forEach(team => {
			db.collection('teams').findOneAndUpdate(
				{_id: team._id},
				{$set: team},
				{upsert: true}
			).then(result => {
				const old = result.value;
				if (!old) {
					delete team.registered;
					vex.sendToSubscribedChannels('New team registered:', {embed: vex.createTeamEmbed(team)});
					console.log(vex.createTeamEmbed(team).fields);
				} else {
					if (!old.registered && team.registered) {
						delete old.registered;
						vex.sendToSubscribedChannels('Existing team registered:', {embed: vex.createTeamEmbed(old)});
						console.log(vex.createTeamEmbed(old).fields);
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
							vex.sendToSubscribedChannels(undefined, {embed: vex.createTeamChangeEmbed(teamId, 'location', vex.getTeamLocation(old), vex.getTeamLocation(team))});
							console.log(vex.createTeamChangeEmbed(teamId, 'location', vex.getTeamLocation(old), vex.getTeamLocation(team)).description);
						}).catch(console.error);
					}
					if (team.name != old.name) {
						vex.sendToSubscribedChannels(undefined, {embed: vex.createTeamChangeEmbed(teamId, 'team name', old.name, team.name)});
						console.log(vex.createTeamChangeEmbed(teamId, 'team name', old.name, team.name).description);
					}
					if (team.robot != old.robot) {
						if (!team.robot) {
							db.collection('teams').findOneAndUpdate(
								{_id: team._id},
								{$unset: {robot: ''}}
							).then(result => {
								vex.sendToSubscribedChannels(undefined, {embed: vex.createTeamChangeEmbed(teamId, 'robot name', old.robot, team.name)});
								console.log(vex.createTeamChangeEmbed(teamId, 'robot name', old.robot, team.name).description);
							}).catch(console.error);
						} else {
							vex.sendToSubscribedChannels(undefined, {embed: vex.createTeamChangeEmbed(teamId, 'robot name', old.robot, team.robot)});
							console.log(vex.createTeamChangeEmbed(teamId, 'robot name', old.robot, team.robot).description);
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

const updateEventsForSeason = (program, season) => {
	const url = 'https://www.robotevents.com/api/events';

	request.post({url: url, form: {when: 'past', season_id: season}, json: true}).then(eventsData => {
		eventsData.map(formatReEvent).forEach(event => {
			db.collection('events').updateOne(
				{_id: event._id},
				{$set: event},
				{upsert: true}
			).then(result => {
				if (result.upsertedCount) {
					console.log(`Insert to events: ${JSON.stringify(event)}`);
				} else if (result.modifiedCount) {
					console.log(`Update to events: ${JSON.stringify(event)}`);
				}
				events.updateEvent(event._id);
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

const formatReTeam = (team, prog, registered) => {
	const document = {
		_id: {
			prog: prog,
			id: team.team
		},
		city: team.city
	};
	const region = team.name;
	if (region) {
		document.region = region;
	}
	const name = team.team_name;
	if (name) {
		document.name = name;
	}
	const robot = team.robot_name;
	if (robot) {
		document.robot = robot;
	}
	if (prog === encodeProgram('VEXU')) {
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
	if (event.phone) {
		document.phone = event.phone;
	}
	if (event.webcast_link) {
		document.webcast = event.webcast_link;
	}
	return document;
};

const updateMaxSkillsForSeason = (program, season) => {
	const url = `https://www.robotevents.com/api/seasons/${season}/skills?untilSkillsDeadline=0`;

	request.get({url: url, json: true}).then(maxSkills => {
		maxSkills.map(maxSkill => formatMaxSkill(maxSkill, season)).forEach(maxSkill => {
			db.collection('maxSkills').findOneAndUpdate(
				{_id: maxSkill._id},
				{$set: maxSkill},
				{upsert: true}
			).then(result => {
				const old = result.value;
				if (!old || maxSkill.team.grade !== old.team.grade) {
					if (!old) {
						console.log(`Insert ${JSON.stringify(maxSkill)} to maxSkills.`);
					}
					db.collection('teams').findOneAndUpdate(
						{_id: {prog: program, id: maxSkill.team.id}},
						{$set: {grade: maxSkill.team.grade}}
					).then(result => {
						const old = result.value;
						if (!old) {
							console.log(`Insert ${maxSkill.team.id} to teams.`);
						} else if (old && maxSkill.team.grade !== old.grade) {
							console.log(`Update ${maxSkill.team.id} from ${old.grade} to ${maxSkill.team.grade}.`);
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
					console.log(`Insert to programs: ${JSON.stringify(program)}`);
				} else if (result.modifiedCount) {
					console.log(`Update to programs: ${JSON.stringify(program)}`);
				}
				seasons.forEach(season => {
					db.collection('seasons').updateOne(
						{_id: season._id},
						season,
						{upsert: true}
					).then(result => {
						if (result.upsertedCount) {
							console.log(`Insert to seasons: ${JSON.stringify(season)}`);
						} else if (result.modifiedCount) {
							console.log(`Update to seasons: ${JSON.stringify(season)}`);
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
const encodeDate = date => Date.parse(date);
const encodeBoolean = number => Boolean(number);
const encodeText = text => text ? text.trim() : text;

module.exports = {
	update: update,
	updateProgramsAndSeasons: updateProgramsAndSeasons,
	updateMaxSkills: updateMaxSkills,
	updateReTeams: updateReTeams,
	updateTeamsForSeason: updateTeamsForSeason,
	updateEventsForSeason: updateEventsForSeason,
	updateMaxSkillsForSeason: updateMaxSkillsForSeason
};
