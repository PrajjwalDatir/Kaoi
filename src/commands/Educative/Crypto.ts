import MessageHandler from '../../Handlers/MessageHandler'
import BaseCommand from '../../lib/BaseCommand'
import WAClient from '../../lib/WAClient'
import { IParsedArgs, ISimplifiedMessage } from '../../typings'
import axios from 'axios'

export default class Command extends BaseCommand {
    constructor(client: WAClient, handler: MessageHandler) {
        super(client, handler, {
            command: 'crypto',
            aliases: ['cr', 'coins'],
            description: 'Get Crypto Prices\n',
            category: 'educative',
            usage: `${client.config.prefix}crypto (Coin/Currency) (Currency/Coin) (count of 1st param)`,
            baseXp: 100
        })
    }
    run = async (M: ISimplifiedMessage, { joined }: IParsedArgs): Promise<void> => {
        let terms = joined.trim().split(' ').map(t => t.toUpperCase());
        // Filter out empty strings that might result from multiple spaces
        terms = terms.filter(t => t.length > 0);
        let text = '';
        const usageHint = `\nUsage: ${this.client.config.prefix}crypto [COIN] [CURRENCY] [AMOUNT]\nExample: ${this.client.config.prefix}crypto BTC INR 1\n${this.client.config.prefix}crypto USDT BTC\n${this.client.config.prefix}crypto (for all prices)`;

        try {
            const res = await axios.get(`https://public.coindcx.com/market_data/current_prices`);

            if (!res.data || typeof res.data !== 'object' || Object.keys(res.data).length === 0) {
                console.log('Unexpected API response from Coindcx:', res.data);
                return void M.reply('🟥 ERROR 🟥\nCould not retrieve valid crypto data. The API might be down or returned an unexpected response.');
            }

            const data: { [key: string]: string | number } = res.data;

            if (terms.length === 0 || (terms.length === 1 && terms[0] === '')) {
                text = `*All Crypto Prices (vs INR)*:\n\n`;
                let foundCount = 0;
                for (const [key, value] of Object.entries(data)) {
                    // Display only pairs ending with INR for the general request for brevity, or adjust as needed
                    if (key.endsWith('INR')) {
                         text += `*${key.replace('INR', '')}*: ${value} INR\n`;
                         foundCount++;
                    }
                }
                if (foundCount === 0) {
                    text = 'No INR pairs found or API data is not in the expected format.';
                }
            } else {
                let coin = terms[0];
                let currency = terms.length > 1 ? terms[1] : 'INR'; // Default to INR
                let countInput = terms.length > 2 ? terms[2] : '1';
                let count = parseFloat(countInput);
                if (isNaN(count) || count <= 0) count = 1;

                const pair = coin + currency;

                if (data[pair]) {
                    const price = parseFloat(data[pair] as string);
                    if (isNaN(price)) {
                        text = `*${pair}*: Invalid price data received from API.`;
                    } else {
                        text = `*${countInput} ${coin} (${pair})* = ${price * count} ${currency}`;
                    }
                } else {
                    // Attempt reverse pairing for convenience, e.g., user types "INR BTC"
                    const reversePair = currency + coin;
                    if (data[reversePair]) {
                         const price = parseFloat(data[reversePair] as string);
                         if (isNaN(price)) {
                            text = `*${reversePair}* (used as ${pair}): Invalid price data received from API.`;
                         } else {
                            if (price === 0) {
                                text = `*${countInput} ${coin} (via ${reversePair})*: Cannot convert as ${reversePair} price is 0.`;
                            } else {
                                // Price is for currency/coin, so for coin/currency it's 1/price
                                text = `*${countInput} ${coin} (via ${reversePair})* = ${(1 / price) * count} ${currency}`;
                            }
                         }
                    } else {
                        text = `*${pair}*: Not Found.${usageHint}`;
                    }
                }
            }

            if (text) {
                return void M.reply(text);
            } else {
                // This case should ideally not be reached if logic is sound
                return void M.reply(`Could not generate a response. Please check your input or try general usage.${usageHint}`);
            }

        } catch (err: any) {
            console.error('Error fetching crypto prices:', err.message);
            let errorText = '🟥 ERROR 🟥\nAn issue occurred while fetching crypto prices.';
            if (err.response) {
                console.error('API Error Status:', err.response.status);
                console.error('API Error Data:', err.response.data);
                errorText += ` (API Status: ${err.response.status})`;
            } else if (err.request) {
                console.error('API No Response:', err.request);
                errorText = '🟥 ERROR 🟥\nNo response from the crypto API service. Please try again later.';
            }
            return void M.reply(errorText);
        }
    }
}
