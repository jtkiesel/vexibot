import { MessageEmbed, Message, Constants, TextChannel } from 'discord.js';
import { decode } from 'he';

import { client, db } from '.';
import { decodeEvent, decodeGrade, decodeProgram, decodeProgramEmoji, decodeRound, decodeSeason, decodeSeasonUrl, decodeSkill, emojiToUrl } from './dbinfo';

export type VexDate = {};

export type Event = {
  _id: string;
  season: number;
  program: number;
  name: string;
  start: Date;
  end: Date;
  lat: number;
  lng: number;
  email?: string;
  phone?: string;
  webcast?: string;
  type?: number;
  capacity?: number;
  spots?: number;
  price?: number;
  dates?: VexDate[];
  grade?: number;
  skills?: boolean;
  tsa?: boolean;
  regPerOrg?: number;
  opens?: Date;
  deadline?: Date;
  teams?: string[];
  divisions?: { [key: number]: string };
};

export type TeamId = {
  program: number;
  id: string;
  season: number;
};

export type Team = {
  _id: TeamId;
  name?: string;
  org?: string;
  lat: number;
  lng: number;
  city: string;
  region?: string;
  country?: string;
  grade?: number;
  robot?: string;
};

const allianceEmojis = ['🔴', '🔵'];
export const subscribedChannels: { [key: string]: string } = {};

export const getTeamId = (message: Message, args: string): string => {
  const arg = args.replace(/\s+/g, '');
  if (arg) {
    return arg.toUpperCase();
  }
  return (message.member?.displayName || message.author.username).split(' | ', 2)[1];
};

export const validTeamId = (teamId: string): boolean => {
  return /^([0-9]{1,5}[A-Z]?|[A-Z]{2,5}[0-9]{0,2})$/i.test(teamId);
};

export const getTeam = (teamId: string, season: number = null): Promise<Team | Team[]> => {
  const query = {
    '_id.id': new RegExp(`^${teamId}$`, 'i'),
    '_id.program': (isNaN(parseInt(teamId.charAt(0))) ? 4 : 1)
  };
  const teams = db().collection('teams');
  if (season != null) {
    query['_id.season'] = season;
    return teams.findOne(query);
  }
  return teams.find(query).sort({'_id.season': -1}).toArray();
};

const makeLocationString = (team: Team): string => {
  return [team.city, team.region, team.country].filter(l => l && l.trim()).join(', ');
};

export const makeTeamEmbed = (team: Team): MessageEmbed => {
  const teamId = team._id.id;
  const program = decodeProgram(team._id.program);
  const season = team._id.season;
  const location = makeLocationString(team);
  const embed = new MessageEmbed()
    .setColor(Constants.Colors.GREEN)
    .setAuthor(teamId, emojiToUrl(decodeProgramEmoji(team._id.program)), `https://www.robotevents.com/teams/${program}/${teamId}`)
    .setTitle(decodeSeason(season))
    .setURL(decodeSeasonUrl(season));
  if (team.name && team.name.trim()) {
    embed.addField('Team Name', team.name, true);
  }
  if (team.robot && team.robot.trim()) {
    embed.addField('Robot Name', team.robot, true);
  }
  if (team.org && team.org.trim()) {
    embed.addField('Organization', team.org, true);
  }
  if (location && location.trim()) {
    embed.addField('Location', location, true);
  }
  if (team.grade) {
    embed.addField('Grade', decodeGrade(team.grade), true);
  }
  return embed;
};

export const makeEventEmbed = (event: Event): MessageEmbed => {
  const embed = new MessageEmbed()
    .setColor(Constants.Colors.ORANGE)
    .setAuthor(event.name, emojiToUrl(decodeProgramEmoji(event.program)), `https://www.robotevents.com/${event._id}.html`)
    .setTitle(`${event.tsa ? 'TSA ' : ''}${decodeSeason(event.season)}`)
    .setURL(decodeSeasonUrl(event.season))
    .setDescription(decodeEvent(event.type))
    .setTimestamp(new Date(event.start))
    .addField('Spots Open', `${event.spots}/${event.capacity}`, true)
    .addField('Price', `$${event.price}`, true)
    .addField('Grade', decodeGrade(event.grade), true)
    .addField('Skills Offered?', event.skills ? 'Yes' : 'No', true);
  return embed;
};

