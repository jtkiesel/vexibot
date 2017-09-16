const request = require('request-promise-native');
const he = require('he');

const app = require('./app');
const vex = require('./vex');
const dbinfo = require('./dbinfo');

const db = app.db;
const validTeamId = vex.validTeamId;
const getTeamLocation = vex.getTeamLocation;
const createTeamEmbed = vex.createTeamEmbed;
const createTeamChangeEmbed = vex.createTeamChangeEmbed;
const createMatchEmbed = vex.createMatchEmbed;
const createAwardEmbed = vex.createAwardEmbed;
const createSkillsEmbed = vex.createSkillsEmbed;
const sendToSubscribedChannels = vex.sendToSubscribedChannels;
const sendMatchEmbed = vex.sendMatchEmbed;
const encodeProgram = dbinfo.encodeProgram;
const encodeGrade = dbinfo.encodeGrade;
const decodeSkill = dbinfo.decodeSkill;
const roundIndex = dbinfo.roundIndex;

const genders = [
	'both',
	'boys_only',
	'girls_only'
];

const encodeGenders = gender => genders.indexOf(gender);

const decodeGenders = gender => genders[gender];

const getEvent = (result, sku) => {
	const name = result.match(/<h3\s+class="panel-title\s+col-sm-6">\s*(.+?)\s*<\/h3>/);
	const totalDates = result.match(/<span\s+class="pull-right text-right col-sm-6">\s*(.+?)(?: - (.+?))?\s*<\/span>/);
	const type = result.match(/Type of Event\s*<\/strong>[^A-Za-z]*(.+?)[^A-Za-z]*<\/p>/);
	const capacity = result.match(/Capacity<\/strong>[^0-9]*(.+?)[^0-9]*(.+?)[^0-9]*<\/p>/);
	const orgLimit = result.match(/Max Registrations per Organization<\/strong>[^0-9]*(.+?)[^0-9]*<\/p>/);
	const deadline = result.match(/Registration Deadline<\/strong>[^0-9A-Za-z]*(.+?)[^0-9A-Za-z]*<\/p>/);
	const cost = result.match(/Price<\/strong>[^0-9A-Z]*(.+?)[^0-9A-Z]*<\/p>/);

	const datesRegex = /Date:\s*(.+?)(?:[^/0-9]+(.+?))?\s*<\/p>\s*<p>\s*Venue\/Location:\s*<div\s+class="well well-sm">\s*(.+?)\s*<br>\s*(?:(.+?)\s*<br>\s*)?(.+?)\s*,\s*(?:(.*?)\s+)??(?:(.+?)\s*<br>\s*)?(.+?)\s*<br>/g;
	const dates = [];
	let regex, start, end, venue, address, city, region, postcode, country;
	while (regex = datesRegex.exec(result)) {
		[regex, start, end, venue, address, city, region, postcode, country] = regex;
		dates.push(Object.assign({
			start: Date.parse(start),
			end: Date.parse(end ? end : start) + 86399999
		},
			venue && {venue: he.decode(venue)},
			address && {address: he.decode(address)},
			city && {city: he.decode(city)},
			region && {region: he.decode(region)},
			postcode && {postcode: he.decode(postcode)},
			country && {country: he.decode(country)}));
	}
	return Object.assign({
		_id: sku,
		name: he.decode(name[1]),
		start: Date.parse(totalDates[1]),
		end: Date.parse(totalDates[2] ? totalDates[2] : totalDates[1]) + 86399999,
		dates: dates,
		type: type[1],
		size: Number.parseInt(capacity[1]),
		capacity: Number.parseInt(capacity[2]),
		cost: (!cost || cost[1] === 'FREE') ? 0 : Math.round(Number.parseFloat(cost[1]) * 100),
	},
		orgLimit && {orgLimit: Number.parseInt(orgLimit[1])},
		deadline && {deadline: Date.parse(deadline[1])});
};

const formatMatch = (match, event, division) => {
	return Object.assign({
		_id: {
			event: event,
			division: division,
			round: match.round,
			instance: match.instance,
			number: match.matchnum
		}
	},
		match.timescheduled && {start: Date.parse(match.timescheduled)},
		match.red1 && {red: match.red1},
		match.red2 && {red2: match.red2},
		match.red3 && {red3: match.red3},
		match.blue1 && {blue: match.blue1},
		match.blue2 && {blue2: match.blue2},
		match.blue3 && {blue3: match.blue3},
		match.hasOwnProperty('redscore') && {redScore: match.redscore},
		match.hasOwnProperty('bluescore') && {blueScore: match.bluescore},
		match.redsit && match.red2 && {redSit: match.redsit},
		match.bluesit && match.blue2 && {blueSit: match.bluesit});
};

