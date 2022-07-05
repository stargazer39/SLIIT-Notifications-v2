import { TelegramBot } from "./TelegramBot/TelegramBot";
import { SqlConnect } from "./SqlConnect";
import { SliitCompareble } from "./Sliit/SllitCompareble";
import { SiteComparable } from "./SiteCompareble";
import { sleep } from "./common";
import dotenv from "dotenv";

dotenv.config()

async function run() : Promise<void>{
    await SqlConnect.init();
    await TelegramBot.init();
    await TelegramBot.start();

    let comparebles : SiteComparable[] = [];
    // Get all the sites
    let conn = await SqlConnect.getInstance();
    let sites = await conn.query("SELECT id,name,extra FROM sites");

    for(let site of sites){
        const id = site.id;
        const name = site.name;
        const extra = JSON.parse(site.extra);

        let comp = new SliitCompareble(id, name);

        try{
            await comp.init(extra);
        }catch(e){
            console.error(e);
            continue;
        }
        
        comparebles.push(comp);
    }

    while(true){
        for(let comp of comparebles){
            try{
                await comp.syncPages();
                await comp.syncWithDB();
            }catch(err){
                console.log("Something went wrong.");
                try{
                    comp.reloadSubPages();
                    console.warn(`Error occured in ${comp.getId()} ${comp.getName()}`);
                }catch(e){
                    console.error(e);
                    continue;
                }
            }
        }
        await sleep(1000*60*1);
    }
}

run().catch(e => {
    console.error(e);
    process.exit(-1);
});
