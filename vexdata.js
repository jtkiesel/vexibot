const request = require('request-promise-native');
const cron = require('cron');

const app = require('./app');
const dbinfo = require('./dbinfo');

const CronJob = cron.CronJob;
const db = app.db;

//const mapsKey = process.env.MAPS_KEY;
const timezone = 'America/New_York';

const updateEvents = () => updateCollectionFromResource('events', 'get_events', formatEvent);
const updateTeams = () => updateCollectionFromResource('teams', 'get_teams', formatTeam);
const updateMatches = () => updateCollectionFromResource('matches', 'get_matches', formatMatch);
const updateRankings = () => updateCollectionFromResource('rankings', 'get_rankings', formatRanking);
const updateAwards = () => updateCollectionFromResource('awards', 'get_awards', formatAward);
const updateSkills = () => updateCollectionFromResource('skills', 'get_skills', formatSkill);

const updateReTeams = () => {
	updateTeamsForSeason(1, 7);
	updateTeamsForSeason(4, 10);
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
	updateReTeams();
	//updateReEvents();
	//updateMaxSkills();
	//updateEvents();
	//updateTeams();
	//updateMatches();
	//updateRankings();
	//updateAwards();
	//updateSkills();
};

const updateTeamsInGroup = (program, season, teamGroup) => {
	const lat = teamGroup.position.lat;
	const lng = teamGroup.position.lng;

	request.post({url: 'https://www.robotevents.com/api/teams/getTeamsForLatLng', form: {when: 'past', programs: [program], season_id: season, lat: lat, lng: lng}, json: true}).then(teams => {
		/*const region = teams[0].name ? `|administrative_area:${teams[0].name}` : '';
		const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&components=locality:${teamGroup.city}${region}&key=${mapsKey}`;

		request.get({url: url, json: true}).then(location => {
			if (!location.error_message) {
				let city = '';
				let region = '';
				let country = '';

				location.results[0].address_components.forEach(addressComponent => {
					if (addressComponent.types.includes('locality')) {
						city = addressComponent.long_name;
					} else if (addressComponent.types.includes('administrative_area_level_1')) {
						region = addressComponent.long_name;
					} else if (addressComponent.types.includes('country')) {
						country = addressComponent.long_name;
					}
				});*/
				teams.map(team => formatReTeam(team, program, season == 119 || season == 120)).forEach(team => {
					/*if (city) {
						team.city = city;
					}
					if (region) {
						team.region = region;
					}
					if (country) {
						team.country = country;
					}*/
					db.collection('teams').updateOne(
						{_id: team._id},
						{$set: team},
						{upsert: true}
					).then(result => {
						if (result.upsertedCount) {
							console.log(`insert to teams: ${JSON.stringify(team)}`);
						} else if (result.modifiedCount) {
							console.log(`update to teams: ${JSON.stringify(team)}`);
						}
						//console.log('.');
					}).catch(console.error);
				});
			/*} else {
				console.error(location);
				updateTeamsInGroup(program, season, teamGroup);
			}
		}).catch(error => {
			console.error(error);
			updateTeamsInGroup(program, season, teamGroup);
		});*/
	}).catch(error => {
		console.error(error);
		updateTeamsInGroup(program, season, teamGroup);
	});
};

const updateEventsForSeason = season => {
	request.post({url: 'https://www.robotevents.com/api/events', form: {when: 'past', season_id: season}, json: true}).then(events => {
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
				//console.log('.');
			}).catch(console.error);
		});
	}).catch(console.error);
}

const updateTeamsForSeason = (program, season) => {
	request.post({url: 'https://www.robotevents.com/api/teams/latLngGrp', form: {when: 'past', programs: [program], season_id: season}, json: true}).then(teamGroups => {
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
	if (team.name) {
		document.region = team.name;
	}
	document.name = team.team_name;
	if (team.robot_name) {
		document.robot = team.robot_name;
	}
	if (/^([A-Z]+)$/i.test(team.team)) {
		document.grade = 'College';
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
	request.get({url: `https://www.robotevents.com/api/seasons/${season}/skills?untilSkillsDeadline=0`, json: true}).then(maxSkills => {
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
				//console.log('.');
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
	if (team.organisation) {
		document.org = team.organisation;
	}
	document.city = team.city;
	if (team.region && team.region != 'N/A' && team.region != 'Not Applicable or Not Listed') {
		document.region = team.region;
	}
	if (team.country) {
		document.country = team.country;
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
	updateMaxSkills: updateMaxSkills
};
