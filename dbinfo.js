const vexdbHost = 'api.vexdb.io';

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

module.exports = {
	vexdbHost: vexdbHost,
	programs: programs,
	seasons: seasons,
	seasonUrls: seasonUrls,
	grades: grades
};
