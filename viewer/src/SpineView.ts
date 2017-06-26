namespace ui {

    import Skeleton  = Laya.Skeleton;
    import Event     = Laya.Event;

    export class SpineView extends Laya.Component {
        private static __options:any = {"isDebugEnabled":false};
        static debugLog(message?: any, ...optionalParams: any[]):void {
            (SpineView.__options["isDebugEnabled"])
            &&(console.log(message, ...optionalParams));
        }

        public static LOADCOMPLETE : string = "::SPINEVIEW:LOADCOMPLETE";

        private _aniPath:string;
        public aniName:string;
        public isLoop:boolean = false;
        public isInitPlay:boolean = false;
        private isSpineAni:boolean = false;
        private aniRate:number = 1;

        private mAniPath:string;
        private mFactory:Laya.SpineAnimationTemplet;
        private mArmature:Skeleton;
        private _cb : any;

        set aniPath(value: string) {
            this._aniPath = value;
            if(this.mFactory){
                delete this.mFactory;
                this.mFactory = null;
            }

            this.mFactory = new Laya.SpineAnimationTemplet();
            this.mFactory.once(Event.COMPLETE, this, this.parseComplete);
            this.mFactory.once(Event.ERROR, this, this.onError);

            if(this.isSpineAni) {
                this.mFactory.loadSpineAni("spine",this._aniPath);
            }
            else {
                this.mAniPath = value;//"commonfx.d/"+this._aniPath + ".sk";
                this.mFactory.loadAni(this.mAniPath);
            }
        }

        get aniPath(): string {
            return this._aniPath ? this._aniPath : "";
        }


        private onError():void
        {
            console.error("SpineView: Load animation error.");
        }

        private parseComplete():void {

            //创建模式为0
            this.mArmature = this.mFactory.buildArmature(0);
            this.mArmature.x = 0;
            this.mArmature.y = 0;
            this.addChild(this.mArmature);
            if (this.isInitPlay){
                this.play();
            }
            SpineView.debugLog("SpineView: parseCompleted.");

            this.event(ui.SpineView.LOADCOMPLETE);
        }

        onClose(){
            if (this.mArmature)
                this.mArmature.destroy(true);
        }

        onStop(){

            if (this._cb) this._cb();
        }

        play(animeName?:string,isLoop?:boolean, cb?: () => void):void{

            if (cb){
                this._cb = cb;
                this.mArmature.once(Event.STOPPED, this, this.onStop);
            }
            if (!this.mArmature){
                return;}

            if (isLoop!=null)
                this.isLoop = isLoop;

            if (animeName){
                this.mArmature.play(animeName,this.isLoop);
                this.mArmature.playbackRate(this.aniRate);
            }else if (this.aniName){
                this.mArmature.play(this.aniName,this.isLoop);
                this.mArmature.playbackRate(this.aniRate);
            }else{
                this.mArmature.play(0,this.isLoop);
                this.mArmature.playbackRate(this.aniRate);
            }
        }

        stop():void{
            if (this.mArmature) this.mArmature.stop();
        }


    }
}
