import { Context, Telegraf, Markup, Scenes, session } from 'telegraf';
import fs from 'fs';
import { sleep } from '../common';
import { SqlConnect } from '../SqlConnect';
import mysql from 'promise-mysql';
import { subscribeScene } from './SubscribeScene';


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
            // this.bot.use(session());
            // const stage = new Scenes.Stage([subscribeScene]);

            // this.bot.use(stage.middleware());
            // Add event listeners
            this.bot.command("/list", async (ctx) => {
                const conn = SqlConnect.getInstance();
                let pages = await conn.query({
                    sql: "SELECT id, name FROM sites"
                });
                let options : string[] = pages.map((obj : { id : number, name : string }) => { return `/sub_${obj.id} ${obj.name}`});
                
                ctx.reply(`Select from here\n ${options.join("\n")}`);
            })
            this.bot.hears(/\/sub_/, async (ctx) => {
                try{
                    let message = ctx.message.text;
                    let param = message.split("_");

                    let id = Number.parseInt(param[param.length - 1]);

                    await conn.query({
                        sql: "INSERT INTO telegram_subscribed(group_id,site_id) VALUES (?,?)",
                        values: [ctx.chat.id,id]
                    });

                    ctx.reply("Subbed to " + id + "!");
                }catch(e){
                    switch(e.code){
                        case "ER_DUP_ENTRY":
                            ctx.reply("Already subbed.");
                            return;
                    }
                    console.dir(e);
                    ctx.reply("Something went wrong.");
                }
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
            });

            console.log("Bot Initialized.");
        }
    }

    public static async start(){
        await this.bot.launch();
    }

    public static async sendMessage(message : string, chatId : number) {
        let count = 0;
        while(count < message.length){
            await this.bot.telegram.sendMessage(chatId,message.substring(count,count + MAX_LENGTH),{ parse_mode:"HTML" });
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

    public static async sendMessagesToSubscribed(site_id : number, message : string){
        let conn = SqlConnect.getInstance();
        try{
            let chat_ids = await conn.query({
                sql:"SELECT group_id FROM telegram_subscribed WHERE site_id = ?", 
                values: [site_id]
            });

            for(let obj of chat_ids){
               try{
                    this.sendMessage(message, obj.group_id);
                    console.log(`Sent to group : ${obj.group_id}`);
               }catch(e){
                await conn.query({ 
                    sql:"INSERT INTO telegram_unsent(chat_id, message, reason) VALUES (?,?,?)",
                    values:[obj.group_id, message, JSON.stringify(e) as string | "Unknown Reason"]
                });
                console.log(e);
               }
            }
        }catch(e){
            console.log(e);
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