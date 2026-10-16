// this is the scene that will be used in the waiting room, i.e. before the game starts
var WaitingRoom = new Phaser.Class ({
    Extends: Phaser.Scene,

    initialize:

    function Room () {
        Phaser.Scene.call(this, {key: 'menu'});
    },

    preload: function () {
        // url where gfx resources are stored
        var gfx = "/static/gfx/";
        this.load.svg('background', gfx + 'background.svg', {width: 1066, height: 600});
    },

    create: function () {
        var self = this;

        //this resizes the background image to fit into our canvas
        var background = this.add.image(533, 300, 'background');
        background.setScale(1);

        // Waiting-room UI: who is connected and that we are waiting for the host to start.
        this.waitingTitle = this.add.text(533, 250, 'En attente du démarrage de la partie…', {
            font: '22px Palatino', fill: '#ffffff', align: 'center'
        }).setOrigin(0.5);
        this.waitingList = this.add.text(533, 295, '', {
            font: '16px Palatino', fill: '#cccccc', align: 'center',
            wordWrap: { width: 900, useAdvancedWrap: true }
        }).setOrigin(0.5);

        //SOCKET CALL! if game start button pressed, then we switch scenes and go to the game board
        socket.on("game_start", function (data) {
            self.scene.start('board', data);
        });

        // Keep the member list up to date while waiting (reconnects included).
        socket.on("members", function (data) {
            var members = data.members || [];
            self.waitingList.setText(
                members.length > 0
                    ? 'Joueurs connectés : ' + members.join(', ')
                    : 'Vous êtes seul dans la salle'
            );
        });
    }
});
