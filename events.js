const request = require('request-promise-native');
const he = require('he');

const app = require('./app');
const vex = require('./vex');
const dbinfo = require('./dbinfo');

const db = app.db;
const validTeamId = vex.validTeamId;
const getTeam = vex.getTeam;
const getTeamLocation = vex.getTeamLocation;
const createTeamEmbed = vex.createTeamEmbed;
const createTeamChangeEmbed = vex.createTeamChangeEmbed;
const createEventEmbed = vex.createEventEmbed;
const createMatchEmbed = vex.createMatchEmbed;
const createSkillsEmbed = vex.createSkillsEmbed;
const createAwardEmbed = vex.createAwardEmbed;
const sendToSubscribedChannels = vex.sendToSubscribedChannels;
const sendMatchEmbed = vex.sendMatchEmbed;
const encodeProgram = dbinfo.encodeProgram;
const encodeGrade = dbinfo.encodeGrade;
const encodeSkill = dbinfo.encodeSkill;
const decodeSkill = dbinfo.decodeSkill;
const roundIndex = dbinfo.roundIndex;
const seasonToVexu = dbinfo.seasonToVexu;

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const guessSeason = async (prog, date) => {
	let year = (new Date(date)).getFullYear();
	const seasonEnd = Date.parse(`5/15/${year}`);

	if (date < seasonEnd) {
		year--;
	}
	const season = await db.collection('seasons').findOne({prog: prog, years: new RegExp(`^${year}`)});
	return season ? season._id : 0;
};

const genders = [
	'both',
	'boys_only',
	'girls_only'
];

const encodeGenders = gender => genders.indexOf(gender);

const decodeGenders = gender => genders[gender];

const encodeDate = date => Date.parse(`${date} EDT`);

const encodeBoolean = value => Boolean(value.toLowerCase() === 'yes');

const encodeText = value => he.decode(value.trim().replace(/\s\s*/g, ' '));

const getEvent = (result, sku) => {
	const name = result.match(/<h3\s+class="panel-title\s+col-sm-6">\s*(.+?)\s*<\/h3>/);
	const totalDates = result.match(/<span\s+class="pull-right text-right col-sm-6">\s*(.+?)(?: - (.+?))?\s*<\/span>/);
	const type = result.match(/Type of Event\s*<\/strong>[^A-Z]*(.+?)[^A-Z]*<\/p>/i);
	const capacity = result.match(/Capacity<\/strong>[^0-9]*(.+?)[^0-9]*(.+?)[^0-9]*<\/p>/);
	const orgLimit = result.match(/Max Registrations per Organization<\/strong>[^0-9]*(.+?)[^0-9]*<\/p>/);
	const opens = result.match(/Registration Opens<\/strong>[^0-9A-Z]*(.+?)[^0-9A-Z]*<\/p>/i);
	const deadline = result.match(/Registration Deadline<\/strong>[^0-9A-Z]*(.+?)[^0-9A-Z]*<\/p>/i);
	const cost = result.match(/Price<\/strong>[^0-9A-Z]*(.+?)[^0-9A-Z]*<\/p>/i);
	const grade = result.match(/Grade Level[^A-Z]*(.+?)[^A-Z]*<\/p>/i);
	const skills = result.match(/Robot Skills Challenge Offered[^A-Z]*(.+?)[^A-Z]*<\/p>/i);
	const tsa = result.match(/TSA Event[^A-Z]*(.+?)[^A-Z]*<\/p>/i);

	const datesRegex = /Date:\s*(.+?)(?:[^/0-9]+(.+?))?\s*<\/p>\s*<p>\s*Venue\/Location:\s*<div\s+class="well well-sm">\s*(.+?)\s*<br>\s*(?:(.+?)\s*<br>\s*)?(.+?)\s*,\s*(?:(.*?)\s+)??(?:(.+?)\s*<br>\s*)?(.+?)\s*<br>/g;
	const dates = [];
	let regex, start, end, venue, address, city, region, postcode, country;
	while (regex = datesRegex.exec(result)) {
		[regex, start, end, venue, address, city, region, postcode, country] = regex;
		dates.push(Object.assign({
			start: encodeDate(start),
			end: encodeDate(end ? end : start) + 86399999
		},
			venue && {venue: encodeText(venue)},
			address && {address: encodeText(address)},
			city && {city: encodeText(city)},
			region && {region: encodeText(region)},
			postcode && {postcode: encodeText(postcode)},
			country && {country: encodeText(country)}));
	}
	return Object.assign({
		_id: sku,
		name: encodeText(name[1]),
		start: encodeDate(totalDates[1]),
		end: encodeDate(totalDates[2] ? totalDates[2] : totalDates[1]) + 86399999,
		dates: dates,
		type: type[1],
		size: parseInt(capacity[1]),
		capacity: parseInt(capacity[2]),
		cost: (!cost || cost[1].toLowerCase() === 'free') ? 0 : Math.round(parseFloat(cost[1]) * 100),
		grade: encodeGrade(grade ? grade[1] : 'All'),
		skills: encodeBoolean(skills[1]),
		tsa: encodeBoolean(tsa[1])
	},
		orgLimit && {orgLimit: parseInt(orgLimit[1])},
		opens && {opens: Date.parse(opens[1])},
		deadline && {deadline: Date.parse(deadline[1])});
};

