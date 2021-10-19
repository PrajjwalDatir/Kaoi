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
            description: `Generate random biodata from the given country code.`,
            aliases: ['biodata', 'bio'],
            category: 'educative',
            usage: `${client.config.prefix}biodata [country_code]`,
            baseXp: 50
        })
    }

    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        const country = await axios.get(`https://api.abirhasan.wtf/bioDataGenerator`)
        if (!joined) return void (await M.reply(`Please provide the country code to generate data like for India give _in_ `))
        const biodata = joined.trim()
        await axios
            .get(`https://api.abirhasan.wtf/bioDataGenerator?countryCode=${biodata}`)
            .then((response) => {
                const text = ` 📌 *Generated Biodata Results*\n\n Name : ${response.data.Name}\n Age : ${response.data.Age} \n Address : ${response.data.Address} \n City : ${response.data.City} \n Gender : ${response.data.Gender} \n Ethnicity: ${response.data.Ethnicity} \n Date Of Birth : ${response.data.DateOfBirth} \n Phone Number : ${response.data.CompanyPhone} \n Email : ${response.data.CompanyEmail} \n Credit Card Number : ${response.data.CreditCardNumber} \n Credit Card Expiry Date : ${response.data.CreditCardExpiry} \n Credit Card CVV : ${response.data.CreditCardCVV2} \n Credit Card Type : ${response.data.CreditCardType} `
                M.reply(text)
            })
            .catch((err) => {
                M.reply(`Sorry, couldn't find country *${biodata}*\n📒 *List of Biodata:*\n${country.data.CountryCodesList}\n\n📝 *Note:* Capital letters don't work here.`)
            })
    }
}
