import { TelegramBot } from "./telegram2";
import { SqlConnect } from "./sql";

SqlConnect.init().then(
    (conn)=> {
        TelegramBot.init().then(() => {
            console.log("Test passses.");
            TelegramBot.start().then(() => {
                console.log("Bot successfully stared.");
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