const formatMatch = (match, event, division) => {
	return Object.assign({
		_id: {
			event: event._id,
			division: division,
			round: match.round,
			instance: match.instance,
			number: match.matchnum
		},
		prog: event.prog,
		season: event.season
	},
		match.timescheduled && {start: Date.parse(match.timescheduled)},
		match.red1 && {red: match.red1},
		match.red2 && {red2: match.red2},
		match.red3 && {red3: match.red3},
		match.blue1 && {blue: match.blue1},
		match.blue2 && {blue2: match.blue2},
		match.blue3 && {blue3: match.blue3},
		match.redsit && match.red2 && {redSit: match.redsit},
		match.bluesit && match.blue2 && {blueSit: match.bluesit},
		match.hasOwnProperty('redscore') && {redScore: match.redscore},
		match.hasOwnProperty('bluescore') && {blueScore: match.bluescore});
};

const formatRanking = (ranking, event, division, prog, season) => {
	if (prog == 1 && isNaN(ranking.teamnum.charAt(0))) {
		prog = 4;
		season = seasonToVexu(season);
	}
	return Object.assign({
		_id: {
			event: event,
			division: division,
			team: {
				id: ranking.teamnum,
				prog: prog,
				season: season
			}
		},
		rank: ranking.rank,
		wins: ranking.wins,
		losses: ranking.losses,
		ties: ranking.ties,
		wp: ranking.wp,
		ap: ranking.ap,
		sp: ranking.sp
	},
		ranking.numplayed != null && {played: ranking.numplayed},
		ranking.win_percentage != null && {winPct: ranking.win_percentage},
		ranking.average_points != null && {avgScore: ranking.average_points},
		ranking.total_points != null && {totalPoints: ranking.total_points},
		ranking.high_score != null && {highScore: ranking.high_score});
};

const matchCompare = (a, b) => {
	a = a._id;
	b = b._id;
	let sort = roundIndex(a.round) - roundIndex(b.round);
	if (sort) {
		return sort;
	}
	sort = a.instance - b.instance;
	if (sort) {
		return sort;
	}
	return a.number - b.number;
};

