import mysql from 'promise-mysql';

export class SqlConnect {
    private static connection : mysql.Connection;

    public static async init() {
        console.log(process.env.SQL_HOST);
        if(!this.connection){
            this.connection = await mysql.createConnection({
                host: process.env.SQL_HOST,
                user: process.env.SQL_USER,
                password: process.env.SQL_PASSWORD,
                database: process.env.SQL_DATABASE
            });
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
}