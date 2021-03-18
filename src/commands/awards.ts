import { Constants, Message, MessageEmbed } from 'discord.js';
import { decode } from 'he';

import { addFooter, Command, db } from '..';
import { getTeam, getTeamId, validTeamId } from '../vex';
import { decodeProgram, decodeSeason, decodeSeasonUrl } from '../dbinfo';

const emojiToRegex = {
  '🏆': /^(.*World Champion.*)$/i,
  '🥇': /^(.*(?:Excellence|Champion|Skills(?: Challenge)? Winner|First|1st).*)/i,
  '🥈': /^(.*(?:Finalist|Second|2nd).*)$/i,
  '🥉': /^(.*(?:Semifinalist|Third|3rd).*)$/i,
  '🏅': /^(.+?)(?=\s+\(|$)/
};

const awardsOmitted = '\n**[Older awards omitted.]**';

class AwardsCommand implements Command {
  async execute(message: Message, args: string): Promise<Message> {
    let teamId = getTeamId(message, args);
    if (!validTeamId(teamId)) {
      return message.reply('please provide a valid team ID, such as **24B** or **BNS**.');
    }
    const team = (await getTeam(teamId))[0];
    if (!team) {
      return message.reply('that team ID has never been registered.');
    }
    teamId = team._id.id;
    const awards = await db().collection('awards').aggregate()
      .match({'team.id': teamId, 'team.program': team._id.program})
      .lookup({from: 'events', localField: '_id.event', foreignField: '_id', as: 'events'})
      .project({name: 1, event: {$arrayElemAt: ['$events', 0]}, season: '$team.season'})
      .sort({'event.season': -1, 'event.end': -1, '_id.event': -1})
      .project({name: 1, event: '$event.name', season: 1}).toArray();
    if (!awards.length) {
      return message.reply('that team has never won an award.');
    }
    const descriptionHeader = `**${awards.length} Award${awards.length === 1 ? '' : 's'}**`;
    const eventsBySeason: { [key: number]: string[] } = {};
    const seasonHeaders: { [key: number]: string } = {};
    let sku: string;
    let event: string;
    let season = awards[0].season;
    let awardCount = 0;

    for (let i = 0; i < awards.length; i++) {
      const award = awards[i];
      if (award._id.event !== sku) {
        if (event) {
          if (eventsBySeason[season] !== undefined) {
            eventsBySeason[season].push(event);
          } else {
            eventsBySeason[season] = [event];
          }
        }
        event = `\n[${decode(award.event)}](https://www.robotevents.com/${award._id.event}.html#tab-awards)`;
        sku = award._id.event;
      }
      let awardEmoji = '🏅';
      let awardName = award.name;

      for (const [emoji, regex] of Object.entries(emojiToRegex)) {
        const matches = awardName.match(regex);
        if (matches) {
          awardEmoji = emoji;
          awardName = matches[0];
          break;
        }
      }
      event += `\n${awardEmoji}${awardName}`;

      if (award.season !== season) {
        seasonHeaders[season] = `\n***[${decodeSeason(season)}](${decodeSeasonUrl(season)})*** (${awardCount})`;
        season = award.season;
        awardCount = 1;
      } else {
        awardCount++;
      }
    }
    if (eventsBySeason[season] !== undefined) {
      eventsBySeason[season].push(event);
    } else {
      eventsBySeason[season] = [event];
    }
    seasonHeaders[season] = `\n***[${decodeSeason(season)}](${decodeSeasonUrl(season)})*** (${awardCount})`;

    let description = descriptionHeader;
    let atLimit = false;
    let linesRemaining = 30 - (3 + Object.keys(seasonHeaders).length);
    let charsRemaining = 2048 - (descriptionHeader.length + awardsOmitted.length);
    Object.values(seasonHeaders).forEach(header => charsRemaining -= header.length);

    for (const [season, header] of Object.entries(seasonHeaders).sort((a, b) => parseInt(b[0]) - parseInt(a[0]))) {
      description += header;

      if (!atLimit) {
        for (let i = 0; i < eventsBySeason[season].length; i++) {
          const event = eventsBySeason[season][i];
          charsRemaining -= event.length;
          linesRemaining -= event.split('\n').length - 1;
          if (charsRemaining < 0 || linesRemaining < 0) {
            if (i) {
              description += awardsOmitted;
            }
            atLimit = true;
            break;
          }
          description += event;
        }
      }
    }
    const program = decodeProgram(team._id.program);
    const embed = new MessageEmbed()
      .setColor(Constants.Colors.PURPLE)
      .setTitle(`${program} ${teamId}`)
      .setURL(`https://www.robotevents.com/teams/${program}/${teamId}`)
      .setDescription(description);
    const reply = await message.channel.send(embed);
    return addFooter(message, reply);
  }
}

export default new AwardsCommand();
