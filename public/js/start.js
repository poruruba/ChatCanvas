'use strict';

//const vConsole = new VConsole();
//window.datgui = new dat.GUI();

const base_url2 = "【Node.jsサーバのURL】";
const base_url = "【HerokuのURL】"; // Herokuを中継する場合

const room_name = "マイホーム";

const UPDATE_INTERVAL = 5000;
const icon_list = [
    "boy_01.png",
    "boy_02.png",
    "boy_03.png",
    "girl_13.png",
    "girl_14.png",
    "girl_15.png",
    "man_49.png",
    "man_50.png",
    "man_51.png",
    "oldman_73.png",
    "oldman_74.png",
    "oldman_75.png",
    "oldwoman_85.png",
    "oldwoman_86.png",
    "oldwoman_87.png",
    "woman_61.png",
    "woman_62.png",
    "woman_63.png",
    "youngman_25.png",
    "youngman_26.png",
    "youngman_27.png",
    "youngwoman_37.png",
    "youngwoman_38.png",
    "youngwoman_39.png",
];

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    data: {
        icon_selecting: 0,
        icon_mine: "",
        icon_list: icon_list,
        chat_list: [],
        message: "",
        margin: 0,
        last_chat_time: 0,
        connected: false,
        room: room_name,
    },
    computed: {
    },
    methods: {
        icon_flip: function(prev){
            if( prev ){
                if( this.icon_selecting > 0 )
                    this.icon_selecting--;
            }else{
                if( this.icon_selecting < this.icon_list.length - 1 )
                    this.icon_selecting++;
            }
        },
        append_sign: async function(sign){
            if( this.connected ){
                window.interactiveCanvas.sendTextQuery("そうそう、" + sign);
            }else{
                var json = await do_post(base_url + "/chatcanvas-put-chat", {
                    room: this.room,
                    character: this.icon_mine,
                    redirect_uri: base_url2,
                    sign: sign });
                console.log(json);
            }
        },
        append_chat: async function(){
            if( this.connected ){
                window.interactiveCanvas.sendTextQuery("ねえねえ、" + this.message);
            }else{
                var json = await do_post(base_url + "/chatcanvas-put-chat", {
                    room: this.room,
                    character: this.icon_mine,
                    redirect_uri: base_url2,
                    message: this.message });
                console.log(json);
            }
        },
        start_chat: async function(){
            if( !this.icon_mine )
                return;
            window.interactiveCanvas.sendTextQuery("私の名前は " + this.icon_mine + " です。");
        },
        character_select: async function(){
            this.icon_mine = this.icon_list[this.icon_selecting];
            window.interactiveCanvas.setCanvasState({
                character: this.icon_mine,
                room: this.room
            });
            this.start_chat();
            this.dialog_close('#character_select_dialog');

            try{
                var json = await do_post(base_url + "/chatcanvas-get-chat", {
                    room: this.room,
                    start: this.last_chat_time,
                    redirect_uri: base_url2,
                });
                if( json.status == 'ok' ){
                    this.append_chat_list(json);
                } 
                setInterval(async () =>{
                    console.log('setInterval function called');
                    var json = await do_post(base_url + "/chatcanvas-get-chat", {
                        room: this.room,
                        start: this.last_chat_time,
                        redirect_uri: base_url2,
                    });
                    if( json.status == 'ok' ){
                        this.append_chat_list(json);
                    } 
                }, UPDATE_INTERVAL);
            }catch(error){
                console.log(error);
                alert(error);
            }
        },
        append_chat_list: function(json){
            this.last_chat_time = json.time;
            if( json.list.length <= 0 )
                return;

            for( var i = 0 ; i < json.list.length ; i++ ){
                var talk = json.list[i];
                var date = new Date(talk.post_time);
                if( talk.character == this.icon_mine ){
                    this.chat_list.push({
                        align: "right",
                        message: talk.message,
                        sign: talk.sign,
                        date: date.toLocaleString(),
                    });
                }else{
                    this.chat_list.push({
                        align: "left",
                        message: talk.message,
                        sign: talk.sign,
                        date: date.toLocaleString(),
                        character: talk.character
                    });
                }
            }
            this.$nextTick(() =>{
                const el = document.getElementById('el');
                el.scrollTo(0, el.scrollHeight);
            });
        },
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        window.interactiveCanvas.getHeaderHeightPx()
        .then(height => {
            console.log("getHeaderHeightPx:" + height);
            this.margin = height;

            const callbacks = {
                onUpdate: (data) => {
                    console.log(data);
                    if( !this.connected ){
                        this.connected = true;
                    }
                }
            };
            window.interactiveCanvas.ready(callbacks);
    
            this.dialog_open('#character_select_dialog');
        });
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );
