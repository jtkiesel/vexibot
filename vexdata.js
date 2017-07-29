const Discord = require('discord.js');
const request = require('request-promise-native');

const app = require('./app');
const dbinfo = require('./dbinfo');

const mapsKey = process.env.MAPS_KEY;

const update = () => {
	//updateReTeams();
	//updateEvents();
	//updateTeams();
	//updateMatches();
	//updateRankings();
	//updateAwards();
	//updateSkills();
};

const updateReTeams = () => {
	updateTeamsForSeason(1, 119);
	updateTeamsForSeason(4, 120);
	/*[{_id: 1, seasons: [119, 115, 110, 102, 92, 85, 73, 7, 1]},
		{_id: 4, seasons: [120, 116, 111, 103, 93, 88, 76, 10, 4]}].forEach(program => {
		const seasons = program.seasons.sort((a, b) => a - b);
		for (let i = 0; i < seasons.length; i++) {
			const when = i < (seasons.length - 1) ? 'past' : 'future';
			updateTeamsForSeason(when, program, seasons[i]);
		}
	});*/
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
					app.db.collection('teams').updateOne(
						{_id: team._id},
						{$set: team},
						{upsert: true}
					).then(result => {
						if (result.upsertedCount) {
							console.log(`insert to teams: ${JSON.stringify(team)}`);
						} else if (result.modifiedCount) {
							console.log(`update to teams: ${JSON.stringify(team)}`);
						}
						console.log('.');
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
	document.registered = registered;
	return document;
};

const updateMaxSkills = () => {
	app.db.collection('programs').find().project({_id: 0, seasons: 1}).forEach(program => {
		program.seasons.forEach(season => updateMaxSkillsForSeason(season));
	});
};

const updateMaxSkillsForSeason = season => {
	request.get({url: `https://www.robotevents.com/api/seasons/${season}/skills?untilSkillsDeadline=0`, json: true}).then(maxSkills => {
		maxSkills.map(maxSkill => formatMaxSkill(maxSkill, season)).forEach(maxSkill => {
			app.db.collection('maxSkills').updateOne(
				{_id: maxSkill._id},
				{$set: maxSkill},
				{upsert: true}
			).then(result => {
				if (result.upsertedCount) {
					console.log(`insert to maxSkills: ${JSON.stringify(maxSkill)}`);
				} else if (result.modifiedCount) {
					console.log(`update to maxSkills: ${JSON.stringify(maxSkill)}`);
				}
			}).catch(console.error);
		});
	}).catch(error => {});
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
	document.team.grade = maxSkill.team.gradeLevel;
	document.event = {
		sku: maxSkill.event.sku,
		start: encodeDate(maxSkill.event.startDate)
	};
	document.scores = {
		score: maxSkill.scores.score,
		prog: maxSkill.scores.programming,
		driver: maxSkill.scores.driver,
		maxProg: maxSkill.scores.maxProgramming,
		maxDriver: maxSkill.scores.maxDriver
	};
	return document;
};

const updateProgramsAndSeasons = () => {
	request.get({url: 'https://www.robotevents.com/api/programs', json: true}).then(programs => {
		programs.map(formatProgram).forEach(program => {
			const seasons = JSON.parse(JSON.stringify(program.seasons));
			const seasonIds = program.seasons.map(season => season._id);
			delete program.seasons;
			app.db.collection('programs').updateOne(
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
					app.db.collection('seasons').updateOne(
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

const updateEvents = () => updateCollectionFromResource('events', 'get_events', formatEvent);
const updateTeams = () => updateCollectionFromResource('teams', 'get_teams', formatTeam);
const updateMatches = () => updateCollectionFromResource('matches', 'get_matches', formatMatch);
const updateRankings = () => updateCollectionFromResource('rankings', 'get_rankings', formatRanking);
const updateAwards = () => updateCollectionFromResource('awards', 'get_awards', formatAward);
const updateSkills = () => updateCollectionFromResource('skills', 'get_skills', formatSkill);

const formatEvent = event => ({
	_id: event.sku,
	prog: encodeProgram(event.program),
	name: event.name,
	venue: event.loc_venue,
	addr1: event.loc_address1,
	addr2: event.loc_address2,
	city: event.loc_city,
	region: event.loc_region,
	postal: event.loc_postalcode,
	country: event.loc_country,
	season: encodeSeason(event.season),
	start: encodeDate(event.start),
	end: encodeDate(event.end),
	divs: event.divisions
});
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
	if (team.region) {
		document.region = team.region;
	}
	if (team.country) {
		document.country = team.country;
	}
	document.grade = encodeGrade(team.grade);
	document.registered = encodeRegistered(team.is_registered);
	return document;
};
const formatMatch = match => ({
	_id: {
		sku: match.sku,
		div: match.division,
		round: match.round,
		instance: match.instance,
		num: match.matchnum
	},
	field: match.field,
	red1: match.red1,
	red2: match.red2,
	red3: match.red3,
	redSit: match.redsit,
	blue1: match.blue1,
	blue2: match.blue2,
	blue3: match.blue3,
	blueSit: match.bluesit,
	redScore: match.redscore,
	blueScore: match.bluescore,
	scored: match.scored,
	start: encodeDate(match.scheduled)
});
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
const formatAward = award => ({
	_id: {
		sku: award.sku,
		name: award.name,
		team: award.team
	},
	quals: award.qualifies
});
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

const encodeProgram = program => vexDbProgramToId[program];
const encodeSeason = season => dbinfo.seasons.indexOf(season);
const encodeGrade = grade => dbinfo.grades.indexOf(grade);
const encodeDate = date => Date.parse(date);
const encodeRegistered = registered => Boolean(registered);

const updateCollectionFromResource = (collection, resource, formatFunc) => {
	updateCollectionFromResourceBatch(collection, resource, formatFunc, 0);
};

const updateCollectionFromResourceBatch = (collection, resource, formatFunc, startIndex) => {
	request.get({url: `https://api.vexdb.io/v1/${resource}?limit_start=${startIndex}`, json: true}).then(body => {
		if (body.status) {
			if (body.size) {
				body.result.map(formatFunc).forEach(document => {
					app.db.collection(collection).updateOne(
						{_id: document._id},
						{$set: document},
						{upsert: true}
					).then(result => {
						if (result.upsertedCount) {
							console.log(`insert to ${collection}: ${JSON.stringify(document)}`);
						} else if (result.modifiedCount) {
							console.log(`update to ${collection}: ${JSON.stringify(document)}`);
						}
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
