const Discord = require('discord.js');
const http = require('http');
const request = require('request-promise-native');

const app = require('./app');
const dbinfo = require('./dbinfo');

const update = () => {
	updateEvents();
	updateTeams();
	updateMatches();
	updateRankings();
	updateAwards();
	updateSkills();
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
				maxSkill,
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
const formatTeam = team => ({
	_id: team.number,
	prog: encodeProgram(team.program),
	name: team.team_name,
	robot: team.robot_name,
	org: team.organisation,
	city: team.city,
	region: team.region,
	country: team.country,
	grade: encodeGrade(team.grade),
	registered: team.is_registered
});
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

const encodeProgram = program => dbinfo.programs.indexOf(program);
const encodeSeason = season => dbinfo.seasons.indexOf(season);
const encodeGrade = grade => dbinfo.grades.indexOf(grade);
const encodeDate = date => Date.parse(date);

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
						document,
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
