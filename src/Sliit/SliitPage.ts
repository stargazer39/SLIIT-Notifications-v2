import { SubPage } from "../SubPage";
import { ISliitPage } from "./ISliitPage"
import tough  from "tough-cookie";
import axios from "axios";
import cheerio from "cheerio";

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
        
        // Assert if logged in
        if(!this.assertLogin($, this.extra.username )){
            // throw new UsenameAssertionError("Assertion Error.");
            // TODO - Have common errors for Page object
            throw new Error("Assertion faild");
        }

        return $;
    }

    private assertLogin(root : cheerio.Root, username : string) : boolean{
        const user_string = root("#loggedin-user .usertext").text();

        if(user_string && user_string.toLowerCase().indexOf(username.toLowerCase()) > -1){
            return true;
        }else{
            return false;
        }
    }
    public async getContent(): Promise<string> {
        const $ = await this.getPage();
        return $.html($(".course-content"));
    }
    
}