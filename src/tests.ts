import { TelegramBot } from "./TelegramBot";
import { SqlConnect } from "./SqlConnect";
import { SliitCompareble } from "./Sliit/SllitCompareble";
import { compareHTML } from "./DomCompare";

import fs from "fs";

function testBot(){
    SqlConnect.init().then(
        (conn)=> {
            TelegramBot.init().then(() => {
                console.log("Test passses.");
                TelegramBot.start().then(() => {
                    console.log("Bot successfully stared.");
                    let comp = new SliitCompareble(1,"sliit1");
                    comp.init({
                        username:"it20603618",
                        password: "wasd!@#123",

                    }).then(() => {
                        console.log("init success");
                        comp.syncPages().then(()=> {
                            comp.syncWithDB();
                        });
                    });
                }).catch((e) => {
                    throw e;
                });
            })
            .catch((e) => {
                throw e;
            });
        }
    )
    .catch((e) => {
        throw e;
    });
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
tryDiff();