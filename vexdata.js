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
const createMatchEmbed = vex.createMatchEmbed;
const createTeamChangeEmbed = vex.createTeamChangeEmbed;
const sendToSubscribedChannels = vex.sendToSubscribedChannels;
const sendMatchEmbed = vex.sendMatchEmbed;
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
	/*[{_id: 1, seasons: [119, 115, 110, 102, 92, 85, 73, 7, 1]},
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

const updateCurrentEvents = async () => {
	const now = Date.now();
	try {
		const documents = await db.collection('events').find({dates: {$elemMatch: {end: {$gt: now}, start: {$lt: now}}}}).project({_id: 1, prog: 1}).toArray();
		for (let event of documents) {
			try {
				await events.updateEvent(event.prog, event._id);
			} catch (err) {
				console.error(err);
			}
		}
	} catch (err) {
		console.error(err);
	}
};

const eventsJob = new CronJob('00 00 08 * * *', updateReEvents, null, true, timezone);
const teamsJob = new CronJob('00 10 08 * * *', updateReTeams, null, true, timezone);
const skillsJob = new CronJob('00 20 08 * * *', updateMaxSkills, null, true, timezone);
const currentEventsJob = new CronJob('00 */2 * * * *', updateCurrentEvents, null, true, timezone);

const update = () => {
	updateCurrentEvents();
	//updateReTeams();
	//updateReEvents();
	//updateMaxSkills();
};

const updateTeamsInGroup = async (program, season, teamGroup, retried = false) => {
	const url = 'https://www.robotevents.com/api/teams/getTeamsForLatLng';
	const lat = teamGroup.position.lat;
	const lng = teamGroup.position.lng;
	const registered = season === 119 || season === 120 || season === 121;

	try {
		const teams = await request.post({url: url, form: {when: 'past', programs: [program], season_id: season, lat: lat, lng: lng}, json: true});
		teams.map(team => formatReTeam(team, program, registered)).forEach(async team => {
			try {
				const teamId = team._id.id;
				let result = await db.collection('teams').findOneAndUpdate({_id: team._id}, {$set: team}, {upsert: true});
				const old = result.value;
				if (!old) {
					delete team.registered;
					sendToSubscribedChannels('New team registered', {embed: createTeamEmbed(team)}, [team._id]);
					console.log(vex.createTeamEmbed(team).fields);
				} else {
					if (!old.registered && team.registered) {
						delete old.registered;
						sendToSubscribedChannels('Existing team registered', {embed: createTeamEmbed(old)}, [team._id]);
						console.log(createTeamEmbed(old).fields);
					}
					if (team.city !== old.city || team.region !== old.region) {
						const unset = {country: ''};
						if (!team.region) {
							unset.region = '';
						}
						try {
							result = await db.collection('teams').findOneAndUpdate({_id: team._id}, {$unset: unset});
							sendToSubscribedChannels(null, {embed: createTeamChangeEmbed(program, teamId, 'location', getTeamLocation(old), getTeamLocation(team))}, [team._id]);
							console.log(vex.createTeamChangeEmbed(program, teamId, 'location', getTeamLocation(old), getTeamLocation(team)).description);
						} catch (err) {
							console.error(err);
						}
					}
					if (team.name !== old.name) {
						sendToSubscribedChannels(null, {embed: createTeamChangeEmbed(program, teamId, 'team name', old.name, team.name)}, [team._id]);
						console.log(createTeamChangeEmbed(program, teamId, 'team name', old.name, team.name).description);
					}
					if (team.robot !== old.robot) {
						if (!team.robot) {
							try {
								result = await db.collection('teams').findOneAndUpdate({_id: team._id}, {$unset: {robot: ''}});
							} catch (err) {
								console.error(err);
							}
						}
						sendToSubscribedChannels(null, {embed: createTeamChangeEmbed(program, teamId, 'robot name', old.robot, team.robot)}, [team._id]);
						console.log(createTeamChangeEmbed(program, teamId, 'robot name', old.robot, team.robot).description);
					}
				}
			} catch (err) {
				console.error(err);
			}
		});
	} catch (err) {
		console.error(err);
		if (!retried) {
			console.log(`Retrying ${lat},${lng}`);
			try {
				await updateTeamsInGroup(program, season, teamGroup, true);
			} catch (err) {
				console.error(err);
			}
		} else {
			console.log (`*** WARNING: ALREADY RETRIED ${lat},${lng}, GIVING UP ***`);
		}
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
	return Object.assign({
			_id: {
				prog: prog,
				id: team.team
			},
			city: he.decode(team.city),
			registered: registered
		},
		team.name && {region: he.decode(team.name)},
		team.team_name && {name: he.decode(team.team_name)},
		team.robot_name && {robot: he.decode(team.robot_name)},
		prog === encodeProgram('VEXU') && {grade: encodeGrade('College')});
};

const formatReEvent = event => {
	const dates = event.date.match(/^(.+?)(?: - (.+))?$/);
	return Object.assign({
			_id: event.sku,
			prog: event.program_id,
			season: event.season_id,
			name: he.decode(event.name),
			start: encodeDate(dates[1]),
			end: encodeDate(dates[2] ? dates[2] : dates[1])
		},
		event.email && {email: event.email},
		event.phone && {phone: event.phone},
		event.webcast_link && {webcast: event.webcast_link});
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

const getMatch = async () => {
	const count = await db.collection('matches').count({});
	const match = await db.collection('matches').find({}).skip(Math.floor(Math.random() * count)).next();
	let reactions, change;
	if (match.hasOwnProperty('redScore')) {
		reactions = vex.matchScoredEmojis;
		change = 'scored';
	} else {
		reactions = vex.matchScheduledEmojis;
		change = 'scheduled';
	}
	sendMatchEmbed(`Match ${change}`, match, reactions);
};

module.exports = {
	update: update,
	updateProgramsAndSeasons: updateProgramsAndSeasons,
	updateMaxSkills: updateMaxSkills,
	updateReTeams: updateReTeams,
	updateTeamsForSeason: updateTeamsForSeason,
	updateEventsForSeason: updateEventsForSeason,
	updateMaxSkillsForSeason: updateMaxSkillsForSeason,
	getMatch: getMatch
};
