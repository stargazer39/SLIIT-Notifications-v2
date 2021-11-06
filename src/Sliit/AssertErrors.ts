import cheerio from "cheerio";
import { SessionTimeoutError } from "../Errors/SessionTimeoutError";
import { UserNameAssertionError } from "../Errors/UserNameAssertionError";

export class AssertError {
    public static assertTimeout($ : cheerio.Root){
        const timeout_string : string = $("span.error").html();
        if (timeout_string && timeout_string.toLowerCase().indexOf("timed out") > -1)
            throw new SessionTimeoutError("Session time out");
    }

    public static assertUsername($ : cheerio.Root, username : string){
        const user_string = $("#loggedin-user .usertext").text();

        if(user_string && user_string.toLowerCase().indexOf(username.toLowerCase()) < 0)
            throw new UserNameAssertionError("Username assertion error");
    }
}