const updateEvent = async (prog, season, sku, timeout = 1000) => {
	try {
		const result = await request.get({url: `https://www.robotevents.com/${sku}.html`});
		const event = getEvent(result, sku);
		const foundSeason = result.match(/season_id&quot;:([0-9]+)/);
		const guessedSeason = await guessSeason(prog, event.deadline ? event.deadline : event.start);

		if (foundSeason) {
			season = parseInt(foundSeason[1]);
			console.log(`Found season for ${sku}: ${season}`);
		}
		if (!season) {
			season = guessedSeason;
			console.log(`Guessed season for ${sku}: ${season}`);
		} else if (season !== guessedSeason) {
			console.log(`***WARNING***: ${sku} HAS DIFFERENT SEASON (${season}) THAN GUESSED SEASON ${guessedSeason}!!`);
		}
		event.prog = prog;
		event.season = season;

		let teamList = result.match(/<div\s+class="tab-pane"\s+id="teamList">(\s|.)+?<\/div>/);
		if (teamList) {
			teamList = teamList[0];
		}
		const teamsRegex = /<tr>\s*<td>\s*((?:[0-9]{1,5}[A-Z]?)|(?:[A-Z]{2,6}[0-9]{0,2}))\s*<\/td>\s*<td>\s*(.+?)\s*<\/td>\s*<td>\s*(.+?)\s*<\/td>\s*<td>\s*(.+?),?\s*[\n\r](?:(.+?),\s*[\n\r])?(?:(.+?))?\s*<\/td>\s*<\/tr>/gi;
		const teams = [];
		let regex, id, name, org, city, region, country;
		while (regex = teamsRegex.exec(teamList)) {
			[regex, id, name, org, city, region, country] = regex;
			let program;
			let teamSeason;
			if (prog === 1 && isNaN(id.charAt(0))) {
				program = 4;
				teamSeason = seasonToVexu(season);
			} else {
				program = prog;
				teamSeason = season;
			}
			teams.push(Object.assign({_id: {id: id, prog: program, season: teamSeason}},
				name && {name: encodeText(name)},
				org && {org: encodeText(org)},
				city && {city: encodeText(city)},
				region && {region: encodeText(region)},
				country && {country: encodeText(country)},
				program === encodeProgram('VEXU') && {grade: encodeGrade('College')}));
		}
		const awardsRegex = /<tr>\s*<td>\s*([^<>]+?)\s*<\/td>\s*<td>\s*((?:[0-9]{1,5}[A-Z]?)|(?:[A-Z]{2,6}[0-9]{0,2}))\s*<\/td>\s*<td>\s*(.+?)\s*<\/td>\s*<td>\s*(.+?)\s*<\/td>\s*<td>\s*(.+?)\s*<\/td>\s*<\/tr>/gi;
		const awards = [];
		const awardInstances = {};
		while (regex = awardsRegex.exec(result)) {
			const name = regex[1];
			const id = regex[2];
			const instance = awardInstances[name] || 0;
			let program;
			let teamSeason;
			if (prog === 1 && isNaN(id.charAt(0))) {
				program = 4;
				teamSeason = seasonToVexu(season);
			} else {
				program = prog;
				teamSeason = season;
			}
			awardInstances[name] = instance + 1;
			awards.push({
				_id: {
					event: sku,
					name: name,
					instance: instance
				},
				team: {
					id: id,
					prog: program,
					season: season
				}
			});
		}
		const qualifiesRegex = /<tr>\s*<td\s+style="text-align:center">\s*(.+?)\s*<\/td>\s*<td\s+style="text-align:left">((?:\s|.)*?)<\/tr>/g;
		const awardRegex = /\s*(.+?)\s*<br>/g;
		while (regex = qualifiesRegex.exec(result)) {
			const name = regex[1];
			const qualifiesString = regex[2];
			const qualifies = [];
			while (regex = awardRegex.exec(qualifiesString)) {
				const eventName = encodeText(regex[1]);
				const qualifiesEvent = await db.collection('events').findOne({prog: prog, season: season, name: eventName});
				qualifies.push(qualifiesEvent ? qualifiesEvent._id : eventName);
			}
			if (qualifies.length) {
				let found = false;
				awards.forEach(award => {
					if (award._id.name === name) {
						found = true;
						award.qualifies = qualifies;
					}
				});
				if (!found) {
					awards.push({_id: {event: sku, name: name, instance: 0}});
				}
			}
		}
		const skills = [];
		let skillsData = result.match(/<skills\s+event=".+?"\s+data="(.+?)"/);
		if (skillsData) {
			skillsData = JSON.parse(he.decode(skillsData[1]));
		} else {
			skillsData = [];
			const skillsRegex = /<re-legacy-skills\s+type=".+?"\s+event=".+?"\s+data="(.+?)"/g;
			while (regex = skillsRegex.exec(result)) {
				skillsData = skillsData.concat(JSON.parse(he.decode(regex[1])));
			}
		}
		if (skillsData) {
			skillsData.forEach((skillData, i) => {
				const teamReg = skillData.team_reg;
				const _id = {
					id: teamReg.team.team,
					prog: teamReg.team.program_id,
					season: teamReg.season_id
				};
				skills.push({
					_id: {
						event: sku,
						type: encodeSkill(skillData.type),
						index: i
					},
					rank: skillData.rank,
					team: _id,
					score: skillData.highscore,
					attempts: skillData.attempts
				});
				for (let i = 0; i < teams.length; i++) {
					if (teams[i]._id.id === _id.id) {
						const contact = Object.assign({
							name: teamReg.contact1_name,
							phone: teamReg.contact1_phone1,
							email: teamReg.contact1_email1
						},
							teamReg.contact1_phone2 && {phone2: teamReg.contact1_phone2},
							teamReg.contact1_email2 && {email2: teamReg.contact1_email2});
						const contact2 = Object.assign({},
							teamReg.contact2_name && {name: teamReg.contact2_name},
							teamReg.contact2_phone1 && {phone: teamReg.contact2_phone1},
							teamReg.contact2_email1 && {email: teamReg.contact2_email1},
							teamReg.contact2_phone2 && {phone2: teamReg.contact2_phone2},
							teamReg.contact2_email2 && {email2: teamReg.contact2_email2});
						const finance = Object.assign({
							name: teamReg.financial_name,
							phone: teamReg.financial_phone1,
							email: teamReg.financial_email1
						},
							teamReg.financial_phone2 && {phone2: teamReg.financial_phone2},
							teamReg.financial_email2 && {email2: teamReg.financial_email2});
						const students = teamReg.num_students.match(/([0-9]+)-?(\+|[0-9]*)/);
						Object.assign(teams[i],
							{grade: teamReg.grade_level_id},
							{name: encodeText(teamReg.team_name)},
							{org: encodeText(teamReg.organization)},
							teamReg.robot_name && {robot: encodeText(teamReg.robot_name)},
							teamReg.lat && {lat: teamReg.lat},
							teamReg.lng && {lng: teamReg.lng},
							teamReg.address && {address: encodeText(teamReg.address)},
							teamReg.city && {city: encodeText(teamReg.city)},
							teamReg.postcode && {postcode: encodeText(teamReg.postcode)},
							teamReg.emergency_phone && {emergPhone: teamReg.emergency_phone},
							Object.keys(contact).length && {contact: contact},
							Object.keys(contact2).length && {contact2: contact2},
							Object.keys(finance).length && {finance: finance},
							students && {minStudents: parseInt(students[1]), maxStudents: (parseInt(students[2] ? students[2] : students[1]) || '+')},
							teamReg.special_needs && {specialNeeds: teamReg.special_needs},
							teamReg.sponsor && {sponsor: teamReg.sponsor},
							teamReg.other_programs && teamReg.other_programs[0] && {progs: teamReg.other_programs},
							teamReg.about_team && {aboutTeam: teamReg.about_team},
							teamReg.about_sponsor && {aboutSponsor: teamReg.about_sponsor},
							teamReg.about_season && {aboutSeason: teamReg.about_season},
							teamReg.reason && {reason: teamReg.reason},
							teamReg.cad_software && teamReg.cad_software[0] && {cad: teamReg.cad_software},
							teamReg.cnt_students_male !== null && {males: teamReg.cnt_students_male},
							teamReg.cnt_students_female !== null && {females: teamReg.cnt_students_female},
							teamReg.cnt_teachers !== null && {teachers: teamReg.cnt_teachers},
							teamReg.cnt_mentors !== null && {mentors: teamReg.cnt_mentors},
							teamReg.team_experience && {exp: parseInt(teamReg.team_experience) || 0},
							teamReg.prior_competition && {rookie: teamReg.prior_competition === 0},
							teamReg.genders && {genders: encodeGenders(teamReg.genders)});
						break;
					}
				}
			});
		}
		const divisionsRegex = /<a\s+href="#(.+?)"\s+role="tab"\s+data-toggle="tab">\s*(.+?)\s*</g;
		const divisionIdToName = {};
		while (regex = divisionsRegex.exec(result)) {
			divisionIdToName[regex[1]] = he.decode(regex[2]);
		}
		const resultsRegex = /id="(.+?)">\s*<div\s+class="row">\s*<div\s+class="col-md-8">\s*<h4>Match Results<\/h4>\s*<results\s+program=".+?"\s+division="([0-9]+)"\s+event=".+?"\s+data="(.+?)"(?:\s|.)*?data="(.+?)"/g;
		const divisionNumberToName = {};
		while (regex = resultsRegex.exec(result)) {
			const divisionName = divisionIdToName[regex[1]];
			const divisionNumber = parseInt(regex[2]);

			divisionNumberToName[divisionNumber] = divisionName;

			const played = {};
			JSON.parse(he.decode(regex[4])).filter(ranking => ranking.division === divisionNumber).map(ranking => formatRanking(ranking, sku, divisionName, prog, season)).forEach(async ranking => {
				//played[ranking._id.team] = ranking.wins + ranking.losses + ranking.ties;
				try {
					const res = await db.collection('rankings').updateOne({_id: ranking._id}, {$set: ranking}, {upsert: true});
				} catch (err) {
					console.error(err);
				}
			});
			const matches = JSON.parse(he.decode(regex[3])).filter(match => match.division === divisionNumber).map(match => formatMatch(match, event, divisionName)).sort(matchCompare);
			/*matches.forEach(match => {
				if (match._id.round === 2 && (match.redScore || match.blueScore)) {
					[match.red, match.red2, match.red3, match.blue, match.blue2, match.blue3].forEach(team => {
						if (team) {
							played[team]--;
						}
					});
				}
			});*/
			for (let i = 0; i < matches.length; i++) {
				const match = matches[i];
				const nextMatch = matches[i + 1];
				//const nextRound = match._id.round === 6 ? 3 : match._id.round + (match._id.round > 6 ? -1 : 1);
				const unset = {};
				let scored = true;
				if (match.redScore === 0 && match.blueScore === 0) {
					if (match._id.round < 3) {  // Practice or qualification.
						if (matches.slice(i + 1).every(otherMatch => otherMatch.redScore === 0 && otherMatch.blueScore === 0)) {
							scored = false;
						}
					/*} else if (match._id.round === 2) {  // Qualification.
						if ([match.red, match.red2, match.red3, match.blue, match.blue2, match.blue3].every(team => !team || --played[team] < 0)) {
							scored = false;
						}*/
					} else {  // Elimination.
						if (match.red3) {
							if (!match.redSit) {
								scored = false;
							}
						} else if (!nextMatch || nextMatch._id.round !== match._id.round || nextMatch._id.instance !== match._id.instance) {
							scored = false;
						} /*else if (matches._id.round !== 5 && matches.some(otherMatch => otherMatch._id.round === nextRound)) {
							scored = false;
						}*/
					}
				}
				let change, reactions;
				if (scored) {
					change = 'scored';
					reactions = vex.matchScoredEmojis;
				} else {
					change = 'scheduled';
					reactions = vex.matchScheduledEmojis;
					delete match.redScore;
					delete match.blueScore;
					unset.redScore = '';
					unset.blueScore = '';
				}
				try {
					let res;
					if (!Object.keys(unset).length) {
					 	res = await db.collection('matches').findOneAndUpdate({_id: match._id}, {$set: match}, {upsert: true});
					} else {
						res = await db.collection('matches').findOneAndUpdate({_id: match._id}, {$set: match, $unset: unset}, {upsert: true});
					}
					const old = res.value;
					if (!old) {
						await sendMatchEmbed(`New match ${change}`, match, reactions);
						console.log(createMatchEmbed(match).fields);
					} else {
						const oldScored = old.hasOwnProperty('redScore');
						if (!oldScored && scored) {
							await sendMatchEmbed('Match scored', match, reactions);
							console.log(createMatchEmbed(match).fields);
						} else if (oldScored && !scored) {
							await sendMatchEmbed('Match score removed', old, reactions);
							console.log(createMatchEmbed(match).fields);
						} else if (match.redScore !== old.redScore || match.blueScore !== old.blueScore) {
							await sendMatchEmbed('Match score changed', match, reactions);
							console.log(createMatchEmbed(match).fields);
						}
					}
				} catch (err) {
					console.error(err);
				}
			}
		}
		event.divisions = Object.keys(divisionNumberToName).sort((a, b) => a - b).map(divisionNumber => divisionNumberToName[divisionNumber]);

		if (teams.length) {
			event.teams = teams.map(team => team._id.id);
		}
		try {
			const res = await db.collection('events').findOneAndUpdate({_id: event._id}, {$set: event}, {upsert: true});
			const old = res.value;
			if (!old) {
				try {
					await sendToSubscribedChannels('New event', {embed: createEventEmbed(event)});
					console.log(createEventEmbed(event).fields);
				} catch (err) {
					console.error(err);
				}
			}
		} catch (err) {
			console.error(err);
		}
		for (let team of teams) {
			try {
				const program = team._id.prog;
				const teamId = team._id.id;
				const res = await db.collection('teams').findOneAndUpdate({_id: team._id}, {$set: team}, {upsert: true});
				const old = res.value;
				if (!old) {
					try {
						if ((await getTeam(teamId)).length === 1) {
							await sendToSubscribedChannels('New team registered', {embed: createTeamEmbed(team)}, [{prog: program, id: teamId}]);
						}
						console.log(createTeamEmbed(team).fields);
					} catch (err) {
						console.error(err);
					}
				} else {
					if (team.city !== old.city || team.region && team.region !== old.region || team.country && team.country !== old.country) {
						const unset = Object.assign({},
							!team.city && {city: ''},
							!team.region && {region: ''},
							!team.country && {country: ''});
						if (Object.keys(unset).length) {
							try {
								const res2 = await db.collection('teams').findOneAndUpdate({_id: team._id}, {$unset: unset});
								console.log(createTeamChangeEmbed(program, teamId, 'location', getTeamLocation(old), getTeamLocation(team)).description);
							} catch (err) {
								console.error(err);
							}
						} else {
							console.log(createTeamChangeEmbed(program, teamId, 'location', getTeamLocation(old), getTeamLocation(team)).description);
						}
					}
					if (team.name !== old.name) {
						console.log(createTeamChangeEmbed(program, teamId, 'team name', old.name, team.name).description);
					}
					if (team.hasOwnProperty('robot') && team.robot !== old.robot) {
						if (!team.robot) {
							try {
								const res2 = await db.collection('teams').findOneAndUpdate({_id: team._id}, {$unset: {robot: ''}});
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
		}
		for (let skill of skills) {
			try {
				const res = await db.collection('skills').findOneAndUpdate({_id: skill._id}, {$set: skill}, {upsert: true});
				const old = res.value;
				if (!old && skill.attempts !== 0 || old && skill.score !== old.score) {
					const embed = await createSkillsEmbed(skill);
					await sendToSubscribedChannels(`New ${decodeSkill(skill._id.type)} Skills score`, {embed: embed}, [skill._id.team]);
					console.log(embed.fields);
				}
			} catch (err) {
				console.error(err);
			}
		}
		for (let award of awards) {
			const unset = Object.assign({},
				!award.team && {team: ''},
				!award.qualifies && {qualifies: ''});
			try {
				let res;
				if (!Object.keys(unset).length) {
					res = await db.collection('awards').findOneAndUpdate({_id: award._id}, {$set: award}, {upsert: true});
				} else {
					res = await db.collection('awards').findOneAndUpdate({_id: award._id}, {$set: award, $unset: unset}, {upsert: true});
				}
				const old = res.value;
				let change;
				if (!old) {
					let teamArray;
					if (award.team) {
						change = 'won';
						teamArray = [{prog: award.team.prog, id: award.team.id}];
					} else {
						change = 'added';
						teamArray = [];
					}
					const embed = await createAwardEmbed(award);
					await sendToSubscribedChannels(`Award ${change}`, {embed: embed}, teamArray);
				} else if (!old.team && award.team) {
					const embed = await createAwardEmbed(award);
					await sendToSubscribedChannels('Award won', {embed: embed}, [{prog: award.team.prog, id: award.team.id}]);
				}
			} catch (err) {
				console.error(err);
			}
		}
	} catch (err) {
		if (err.statusCode === 404) {
			console.log(`${sku} is not an event.`);
		} else {
			console.error(err);
			try {
				await sleep(timeout);
				console.log(`Retrying ${sku}.`);
				await updateEvent(prog, season, sku, timeout * 2);
			} catch (err) {
				console.error(err);
			}
		}
	}
};

module.exports = {
	updateEvent: updateEvent
};
