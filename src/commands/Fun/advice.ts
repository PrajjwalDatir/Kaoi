import { MessageType } from '@adiwajshing/baileys' 

import MessageHandler from '../../Handlers/MessageHandler' 

import BaseCommand from '../../lib/BaseCommand'

import WAClient from '../../lib/WAClient' 

import { ISimplifiedMessage } from '../../typings'

import axios from 'axios'

export default class Command extends BaseCommand { 

  constructor(client: WAClient, handler: MessageHandler) { 

    super(client, handler, { 

      command: 'advice',

      description: 'Gives you advice', 

      catagory: 'fun',

      usage: `${client.config.prefix}advice`,

      baseXp:30

   })

  }

  run = async (M: ISimplifiedMessage): Promise<void> => {

      await axios 

          .get(`https://api.adviceslip.com/advice`)

          .then((response) => { 

              // console.log(response);

              const text = `*Advice for you🔖:* ${response.data.advice}` 

              M.reply(text)

           })

           .catch((err) => { 

              M.reply(`🚫 Error: ${err}`)

           }) 

  }

}

