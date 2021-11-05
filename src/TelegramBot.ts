import { Context, Telegraf } from 'telegraf';
import fs from 'fs';
import { sleep } from './common';
import { SqlConnect } from './SqlConnect';
import mysql from 'promise-mysql';

const CREDS_PATH = "config/credentials.json";
const MAX_LENGTH = 3500;
const MESSAGE_TIMEOUT = 1000;

export class TelegramBot {
    private static bot : Telegraf;
    private static token : string;
    private static chatIds : number[] = [];

    private TelegramBot () {}

    public static async init() {
        if(!this.bot){
            SqlConnect.init();
            let conn = SqlConnect.getInstance();

            // Get existing chat_ids
            let res = await conn.query({
                sql:"SELECT chat_id FROM telegram_group_ids"
            })

            console.log(res);

            for(let row of res){
                this.chatIds.push(row.chat_id);
            }

            this.token = this.getToken();
            this.bot = new Telegraf(this.token);

            // Add event listeners
            this.bot.command("start", (ctx) => {
                ctx.reply("Hi");
            });

            this.bot.command("/addme", async (ctx) => {
                try{
                    await conn.query({
                        sql:"INSERT INTO telegram_group_ids(chat_id, extra) VALUES (?,?)",
                        values:[ctx.chat.id, JSON.stringify(ctx)]
                    });
                    this.chatIds.push(ctx.chat.id);
                    ctx.reply("Successfully added.");
                }catch(e){
                    console.log(e);
                    switch(e.code){
                        case "ER_DUP_ENTRY":
                            ctx.reply("Already added.");
                            break;
                        default:
                            ctx.reply("Faild to add you. Sorry.");
                    }
                    
                }
            })
            console.log("Bot Initialized.");
        }
    }

    public static async start(){
        await this.bot.launch();
    }

    public static async sendMessage(message : string, chatId : number) {
        let count = 0;
        while(count < message.length){
            await this.bot.telegram.sendMessage(chatId,message.substring(count,count + MAX_LENGTH),);
            count += MAX_LENGTH;
            if(count < message.length){
                await sleep(MESSAGE_TIMEOUT);
            }
        }
    }

    public static async sendMessageToAll(message : string) {
        for(const id of this.chatIds){
            await this.sendMessage(message, id);
        }
    }

    private static getToken() {
        if(!this.token){
            let creds = fs.readFileSync(CREDS_PATH)
            let credJson : any = JSON.parse(creds.toString());
    
            if(!Object.keys(credJson).includes("botToken")){
                throw new Error("File dosent contain a valid BotToken");
            }

            return credJson["botToken"];
        }else{
            return this.token;
        }
    }
}