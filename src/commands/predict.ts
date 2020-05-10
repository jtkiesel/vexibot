import { db } from '..';
import { validTeamId, getTeam, createMatchEmbed } from '../vex';

export default async (message, args) => {
  const alliances = args.split(',').map(alliance => alliance.trim().split(/\s+/)).filter(alliance => alliance.length);
  if (alliances.length > 2) {
    message.reply('number of alliances cannot be greater than 2');
    return;
  }
  let redScore = 0;
  let blueScore = 0;
  for (let i = 0; i < alliances.length; i++) {
    const alliance = alliances[i];
    for (let j = 0; j < alliance.length; j++) {
      const teamId = alliance[j];
      if (!validTeamId(teamId)) {
        message.reply(`\`${teamId}\` is not a valid team ID`);
        return;
      }
      const team = (await getTeam(teamId))[0];
      if (!team) {
        message.reply(`\`${teamId}\` has never been registered`);
        return;
      }
      alliance[j] = team._id.id;
      let opr;
      if ([139, 140].includes(team._id.season)) {
        const ranking = (await db.collection('rankings').aggregate()
          .match({'_id.team': team._id, opr: {$exists: true}})
          .lookup({from: 'events', localField: '_id.event', foreignField: '_id', as: 'events'})
          .project({opr: 1, event: {$arrayElemAt: ['$events', 0]}})
          .sort({'event.end': -1, '_id.event': -1})
          .limit(1)
          .project({opr: 1}).toArray())[0];
        opr = ranking ? ranking.opr : 0;
      } else {
        opr = 0;
      }
      if (i == 0) {
        redScore += opr;
      } else {
        blueScore += opr;
      }
    }
  }
  const match = {
    _id: {
      division: 0,
      round: 1,
      instance: 0,
      number: 0
    },
    program: (alliances[0][0] && isNaN(alliances[0][0].charAt(0))) ? 4 : 1,
    red: alliances[0] || [],
    blue: alliances[1] || [],
    redScore,
    blueScore,
    started: message.createdAt
  };
  const event = {
    _id: '',
    name: 'Theoretical',
    divisions: {
      0: ''
    }
  };
  message.channel.send({embed: createMatchEmbed(match, event)}).catch(console.error);
};
