import { SiteComparable } from "../SiteCompareble";
import { ISliitComparebleExtra } from "./ISliitComparebleExtra"; 
import { SliitPage } from "./SliitPage";
import { SubPage } from "../SubPage";
import { SqlConnect } from "../SqlConnect";
import { compareHTML } from "../DomCompare";

import axios from "axios";
import axiosCookieJarSupport from "axios-cookiejar-support";
import cheerio from "cheerio";
import querystring from "querystring";
import tough from "tough-cookie";
import mysql from "promise-mysql";
import fs from "fs";
import zlib from "zlib";

axiosCookieJarSupport(axios);

export class SliitCompareble extends SiteComparable {
    private extra : ISliitComparebleExtra = null;
    private cookieJar : tough.CookieJar = new tough.CookieJar();

    constructor(id : number, name : string){
        super(id,name);
    }
    
    public getPage(id: string): SubPage {
        throw new Error("Method not implemented.");
    }
    public async init(extra : ISliitComparebleExtra): Promise<void> {
        this.extra = extra;
        console.log(extra);
        if(! await this.login()) {
            throw new Error(`Login falied on site id ${this.id}`);
        }else{
            console.log("Login success");
        }
    }

    public async syncPages(): Promise<void> {
        let res, $;
        res = await axios.get("https://courseweb.sliit.lk/my/",{ jar:this.cookieJar, withCredentials: true });
        $ = cheerio.load(res.data);
        
        // Assert if logged in
        if(!this.assertLogin($, this.extra.username)){
            //throw new UsenameAssertionError("Assertion Error.");
            throw new Error("Username Assertion error");
        }

        // Get existing sites
        const mycourses = $("a[title='My courses'] ~ ul > li a");
        
        // Get existing data in the database
        let conn = SqlConnect.getInstance();
        let existing = await conn.query({
            sql:"SELECT id, name, full_url FROM sub_pages WHERE site_id = ?;",
            values: [this.id]
        });

        // Add to Hash Table
        let existingMap = new Map<string,{  id : number, fullURL: string }>();

        for(let p of existing){
            existingMap.set(p.name, {
                id: p.id,
                fullURL: p.full_url
            });
        }
        

        for(const c of mycourses){
            let elem = $(c);
            let name = elem.text().trim();

            let id = 0;
            if(name) { 
                let href =  elem.attr("href");

                try{
                    if(existingMap.has(name)){
                        let p =  existingMap.get(name)
                        console.log(p);
                        // check with the current subpages in the instance
                        let obj = this.subPages.get(name);
                        if(obj) {
                            if(obj.getfullURL() !== p.fullURL){
                                throw new Error("URL has changed of one of the sites. Need attention.");
                            }
                        }
                        console.log("has name "+ name);

                        // Add to the existing object array

                        // TODO - update database
                    }else{
                        // Add this page to database
                        let now = new Date();
                        console.log("no name " + name);
                        let page = await conn.query({
                            sql:`INSERT INTO sub_pages(
                                site_id,
                                name,
                                added_date,
                                last_synced,
                                full_url
                            ) VALUES (?,?,?,?,?);`,
                            values:[this.id, name, now, now, href]
                        });

                        console.dir(page.id);
                    }
                    

                    
                    // let sp = new SliitPage(id++, name, href);
                    // sp.setExtra({
                    //     username: this.extra.username,
                    //     cookieJar: this.extra.cookieJar
                    // });
                    // this.setSubPage(sp);
                }catch(e){
                    console.log(e);
                }
                
            }
        }

        // Refresh objects
        let pages = await conn.query({
            sql:"SELECT id, name, site_id, added_date, last_synced, full_url FROM sub_pages WHERE site_id = ?",
            values:[this.id]
        });

        // Delete all objects
        for(let k of this.subPages.keys()){
            this.subPages.delete(k);
        }
        // Add all agin
        for(let p of pages){
            // console.log(p);
            let sp = new SliitPage(p.id, p.name, p.full_url);
            sp.setExtra({
                username: this.extra.username,
                cookieJar: this.cookieJar
            });

            this.subPages.set(p.name, sp);
        }

    }


    public async reloadSubPages(): Promise<void> {
        // throw new Error("Method not implemented.");
        if(!await this.login()) {
            throw new Error(`Login falied on site id ${this.id}`);
        }

        this.subPages.forEach((page : SliitPage) => {
            page.setExtra({
                username: this.extra.username,
                cookieJar: this.cookieJar
            });
        })
    }

    public async syncWithDB() : Promise<void> {
        let conn = SqlConnect.getInstance();

        for(let[key, obj] of this.subPages.entries()){
            console.log(`Syncing ${obj.getId()}, name = ${obj.getName()}`);
            // Get last history
            let history = await conn.query({
                sql:"SELECT id, page_source FROM page_history WHERE sub_page_id = ? ORDER BY id DESC LIMIT 1",
                values:[obj.getId()]
            });

            if(history.length === 0){
                console.log("No histroy. Adding page..");
                let content = await obj.getContent();
                

                content =  zlib.deflateSync(content).toString('base64');
                // fs.writeFileSync(`./${key.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html.txt`,content);
                await conn.query({
                    sql:"INSERT INTO page_history(sub_page_id, page_source, page_history, date_added) VALUES(?,?,?,?)",
                    values:[obj.getId(), content, "{}", new Date().toISOString().slice(0, 19).replace('T', ' ')]
                });
            }else{
                // console.log("history found...");
                let page_now = await obj.getContent();
                //fs.writeFileSync(`./tmp/${key.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`,page_now);
                //fs.writeFileSync(`./tmp/${key.replace(/[^a-z0-9]/gi, '_').toLowerCase()}new.html`,page_now);
                //throw new Error();
                if(!page_now){
                    throw new Error(`Page data is not available.. Maybe ${this.name}@${this.id}} layout changed?`);
                }

                let page_old = zlib.inflateSync(Buffer.from(history[0].page_source, 'base64')).toString();
                
                // Compare two pages
                let result = compareHTML(page_old, page_now)

                if(typeof(result.different) != 'boolean'){
                    throw new Error("Result different is not boolean.");
                }
                let sections : any[] = [];

                if(result.different === true){
                    console.log(`ID : ${obj.getId()} ${obj.getName()} has changed. Updating..`);
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
                    // add to database
                    console.dir(section_htmls);
                }
            }
        }
    }

    private async login(): Promise<boolean> {
        await axios.get("https://courseweb.sliit.lk/", { jar: this.cookieJar, withCredentials: true });
        let loggedInPage = await axios.post("https://courseweb.sliit.lk/login/index.php?authldap_skipntlmsso=1",
                                    querystring.stringify({
                                        username:this.extra.username,
                                        password:this.extra.password
                                    }),{
                                    headers:{
                                        "Content-Type":"application/x-www-form-urlencoded",
                                    },
                                    jar:this.cookieJar,
                                    withCredentials: true
                                });
        fs.writeFileSync("./pp.html",loggedInPage.data);
        let doc = cheerio.load(loggedInPage.data)
        return this.assertLogin(doc, this.extra.username);
    }

    public setSubPage(page: SubPage) {
        this.subPages.set(page.getName(),page);
    }
    
    private assertLogin(root : cheerio.Root, username : string) : boolean{
        const user_string = root("#loggedin-user .usertext").text();

        console.log(`user ${user_string}`);
        if(user_string && user_string.toLowerCase().indexOf(username.toLowerCase()) > -1){
            return true;
        }else{
            return false;
        }
    }
}