const formatRanking = (ranking, event, division) => {
	return Object.assign({
		_id: {
			event: event,
			division: division,
			team: ranking.teamnum
		},
		rank: ranking.rank,
		wins: ranking.wins,
		losses: ranking.losses,
		ties: ranking.ties,
		wp: ranking.wp,
		ap: ranking.ap,
		sp: ranking.sp
	},
		ranking.numplayed !== null && {played: ranking.numplayed},
		ranking.win_percentage !== null && {winPct: ranking.win_percentage},
		ranking.average_points !== null && {avgScore: ranking.average_points},
		ranking.total_points !== null && {totalPoints: ranking.total_points},
		ranking.high_score !== null && {highScore: ranking.high_score});
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

const updateEvent = async (prog, sku, retried = false) => {
	try {
		const result = await request.get({url: `https://www.robotevents.com/${sku}.html`});
		const event = getEvent(result, sku);

		let teamList = result.match(/<div\s+class="tab-pane"\s+id="teamList">(\s|.)+?<\/div>/);
		if (teamList) {
			teamList = teamList[0];
		}
		const teamsRegex = /<tr>\s*<td>\s*((?:[0-9]{1,5}[A-Z]?)|(?:[A-Z]{2,6}[0-9]{0,2}))\s*<\/td>\s*<td>\s*(.+?)\s*<\/td>\s*<td>\s*(.+?)\s*<\/td>\s*<td>\s*(?:(.+?),?)?[\t ]*[\n\r][\t ]*(?:(.+?),?)?[\t ]*[\n\r][\t ]*(.+?)?\s*<\/td>\s*<\/tr>/gi;
		const teams = [];
		let regex, id, name, org, city, region, country;
		while (regex = teamsRegex.exec(teamList)) {
			[regex, id, name, org, city, region, country] = regex;
			const program = (prog === 1 || prog === 4) ? (isNaN(id.charAt(0)) ? 4 : 1) : prog;

			teams.push(Object.assign({_id: {prog: program, id: id}},
				name && {name: he.decode(name)},
				org && {org: he.decode(org)},
				city && {city: he.decode(city)},
				region && {region: he.decode(region)},
				country && {country: he.decode(country)},
				program === encodeProgram('VEXU') && {grade: encodeGrade('College')}));
		}
		const awardsRegex = /<tr>\s*<td>\s*(.+?)\s*<\/td>\s*<td>\s*((?:[0-9]{1,5}[A-Z]?)|(?:[A-Z]{2,6}[0-9]{0,2}))\s*<\/td>\s*<td>\s*(.+?)\s*<\/td>\s*<td>\s*(.+?)\s*<\/td>\s*<td>\s*(.+?)\s*<\/td>\s*<\/tr>/gi;
		const awards = [];
		const awardInstances = {};
		while (regex = awardsRegex.exec(result)) {
			const name = regex[1];
			const id = regex[2];
			const instance = awardInstances[name] || 0;
			const program = (prog === 1 || prog === 4) ? (isNaN(id.charAt(0)) ? 4 : 1) : prog;

			awardInstances[name] = instance + 1;
			awards.push(Object.assign({_id: {event: sku, name: name, instance: instance}},
				validTeamId(id) && {team: {prog: program, id: id}}
			));
		}
		const qualifiesRegex = /<tr>\s*<td\s+style="text-align:center">\s*(.+?)\s*<\/td>\s*<td\s+style="text-align:left">((?:\s|.)*?)<\/tr>/g;
		const awardRegex = /\s*(.+?)\s*<br>/g;
		while (regex = qualifiesRegex.exec(result)) {
			const name = regex[1];
			const qualifiesString = regex[2];
			const qualifies = [];
			while (regex = awardRegex.exec(qualifiesString)) {
				const eventName = regex[1];
				const qualifiesEvent = await db.collection('events').findOne({prog: prog, name: eventName});
				if (qualifiesEvent) {
					qualifies.push(qualifiesEvent._id);
				}
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
		const skillsData = result.match(/<skills\s+event=".+?"\s+data="(.+?)"\s*>/);
		if (skillsData) {
			JSON.parse(he.decode(skillsData[1])).forEach(skillData => {
				const teamReg = skillData.team_reg;
				const _id = {
					prog: teamReg.team.program_id,
					id: teamReg.team.team
				};
				skills.push({
					_id: {
						event: sku,
						type: skillData.type,
						team: _id
					},
					rank: skillData.rank,
					score: skillData.highscore,
					attempts: skillData.attempts
				});
				for (let i = 0; i < teams.length; i++) {
					if (teams[i]._id.prog === _id.prog && teams[i]._id.id === _id.id) {
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
							{name: teamReg.team_name},
							{org: teamReg.organization},
							teamReg.robot_name && {robot: teamReg.robot_name},
							teamReg.address && {address: teamReg.address},
							teamReg.city && {city: teamReg.city},
							teamReg.postcode && {postcode: teamReg.postcode},
							teamReg.emergency_phone && {emergPhone: teamReg.emergency_phone},
							Object.keys(contact).length && {contact: contact},
							Object.keys(contact2).length && {contact2: contact2},
							Object.keys(finance).length && {finance: finance},
							students && {minStudents: Number.parseInt(students[1]), maxStudents: (Number.parseInt(students[2] ? students[2] : students[1]) || '+')},
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
							teamReg.team_experience && {exp: Number.parseInt(teamReg.team_experience) || 0},
							teamReg.lat && {lat: teamReg.lat},
							teamReg.lng && {lng: teamReg.lng},
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
		const resultsRegex = /id="(.+?)">\s*<div\s+class="row">\s*<div\s+class="col-md-8">\s*<h4>Match Results<\/h4>\s*<results\s+program=".+?"\s+division="([0-9]+)"\s+event=".+?"\s+data="(.+?)"(?:\s|.)*?>(?:\s|.)*?data="(.+?)"/g;
		const divisionNumberToName = {};
		while (regex = resultsRegex.exec(result)) {
			const divisionName = divisionIdToName[regex[1]];
			const divisionNumber = Number.parseInt(regex[2]);

			divisionNumberToName[divisionNumber] = divisionName;

			const played = {};
			JSON.parse(he.decode(regex[4])).filter(ranking => ranking.division === divisionNumber).map(ranking => formatRanking(ranking, sku, divisionName)).forEach(async ranking => {
				played[ranking._id.team] = ranking.wins + ranking.losses + ranking.ties;
				try {
					const res = await db.collection('rankings').updateOne({_id: ranking._id}, {$set: ranking}, {upsert: true});
				} catch (err) {
					console.error(err);
				}
			});
			const matches = JSON.parse(he.decode(regex[3])).filter(match => match.division === divisionNumber).map(match => formatMatch(match, sku, divisionName)).sort(matchCompare);
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
						let reactions = vex.matchScoredEmojis;
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
					await sendToSubscribedChannels('New team registered', {embed: createTeamEmbed(team)}, [team._id]);
					console.log(createTeamEmbed(team).fields);
				} else {
					if (team.city !== old.city || team.region !== old.region || team.country !== old.country) {
						const unset = Object.assign({},
							!team.city && {city: ''},
							!team.region && {region: ''},
							!team.country && {country: ''});
						if (Object.keys(unset).length) {
							try {
								const res2 = await db.collection('teams').findOneAndUpdate({_id: team._id}, {$unset: unset});
								await sendToSubscribedChannels(null, {embed: createTeamChangeEmbed(program, teamId, 'location', getTeamLocation(old), getTeamLocation(team))}, [team._id]);
								console.log(createTeamChangeEmbed(program, teamId, 'location', getTeamLocation(old), getTeamLocation(team)).description);
							} catch (err) {
								console.error(err);
							}
						} else {
							await sendToSubscribedChannels(null, {embed: createTeamChangeEmbed(program, teamId, 'location', getTeamLocation(old), getTeamLocation(team))}, [team._id]);
							console.log(createTeamChangeEmbed(program, teamId, 'location', getTeamLocation(old), getTeamLocation(team)).description);
						}
					}
					if (team.name !== old.name) {
						await sendToSubscribedChannels(null, {embed: createTeamChangeEmbed(program, teamId, 'team name', old.name, team.name)}, [team._id]);
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
						await sendToSubscribedChannels(null, {embed: createTeamChangeEmbed(program, teamId, 'robot name', old.robot, team.robot)}, [team._id]);
						console.log(createTeamChangeEmbed(program, teamId, 'robot name', old.robot, team.robot).description);
					}
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
				const program = (prog === 1 || prog === 4) ? (isNaN(id.charAt(0)) ? 4 : 1) : prog;
				const team = {prog: program, id: award.team};
				const res = await db.collection('awards').findOneAndUpdate({_id: award._id}, {$set: award}, {upsert: true});
				const old = res.value;
				let change;
				if (!old) {
					if (award.team) {
						change = 'won';
					} else {
						change = 'added';
					}
					await sendToSubscribedChannels(`Award ${change}`, {embed: createAwardEmbed(award)}, [team]);
					console.log(createAwardEmbed(award).fields);
				} else {
					if (!old.team && award.team) {
						await sendToSubscribedChannels('Award won', {embed: createAwardEmbed(award)}, [team]);
						console.log(createAwardEmbed(award).fields);
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
				if (!old || skill.score != old.score) {
					await sendToSubscribedChannels(`New ${decodeSkill(skill._id.type)} Skills score`, {embed: createSkillsEmbed(skill)}, [skill._id.team]);
					console.log(createSkillsEmbed(award).fields);
				}
			} catch (err) {
				console.error(err);
			}
		}
	} catch (err) {
		console.error(err);
		if (!retried) {
			console.log(`Retrying ${sku}`);
			try {
				await updateEvent(prog, sku, true);
			} catch (err) {
				console.error(err);
			}
		} else {
			console.log (`*** WARNING: ALREADY RETRIED ${sku}, GIVING UP ***`);
		}
	}
};

module.exports = {
	updateEvent: updateEvent
};
