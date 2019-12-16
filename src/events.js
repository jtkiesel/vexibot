import { get } from 'axios';
import { load } from 'cheerio';
import { matrix, multiply } from 'mathjs';
import { CholeskyDecomposition, Matrix, pseudoInverse } from 'ml-matrix';
import { tz } from 'moment-timezone';
import tzlookup from 'tz-lookup';

import { db } from '.';
import * as vex from './vex';
import { decodeProgram, decodeSeason, decodeSkill, encodeEvent, encodeGrade, encodeProgram, encodeSkill, roundIndex, seasonToVexu } from './dbinfo';

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const guessSeason = async (program, date) => {
  let start = (new Date(date)).getFullYear();
  const seasonEnd = Date.parse(`5/15/${start}`);

  if (date < seasonEnd) {
    start--;
  }
  const season = await db.collection('seasons').findOne({program, start});
  return season ? season._id : 0;
};

const genders = [
  'both',
  'boys_only',
  'girls_only'
];

const encodeGenders = gender => genders.indexOf(gender);

const encodeBoolean = value => Boolean(value.toLowerCase() === 'yes');

const getTeam_id = (id, {season, program}) => {
  if (program === 1 && isNaN(id.charAt(0))) {
    console.warn(`Found VEXU ${id} in VRC event`);
    program = 4;
    season = seasonToVexu(season);
  }
  return {id, program, season};
};

const formatMatch = (match, event) => {
  if (event.program === 41) {
    return Object.assign({
      _id: {
        event: event._id,
        division: match.division,
        round: match.round,
        instance: match.instance,
        number: match.matchnum
      },
      season: event.season,
      program: event.program,
      teams: [match.red1, match.blue1].filter(team => team)
    },
    match.timescheduled && {scheduled: new Date(match.timescheduled)},
    match.timestarted && {started: new Date(match.timestarted)},
    match.redscore !== undefined && {score: match.redscore});
  }
  return Object.assign(
    {
      _id: {
        event: event._id,
        division: match.division,
        round: match.round,
        instance: match.instance,
        number: match.matchnum
      },
      season: event.season,
      program: event.program,
      red: [match.red1, match.red2, match.red3].filter(team => team),
      blue: [match.blue1, match.blue2, match.blue3].filter(team => team)
    },
    match.timescheduled && {scheduled: new Date(match.timescheduled)},
    match.timestarted && {started: new Date(match.timestarted)},
    match.redsit && match.red2 && {redSit: match.redsit},
    match.bluesit && match.blue2 && {blueSit: match.bluesit},
    match.redscore !== undefined && {
      redScore: match.redscore,
      blueScore: match.bluescore
    }
  );
};

const formatRanking = (ranking, event) => {
  const {division, rank, wins, losses, ties, wp, ap, sp, total_points, high_score} = ranking;
  const played = wins + losses + ties;
  return Object.assign({
    _id: {
      event: event._id,
      division,
      rank
    },
    team: getTeam_id(ranking.teamnum, event),
    played
  },
  event.program !== 41 && {
    wins,
    losses,
    ties,
    wp,
    ap,
    sp
  },
  played && {
    winPct: wins / played
  },
  total_points != null && played && {
    avgScore: total_points / played,
    totalScore: total_points
  },
  high_score != null && {
    highScore: high_score
  });
};

const getAwards = ($, event) => {
  const awardsTab = $('#tab-awards');
  let awardsHeaders = awardsTab.find('tr > th:contains(Team #)');
  let standardAwards = true;
  if (awardsHeaders.length === 0) {
    awardsHeaders = awardsTab.find('tr > td > :contains(Team #)');
    standardAwards = false;
  }
  let index = 0;
  const awards = awardsHeaders.parents('tr').toArray().map(awardsHeader => {
    let division, awards;
    if (standardAwards) {
      const awardsPanel = $(awardsHeader).parents('.panel').first();
      division = awardsPanel.find('.panel-heading').first().text().trim();
      awards = awardsPanel.find('tbody tr');
    } else {
      division = $(awardsHeader).prev().find('th').first().text().trim();
      awards = $(awardsHeader).nextUntil($('tr > th, tr > td:empty').closest('tr'));
    }
    return {division, awards};
  }).reduce((all, {division, awards}) => {
    return all.concat(awards.map((_, award) => {
      const [name, id] = $(award).find('td').slice(0, 2).map((_, field) => $(field).text().trim()).get();
      return {
        _id: {
          event: event._id,
          index: index++
        },
        division,
        name,
        team: getTeam_id(id, event)
      };
    }).get());
  }, []);
  awardsTab.find('tr > th:contains(Qualifies for)').parents('table').first().find('tbody tr').map((_, award) => {
    const [name, qualifyingEvents] = $(award).find('td').map((_, field) => $(field).text().trim()).get();
    const qualifies = qualifyingEvents.split('\n').reduce((filtered, event) => {
      if (event !== 'Does not qualify for any events.') {
        filtered.push(event.trim());
      }
      return filtered;
    }, []);
    const matchingAwards = awards.filter(award => award.name === name);
    if (!matchingAwards.length) {
      awards.push(Object.assign({
        _id: {
          event: event._id,
          index: index++
        },
        name
      },
      qualifies.length && {qualifies}));
    } else if (qualifies.length) {
      matchingAwards.forEach(award => award.qualifies = qualifies);
    }
  });
  return awards;
};

