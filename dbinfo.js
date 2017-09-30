const programToId = {
	'VRC': 1,
	'VEXU': 4,
	'CREATE': 37,
	'WORKSHOP': 40,
	'VIQC': 41
};

const idToProgram = {
	1: 'VRC',
	4: 'VEXU',
	37: 'CREATE',
	40: 'WORKSHOP',
	41: 'VIQC'
};

const seasonToId = {
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
	'In the Zone': 119
};

const idToSeason = {
	'-4': 'Bridge Battle',
	'-3': 'Elevation',
	'-2': 'Elevation',
	'1': 'Clean Sweep',
	'4': 'Clean Sweep',
	'7': 'Round Up',
	'10': 'Round Up',
	'73': 'Gateway',
	'76': 'Gateway',
	'85': 'Sack Attack',
	'88': 'Sack Attack',
	'92': 'Toss Up',
	'93': 'Toss Up',
	'102': 'Skyrise',
	'103': 'Skyrise',
	'110': 'Nothing But Net',
	'111': 'Nothing But Net',
	'115': 'Starstruck',
	'116': 'Starstruck',
	'119': 'In the Zone',
	'120': 'In the Zone'
};

const idToSeasonUrl = {
	'-4': 'http://roboticseducation.org/vrc-bridge-battle',
	'-3': 'http://roboticseducation.org/vrc-elevation',
	'-2': 'http://roboticseducation.org/vrc-elevation',
	'1': 'http://roboticseducation.org/vrc-clean-sweep',
	'4': 'http://roboticseducation.org/vrc-clean-sweep',
	'7': 'http://roboticseducation.org/vrc-round-up',
	'10': 'http://roboticseducation.org/vrc-round-up',
	'73': 'http://roboticseducation.org/vrc-gateway',
	'76': 'http://roboticseducation.org/vrc-gateway',
	'85': 'http://roboticseducation.org/vrc-sack-attack',
	'88': 'http://roboticseducation.org/vrc-sack-attack',
	'92': 'http://roboticseducation.org/vrc-toss-up',
	'93': 'http://roboticseducation.org/vrc-toss-up',
	'102': 'http://roboticseducation.org/vrc-skyrise',
	'103': 'http://roboticseducation.org/vrc-skyrise',
	'110': 'http://roboticseducation.org/vrc-nothing-but-net',
	'111': 'http://roboticseducation.org/vrc-nothing-but-net',
	'115': 'http://roboticseducation.org/vrc-history-2016-2017-starstruck',
	'116': 'http://roboticseducation.org/vrc-history-2016-2017-starstruck',
	'119': 'https://vexrobotics.com/vexedr/competition/vrc-current-game',
	'120': 'https://vexrobotics.com/vexedr/competition/vrc-current-game'
};

const grades = [
	'All',
	'Elementary',
	'Middle School',
	'High School',
	'College'
];

const rounds = {
	1: 'P',
	2: 'Q',
	9: 'R128',
	8: 'R64',
	7: 'R32',
	6: 'R16',
	3: 'QF',
	4: 'SF',
	5: 'F'
};

const roundKeys = [1, 2, 9, 8, 7, 6, 3, 4, 5];

const encodeSkills = ['programming', 'driver'];

const decodeSkills = ['Programming', 'Driver'];

const encodeProgram = program => programToId[program];

const decodeProgram = program => idToProgram[program];

const decodeSeason = id => idToSeason[id];

const decodeSeasonUrl = id => idToSeasonUrl[id];

const encodeGrade = grade => grades.indexOf(grade);

const decodeGrade = grade => grades[grade];

const decodeRound = round => rounds[round];

const roundIndex = round => roundKeys.indexOf(round);

const encodeSkill = type => encodeSkills.indexOf(type);

const decodeSkill = type => decodeSkills[type];

const seasons = Object.keys(idToSeasonUrl).map(season => Number.parseInt(season));

const seasonToVexu = season => season === -4 ? null : seasons[seasons.indexOf(season) + 1];

module.exports = {
	programToId: programToId,
	idToProgram: idToProgram,
	seasonToId: seasonToId,
	idToSeason: idToSeason,
	decodeSeason: decodeSeason,
	idToSeasonUrl: idToSeasonUrl,
	decodeSeasonUrl: decodeSeasonUrl,
	grades: grades,
	encodeProgram: encodeProgram,
	decodeProgram: decodeProgram,
	encodeGrade: encodeGrade,
	decodeGrade: decodeGrade,
	decodeRound: decodeRound,
	decodeSkill: decodeSkill,
	encodeSkill: encodeSkill,
	decodeSkill: decodeSkill,
	roundIndex: roundIndex,
	seasonToVexu: seasonToVexu
};
