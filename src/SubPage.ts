import cheerio from "cheerio";

export abstract class SubPage {
    protected id : number;
    protected name : string;
    protected fullURL : string;
    
    constructor(id : number, name : string, fullURL : string){
        this.id = id;
        this.name = name;
        this.fullURL = fullURL;
    }
    
    public abstract getPage(): Promise<cheerio.Root>;
    public abstract getContent(): Promise<string>;

    public getId() : number {
        return this.id;
    }

    public setName(name : string) : void {
        this.name = name;
    }

    public getName(): string {
        return this.name;
    }

    public getfullURL(): string{
        return this.fullURL;
    }

    public setfullURL(fullURL : string){
        this.fullURL = fullURL;
    }
}