const matchCompare = (a, b) => {
  a = a._id;
  b = b._id;
  let sort = a.division - b.division;
  if (sort) {
    return sort;
  }
  sort = roundIndex(a.round) - roundIndex(b.round);
  if (sort) {
    return sort;
  }
  sort = a.instance - b.instance;
  if (sort) {
    return sort;
  }
  return a.number - b.number;
};

const updateSkillsAndTeams = async (skills, event) => {
  for (let index = 0; index < skills.length; index++) {
    const skill = skills[index];
    const teamReg = skill.team_reg;
    let team_id;
    if (teamReg) {
      team_id = {
        id: teamReg.team.team,
        program: teamReg.team.program_id,
        season: teamReg.season_id
      };
      const contact = Object.assign(
        {
          name: teamReg.contact1_name,
          phone: teamReg.contact1_phone1,
          email: teamReg.contact1_email1
        },
        teamReg.contact1_phone2 && {phone2: teamReg.contact1_phone2},
        teamReg.contact1_email2 && {email2: teamReg.contact1_email2}
      );
      const contact2 = Object.assign({},
        teamReg.contact2_name && {name: teamReg.contact2_name},
        teamReg.contact2_phone1 && {phone: teamReg.contact2_phone1},
        teamReg.contact2_email1 && {email: teamReg.contact2_email1},
        teamReg.contact2_phone2 && {phone2: teamReg.contact2_phone2},
        teamReg.contact2_email2 && {email2: teamReg.contact2_email2}
      );
      const finance = Object.assign(
        {
          name: teamReg.financial_name,
          phone: teamReg.financial_phone1,
          email: teamReg.financial_email1
        },
        teamReg.financial_phone2 && {phone2: teamReg.financial_phone2},
        teamReg.financial_email2 && {email2: teamReg.financial_email2}
      );
      const students = teamReg.num_students.match(/([0-9]+)-?(\+|[0-9]*)/);
      const team = Object.assign(
        {
          grade: teamReg.grade_level_id,
          name: teamReg.team_name,
          org: teamReg.organization
        },
        teamReg.robot_name && {robot: teamReg.robot_name},
        teamReg.lat && {lat: teamReg.lat},
        teamReg.lng && {lng: teamReg.lng},
        teamReg.address && {address: teamReg.address},
        teamReg.city && {city: teamReg.city},
        teamReg.postcode && {postcode: teamReg.postcode},
        teamReg.emergency_phone && {emergPhone: teamReg.emergency_phone},
        Object.keys(contact).length && {contact: contact},
        Object.keys(contact2).length && {contact2: contact2},
        Object.keys(finance).length && {finance: finance},
        students && {minStudents: parseInt(students[1]), maxStudents: (parseInt(students[2] ? students[2] : students[1]) || '+')},
        teamReg.special_needs && {specialNeeds: teamReg.special_needs},
        teamReg.sponsor && {sponsor: teamReg.sponsor},
        teamReg.other_programs && teamReg.other_programs[0] && {programs: teamReg.other_programs},
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
        teamReg.genders && {genders: encodeGenders(teamReg.genders)}
      );
      await db.collection('teams').updateOne({_id: team_id}, {$set: team}, {upsert: true}).catch(console.error);
    } else {
      team_id = getTeam_id(skill.team, event);
    }
    const update = {
      _id: {
        event: event._id,
        type: encodeSkill(skill.type),
        index
      },
      rank: skill.rank,
      team: team_id,
      score: skill.highscore,
      attempts: skill.attempts
    };
    const res = await db.collection('skills').findOneAndUpdate({_id: update._id}, {$set: update}, {upsert: true});
    const old = res.value;
    if (!old && update.attempts !== 0 || old && update.score !== old.score) {
      await vex.sendToSubscribedChannels(`New ${decodeSkill(update._id.type)} Skills score`, {embed: vex.createSkillsEmbed(update, event)}, [update.team]);
    }
  }
};

