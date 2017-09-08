const request = require('request-promise-native');
const cron = require('cron');
const he = require('he');

const app = require('./app');
const vex = require('./vex');
const dbinfo = require('./dbinfo');
const events = require('./events');

const CronJob = cron.CronJob;
const db = app.db;
const getTeamLocation = vex.getTeamLocation;
const createTeamEmbed = vex.createTeamEmbed;
const createTeamChangeEmbed = vex.createTeamChangeEmbed;
const sendToSubscribedChannels = vex.sendToSubscribedChannels;
const encodeProgram = dbinfo.encodeProgram;
const encodeGrade = dbinfo.encodeGrade;

const timezone = 'America/New_York';

const updateReTeams = async () => {
	await updateTeamsForSeason(1, 119);
	await updateTeamsForSeason(4, 120);
	/*[{_id: 1, seasons: [119, 115, 110, 102, 92, 85, 73, 7, 1]},
		{_id: 4, seasons: [120, 116, 111, 103, 93, 88, 76, 10, 4]}].forEach(program => {
		const seasons = program.seasons.sort((a, b) => a - b);
		for (let i = 0; i < seasons.length; i++) {
			updateTeamsForSeason(program, seasons[i]);
		}
	});*/
};

const updateReEvents = async () => {
	await updateEventsForSeason(1, 119);
	await updateEventsForSeason(4, 120);
/*
	[{_id: 1, seasons: [119, 115, 110, 102, 92, 85, 73, 7, 1]},
		{_id: 4, seasons: [120, 116, 111, 103, 93, 88, 76, 10, 4]}].forEach(program => {
		program.seasons.forEach(updateEventsForSeason);
	});*/
}

