const Discord = require('discord.js');
const http = require('http');

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

const updateEvents = () => updateCollectionFromResource('events', 'get_events', formatEvent);
const updateTeams = () => updateCollectionFromResource('teams', 'get_teams', formatTeam);
const updateMatches = () => updateCollectionFromResource('matches', 'get_matches', formatMatch);
const updateRankings = () => updateCollectionFromResource('rankings', 'get_rankings', formatRanking);
const updateAwards = () => updateCollectionFromResource('awards', 'get_awards', formatAward);
const updateSkills = () => updateCollectionFromResource('skills', 'get_skills', formatSkill);

const formatEvent = event => ({
	_id: event.sku,
	sku: event.sku,
	key: event.key,
	program: formatProgram(event.program),
	name: event.name,
	loc_venue: event.loc_venue,
	loc_address1: event.loc_address1,
	loc_address2: event.loc_address2,
	loc_city: event.loc_city,
	loc_region: event.loc_region,
	loc_postalcode: event.loc_postalcode,
	loc_country: event.loc_country,
	season: formatSeason(event.season),
	start: formatDate(event.start),
	end: formatDate(event.end),
	divisions: event.divisions
});
const formatTeam = team => ({
	_id: team.number,
	number: team.number,
	program: formatProgram(team.program),
	team_name: team.team_name,
	robot_name: team.robot_name,
	organisation: team.organisation,
	city: team.city,
	region: team.region,
	country: team.country,
	grade: formatGrade(team.grade),
	is_registered: team.is_registered
});
const formatMatch = match => ({
	_id: `${match.sku}-${match.division}-${match.round}-${match.instance}-${match.matchnum}`,
	sku: match.sku,
	division: match.division,
	round: match.round,
	instance: match.instance,
	matchnum: match.matchnum,
	field: match.field,
	red1: match.red1,
	red2: match.red2,
	red3: match.red3,
	redsit: match.redsit,
	blue1: match.blue1,
	blue2: match.blue2,
	blue3: match.blue3,
	bluesit: match.bluesit,
	redscore: match.redscore,
	bluescore: match.bluescore,
	scored: match.scored,
	scheduled: formatDate(match.scheduled)
});
const formatRanking = ranking => ({
	_id: `${ranking.sku}-${ranking.division}-${ranking.team}`,
	sku: ranking.sku,
	division: ranking.division,
	rank: ranking.rank,
	team: ranking.team,
	wins: ranking.wins,
	losses: ranking.losses,
	ties: ranking.ties,
	wp: ranking.wp,
	ap: ranking.ap,
	sp: ranking.sp,
	trsp: ranking.trsp,
	max_score: ranking.max_score,
	opr: ranking.opr,
	dpr: ranking.dpr,
	ccwm: ranking.ccwm
});
const formatAward = award => ({
	_id: `${award.sku}-${award.name}-${award.team}`,
	sku: award.sku,
	name: award.name,
	team: award.team,
	qualifies: award.qualifies
});
const formatSkill = skill => ({
	_id: `${skill.sku}-${skill.type}-${skill.team}`,
	sku: skill.sku,
	type: skill.type,
	rank: skill.rank,
	team: skill.team,
	program: formatProgram(skill.program),
	attempts: skill.attempts,
	score: skill.score
});

const formatProgram = program => dbinfo.programs.indexOf(program);
const formatSeason = season => dbinfo.seasons.indexOf(season);
const formatGrade = grade => dbinfo.grades.indexOf(grade);
const formatDate = date => Date.parse(date);

const updateCollectionFromResource = (collection, resource, formatFunc) => {
	updateCollectionFromResourceBatch(collection, resource, formatFunc, 0);
};

const updateCollectionFromResourceBatch = (collection, resource, formatFunc, startIndex) => {
	http.request({
		host: dbinfo.vexdbHost,
		path: `/v1/${resource}?limit_start=${startIndex}`
	}, response => {
		let body = '';

		response.on('data', chunk => body += chunk);

		response.on('end', () => {
			body = JSON.parse(body);
			if (body.status) {
				if (body.size) {
					body.result.map(formatFunc).forEach(document => {
						app.db.collection(collection).updateOne(
							{_id: document._id},
							document,
							{upsert: true}
						).then(result => {
							if (result.upsertedCount) {
								//console.log(`insert to ${collection}: ${JSON.stringify(document)}`);
							} else if (result.modifiedCount) {
								//console.log(`update to ${collection}: ${JSON.stringify(document)}`);
							}
						}).catch(console.error);
					});
					updateCollectionFromResourceBatch(collection, resource, formatFunc, startIndex + body.size);
				}
			} else {
				console.error(`Error: VEXDB_ERROR: ${body.error_text} errno: ${body.error_code}`);
			}
		});
	}).end();
};

module.exports = {
	update: update
};
