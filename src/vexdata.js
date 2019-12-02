import { get, post } from 'axios';
import { load } from 'cheerio';
import { tz } from 'moment-timezone';
import tzlookup from 'tz-lookup';

import { db } from '.';
import { decodeProgram, decodeSeason, encodeProgram, encodeGrade } from './dbinfo';
import { updateEvent } from './events';

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const updateTeams = async () => {
  await updateTeamsForSeason(1, 130);
  await updateTeamsForSeason(4, 131);
  await updateTeamsForSeason(41, 129);
};

const updateEvents = async () => {
  await updateEventsForSeason(1, 130);
  await updateEventsForSeason(1, 130, 'future');
  await updateEventsForSeason(4, 131);
  await updateEventsForSeason(4, 131, 'future');
  await updateEventsForSeason(41, 129);
  await updateEventsForSeason(41, 129, 'future');
};

const updateMaxSkills = async () => {
  await updateMaxSkillsForSeason(1, 130);
  await updateMaxSkillsForSeason(4, 131);
  await updateMaxSkillsForSeason(41, 129);
};

const updateAllTeams = async () => {
  const programs = await db.collection('programs').find().project({seasons: 1}).toArray();
  for (const program of programs) {
    for (const season of program.seasons) {
      try {
        await updateTeamsForSeason(program._id, season);
      } catch (err) {
        console.error(err);
      }
    }
  }
};

const updateAllEvents = async () => {
  try {
    const programs = await db.collection('programs').find().project({seasons: 1}).toArray();
    for (const program of programs) {
      let season;
      for (season of program.seasons) {
        try {
          await updateEventsForSeason(program._id, season);
        } catch (err) {
          console.error(err);
        }
      }
      try {
        await updateEventsForSeason(program._id, season, 'future');
      } catch (err) {
        console.error(err);
      }
    }
  } catch (err) {
    console.error(err);
  }
};

const updateAllMaxSkills = async () => {
  const programs = await db.collection('programs').find().project({seasons: 1}).toArray();
  for (const program of programs) {
    const seasons = program.seasons.sort((a, b) => a - b);
    for (const season of seasons) {
      try {
        await updateMaxSkillsForSeason(program._id, season);
      } catch (err) {
        console.error(err);
      }
    }
  }
};

const updateExistingEvents = async () => {
  const events = await db.collection('events').find().toArray();
  for (const event of events) {
    try {
      await updateEvent(event);
    } catch (err) {
      console.error(err);
    }
  }
};

const updateCurrentEvents = async () => {
  const now = new Date();
  try {
    const documents = await db.collection('events').find({dates: {$elemMatch: {end: {$gt: now}, start: {$lt: now}}}}).toArray();
    for (const event of documents) {
      try {
        await updateEvent(event);
      } catch (err) {
        console.error(err);
      }
    }
  } catch (err) {
    console.error(err);
  }
};