const maskedTeamUrl = (program: number, teamId: string): string => {
  return `[${teamId}](https://www.robotevents.com/teams/${decodeProgram(program)}/${teamId})`;
};

const makeMatchString = (round: number, instance: number, number: number): string => {
  return `${decodeRound(round)}${round < 3 || round > 8 ? '' : ` ${instance}-`}${number}`;
};

const makeTeamsString = (program: number, teams: string[], teamSit = '', scored = false): string => {
  return teams.filter(team => team).map((team, _, array) => {
    program = isNaN(parseInt(team.charAt(0))) ? 4 : program;
    const teamLink = maskedTeamUrl(program, team);
    if (!scored) {
      return teamLink;
    }
    if (array.length > 2 && team === teamSit) {
      return `*${teamLink}*`;
    }
    return `**${teamLink}**`;
  }).join(' ');
};

const matchScoredNotification = (match): string => {
  const matchString = makeMatchString(match._id.round, match._id.instance, match._id.number);
  const redTeams = match.red.filter(team => team && team !== match.redSit);
  const blueTeams = match.blue.filter(team => team && team !== match.blueSit);
  return `${matchString} ${redTeams[0]}${redTeams[1] ? ` ${redTeams[1]}` : ''}${allianceEmojis[0]}${match.redScore}-${match.blueScore}${allianceEmojis[1]}${blueTeams[1] ? `${blueTeams[1]} ` : ''}${blueTeams[0]}`;
};

export const makeMatchEmbed = (match, event: Event): MessageEmbed => {
  let color;
  if (match.redScore === undefined && match.score === undefined) {
    color = 0xffffff;
  } else if (match.program === 41) {
    color = Constants.Colors.BLUE;
  } else if (match.redScore === match.blueScore) {
    color = Constants.Colors.GREY;
  } else {
    color = (match.redScore > match.blueScore) ? Constants.Colors.RED : Constants.Colors.BLUE;
  }
  let red = `${allianceEmojis[0]} Red`;
  let blue = `${allianceEmojis[1]} Blue`;
  let alliance = allianceEmojis[1];
  if (match.redScore !== undefined || match.redScorePred !== undefined) {
    red += ':';
    blue += ':';
    if (match.redScore !== undefined) {
      red += ` ${match.redScore}`;
      blue += ` ${match.blueScore}`;
    }
    if (match.redScorePred !== undefined) {
      red += ` (${match.redScorePred} predicted)`;
      blue += ` (${match.blueScorePred} predicted)`;
    }
  } else if (match.score !== undefined || match.scorePred !== undefined) {
    alliance += ' Score:';
    if (match.score !== undefined) {
      alliance += ` ${match.score}`;
    }
    if (match.scorePred !== undefined) {
      alliance += ` (${match.scorePred} predicted)`;
    }
  }
  const embed = new MessageEmbed()
    .setColor(color)
    .setAuthor(event.name, emojiToUrl(decodeProgramEmoji(match.program)), `https://www.robotevents.com/${match._id.event}.html`)
    .setTitle(event.divisions[match._id.division])
    .setURL(`https://www.robotevents.com/${match._id.event}.html#tab-results`)
    .setDescription(makeMatchString(match._id.round, match._id.instance, match._id.number));
  if (match.program === 41) {
    if (match.teams.length) {
      embed.addField(alliance, makeTeamsString(match.program, match.teams));
    }
  } else {
    if (match.red.length) {
      embed.addField(red, makeTeamsString(match.program, match.red, match.redSit), true);
    }
    if (match.blue.length) {
      embed.addField(blue, makeTeamsString(match.program, match.blue, match.blueSit), true);
    }
  }
  if (match.started !== undefined) {
    embed.setTimestamp(new Date(match.started));
  } else if (match.scheduled !== undefined) {
    embed.setTimestamp(new Date(match.scheduled));
  }
  return embed;
};

