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
	'In the Zone': 119,
	'Turning Point': 125
};

const idToSeason = {
	'-4': 'Bridge Battle',
	'-3': 'Elevation',
	'-2': 'Elevation',
	'-1': 'Rings-n-Things',
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
	'96': 'Add It Up',
	'101': 'Highrise',
	'102': 'Skyrise',
	'103': 'Skyrise',
	'109': 'Bank Shot',
	'110': 'Nothing But Net',
	'111': 'Nothing But Net',
	'114': 'Crossover',
	'115': 'Starstruck',
	'116': 'Starstruck',
	'119': 'In the Zone',
	'120': 'In the Zone',
	'121': 'Ringmaster',
	'124': 'Next Level',
	'125': 'Turning Point',
	'126': 'Turning Point'
};

const idToSeasonUrl = {
	'-4': 'https://roboticseducation.org/vrc-bridge-battle',
	'-3': 'https://roboticseducation.org/vrc-elevation',
	'-2': 'https://roboticseducation.org/vrc-elevation',
	'-1': 'https://roboticseducation.org/viqc-rings-n-things',
	'1': 'https://roboticseducation.org/vrc-clean-sweep',
	'4': 'https://roboticseducation.org/vrc-clean-sweep',
	'7': 'https://roboticseducation.org/vrc-round-up',
	'10': 'https://roboticseducation.org/vrc-round-up',
	'73': 'https://roboticseducation.org/vrc-gateway',
	'76': 'https://roboticseducation.org/vrc-gateway',
	'85': 'https://roboticseducation.org/vrc-sack-attack',
	'88': 'https://roboticseducation.org/vrc-sack-attack',
	'92': 'https://roboticseducation.org/vrc-toss-up',
	'93': 'https://roboticseducation.org/vrc-toss-up',
	'96': 'https://roboticseducation.org/viqc-add-it-up',
	'101': 'https://roboticseducation.org/viqc-highrise',
	'102': 'https://roboticseducation.org/vrc-skyrise',
	'103': 'https://roboticseducation.org/vrc-skyrise',
	'109': 'https://roboticseducation.org/viqc-bank-shot',
	'110': 'https://roboticseducation.org/vrc-nothing-but-net',
	'111': 'https://roboticseducation.org/vrc-nothing-but-net',
	'114': 'https://roboticseducation.org/viqc-crossover',
	'115': 'https://roboticseducation.org/vrc-history-2016-2017-starstruck',
	'116': 'https://roboticseducation.org/vrc-history-2016-2017-starstruck',
	'119': 'https://roboticseducation.org/vrc-history-2017-2018-in-the-zone',
	'120': 'https://roboticseducation.org/vrc-history-2017-2018-in-the-zone',
	'121': 'https://roboticseducation.org/vex-iq-challenge-history-2017-2018-ringmaster',
	'124': 'https://vexrobotics.com/vexiq/competition/viqc-current-game',
	'125': 'https://vexrobotics.com/vexedr/competition/vrc-current-game',
	'126': 'https://vexrobotics.com/vexedr/competition/vrc-current-game'
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
	5: 'F',
	15: 'F'
};

const roundKeys = [1, 2, 9, 8, 7, 6, 3, 4, 5, 15];

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

const seasons = Object.keys(idToSeason).map(season => parseInt(season));

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
