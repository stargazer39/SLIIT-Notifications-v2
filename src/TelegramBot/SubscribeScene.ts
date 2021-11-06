import { Telegraf, Markup, Scenes } from "telegraf";
import { SqlConnect } from "../SqlConnect";

export const subscribeScene = new Scenes.WizardScene("subscribeScene",
    async (ctx) =>{
        try{
            let reply = "Select from here\n";
            const conn = SqlConnect.getInstance();
            let pages = await conn.query({
                sql: "SELECT id, name FROM sites"
            });
            let options : any[] = [];
    
            for(let s of pages){
                options.push(s.name);
            }
            // const keyboard = Markup.inlineKeyboard(buttons);
    
            ctx.reply(reply,Markup.keyboard(options).oneTime().resize());
            return ctx.wizard.next();
        }catch(e){
            console.log(e);
            ctx.reply("Something went wrong");
            return ctx.scene.leave();
        }
    },
    async (ctx) => {
        ctx.reply("Subbed to [name]..");
        return ctx.scene.leave();
    } 
);