export const createAwardEmbed = (award, event: Event): MessageEmbed => {
  const embed = new MessageEmbed()
    .setColor(Constants.Colors.PURPLE)
    .setAuthor(event.name, emojiToUrl(decodeProgramEmoji(event.program)), `https://www.robotevents.com/${event._id}.html`)
    .setTitle(award.name)
    .setURL(`https://www.robotevents.com/${event._id}.html#tab-awards`);
  if (award.division) {
    embed.addField('Division', award.division);
  }
  if (award.team) {
    embed.addField('Team', `${decodeProgramEmoji(award.team.program)} ${maskedTeamUrl(award.team.program, award.team.id)}`, true);
  }
  if (award.qualifies) {
    embed.addField('Qualifies for', award.qualifies.join('\n'), true);
  }
  return embed;
};

export const createSkillsEmbed = (skill, event): MessageEmbed => {
  return new MessageEmbed()
    .setColor(Constants.Colors.GOLD)
    .setAuthor(event.name, emojiToUrl(decodeProgramEmoji(skill.team.program)), `https://www.robotevents.com/${event._id}.html#tab-results`)
    .setTitle(skill.team.id)
    .setURL(`https://www.robotevents.com/teams/${decodeProgram(skill.team.program)}/${skill.team.id}`)
    .addField('Type', decodeSkill(skill._id.type), true)
    .addField('Rank', skill.rank, true)
    .addField('Score', skill.score, true)
    .addField('Attempts', skill.attempts, true);
};

const getMatchTeams = (match): Team[] => (match.teams || match.red.concat(match.blue)).filter(team => team).map(team => {
  return {id: team, program: (isNaN(team.charAt(0)) ? 4 : match.program)};
});

export const sendToSubscribedChannels = async (content: string, options, teams: Team[] = []): Promise<void> => {
  const settings = await db().collection('settings').find({updatesChannel: {$exists: true}, $or: [{updatesFilter: {$exists: false}}, {updatesFilter: {$size: 0}}, {updatesFilter: {$in: teams}}]}).toArray();
  settings.map(setting => setting.updatesChannel).forEach(async id => {
    const channel = await client.channels.fetch(id) as TextChannel;
    if (!channel) {
      return;
    }
    try {
      const subscribers = [];
      for (const team of teams) {
        const teamSubs = await db().collection('teamSubs').find({_id: {guild: channel.guild.id, team}}).toArray();
        for (const teamSub of teamSubs) {
          for (const user of teamSub.users) {
            if (!subscribers.includes(user)) {
              subscribers.push(user);
            }
          }
        }
      }
      let text;
      if (subscribers.length) {
        text = subscribers.map(subscriber => `<@${subscriber}>`).join('');
      }
      if (content) {
        text = text ? `${content}\n${text}` : content;
      }
      await channel.send(text || undefined, options).catch(console.error);
    } catch (err) {
      console.error(err);
    }
  });
};

export const sendMatchEmbed = async (content: string, match, event): Promise<void> => {
  try {
    await sendToSubscribedChannels((match.redScore !== undefined ? `${matchScoredNotification(match)}\n${content}` : content), {embed: makeMatchEmbed(match, event)}, getMatchTeams(match));
  } catch (err) {
    console.error(err);
  }
};

const escapeMarkdown = (string: string): string => string ? string.replace(/([*^_`~])/g, '\\$1') : '';

export const createTeamChangeEmbed = (program, teamId: string, field: string, oldValue: string, newValue: string): MessageEmbed => {
  program = decodeProgram(program);
  let change;
  if (!oldValue) {
    change = `added their ${field} **"**${escapeMarkdown(decode(newValue))}**"**`;
  } else if (!newValue) {
    change = `removed their ${field} **"**${escapeMarkdown(decode(oldValue))}**"**`;
  } else {
    change = `changed their ${field} from **"**${escapeMarkdown(decode(oldValue))}**"** to **"**${escapeMarkdown(decode(newValue))}**"**`;
  }
  return new MessageEmbed()
    .setColor(Constants.Colors.GREEN)
    .setDescription(`[${program} ${teamId}](https://www.robotevents.com/teams/${program}/${teamId}) ${change}.`);
};