const updateMaxSkills = async () => {
	await updateMaxSkillsForSeason(1, 119);
	await updateMaxSkillsForSeason(4, 120);
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

const updateTeamsInGroup = async (program, season, teamGroup) => {
	const url = 'https://www.robotevents.com/api/teams/getTeamsForLatLng';
	const lat = teamGroup.position.lat;
	const lng = teamGroup.position.lng;
	const registered = season === 119 || season === 120 || season === 121;

	try {
		const teams = await request.post({url: url, form: {when: 'past', programs: [program], season_id: season, lat: lat, lng: lng}, json: true});
		teams.map(team => formatReTeam(team, program, registered)).forEach(async team => {
			try {
				let result = await db.collection('teams').findOneAndUpdate({_id: team._id}, {$set: team}, {upsert: true});
				const old = result.value;
				if (!old) {
					delete team.registered;
					sendToSubscribedChannels('New team registered:', {embed: createTeamEmbed(team)}, program, teamId);
					console.log(vex.createTeamEmbed(team).fields);
				} else {
					if (!old.registered && team.registered) {
						delete old.registered;
						sendToSubscribedChannels('Existing team registered:', {embed: createTeamEmbed(old)}, program, teamId);
						console.log(createTeamEmbed(old).fields);
					}
					const teamId = team._id.id;
					if (team.city != old.city || team.region != old.region) {
						const unset = {country: ''};
						if (!team.region) {
							unset.region = '';
						}
						try {
							result = await db.collection('teams').findOneAndUpdate({_id: team._id}, {$unset: unset});
							sendToSubscribedChannels(undefined, {embed: createTeamChangeEmbed(teamId, 'location', getTeamLocation(old), getTeamLocation(team))}, program, teamId);
							console.log(vex.createTeamChangeEmbed(teamId, 'location', getTeamLocation(old), getTeamLocation(team)).description);
						} catch (err) {
							console.error(err);
						}
					}
					if (team.name != old.name) {
						sendToSubscribedChannels(undefined, {embed: createTeamChangeEmbed(teamId, 'team name', old.name, team.name)}, program, teamId);
						console.log(createTeamChangeEmbed(teamId, 'team name', old.name, team.name).description);
					}
					if (team.robot != old.robot) {
						if (!team.robot) {
							try {
								result = await db.collection('teams').findOneAndUpdate({_id: team._id}, {$unset: {robot: ''}});
								sendToSubscribedChannels(undefined, {embed: createTeamChangeEmbed(teamId, 'robot name', old.robot, team.name)}, program, teamId);
								console.log(createTeamChangeEmbed(teamId, 'robot name', old.robot, team.name).description);
							} catch (err) {
								console.error(err);
							}
						} else {
							sendToSubscribedChannels(undefined, {embed: createTeamChangeEmbed(teamId, 'robot name', old.robot, team.robot)}, program, teamId);
							console.log(createTeamChangeEmbed(teamId, 'robot name', old.robot, team.robot).description);
						}
					}
				}
			} catch (err) {
				console.error(err);
			}
		});
	} catch (err) {
		console.error(err);
	}
};

const updateEventsForSeason = async (program, season) => {
	const url = 'https://www.robotevents.com/api/events';

	try {
		let eventsData = await request.post({url: url, form: {when: 'past', season_id: season}, json: true});
		eventsData = eventsData.filter((event, i, self) => self.findIndex(e => e.sku === event.sku) === i).map(formatReEvent);
		for (let event of eventsData) {
			try {
				const result = await db.collection('events').updateOne({_id: event._id}, {$set: event}, {upsert: true});
				if (result.upsertedCount) {
					console.log(`Insert to events: ${JSON.stringify(event)}`);
				} else if (result.modifiedCount) {
					console.log(`Update to events: ${JSON.stringify(event)}`);
				}
				console.log(`starting ${event._id}`);
				await events.updateEvent(program, event._id);
				console.log(`ended ${event._id}`);
			} catch (err) {
				console.error(err);
			}
		}
	} catch (err) {
		console.error(err);
	}
}

const updateTeamsForSeason = async (program, season) => {
	const url = 'https://www.robotevents.com/api/teams/latLngGrp';

	try {
		const teamGroups = await request.post({url: url, form: {when: 'past', programs: [program], season_id: season}, json: true});
		for (let teamGroup of teamGroups) {
			await updateTeamsInGroup(program, season, teamGroup);
		}
	} catch (err) {
		console.error(err);
	}
};

const formatReTeam = (team, prog, registered) => {
	const document = {
		_id: {
			prog: prog,
			id: team.team
		},
		city: he.decode(team.city)
	};
	const region = team.name;
	if (region) {
		document.region = he.decode(region);
	}
	const name = team.team_name;
	if (name) {
		document.name = he.decode(name);
	}
	const robot = team.robot_name;
	if (robot) {
		document.robot = he.decode(robot);
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
		season: event.season_id,
		name: he.decode(event.name),
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

const updateMaxSkillsForSeason = async (program, season) => {
	const url = `https://www.robotevents.com/api/seasons/${season}/skills?untilSkillsDeadline=0`;

	try {
		const maxSkills = await request.get({url: url, json: true});
		maxSkills.map(maxSkill => formatMaxSkill(maxSkill, program, season)).forEach(async maxSkill => {
			try {
				let result = await db.collection('maxSkills').findOneAndUpdate({_id: maxSkill._id}, {$set: maxSkill}, {upsert: true});
				const old = result.value;
				if (!old || maxSkill.team.grade !== old.team.grade) {
					if (!old) {
						console.log(`Insert ${JSON.stringify(maxSkill)} to maxSkills.`);
					}
					try {
						result = await db.collection('teams').findOneAndUpdate(
							{_id: {prog: program, id: maxSkill.team.id}},
							{$set: {grade: maxSkill.team.grade}}
						);
						const old = result.value;
						if (!old) {
							console.log(`Insert ${maxSkill.team.id} to teams.`);
						} else if (old && maxSkill.team.grade !== old.grade) {
							console.log(`Update ${maxSkill.team.id} from ${old.grade} to ${maxSkill.team.grade}.`);
						}
					} catch (err) {
						console.error(err);
					}
				}
			} catch (err) {
				console.error(err);
			}
		});
	} catch (err) {
		console.error(err);
	}
};

const formatMaxSkill = (maxSkill, prog, season) => {
	const document = {
		_id: {
			season: season,
			rank: maxSkill.rank
		},
		team: {
			prog: prog,
			id: maxSkill.team.team
		}
	};
	if (maxSkill.team.region) {
		document.team.region = he.decode(maxSkill.team.region);
	}
	if (maxSkill.team.country) {
		document.team.country = he.decode(maxSkill.team.country);
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

const updateProgramsAndSeasons = async () => {
	try {
		const programs = await request.get({url: 'https://www.robotevents.com/api/programs', json: true});
		programs.map(formatProgram).forEach(async program => {
			const seasons = JSON.parse(JSON.stringify(program.seasons));
			const seasonIds = program.seasons.map(season => season._id);

			delete program.seasons;
			try {
				let result = await db.collection('programs').updateOne(
					{_id: program._id},
					{$set: program, $addToSet: {seasons: {$each: seasonIds}}},
					{upsert: true}
				);
				if (result.upsertedCount) {
					console.log(`Insert to programs: ${JSON.stringify(program)}`);
				} else if (result.modifiedCount) {
					console.log(`Update to programs: ${JSON.stringify(program)}`);
				}
				seasons.forEach(async season => {
					try {
						result = await db.collection('seasons').updateOne({_id: season._id}, {$set: season}, {upsert: true});
						if (result.upsertedCount) {
							console.log(`Insert to seasons: ${JSON.stringify(season)}`);
						} else if (result.modifiedCount) {
							console.log(`Update to seasons: ${JSON.stringify(season)}`);
						}
					} catch (err) {
						console.error(err);
					}
				});
			} catch (err) {
				console.error(err);
			}
		});
	} catch (err) {
		console.error(err);
	}
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

module.exports = {
	update: update,
	updateProgramsAndSeasons: updateProgramsAndSeasons,
	updateMaxSkills: updateMaxSkills,
	updateReTeams: updateReTeams,
	updateTeamsForSeason: updateTeamsForSeason,
	updateEventsForSeason: updateEventsForSeason,
	updateMaxSkillsForSeason: updateMaxSkillsForSeason
};
