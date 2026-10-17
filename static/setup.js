// Don't do anything until the DOM loads
// First, establish socket connection and set up handlers
// Then, set up and start game
$(document).ready(function() {

    // Forms are initially hidden
    $('#confirm').hide();
    $('#yesno').hide();
    $('#select').hide();
    $('#reveal').hide();
    $('#special').hide();
    // Only the host may see game settings (player count) and the Start button.
    $('#selectPlayers').hide();
    $('#start').hide();
    if(usrctx.spectate) {
        $('#start').remove();
        $('#reveal').remove();
        $('#special').remove();
    }

    // --- Reusable error popup ---
    var errorPopupVisible = false;
    function showError(msg, onOk) {
        if (errorPopupVisible) return; // avoid stacking popups
        errorPopupVisible = true;
        $('#error-popup-msg').text(msg);
        $('#error-popup').fadeIn(150);
        $('#error-popup-ok').off('click').on('click', function() {
            $('#error-popup').fadeOut(150);
            errorPopupVisible = false;
            if (onOk) onOk();
        });
    }
    function hideError() {
        if (errorPopupVisible) {
            $('#error-popup').fadeOut(150);
            errorPopupVisible = false;
            $('#error-popup-ok').off('click');
        }
    }

    // Initial connection
    // Use same-origin/protocol so HTTPS sites don't attempt to connect over http:// (mixed content).
    // Socket.IO will automatically choose ws/wss based on the current page.
    socket = io(window.location.origin, {
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        'sync disconnect on unload': true
    });

    socket.on('connect_error', function(err) {
        console.error('Socket connect_error', err);
        showError("Impossible de se connecter au serveur. Vérifiez votre connexion et réessayez.", function() {
            window.location = "/";
        });
    });

    // --- Register ALL Socket.IO listeners BEFORE emitting anything ---
    // This guarantees we don't miss server responses that arrive quickly.

    // Receive host status from the server (only the host sees settings).
    socket.on('host_status', function(data) {
        console.debug('Received host_status', data);
        if (data && data.is_host) {
            $('#selectPlayers').show();
            $('#start').show();
        } else {
            $('#selectPlayers').hide();
            $('#start').hide();
        }
    });

    // Receive updated member list from the server
    socket.on('members', function(data) {
        console.debug('Received members', data);
        var list = $('#members-list');
        if (!list.length) return;
        list.empty();
        (data.members || []).forEach(function(name) {
            list.append('<li>' + name + '</li>');
        });
    });

    // Receive a message (chat or system)
    socket.on('message', function(msg) {
        console.debug('Received message', msg);

        // Build message
        var html = '';
        if(typeof msg.name !== 'undefined') {
            html = '<p style="margin:0"><b style="color:'+msg.color+'">'+msg.name+'</b> '+msg.data+'</p>';
        }
        else {
            html = '<p style="margin:0">';
            for(var i = 0; i < msg.strings.length; i++) {
                html += '<b style="color:'+msg.colors[i]+'">'+msg.strings[i]+'</b>';
            }
            html += '</p>';
        }

        // Put message in chatbox and snap to bottom if already at bottom
        var chat = $("#message_holder");
        var atBottom = (chat.scrollTop() == chat[0].scrollHeight - chat[0].clientHeight);
        chat.append(html);
        if (atBottom) {
            chat.scrollTop(chat[0].scrollHeight);
        }
    });

    // Receive an ask
    socket.on('ask', function(data) {

        console.debug('Received ask', data);

        // Add buttons for each option
        var option = '';
        if(data.form === 'select')
        {
            option += '<div id="popup"><br>';
            for (var i = 0; i < data.options.length; i++)
            {
                option += '<button name="inputs" type="submit" class="selectButton" value="' +
                data.options[i] + '">' + data.options[i] + '</button>';
            }
            option += '<br></div>';
        }
        else
        {
            for (var i = 0; i < data.options.length; i++)
            {
                option += '<button name="inputs" type="submit" class="button' +
                           String(i+1) + '" value="' + data.options[i] + '">' +
                           data.options[i] + '</button><br>';
            }
        }
        $('#'+data.form).append(option);

        // Add click handler to each button
        $('form [name="inputs"]').click(function() {
            $('[name="inputs"]', $(this).parents("form")).removeAttr("clicked");
            $(this).attr("clicked", "true");
        });

        // Show buttons
        $('#'+data.form).show();
    });

    // False start handler
    socket.on('false_start', function(data) {
        showError("Impossible de démarrer : vous avez demandé une partie à "+data.field+" joueurs alors qu'il y a "+data.actual+" personnes dans la salle.");
    });

    // Game error emitted by the server when the game loop crashes
    socket.on('game_error', function(data) {
        showError(data.error || "Une erreur est survenue pendant la partie.");
    });

    // Disconnect handler
    socket.on('disconnect', function(reason) {
        window.onbeforeunload = function() {};
        showError("Connexion perdue avec le serveur. Cliquez sur 'Ok' pour revenir à la page d'accueil et vous reconnecter si vous étiez en partie.", function() {
            window.location = "/";
        });
    });

    // Reconnection handlers
    var reconnecting = false;
    socket.on('reconnect_attempt', function(attemptNumber) {
        if (!reconnecting) {
            reconnecting = true;
            showError("Reconnexion au serveur en cours... (tentative " + attemptNumber + ")", null);
        }
    });
    socket.on('reconnect', function(attemptNumber) {
        reconnecting = false;
        hideError();
        // Re-join the room so the server restores the player's socket_id
        usrctx.reconnect = true;
        socket.emit('join', usrctx);
    });
    socket.on('reconnect_failed', function() {
        reconnecting = false;
        hideError();
        showError("Impossible de se reconnecter au serveur. Cliquez sur 'Ok' pour revenir à la page d'accueil.", function() {
            window.location = "/";
        });
    });

    // Close window handler
    window.onbeforeunload = function() {
        socket.close();
    }

    // --- Now that all listeners are registered, join the room ---
    socket.on('connect', function() {
        console.log('Socket connected, id=', socket.id);

        // User joins the room
        socket.emit('join', usrctx );
    });

    // Setup send message helper
    function sendMessage() {
            var user_input = $('#message').val();
            if (!user_input || !user_input.trim()) return;
            console.debug('Emitting message', user_input);
            socket.emit('message', { 'data': user_input });
            $('#message').val('').focus();
        }

        // Set up message posting with button presses
        var chat_form = $('#chat').on('submit', function(e) {
            e.preventDefault();
            sendMessage();
        });
        // Also handle send button click in case form submit handlers aren't firing
        $('#chat').on('click', '.send', function(e) {
            e.preventDefault();
            sendMessage();
        });

        // Start game button
        var start_form = $('#start').on('submit', function(e) {
            e.preventDefault();
            console.debug('Emitting start with n_players=', $('#nPlayers').val());
            socket.emit('start', { 'n_players': $('#nPlayers').val() });
        });

        // Reveal button
        var reveal_form = $('#reveal').on('submit', function(e) {
            e.preventDefault();
            $('#reveal').hide();
            socket.emit('reveal');
        });

        // Special ability button
        var special_form = $('#special').on('submit', function(e) {
            e.preventDefault();
            $('#special').hide();
            socket.emit('special');
        });

        // Form type 1
        var confirm_form = $('#confirm').on('submit', function(e) {
            e.preventDefault();
            socket.emit('answer', { 'value': $('#confirm [name="inputs"][clicked=true]').val() });
            $('#confirm').hide();
            $('#confirm').empty();
        });

        // Form type 2
        var yesno_form = $('#yesno').on('submit', function(e) {
            e.preventDefault();
            socket.emit('answer', { 'value': $('#yesno [name="inputs"][clicked=true]').val() });
            $('#yesno').hide();
            $('#yesno').empty();
        });

        // Form type 3
        var select_form = $('#select').on('submit', function(e) {
            e.preventDefault();
            socket.emit('answer', { 'value': $('#select [name="inputs"][clicked=true]').val() });
            $('#select').hide();
            $('#select').empty();
        });

        // Receive a message
        socket.on('message', function(msg) {
            console.debug('Received message', msg);

            // Build message
            var html = '';
            if(typeof msg.name !== 'undefined') {
                html = '<p style="margin:0"><b style="color:'+msg.color+'">'+msg.name+'</b> '+msg.data+'</p>';
            }
            else {
                html = '<p style="margin:0">';
                for(var i = 0; i < msg.strings.length; i++) {
                    html += '<b style="color:'+msg.colors[i]+'">'+msg.strings[i]+'</b>';
                }
                html += '</p>';
            }

            // Put message in chatbox and snap to bottom if already at bottom
            var chat = $("#message_holder");
            var atBottom = (chat.scrollTop() == chat[0].scrollHeight - chat[0].clientHeight);
            chat.append(html);
            if (atBottom) {
                chat.scrollTop(chat[0].scrollHeight);
            }
        });

        // Receive an ask
        socket.on('ask', function(data) {

            console.debug('Received ask', data);

            // Add buttons for each option
            var option = '';
            if(data.form === 'select')
            {
                option += '<div id="popup"><br>';
                for (var i = 0; i < data.options.length; i++)
                {
                    option += '<button name="inputs" type="submit" class="selectButton" value="' +
                    data.options[i] + '">' + data.options[i] + '</button>';
                }
                option += '<br></div>';
            }
            else
            {
                for (var i = 0; i < data.options.length; i++)
                {
                    option += '<button name="inputs" type="submit" class="button' +
                               String(i+1) + '" value="' + data.options[i] + '">' +
                               data.options[i] + '</button><br>';
                }
            }
            $('#'+data.form).append(option);

            // Add click handler to each button
            $('form [name="inputs"]').click(function() {
                $('[name="inputs"]', $(this).parents("form")).removeAttr("clicked");
                $(this).attr("clicked", "true");
            });

            // Show buttons
            $('#'+data.form).show();
        });

        // False start handler
        socket.on('false_start', function(data) {
            showError("Impossible de démarrer : vous avez demandé une partie à "+data.field+" joueurs alors qu'il y a "+data.actual+" personnes dans la salle.");
        });

        // Game error emitted by the server when the game loop crashes
        socket.on('game_error', function(data) {
            showError(data.error || "Une erreur est survenue pendant la partie.");
        });

        // Disconnect handler
        socket.on('disconnect', function(reason) {
            window.onbeforeunload = function() {};
            showError("Connexion perdue avec le serveur. Cliquez sur 'Ok' pour revenir à la page d'accueil et vous reconnecter si vous étiez en partie.", function() {
                window.location = "/";
            });
        });

        // Reconnection handlers
        var reconnecting = false;
        socket.on('reconnect_attempt', function(attemptNumber) {
            if (!reconnecting) {
                reconnecting = true;
                showError("Reconnexion au serveur en cours... (tentative " + attemptNumber + ")", null);
            }
        });
        socket.on('reconnect', function(attemptNumber) {
            reconnecting = false;
            hideError();
            // Re-join the room so the server restores the player's socket_id
            usrctx.reconnect = true;
            socket.emit('join', usrctx);
        });
        socket.on('reconnect_failed', function() {
            reconnecting = false;
            hideError();
            showError("Impossible de se reconnecter au serveur. Cliquez sur 'Ok' pour revenir à la page d'accueil.", function() {
                window.location = "/";
            });
        });

        // Close window handler
        window.onbeforeunload = function() {
            socket.close();
        }

        // Configure game
        var config = {
            type: Phaser.AUTO,
            width: 1066,
            height: 600,
            pixelArt: false,
            parent: 'board',
            scene: [ WaitingRoom, GameBoard ]
        };

        // Start up waiting room and phaser game
        var game = new Phaser.Game(config);
    });
});