const updateProgramsAndSeasons = async () => {
  try {
    const programs = (await get('https://www.robotevents.com/api/programs')).data.data.map(formatProgram);
    programs.forEach(program => {
      program.seasons.forEach(season => {
        db.collection('seasons').updateOne(
          {_id: season._id},
          {$set: season},
          {upsert: true}
        ).then(result => {
          if (result.upsertedCount) {
            console.log(`Insert to seasons: ${JSON.stringify(season)}`);
          } else if (result.modifiedCount) {
            console.log(`Update to seasons: ${JSON.stringify(season)}`);
          }
        });
      });
      const seasons = program.seasons.map(season => season._id);
      delete program.seasons;
      db.collection('programs').updateOne(
        {_id: program._id},
        {$set: program, $addToSet: {seasons: {$each: seasons}}},
        {upsert: true}
      ).then(result => {
        if (result.upsertedCount) {
          console.log(`Insert to programs: ${JSON.stringify(program)}`);
        } else if (result.modifiedCount) {
          console.log(`Update to programs: ${JSON.stringify(program)}`);
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
};

const getCsrfTokenAndCookie = async () => {
  const response = await get('https://www.robotevents.com');
  const $ = load(response.data);
  return {csrfToken: $('meta[name="csrf-token"]').attr('content'), cookie: response.headers['set-cookie'].map(cookie => cookie.slice(0, cookie.indexOf(';') + 1)).join(' ')};
};

const updateTeamsForSeason = async (program, season) => {
  try {
    const {csrfToken, cookie} = await getCsrfTokenAndCookie();
    const teamGroups = (await post('https://www.robotevents.com/api/teams/latLngGrp', {
      programs: [program],
      season_id: season,
      when: 'past'
    })).data;
    for (const teamGroup of teamGroups) {
      await updateTeamsInGroup(program, season, teamGroup, csrfToken, cookie);
    }
  } catch (err) {
    console.error(err);
  }
};

const updateEventsForSeason = async (program, season, when = 'past') => {
  try {
    const events = (await post('https://www.robotevents.com/api/events', {
      programs: [program],
      season_id: season,
      when
    })).data.data.map(formatEvent);
    for (const event of events) {
      try {
        console.log(`Updating ${event._id}`);
        await updateEvent(event);
      } catch (err) {
        console.error(err);
      }
    }
  } catch (err) {
    console.error(err);
  }
};

const updateMaxSkillsForSeason = async (program, season) => {
  try {
    const ranks = {};
    const maxSkills = (await get(`https://www.robotevents.com/api/seasons/${season}/skills?untilSkillsDeadline=0&grade_level=All`))
      .data.map(maxSkill => formatMaxSkill(maxSkill, program, season)).sort((a, b) => a._id.rank - b._id.rank);
    for (const maxSkill of maxSkills) {
      const {grade} = maxSkill._id;
      const rank = (ranks[grade] || 0) + 1;
      maxSkill._id.rank = rank;
      ranks[grade] = rank;
      try {
        await db.collection('maxSkills').updateOne({_id: maxSkill._id}, {$set: maxSkill}, {upsert: true});
      } catch (err) {
        console.error(err);
      }
      db.collection('teams').updateOne({_id: {id: maxSkill.team.id, program, season}}, {$set: {grade}}, {upsert: true}).catch(console.error);
    }
    for (const grade of Object.keys(ranks)) {
      await db.collection('maxSkills').deleteMany({'_id.season': season, '_id.grade': grade, '_id.rank': {$gt: ranks[grade]}});
    }
  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.log(`${decodeProgram(program)} ${decodeSeason(season)} has no official skills rankings.`);
    } else {
      console.error(err);
    }
  }
};

const updateTeamsInGroup = async (program, season, teamGroup, csrfToken, cookie, timeout = 1000) => {
  const {lat, lng} = teamGroup.position;
  try {
    const resp = await post('https://www.robotevents.com/api/teams/getTeamsForLatLng', {
      programs: [program],
      when: 'past',
      season_id: season,
      lat,
      lng
    }, {
      headers: {
        cookie,
        origin: 'https://www.robotevents.com/',
        'x-csrf-token': csrfToken
      }
    });
    const teams = (resp).data.map(team => formatTeam(team, program, season, lat, lng));
    teams.forEach(team => {
      const filter = {_id: team._id};
      const update = {$set: team};
      db.collection('teams').findOne(filter, {projection: {_id: 0, city: 1, region: 1}}).then(oldTeam => {
        if (oldTeam) {
          const unset = {};
          if (team.city !== oldTeam.city || team.region !== oldTeam.region) {
            unset.country = '';
            if (!team.region) {
              unset.region = '';
            }
          }
          if (!team.name) {
            unset.name = '';
          }
          if (!team.robot) {
            unset.robot = '';
          }
          if (Object.keys(unset).length) {
            update.$unset = unset;
          }
        }
        db.collection('teams').updateOne(filter, update, {upsert: true}).catch(console.error);
        if (!oldTeam) {
          //await vex.sendToSubscribedChannels('Team registered', {embed: vex.createTeamEmbed(team)}, [team._id]);
          console.log(`${decodeProgram(program)} ${team._id.id} registered for ${decodeSeason(season)}`);
        }
      }).catch(console.error);
    });
  } catch (err) {
    if (err.response && err.response.status === 429) {
      console.log('Rate limiting');
      await sleep(err.response.headers['retry-after'] * 1000);
      await updateTeamsInGroup(program, season, teamGroup, csrfToken, cookie);
    } else {
      console.error(err);
      try {
        await sleep(timeout);
        console.log(`Retrying team group ${lat},${lng}`);
        await updateTeamsInGroup(program, season, teamGroup, csrfToken, cookie, timeout * 2);
      } catch (err) {
        console.error(err);
      }
    }
  }
};

const formatProgram = program => {
  return {
    _id: program.id,
    name: program.name,
    abbr: program.abbr,
    seasons: program.seasons.map(season => formatSeason(season, program.id)).sort((a, b) => a._id - b._id)
  };
};

const formatSeason = (season, program) => {
  return {
    _id: season.id,
    program,
    name: encodeSeasonName(season.name),
    start: Number(season.start_year),
    end: Number(season.end_year)
  };
};

const formatTeam = (team, program, season, lat, lng) => {
  const {city, name, team_name, robot_name} = team;
  /*if (program === 1 && isNaN(team.team.charAt(0))) {
    console.log(`Found VEXU ${team.team} in VRC group`);
    program = 4;
    season = dbinfo.seasonToVexu(season);
  }*/
  return Object.assign({
    _id: {
      id: team.team,
      program,
      season
    },
    lat,
    lng,
    city
  },
  name && {region: name},
  team_name && {name: team_name},
  robot_name && {robot: robot_name},
  program === encodeProgram('VEXU') && {grade: encodeGrade('College')});
};

const formatEvent = event => {
  const {sku, season_id, program_id, name, date, lat, lng, email, phone, webcast_link} = event;
  let timezone;
  try {
    timezone = tzlookup(lat, lng);
  } catch (err) {
    console.error(`${sku} timezone lookup error for ${lat}, ${lng}:`);
    console.error(err);
    timezone = 'America/New_York';
  }
  const moments = date.split('-').map(date => tz(date, 'MM/DD/YYYY', timezone));

  return Object.assign({
    _id: sku,
    program: program_id,
    season: season_id,
    name,
    start: moments[0].toDate(),
    end: ((moments.length == 1) ? moments[0] : moments[1]).endOf('day').toDate(),
    lat,
    lng
  },
  email && {email},
  phone && {phone},
  webcast_link && {webcast: webcast_link});
};

const formatMaxSkill = (maxSkill, program, season) => {
  const {rank, team, event, scores, eligible} = maxSkill;
  const {gradeLevel, region, country} = team;
  const {score, programming, driver, maxProgramming, maxDriver} = scores;
  const {sku, startDate} = event;
  return Object.assign({
    _id: {
      season,
      grade: encodeGrade(gradeLevel),
      rank
    },
    team: {
      id: team.team,
      program
    },
    event: {
      sku,
      start: new Date(startDate)
    },
    score,
    programming,
    driver,
    maxProgramming,
    maxDriver,
    eligible
  },
  region && {region},
  country && {country});
};

const encodeSeasonName = name => name.match(/^(?:.+: )?(.+?)(?: [0-9]{4}-[0-9]{4})?$/)[1];

export {
  updateProgramsAndSeasons,
  updateMaxSkills,
  updateTeams,
  updateEvents,
  updateAllTeams,
  updateAllEvents,
  updateCurrentEvents,
  updateExistingEvents,
  updateAllMaxSkills,
  updateTeamsForSeason,
  updateEventsForSeason,
  updateMaxSkillsForSeason
};
