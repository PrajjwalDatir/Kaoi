import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import axios from 'axios'
import request from '../../lib/request'
import { MessageType, Mimetype } from '@adiwajshing/baileys'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'biodata',
            description: `Generate random biodata for given country code`,
            aliases: ['biodata', 'bio'],
            category: 'educative',
            usage: `${client.config.prefix}biodata [name]`,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        if (!joined) return void (await M.reply(`Please provide the country code to generate biodata. \n Here's the supported list of countries : *https://api.abirhasan.wtf/bioDataGenerator* `))
        const biodata = joined.trim()
        await axios
            .get(`https://api.abirhasan.wtf/bioDataGenerator?countryCode=${biodata}`)
            .then((response) => {
                const text = ` 📌 *Generated Biodata Results*\n\n Name : ${response.data.Name}\n Age : ${response.data.Age} \n Address : ${response.data.Address} \n City : ${response.data.City} \n Gender : ${response.data.Gender} \n Ethnicity: ${response.data.Ethnicity} \n Date Of Birth : ${response.data.DateOfBirth} \n Phone Number : ${response.data.CompanyPhone} \n Email : ${response.data.CompanyEmail} \n Credit Card Number : ${response.data.CreditCardNumber} \n Credit Card Expiry Date : ${response.data.CreditCardExpiry} \n Credit Card CVV : ${response.data.CreditCardCVV2} \n Credit Card Type : ${response.data.CreditCardType} `
                M.reply(text)
            })
            .catch((err) => {
                M.reply(`Sorry, couldn't find country *${biodata}*\n📝 *Note:* Check https://api.abirhasan.wtf/bioDataGenerator for supported countries and codes.`)
            })
    }
}