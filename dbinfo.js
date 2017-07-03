const tablesToColumns = {
	'events': {
		'sku': 'TEXT',
		'key': 'TEXT',
		'program': 'TEXT',
		'name': 'TEXT',
		'loc_venue': 'TEXT',
		'loc_address1': 'TEXT',
		'loc_address2': 'TEXT',
		'loc_city': 'TEXT',
		'loc_region': 'TEXT',
		'loc_postalcode': 'TEXT',
		'loc_country': 'TEXT',
		'season': 'TEXT',
		'start': 'INTEGER',
		'end': 'INTEGER',
		'divisions': 'TEXT'
	},
	'teams': {
		'number': 'TEXT',
		'program': 'TEXT',
		'team_name': 'TEXT',
		'robot_name': 'TEXT',
		'organisation': 'TEXT',
		'city': 'TEXT',
		'region': 'TEXT',
		'country': 'TEXT',
		'grade': 'TEXT',
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
	'events': event => {
		var values = [
			event.sku,
			event.key,
			event.program,
			event.name,
			event.loc_venue,
			event.loc_address1,
			event.loc_address2,
			event.loc_city,
			event.loc_region,
			event.loc_postalcode,
			event.loc_country,
			event.season
		];
		values.push.apply(values, [
			event.start,
			event.end
		].map(formatDateTime));
		values.push(
			event.divisions
		);
		return values;
	},
	'teams': team => {
		var values = [
			team.number,
			team.program,
			team.team_name,
			team.robot_name,
			team.organisation,
			team.city,
			team.region,
			team.country,
			team.grade,
			team.is_registered
		];
		return values;
	},
	'matches': match => {
		var values = [
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
			match.scored
		];
		values.push(formatDateTime(
			match.scheduled
		));
		return values;
	},
	'rankings': ranking => {
		var values = [
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
		];
		return values;
	},
	'awards': award => {
		var values = [
			award.sku,
			award.name,
			award.team,
			award.qualifies,
			award.order
		];
		return values;
	},
	'skills': skill => {
		var values = [
			skill.sku,
			skill.type,
			skill.rank,
			skill.team,
			skill.program,
			skill.attempts,
			skill.score
		];
		return values;
	}
};

var formatDateTime = value => Date.parse(value);

module.exports = {
	'tablesToColumns': tablesToColumns,
	'formatValues': formatValues,
	''
};
