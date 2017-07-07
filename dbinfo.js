const programs = [
	'VIQC',
	'VRC',
	'VEXU',
	'CREATE'
];

const seasons = [
	'Bridge Battle',
	'Elevation',
	'Clean Sweep',
	'Round Up',
	'Gateway',
	'Sack Attack',
	'Toss Up',
	'Skyrise',
	'Nothing But Net',
	'Starstruck',
	'In The Zone'
];

const seasonUrls = [
	'http://roboticseducation.org/vrc-bridge-battle',
	'http://roboticseducation.org/vrc-elevation',
	'http://roboticseducation.org/vrc-clean-sweep',
	'http://roboticseducation.org/vrc-round-up',
	'http://roboticseducation.org/vrc-gateway',
	'http://roboticseducation.org/vrc-sack-attack',
	'http://roboticseducation.org/vrc-toss-up',
	'http://roboticseducation.org/vrc-skyrise',
	'http://roboticseducation.org/vrc-nothing-but-net',
	'http://roboticseducation.org/vrc-history-2016-2017-starstruck',
	'https://vexrobotics.com/vexedr/competition/vrc-current-game'
];

const grades = [
	'Elementary School',
	'Middle School',
	'High School',
	'College'
];

const tablesToColumns = {
	'events': {
		'sku': 'TEXT',
		'key': 'TEXT',
		'program': 'INTEGER',
		'name': 'TEXT',
		'loc_venue': 'TEXT',
		'loc_address1': 'TEXT',
		'loc_address2': 'TEXT',
		'loc_city': 'TEXT',
		'loc_region': 'TEXT',
		'loc_postalcode': 'TEXT',
		'loc_country': 'TEXT',
		'season': 'INTEGER',
		'start': 'INTEGER',
		'end': 'INTEGER',
		'divisions': 'TEXT'
	},
	'teams': {
		'number': 'TEXT',
		'program': 'INTEGER',
		'team_name': 'TEXT',
		'robot_name': 'TEXT',
		'organisation': 'TEXT',
		'city': 'TEXT',
		'region': 'TEXT',
		'country': 'TEXT',
		'grade': 'INTEGER',
		'is_registered': 'INTEGER'
	},
	'matches': {
		'sku': 'TEXT',
		'division': 'TEXT',
		'round': 'INTEGER',
		'instance': 'INTEGER',
		'matchnum': 'INTEGER',
		'field': 'TEXT',
		'red1': 'TEXT',
		'red2': 'TEXT',
		'red3': 'TEXT',
		'redsit': 'TEXT',
		'blue1': 'TEXT',
		'blue2': 'TEXT',
		'blue3': 'TEXT',
		'bluesit': 'TEXT',
		'redscore': 'INTEGER',
		'bluescore': 'INTEGER',
		'scored': 'INTEGER',
		'scheduled': 'INTEGER'
	},
	'rankings': {
		'sku': 'TEXT',
		'division': 'TEXT',
		'rank': 'INTEGER',
		'team': 'TEXT',
		'wins': 'INTEGER',
		'losses': 'INTEGER',
		'ties': 'INTEGER',
		'wp': 'INTEGER',
		'ap': 'INTEGER',
		'sp': 'INTEGER',
		'trsp': 'INTEGER',
		'max_score': 'INTEGER',
		'opr': 'REAL',
		'dpr': 'REAL',
		'ccwm': 'REAL'
	},
	'awards': {
		'sku': 'TEXT',
		'name': 'TEXT',
		'team': 'TEXT',
		'qualifies': 'TEXT',
		'order': 'INTEGER'
	},
	'skills': {
		'sku': 'TEXT',
		'type': 'INTEGER',
		'rank': 'INTEGER',
		'team': 'TEXT',
		'program': 'TEXT',
		'attempts': 'INTEGER',
		'score': 'INTEGER'
	}
};

const formatValues = {
	'events': event => [
		event.sku,
		event.key, programs.indexOf(
		event.program),
		event.name,
		event.loc_venue,
		event.loc_address1,
		event.loc_address2,
		event.loc_city,
		event.loc_region,
		event.loc_postalcode,
		event.loc_country, seasons.indexOf(
		event.season), Date.parse(
		event.start), Date.parse(
		event.end),
		event.divisions
	],
	'teams': team => [
		team.number, programs.indexOf(
		team.program),
		team.team_name,
		team.robot_name,
		team.organisation,
		team.city,
		team.region,
		team.country, grades.indexOf(
		team.grade),
		team.is_registered
	],
	'matches': match => [
		match.sku,
		match.division,
		match.round,
		match.instance,
		match.matchnum,
		match.field,
		match.red1,
		match.red2,
		match.red3,
		match.redsit,
		match.blue1,
		match.blue2,
		match.blue3,
		match.bluesit,
		match.redscore,
		match.bluescore,
		match.scored, Date.parse(
		match.scheduled)
	],
	'rankings': ranking => [
		ranking.sku,
		ranking.division,
		ranking.rank,
		ranking.team,
		ranking.wins,
		ranking.losses,
		ranking.ties,
		ranking.wp,
		ranking.ap,
		ranking.sp,
		ranking.trsp,
		ranking.max_score,
		ranking.opr,
		ranking.dpr,
		ranking.ccwm
	],
	'awards': award => [
		award.sku,
		award.name,
		award.team,
		award.qualifies,
		award.order
	],
	'skills': skill => [
		skill.sku,
		skill.type,
		skill.rank,
		skill.team, programs.indexOf(
		skill.program),
		skill.attempts,
		skill.score
	]
};

module.exports = {
	'programs': programs,
	'seasons': seasons,
	'seasonUrls': seasonUrls,
	'grades': grades,
	'tablesToColumns': tablesToColumns,
	'formatValues': formatValues
};