const getDivisions = $ => {
  const divisions = {};
  $('#results-content results').toArray().forEach(element => {
    const matches = $(element);
    const division = matches.attr('division');
    const key = matches.closest('.tab-pane').attr('id');
    divisions[division] = $(`#tab-results a[href=#${key}]`).last().remove().text().trim();
  });
  return divisions;
};

const getMatches = ($, event) => {
  return JSON.parse($('#results-content results').first().attr('data')).map(match => formatMatch(match, event));
};

const getRankings = ($, event) => {
  return JSON.parse($('#results-content rankings').first().attr('data')).map(ranking => formatRanking(ranking, event));
};

const getSkills = $ => {
  const skills = $('#results-content skills').attr('data');
  return skills ? JSON.parse(skills) : $('#results-content re-legacy-skills').map((_, skill) => JSON.parse(skill.attribs.data)).get().flat();
};

const updateMatchesAndRankings = async (matches, rankings, event) => {
  const alliancesMatrix = matrix();
  const scoresVector = [];
  const opponentScoresVector = [];
  const teamIndexes = {};
  let oprVector = [];
  let dprVector = [];
  let numTeams = 0;
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];

    if (match.program === 41) {
      const oprs = match.teams.map(team => team ? (oprVector[teamIndexes[team]] || 0) : 0);
      match.scorePred = Math.max(0, Math.round(oprs.reduce((sum, opr) => sum + opr)));

      let scored = true;
      if (match.score === 0) {
        if (match._id.round < 3) {  // Practice or qualification.
          if (matches.slice(index + 1).every(otherMatch => otherMatch.score === 0 || otherMatch._id.division !== match._id.division)) {
            scored = false;
          }
        } else {  // Elimination.
          const nextMatch = matches[index + 1];
          if (!nextMatch || nextMatch._id.division !== match._id.division || nextMatch._id.round !== match._id.round || nextMatch._id.instance !== match._id.instance) {
            scored = false;
          }
        }
      }
      let change;
      const unset = {};
      if (scored) {
        match.teams.forEach(team1 => {
          let index1;
          if (teamIndexes[team1] !== undefined) {
            index1 = teamIndexes[team1];
          } else {
            index1 = numTeams++;
            teamIndexes[team1] = index1;
            alliancesMatrix.resize([numTeams, numTeams]);
            scoresVector.push(0);
          }
          match.teams.forEach(team2 => {
            let index2;
            if (teamIndexes[team2] !== undefined) {
              index2 = teamIndexes[team2];
            } else {
              index2 = numTeams++;
              teamIndexes[team2] = index2;
              alliancesMatrix.resize([numTeams, numTeams]);
              scoresVector.push(0);
            }
            alliancesMatrix.set([index1, index2], alliancesMatrix.get([index1, index2]) + 1);
          });
          scoresVector[index1] += match.score;
        });
        change = 'scored';
      } else {
        change = 'scheduled';
        delete match.score;
        unset.score = '';
      }
      if (scoresVector.length) {
        const array = alliancesMatrix.toArray();
        const cholesky = new CholeskyDecomposition(array);
        if (cholesky.isPositiveDefinite()) {
          oprVector = cholesky.solve(Matrix.columnVector(scoresVector)).to1DArray();
        } else {
          oprVector = multiply(pseudoInverse(array).to2DArray(), scoresVector);
        }
      }
      let res;
      if (!Object.keys(unset).length) {
        res = await db.collection('matches').findOneAndUpdate({_id: match._id}, {$set: match}, {upsert: true}).catch(console.error);
      } else {
        res = await db.collection('matches').findOneAndUpdate({_id: match._id}, {$set: match, $unset: unset}, {upsert: true}).catch(console.error);
      }
      const old = res.value;
      try {
        if (old) {
          if (old.score === undefined && scored) {
            await vex.sendMatchEmbed('Match scored', match, event);
          } else if (old.score !== undefined && !scored) {
            await vex.sendMatchEmbed('Match score removed', old, event);
          } else if (match.score !== old.score) {
            await vex.sendMatchEmbed('Match score changed', match, event);
          }
        } else {
          await vex.sendMatchEmbed(`New match ${change}`, match, event);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      const [redOpr, blueOpr] = [match.red, match.blue].map(teams => teams.map(team => oprVector[teamIndexes[team]] || 0).sort((a, b) => b - a).slice(0, 2).reduce((sum, opr) => sum + opr, 0));

      match.redScorePred = Math.max(0, Math.round(redOpr));
      match.blueScorePred = Math.max(0, Math.round(blueOpr));

      let scored = true;
      if (match.redScore === 0 && match.blueScore === 0) {
        if (match._id.round < 3) {  // Practice or qualification.
          if (matches.slice(index + 1).every(otherMatch => otherMatch.redScore === 0 && otherMatch.blueScore === 0 || otherMatch._id.division !== match._id.division)) {
            scored = false;
          }
        } else {  // Elimination.
          const nextMatch = matches[index + 1];
          if (match.red.length > 2) {
            if (!match.redSit) {
              scored = false;
            }
          } else if (!nextMatch || nextMatch._id.division !== match._id.division || nextMatch._id.round !== match._id.round || nextMatch._id.instance !== match._id.instance) {
            scored = false;
          }
        }
      }
      let change;
      const unset = {};
      if (scored) {
        const red = {teams: match.red.filter(team => team && team !== match.redSit), score: match.redScore, opponentScore: match.blueScore};
        const blue = {teams: match.blue.filter(team => team && team !== match.blueSit), score: match.blueScore, opponentScore: match.redScore};
        [red, blue].forEach(alliance => {
          alliance.teams.forEach(team1 => {
            let index1;
            if (teamIndexes[team1] !== undefined) {
              index1 = teamIndexes[team1];
            } else {
              index1 = numTeams++;
              teamIndexes[team1] = index1;
              alliancesMatrix.resize([numTeams, numTeams]);
              scoresVector.push(0);
              opponentScoresVector.push(0);
            }
            alliance.teams.forEach(team2 => {
              let index2;
              if (teamIndexes[team2] !== undefined) {
                index2 = teamIndexes[team2];
              } else {
                index2 = numTeams++;
                teamIndexes[team2] = index2;
                alliancesMatrix.resize([numTeams, numTeams]);
                scoresVector.push(0);
                opponentScoresVector.push(0);
              }
              alliancesMatrix.set([index1, index2], alliancesMatrix.get([index1, index2]) + 1);
            });
            scoresVector[index1] += alliance.score;
            opponentScoresVector[index1] += alliance.opponentScore;
          });
        });
        change = 'scored';
      } else {
        change = 'scheduled';
        delete match.redScore;
        delete match.blueScore;
        unset.redScore = '';
        unset.blueScore = '';
      }
      if (scoresVector.length) {
        const array = alliancesMatrix.toArray();
        const cholesky = new CholeskyDecomposition(array);
        if (cholesky.isPositiveDefinite()) {
          oprVector = cholesky.solve(Matrix.columnVector(scoresVector)).to1DArray();
          dprVector = cholesky.solve(Matrix.columnVector(opponentScoresVector)).to1DArray();
        } else {
          const inverse = pseudoInverse(array).to2DArray();
          oprVector = multiply(inverse, scoresVector);
          dprVector = multiply(inverse, opponentScoresVector);
        }
      }
      let res;
      if (!Object.keys(unset).length) {
        res = await db.collection('matches').findOneAndUpdate({_id: match._id}, {$set: match}, {upsert: true}).catch(console.error);
      } else {
        res = await db.collection('matches').findOneAndUpdate({_id: match._id}, {$set: match, $unset: unset}, {upsert: true}).catch(console.error);
      }
      const old = res.value;
      try {
        if (old) {
          if (old.redScore === undefined && scored) {
            await vex.sendMatchEmbed('Match scored', match, event);
          } else if (old.redScore !== undefined && !scored) {
            await vex.sendMatchEmbed('Match score removed', old, event);
          } else if (old.redScore !== match.redScore || old.blueScore !== match.blueScore) {
            await vex.sendMatchEmbed('Match score changed', match, event);
          }
        } else {
          await vex.sendMatchEmbed(`New match ${change}`, match, event);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
  const maxRanks = {};
  for (const ranking of rankings) {
    if (ranking._id.rank > maxRanks[ranking._id.division]) {
      maxRanks[ranking._id.division] = ranking._id.rank;
    }
    const index = teamIndexes[ranking.team.id];
    if (index !== undefined) {
      const opr = oprVector[index] || 0;
      ranking.opr = opr;
      if (ranking.team.program !== 41) {
        const dpr = dprVector[index] || 0;
        ranking.dpr = dpr;
        ranking.ccwm = opr - dpr;
      }
    }
    await db.collection('rankings').replaceOne({_id: ranking._id}, ranking, {upsert: true});
  }
  for (const division of Object.keys(maxRanks)) {
    await db.collection('rankings').deleteMany({'_id.event': event._id, '_id.division': division, '_id.rank': {$gt: maxRanks[division]}});
  }
};

const getDates = ($, timezone) => {
  const locations = $('.tab-pane.active .panel:contains(Event Dates) .panel-body p:contains(Venue/Location)').toArray();
  if (locations.length) {
    return locations.map(element => {
      const location = $(element);
      const [start, end] = location.prev('p:contains(Date)').text().trim().match(/Date[^0-9A-Z]*(.*)/i)[1].split('-').map(date => tz(date, 'MM/DD/YYYY', timezone));
      const [, venue, address, city, region, postcode, country] = location.next('.well').text().match(/\s*(.+?)\s*\n\s*(?:(.+?)\s*\n\s*)?(.+?)\s*,\s*\n\s*(?:(.*?)\s*\n\s*)??(?:(.+?)\s*\n\s*)?(.+?)\s*\n\s*$/);
      return Object.assign({
        start: start.toDate(),
        end: (end || start).endOf('day').toDate()
      },
      venue && {venue},
      address && {address},
      city && {city},
      region && {region},
      postcode && {postcode},
      country && {country});
    });
  }
  return $('.tab-pane .row div:contains(Date:)').toArray().map(element => {
    const [, dates, venue, address, city, region, postcode, country] = $(element).text().match(/Date[^0-9A-Z]*(.*)\n\s*(.+?)\s*\n\s*(?:(.+?)\s*\n\s*)?(.+?)\s*,\s*\n\s*(?:(.*?)\s*\n\s*)??(?:(.+?)\s*\n\s*)?(.+?)\s*\n\s*$/i);
    const [start, end] = dates.split('-').map(date => tz(date, 'MM/DD/YYYY', timezone));
    return Object.assign({
      start: start.toDate(),
      end: (end || start).endOf('day').toDate()
    },
    venue && {venue},
    address && {address},
    city && {city},
    region && {region},
    postcode && {postcode},
    country && {country});
  });
};

const getEventData = async event => {
  const $ = load((await get(`https://www.robotevents.com/${event._id}.html`)).data);
  const {lat, lng} = event;
  let timezone;
  try {
    timezone = tzlookup(lat, lng);
  } catch (err) {
    console.error(`${event._id} timezone lookup error for ${lat}, ${lng}:`);
    console.error(err);
    timezone = 'America/New_York';
  }

  const teams = await Promise.all($('#teamList #data-table tbody tr').map(async (_, team) => {
    const [id, name, org, city, region, country] = $(team).find('td').map((index, field) => {
      switch (index) {
      case 0:
        return $(field).find('a').first().text().trim();
      case 1:
      case 2:
        return $(field).text().trim();
      case 3:
        return $(field).text().match(/^\s*(.+?),?\s*\n(?:\s*(.+?),\s*\n)?(?:\s*(.+?))?\s*$/).slice(1);
      }
    }).get();

    const _id = getTeam_id(id, event);
    const update = Object.assign({
      _id,
      city
    },
    name.length && {name},
    org.length && {org},
    region && {region},
    country && {country},
    _id.program === encodeProgram('VEXU') && {grade: encodeGrade('College')});

    await db.collection('teams').updateOne({_id: update._id}, {$set: update}, {upsert: true});

    return id;
  }).get());

  await updateSkillsAndTeams(getSkills($, event), event);

  const awards = getAwards($, event);
  for (const award of awards) {
    try {
      const result = await db.collection('awards').findOneAndReplace({_id: award._id}, award, {upsert: true});
      const oldAward = result.value;
      let change, teams;
      if (!oldAward && !award.team) {
        change = 'created';
      } else if (award.team) {
        if (!oldAward || !oldAward.team) {
          change = 'won';
        } else if (oldAward && (oldAward.team.id !== award.team.id)) {
          change = 'changed';
        }
        teams = [award.team];
      }
      if (change) {
        await vex.sendToSubscribedChannels(`Award ${change}`, {embed: vex.createAwardEmbed(award, event)}, teams);
      }
    } catch (err) {
      console.error(err);
    }
  }
  await db.collection('awards').deleteMany({'_id.event': event._id, '_id.index': {$gte: awards.length}});

  const divisions = getDivisions($);
  const matches = getMatches($, event).filter(match => divisions[match._id.division]).sort(matchCompare);
  const rankings = getRankings($, event);
  const dates = getDates($, timezone);

  const mainBody = $('#front-app .panel .panel-body').first();
  const type = mainBody.find('p:contains(Type of Event)').first().text().trim().match(/Type of Event:\s*(.+)/i)[1];
  const [capacity, spots] = mainBody.find('p:contains(Capacity)').first().text().trim().match(/Capacity.*?([0-9]+).*?Spots Open.*?([0-9]*(?:%\+-)?)/i).slice(1).map(val => isNaN(val) ? val : Number(val));
  const regPerOrg = mainBody.find('p:contains(Max Registrations per Organization)').first().text().trim().match(/[0-9]+/);
  const opens = mainBody.find('p:contains(Registration Opens)').first().text().trim().match(/Registration Opens[^0-9A-Z]*(.+)/i);
  const deadline = mainBody.find('p:contains(Registration Deadline)').first().text().trim().match(/Registration Deadline[^0-9A-Z]*(.+)/i);
  const price = mainBody.find('p:contains(Price)').first().text().trim().match(/Price[^.0-9]*([.0-9]+)/i);

  const general = $('.tab-pane.active').first();
  const grade = general.find('p:contains(Grade Level)').first().text().match(/Grade Level[^A-Z]*(.+)/i);
  const skills = general.find('p:contains(Robot Skills Challenge Offered)').first().text().match(/Robot Skills Challenge Offered[^A-Z]*(.+)/i);
  const tsa = general.find('p:contains(TSA Event)').first().text().match(/TSA Event[^A-Z]*(.+)/i);

  const eventObject = Object.assign(event,
    {
      type: encodeEvent(type),
      capacity,
      spots,
      price: price ? Number(price[1]) : 0,
      grade: grade ? encodeGrade(grade[1]) : 0
    },
    regPerOrg && {regPerOrg: Number(regPerOrg[0])},
    opens && {opens: new Date(opens[1])},
    deadline && {deadline: new Date(deadline[1])},
    dates.length && {dates},
    skills && {skills: encodeBoolean(skills[1])},
    tsa && {tsa: encodeBoolean(tsa[1])},
    teams.length && {teams},
    Object.keys(divisions).length && {divisions}
  );
  return {
    event: eventObject,
    matches,
    rankings
  };
};

const updateEvent = async (eventObject, timeout = 1000) => {
  try {
    const {event, matches, rankings} = await getEventData(eventObject);
    await updateMatchesAndRankings(matches, rankings, event);

    const filter = {_id: event._id};
    const update = {$set: event};
    const oldEvent = await db.collection('events').findOne(filter, {projection: {_id: 0, email: 1, phone: 1, webcast: 1}});
    if (oldEvent) {
      const unset = {};
      if (!event.email) {
        unset.email = '';
      }
      if (!event.phone) {
        unset.phone = '';
      }
      if (!event.webcast) {
        unset.webcast = '';
      }
      if (Object.keys(unset).length) {
        update.$unset = unset;
      }
    }
    await db.collection('events').updateOne(filter, update, {upsert: true});
    if (!oldEvent) {
      try {
        await vex.sendToSubscribedChannels('Event created', {embed: vex.createEventEmbed(event)});
      } catch (err) {
        console.error(err);
      }
      console.log(`${decodeProgram(event.program)} ${event._id} created for ${decodeSeason(event.season)}`);
    }
  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.log(`${eventObject._id} is not an event.`);
      db.collection('events').deleteOne({_id: eventObject._id});
    } else {
      console.error(`${eventObject._id} failed to update:`);
      console.error(err);
      try {
        await sleep(timeout);
        console.log(`Retrying ${eventObject._id}`);
        await updateEvent(eventObject, timeout * 2);
      } catch (err) {
        console.error(err);
      }
    }
  }
};

export {
  updateEvent
};
