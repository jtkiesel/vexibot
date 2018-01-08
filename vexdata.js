const request = require('request-promise-native');
const cron = require('cron');
const he = require('he');

const app = require('./app');
const vex = require('./vex');
const dbinfo = require('./dbinfo');
const events = require('./events');

const CronJob = cron.CronJob;
const db = app.db;
const getTeam = vex.getTeam;
const getTeamLocation = vex.getTeamLocation;
const createTeamEmbed = vex.createTeamEmbed;
const createMatchEmbed = vex.createMatchEmbed;
const createTeamChangeEmbed = vex.createTeamChangeEmbed;
const sendToSubscribedChannels = vex.sendToSubscribedChannels;
const sendMatchEmbed = vex.sendMatchEmbed;
const encodeProgram = dbinfo.encodeProgram;
const encodeGrade = dbinfo.encodeGrade;
const decodeGrade = dbinfo.decodeGrade;
const seasonToVexu = dbinfo.seasonToVexu;

const timezone = 'America/New_York';

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const encodeText = value => he.decode(value.trim().replace(/\s\s*/g, ' '));

const updateTeams = async () => {
	await updateTeamsForSeason(1, 119);
	await updateTeamsForSeason(4, 120);
};

const updateAllTeams = async () => {
	const programs = await db.collection('programs').find().project({_id: 1, seasons: 1}).toArray();
	for (let program of programs) {
		const seasons = program.seasons.sort((a, b) => a - b);
		for (let season of seasons) {
			try {
				await updateTeamsForSeason(program._id, season);
			} catch (err) {
				console.error(err);
			}
		}
	}
};

const updateEvents = async () => {
	await updateEventsForSeason(1, 119);
	await updateEventsForSeason(4, 120);
};

const updateAllEvents = async () => {
	const programs = await db.collection('programs').find().project({_id: 1, seasons: 1}).toArray();
	for (let program of programs) {
		const seasons = program.seasons.sort((a, b) => a - b);
		for (let season of seasons) {
			try {
				await updateEventsForSeason(program._id, season);
			} catch (err) {
				console.error(err);
			}
		}
	}
};

const updateExistingEvents = async () => {
	const eventArray = await db.collection('events').find().project({_id: 1, prog: 1, season: 1}).toArray();
	for (let event of eventArray) {
		try {
			await events.updateEvent(event.prog, event.season, event._id);
		} catch (err) {
			console.error(err);
		}
	}
};

const updateMaxSkills = async () => {
	await updateMaxSkillsForSeason(1, 119, 2);
	await updateMaxSkillsForSeason(1, 119, 3);
	await updateMaxSkillsForSeason(4, 120, 4);
};

const updateAllMaxSkills = async () => {
	const programs = await db.collection('programs').find().project({_id: 1, seasons: 1}).toArray();
	for (let program of programs) {
		const seasons = program.seasons.sort((a, b) => a - b);
		for (let season of seasons) {
			try {
				await updateMaxSkillsForSeason(program._id, season)
			} catch (err) {
				console.error(err);
			}
		}
	}
};

const updateCurrentEvents = async () => {
	const now = Date.now();
	try {
		const documents = await db.collection('events').find({dates: {$elemMatch: {end: {$gt: now}, start: {$lt: now}}}}).project({_id: 1, prog: 1, season: 1}).toArray();
		for (let event of documents) {
			try {
				await events.updateEvent(event.prog, event.season, event._id);
			} catch (err) {
				console.error(err);
			}
		}
	} catch (err) {
		console.error(err);
	}
};

const eventsJob = new CronJob('00 00 08 * * *', updateEvents, null, true, timezone);
const teamsJob = new CronJob('00 10 08 * * *', updateTeams, null, true, timezone);
const skillsJob = new CronJob('00 20 08 * * *', updateMaxSkills, null, true, timezone);
const currentEventsJob = new CronJob('00 */2 * * * *', updateCurrentEvents, null, true, timezone);

const update = () => {
	updateCurrentEvents();
	//events.updateEvent(1, 115, 'RE-VRC-16-1790');
	//updateTeams();
	//updateEvents();
	//updateMaxSkills();
};

const updateTeamsInGroup = async (program, season, teamGroup, timeout = 1000) => {
	const url = 'https://www.robotevents.com/api/teams/getTeamsForLatLng';
	const lat = teamGroup.position.lat;
	const lng = teamGroup.position.lng;
	try {
		let teams = await request.post({url: url, form: {when: 'past', programs: [program], season_id: season, lat: lat, lng: lng}, json: true});
		teams.map(team => formatTeam(program, season, lat, lng, team)).forEach(async team => {
			try {
				const teamId = team._id.id;
				let result = await db.collection('teams').findOneAndUpdate({_id: team._id}, {$set: team}, {upsert: true});
				const old = result.value;
				if (!old) {
					try {
						if ((await getTeam(teamId)).length !== 1) {
							await sendToSubscribedChannels('New team registered', {embed: createTeamEmbed(team)}, [team._id]);
						}
						console.log(createTeamEmbed(team).fields);
					} catch (err) {
						console.error(err);
					}
				} else {
					if (team.city !== old.city || team.region !== old.region) {
						const unset = {country: ''};
						if (!team.region) {
							unset.region = '';
						}
						try {
							result = await db.collection('teams').findOneAndUpdate({_id: team._id}, {$unset: unset});
							console.log(createTeamChangeEmbed(program, teamId, 'location', getTeamLocation(old), getTeamLocation(team)).description);
						} catch (err) {
							console.error(err);
						}
					}
					if (team.name !== old.name) {
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
						console.log(createTeamChangeEmbed(program, teamId, 'robot name', old.robot, team.robot).description);
					}
				}
			} catch (err) {
				console.error(err);
			}
		});
	} catch (err) {
		console.error(err);
		console.log(`Retrying ${lat},${lng}`);
		try {
			await sleep(timeout);
			await updateTeamsInGroup(program, season, teamGroup, timeout * 2);
		} catch (err) {
			console.error(err);
		}
	}
};

