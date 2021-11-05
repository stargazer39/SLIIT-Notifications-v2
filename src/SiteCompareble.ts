import { SubPage } from "./SubPage";
import { ISiteComparebleExtra } from "./ISiteComparebleExtra";

export abstract class SiteComparable {
    protected subPages : Map<string, SubPage> = new Map<string, SubPage>();
    protected id : number;
    protected name : string;
    
    constructor(id : number, name : string){
        this.id = id;
        this.name = name;
    }

    public abstract init(extra : ISiteComparebleExtra): Promise<void>;
    public abstract reloadSubPages(): Promise<void>;
    public abstract getPage(id : string) : SubPage;
    public abstract setSubPage(page : SubPage) : void;
    public abstract syncPages(): Promise<void>;
    public abstract syncWithDB() : Promise<void>;
}