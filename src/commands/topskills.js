import { MessageEmbed } from 'discord.js';

import { db, addFooter } from '..';
import { decodeProgram, encodeGrade, decodeGrade, decodeSeason, decodeSeasonUrl } from '../dbinfo';

const rankEmojis = ['🥇', '🥈', '🥉'];
const pageSize = 10;
const previous = '🔺';
const next = '🔻';

const emojis = [previous, next];

const getDescription = (skills, index = 0) => {
  let description = '';
  for (let i = index; i < skills.length && i < (index + pageSize); i++) {
    const skill = skills[i];
    let rank = skill._id.rank;
    rank = (rank < 4) ? `${rankEmojis[rank - 1]}  ` : `**\`#${String(rank).padEnd(3)}\u200B\`**`;
    const score = String(skill.score).padStart(3);
    const programming = String(skill.programming).padStart(3);
    const driver = String(skill.driver).padStart(3);
    const team = skill.team.id;
    description += `${rank}   \`\u200B${score}\`   \`(\u200B${programming} / \u200B${driver})\`   [${team}](https://www.robotevents.com/teams/${decodeProgram(skill.team.program)}/${team})\n`;
  }
  return description;
};

export default async (message, args) => {
  const arg = args ? args.replace(/\s+/g, '') : '';

  let grade = arg ? arg.toLowerCase() : 'h';
  let program;
  let season;
  if (['h', 'hs', 'high', 'highschool'].includes(grade)) {
    program = 'VRC';
    grade = 'High School';
    season = 130;
  } else if (['m', 'ms', 'mid', 'middle', 'middleschool'].includes(grade)) {
    program = 'VRC';
    grade = 'Middle School';
    season = 130;
  } else if (['c', 'u', 'college', 'uni', 'university', 'vexu'].includes(grade)) {
    program = 'VEXU';
    grade = 'College';
    season = 131;
  } else {
    message.reply('please enter a valid grade, such as **h**, **m**, or **c**.');
    return;
  }
  let skills;
  try {
    skills = await db.collection('maxSkills')
      .find({'_id.season': season, '_id.grade': encodeGrade(grade)})
      .sort({'_id.rank': 1}).toArray();
  } catch (err) {
    console.error(err);
  }
  if (skills && skills.length) {
    let index = 0;
    const program = decodeProgram(skills[index].team.program);
    const grade = decodeGrade(skills[index]._id.grade);
    const season = decodeSeason(skills[index]._id.season);
    const seasonUrl = decodeSeasonUrl(skills[index]._id.season);
    const embed = new MessageEmbed()
      .setColor('GOLD')
      .setAuthor(`${grade} World Skills Standings`, null, `https://www.vexdb.io/skills/${program}/${season.replace(/ /g, '_')}/Robot`)
      .setTitle(`${program} ${season}`)
      .setURL(seasonUrl)
      .setDescription(getDescription(skills));

    try {
      const reply = await message.channel.send({embed});
      const collector = reply.createReactionCollector((reaction, user) => {
        return (user.id === message.author.id) && emojis.includes(reaction.emoji.name);
      }, {time: 30000, dispose: true});
      const lastPage = Math.max(skills.length - pageSize, 0);
      collector.on('collect', reaction => {
        index += ((reaction.emoji.name === next) ? 1 : -1) * pageSize;
        if (index >= skills.length) {
          index = 0;
        } else if (index < 0) {
          index = lastPage;
        }
        embed.setDescription(getDescription(skills, index));
        reply.edit({embed});
      });
      collector.on('remove', reaction => {
        index += (reaction.emoji.name === next ? 1 : -1) * pageSize;
        if (index >= skills.length) {
          index = 0;
        } else if (index < 0) {
          index = lastPage;
        }
        embed.setDescription(getDescription(skills, index));
        reply.edit({embed});
      });
      collector.on('end', () => {
        if (message.channel.type === 'text') {
          reply.reactions.removeAll().catch(console.error);
        }
        addFooter(message, reply);
      });
      await reply.react(previous);
      reply.react(next);
    } catch (err) {
      console.log(err);
    }
  } else {
    message.reply(`no skills scores available for ${grade} ${program} ${decodeSeason(season)}.`).catch(console.error);
  }
};