const updateEventsForSeason = async (program, season) => {
	const url = 'https://www.robotevents.com/api/events';
	try {
		let eventsData = await request.post({url: url, form: {when: 'past', season_id: season}, json: true});
		eventsData = eventsData.filter((event, i, self) => self.findIndex(e => e.sku === event.sku) === i).map(formatEvent);
		for (let event of eventsData) {
			try {
				const result = await db.collection('events').findOneAndUpdate({_id: event._id}, {$set: event}, {upsert: true});
				const old = result.value;
				if (!old) {
					console.log(`New event: ${JSON.stringify(event)}`);
				}
				console.log(`starting ${event._id}`);
				await events.updateEvent(program, season, event._id);
				console.log(`ended ${event._id}`);
			} catch (err) {
				console.error(err);
			}
		}
	} catch (err) {
		console.error(err);
	}
};

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

const formatTeam = (prog, season, lat, lng, team) => {
	if (prog === 1 && isNaN(team.team.charAt(0))) {
		prog = 4;
		season = seasonToVexu(season);
	}
	return Object.assign({
			_id: {
				id: team.team,
				prog: prog,
				season: season
			},
			lat: lat,
			lng: lng,
			city: encodeText(team.city)
		},
		team.name && {region: encodeText(team.name)},
		team.team_name && {name: encodeText(team.team_name)},
		team.robot_name && {robot: encodeText(team.robot_name)},
		prog === encodeProgram('VEXU') && {grade: encodeGrade('College')});
};

const formatEvent = event => {
	const dates = event.date.match(/^(.+?)(?: - (.+))?$/);
	return Object.assign({
			_id: event.sku,
			prog: event.program_id,
			season: event.season_id,
			name: encodeText(event.name),
			start: encodeDate(dates[1]),
			end: encodeDate(dates[2] ? dates[2] : dates[1]),
			lat: event.lat,
			lng: event.lng
		},
		event.email && {email: event.email},
		event.phone && {phone: event.phone},
		event.webcast_link && {webcast: event.webcast_link});
};

const updateMaxSkillsForSeason = async (program, season, grade) => {
	const url = `https://www.robotevents.com/api/seasons/${season}/skills?untilSkillsDeadline=0&grade_level=${decodeGrade(grade)}`;
	try {
		const maxSkills = await request.get({url: url, json: true});
		maxSkills.map(maxSkill => formatMaxSkill(maxSkill, program, season, grade)).forEach(async maxSkill => {
			try {
				let result = await db.collection('maxSkills').findOneAndUpdate({_id: maxSkill._id}, {$set: maxSkill}, {upsert: true});
				let old = result.value;
				if (!old) {
					console.log(`Insert ${JSON.stringify(maxSkill)} to maxSkills.`);
					const teamId = maxSkill.team.id;
					try {
						result = await db.collection('teams').findOneAndUpdate({_id: {id: teamId, prog: program, season: season}}, {$set: {grade: grade}}, {upsert: true});
						old = result.value;
						if (!old) {
							console.log(`Insert ${teamId} to teams.`);
						} else if (old && grade !== old.grade) {
							console.log(`Update ${teamId} from ${decodeGrade(old.grade)} to ${decodeGrade(grade)}.`);
						}
					} catch (err) {
						console.error(err);
					}
				}
			} catch (err) {
				console.error(err);
			}
		});
		if (maxSkills.length) {
			await db.collection('maxSkills').deleteMany({'_id.season': season, '_id.grade': grade, '_id.rank': {$gt: maxSkills.length}});
		}
	} catch (err) {
		console.error(err);
	}
};

const formatMaxSkill = (maxSkill, prog, season, grade) => {
	const document = {
		_id: {
			season: season,
			grade: grade,
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
	document.event = {
		sku: maxSkill.event.sku,
		start: encodeDate(maxSkill.event.startDate)
	};
	document.score = maxSkill.scores.score;
	document.prog = maxSkill.scores.programming;
	document.driver = maxSkill.scores.driver;
	document.maxProg = maxSkill.scores.maxProgramming;
	document.maxDriver = maxSkill.scores.maxDriver;
	document.eligible = maxSkill.eligible;
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
	updateTeams: updateTeams,
	updateEvents: updateEvents,
	updateAllTeams: updateAllTeams,
	updateAllEvents: updateAllEvents,
	updateExistingEvents,
	updateAllMaxSkills: updateAllMaxSkills,
	updateTeamsForSeason: updateTeamsForSeason,
	updateEventsForSeason: updateEventsForSeason,
	updateMaxSkillsForSeason: updateMaxSkillsForSeason,
	getMatch: getMatch
};
