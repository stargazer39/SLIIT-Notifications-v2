import { TelegramBot } from "./TelegramBot/TelegramBot";
import { SqlConnect } from "./SqlConnect";
import { SliitCompareble } from "./Sliit/SllitCompareble";
import { compareHTML } from "./DomCompare";

import fs from "fs";
import { Telegram } from "telegraf";
import { SiteComparable } from "./SiteCompareble";

async function testBot() : Promise<void>{
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
        await comp.init(extra);
        comparebles.push(comp);
    }

    for(let comp of comparebles){
        await comp.syncPages();
        await comp.syncWithDB();
    }
}

function tryDiff(){
    let page_name = "communication_skills___it1040___2020_jul_";
    let page_old = fs.readFileSync(`./tmp/${page_name}.html`).toString();

    let page_now = fs.readFileSync(`./tmp/${page_name}new.html`).toString();

    if(!page_now){
        //throw new Error(`Page data is not available.. Maybe ${this.name}@${this.id}} layout changed?`);
    }
    // console.log(page_now);
    // Compare two pages
    let result = compareHTML(page_old, page_now)

    if(typeof(result.different) != 'boolean'){
        throw new Error("Result different is not boolean.");
    }

    let sections : any[] = [];

    if(result.different === true){
        console.log(`ID : test has changed. Updating..`);
        console.dir(result.changes);
        console.log("-----");
        for(const change of result.changes){
            let node;
            switch(change.type) {
                case 'added':
                case 'modified':
                    change.after.$node.addClass("changed-node");
                    node = change.after.$node.closest(".section.main");
                    
                   
                    console.log('added/ modified')
                    break;
                case 'changed':
                    change.after.$node.parent().addClass("changed-node");
                    node = change.after.$node.closest(".section.main");
                    
                    // console.log(result.$after.html(change.after.$node.parent()));
                    console.log('changed');
            /*case 'removed':
                    node = change.before.$node.closest(".section"); */
            }
            if(node && !sections.includes(node)){
                sections.push(node);
            }else if(!node){
                sections.push(change.type);
            }
        }
        let ids : string[] = [];
        let section_htmls = sections.filter((sect) => {

            if(typeof(sect) == 'string'){
                return `<div class="notice"> There is some hidden ${sect} sections. </div>`;
            }

            let id = result.$after(sect).attr("id");

            if(typeof(id) == 'string' && !ids.includes(id)){
                ids.push(id);
                return result.$after.html(sect);
            }
        });
    
        fs.writeFileSync(`./tmp/${page_name}diff.html`, section_htmls.join("\n"));
    }else{
    }
}

//tryDiff();
testBot();