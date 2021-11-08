import { SubPage } from "../SubPage";
import { ISliitPage } from "./ISliitPage"
import tough  from "tough-cookie";
import axios from "axios";
import axiosRetry from "axios-retry";
import cheerio from "cheerio";
import { AssertError } from "./AssertErrors";

axiosRetry(axios, { retries: 10, shouldResetTimeout: true });

export class SliitPage extends SubPage {
    protected extra : ISliitPage;

    constructor(id : number, name : string, fullURL : string){
        super(id,name,fullURL);
    }

    public setExtra(sliitExtra : ISliitPage){
        this.extra = sliitExtra;
    }

    public async getPage(): Promise<cheerio.Root> {
        let modulePage = await axios.get(this.fullURL, { jar: this.extra.cookieJar, withCredentials: true });
        const $ = cheerio.load(modulePage.data);
        
        AssertError.assertTimeout($);
        AssertError.assertUsername($, this.extra.username);

        return $;
    }

    public async getContent(): Promise<string> {
        let done = false;
        const $ = await this.getPage();
        return $.html($(".course-content"));
    }
    
}