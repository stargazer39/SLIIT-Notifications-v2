import mysql from 'promise-mysql';
import fs from 'fs';

const CREDS_PATH = "config/credentials.json";

export class SqlConnect {
    private static sqlCreds : mysql.ConnectionConfig;
    private static connection : mysql.Connection;

    public static async init() {
        if(!this.connection){
            console.log("Sql");
            this.sqlCreds = this.getCreds();
            console.log(this.sqlCreds);
            this.connection = await mysql.createConnection(this.sqlCreds);
            return this.connection;
        }
        return this.connection;
    }

    public static getInstance() : mysql.Connection {
        if(this.connection){
            return this.connection;
        }
        throw new Error("SQL not initialzed yet. Call init() first.");
    }

    private static getCreds() {
        if(!this.sqlCreds){
            let creds = fs.readFileSync(CREDS_PATH);
            let credJson : any = JSON.parse(creds.toString());
            console.log(credJson);
            if(!Object.keys(credJson).includes("sql")){
                throw new Error("File dosent contain SQL credentials");
            }

            if(!Object.keys(credJson.sql).every((key) => ['host','user','password','database'].includes(key))){
                throw new Error("Some sql params missing");
            }
            
            return credJson["sql"];
        }else{
            return this.sqlCreds;
        }
    }
}