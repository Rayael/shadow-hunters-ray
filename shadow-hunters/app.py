#!/usr/bin/env python3
import random
import os
import re
import secrets
import html
import sys

# Ensure the current module directory is on sys.path so sibling modules can be
# imported when the app runs from a different working directory or as a module.
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Compatibility shim for older packages that import MutableMapping from
# `collections` instead of `collections.abc` (removed in Python 3.10).
import collections
try:
    from collections import MutableMapping  # type: ignore
except Exception:
    from collections.abc import MutableMapping  # type: ignore
    # Provide alias so third-party code importing from `collections` still works
    collections.MutableMapping = MutableMapping

from flask import (
    Flask, render_template, url_for, redirect,
    request, flash, send_from_directory
)
from flask_socketio import SocketIO, join_room, leave_room

from game_context import GameContext
from elements import ElementFactory
from player import Player

from helpers import color_format, get_room_id, get_reserved_words
import constants as C
import concurrency as R

# eventlet monkey-patch for async I/O (required by Flask-SocketIO in production)
import eventlet
eventlet.monkey_patch()

# app config
template_dir = os.path.abspath('./templates')
static_dir = os.path.abspath('./static')
app = Flask(
    __name__, template_folder=template_dir,
    static_folder=static_dir, static_url_path='/static'
)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
socketio = SocketIO(app, async_handlers=True, async_mode='eventlet',
                    cors_allowed_origins="*")


# disable caching
@app.after_request
def after_request(response):
    cache_control = "no-cache, no-store, must-revalidate, public, max-age=0"
    response.headers["Cache-Control"] = cache_control
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


# favicon handler
@app.route('/favicon.ico')
def favicon():
    base = os.path.join(os.path.dirname(app.root_path), 'static')
    return send_from_directory(base, 'favicon.ico')


# sleep times after socket emissions (to pace frontend)
SOCKET_SLEEP = float(os.getenv('SOCKET_SLEEP', 0.25))
AI_SLEEP = float(os.getenv('AI_SLEEP', 2.0))

# Single-room mode: fixed room id and shared access code
LOBBY_ROOM = os.getenv('LOBBY_ROOM', 'shadow-hunters')
GAME_CODE = os.getenv('GAME_CODE', 'shadowhunters')

# rooms are indexed by room_id, with a status, gc, and connections field
# status is LOBBY or GAME. gc is None if status is LOBBY, otherwise a
# GameContext object connections is a dict indexed by socket_id whose value is
# the username of that connection
# TODO replace with Redis (#209)
rooms = {}

# APP ROUTES


@app.route('/')
def join():
    return render_template('join.html')


@app.route('/rules')
def rules():
    return render_template('rules.html')


@app.route('/room', methods=['GET', 'POST'])
def room(methods=['GET', 'POST']):
    if request.method == 'POST':

        # Single-room mode: only a username is required; room_id is fixed
        username = request.form.get('username').strip()
        room_id = LOBBY_ROOM
        if not username:
            flash("Please enter a name")
            return redirect('/')

        # access control: shared access code (GAME_CODE)
        provided = request.form.get('access_code', '').strip()
        if provided != GAME_CODE:
            flash("Code d'accès incorrect")
            return redirect('/')

        # username validation
        uname_special = re.match(r"^[\w\d ]*$", username)
        if len(username) > 10:
            flash("Name must not exceed 10 characters")
            return redirect('/')
        elif not uname_special:
            flash("Name must not contain special characters")
            return redirect('/')
        elif username.isdigit():
            flash("Name must not be a number")
            return redirect('/')
        elif username == "undefined":
            flash("Name must not be 'undefined'")
            return redirect('/')
        elif username.startswith('CPU') or (username in get_reserved_words()):
            m = "The name '{}' is reserved for gameplay. Please choose another"
            flash(m.format(username))
            return redirect('/')

        # check for username taken / game already in progress
        R.connection_lock.acquire()
        if room_id in rooms:
            if username in rooms[room_id]['connections'].values():
                flash("Someone in the room has taken your name")
                R.connection_lock.release()
                return redirect('/')

            if rooms[room_id]['status'] == 'GAME':
                public_state, private_state = rooms[room_id]['gc'].dump()
                context = {
                    'name': username,
                    'room_id': room_id,
                    'spectate': True,
                    'reconnect': False,
                    'gc_data': {'public': public_state}
                }

                # Reconnect to game
                if username in rooms[room_id]['reconnections']:
                    context['spectate'] = False
                    context['reconnect'] = True
                    context['gc_data']['private'] = [
                        p for p in private_state if p['user_id'] == username][0]
                    ai_player = [p for p in rooms[room_id]
                                 ['gc'].players if p.user_id == username][0]
                R.connection_lock.release()
                return render_template('room.html', context=context)
        R.connection_lock.release()

        # send player to the single lobby room
        return render_template('room.html', context={
            'name': username,
            'room_id': room_id,
            'spectate': False,
            'reconnect': False
        })
    else:
        return redirect('/')

# SOCKET EMITTERS


def socket_ask(form, data, user_id, room_id):

    # Get player
    R.connection_lock.acquire()
    if room_id in rooms and rooms[room_id]['gc']:
        pl = [p for p in rooms[room_id]['gc'].players if p.user_id == user_id]
        player = pl[0]
    else:
        R.connection_lock.release()
        if 'Decline' in data['options'] and len(data['options']) > 1:
            data['options'].remove('Decline')
        return {'value': random.choice(data['options'])}
    R.connection_lock.release()

    # If player is a CPU, use the player's piggyback agent to make a choice
    if player.ai:
        socketio.sleep(AI_SLEEP)
        return player.agent.choose_action(
            data['options'], player=player, gc=player.gc
        )

    # Otherwise, emit ask
    sid = player.socket_id
    mailbox = rooms[room_id]['gc'].answer_bin
    data['form'] = form
    mailbox['answered'] = False
    socketio.emit('ask', data, room=sid)

    # Loop until an answer is received
    while not mailbox['answered']:
        while not mailbox['answered']:
            # If a player swaps out for an AI during an ask, the piggyback
            # agent answers for them
            if player.ai or player.socket_id != sid:
                socketio.sleep(AI_SLEEP)
                return player.agent.choose_action(
                    data['options'], player=player, gc=player.gc
                )
            socketio.sleep(SOCKET_SLEEP)

        # Validate answerer and answer
        invalid_option = mailbox['data']['value'] not in data['options']
        if mailbox['sid'] != sid or invalid_option:
            mailbox['answered'] = False

    # Return answer
    mailbox['answered'] = False
    return mailbox['data']


def socket_tell(str, args, gc, room_id, client=None):
    if not client:
        client = (room_id,)
    data = color_format(str, args, gc)
    packet = {'strings': data[0], 'colors': data[1]}
    socketio.emit('message', packet, room=client[0])
    if room_id in rooms and rooms[room_id]['gc']:
        socketio.sleep(SOCKET_SLEEP)


def socket_show(data, gc, room_id, client=None):
    assert data['type'] in ["die", "win", "reveal", "roll", "draw", "damage"]
    if not client:
        client = (room_id,)
    socketio.emit('display', data, room=client[0])
    if room_id in rooms and rooms[room_id]['gc']:
        socketio.sleep(SOCKET_SLEEP)


def socket_update(data, room_id):
    socketio.emit('update', data, room=room_id)
    if room_id in rooms and rooms[room_id]['gc']:
        socketio.sleep(SOCKET_SLEEP)


def emit_member_list(room_id):
    """Emit the list of currently connected usernames to everyone in the room."""
    if room_id in rooms:
        members = list(rooms[room_id]['connections'].values())
        socketio.emit('members', {'members': members}, room=room_id)

# SOCKET RECEIVERS


@socketio.on('connect')
def _on_connect():
    try:
        print(f"DEBUG connect: sid={request.sid}")
    except Exception:
        print("DEBUG connect: sid=unknown")


@socketio.on('start')
def on_start(json):

    # Get room and players in it
    R.connection_lock.acquire()
    room_id = get_room_id(rooms, request.sid)
    if not room_id:
        R.connection_lock.release()
        return

    people_in_room = rooms[room_id]['connections']
    names_and_sids = [(people_in_room[x], x) for x in people_in_room.keys()]

    # Check for false start
    n_players = max(min(int(json['n_players']), 8), 4)
    if len(names_and_sids) > n_players:
        R.connection_lock.release()
        packet = {'field': n_players, 'actual': len(names_and_sids)}
        socketio.emit('false_start', packet, room=request.sid)
        return

    # Initialize human and AI players
    rgb = ['rgb(245,245,245)', 'rgb(100,100,100)', 'rgb(79,182,78)',
           'rgb(62,99,171)', 'rgb(197,97,163)', 'rgb(219,62,62)',
           'rgb(249,234,48)', 'rgb(239,136,43)']
    human_players = [Player(n[0], n[1], rgb.pop(0), False)
                     for n in names_and_sids]
    ai_players = [Player("CPU_{}".format(i), str(i), rgb.pop(0), True)
                  for i in range(1, n_players - len(human_players) + 1)]
    players = human_players + ai_players

    # Initialize game context with players and emission functions
    ef = ElementFactory()
    gc = GameContext(
        players=players,
        characters=ef.CHARACTERS,
        black_cards=ef.BLACK_DECK,
        white_cards=ef.WHITE_DECK,
        hermit_cards=ef.HERMIT_DECK,
        areas=ef.AREAS,
        ask_h=lambda x, y, z: socket_ask(x, y, z, room_id),
        tell_h=None,
        show_h=None,
        update_h=None
    )
    gc.tell_h = lambda x, y, *z: socket_tell(x, y, gc, room_id, z)
    gc.show_h = lambda x, *y: socket_show(x, gc, room_id, y)
    gc.update_h = lambda: socket_update(gc.dump()[0], room_id)

    # Assign game to room
    if rooms[room_id]['status'] == 'GAME':
        R.connection_lock.release()
        return
    rooms[room_id]['gc'] = gc
    rooms[room_id]['status'] = 'GAME'

    R.connection_lock.release()

    # Send public and private game states to frontend
    gc.tell_h("Loading game...", [])
    public_state, private_state = gc.dump()
    for priv in private_state:
        data = {
            'public': public_state,
            'private': priv
        }
        socketio.emit('game_start', data, room=priv['socket_id'])
    socketio.sleep(1)
    gc.tell_h("Started a game with players {}".format(
        ", ".join(['{}'] * len(players))), [p.user_id for p in players])

    # Initiate gameplay loop
    gc.play()


@socketio.on('reveal')
def on_reveal():

    # Get room
    R.connection_lock.acquire()
    room_id = get_room_id(rooms, request.sid)

    # Make sure room and game still exist
    if room_id and rooms[room_id]['gc']:
        player = [p for p in rooms[room_id]
                  ['gc'].players if p.socket_id == request.sid][0]
    else:
        R.connection_lock.release()
        return

    # Reveal them (if they're alive and unrevealed)
    R.connection_lock.release()
    R.reveal_lock.acquire()
    if player.state == C.PlayerState.Hidden:
        player.state = C.PlayerState.Revealed  # Guard
        R.reveal_lock.release()
        player.reveal()
    else:
        R.reveal_lock.release()


@socketio.on('special')
def on_special():

    # Get room
    R.connection_lock.acquire()
    room_id = get_room_id(rooms, request.sid)

    # Make sure room and game still exist
    if room_id and rooms[room_id]['gc']:
        player = [p for p in rooms[room_id]
                  ['gc'].players if p.socket_id == request.sid][0]
    else:
        R.connection_lock.release()
        return
    R.connection_lock.release()

    # Use special
    R.reveal_lock.acquire()
    if player.state == C.PlayerState.Revealed and not player.special_active:
        player.special_active = True  # Guard
        R.reveal_lock.release()
        msg = "You've activated your special ability."
        msg += " It will take effect next time its use conditions are met."
        player.gc.tell_h(msg, [], request.sid)
        player.character.special(rooms[room_id]['gc'], player, turn_pos='now')
        rooms[room_id]['gc'].update_h()
    else:
        R.reveal_lock.release()


@socketio.on('answer')
def on_answer(json):

    # Make sure an answer isn't already being processed
    R.connection_lock.acquire()
    room_id = get_room_id(rooms, request.sid)

    # Define some checks (functions, not booleans, to preserve short-circuit)
    def not_in_game(rid):
        return rooms[rid]['status'] != 'GAME'

    def room_bin_answered(rid):
        rooms[room_id]['gc'].answer_bin['answered']

    if not room_id or not_in_game(room_id) or room_bin_answered(room_id):
        R.connection_lock.release()
        return
    bin = rooms[room_id]['gc'].answer_bin

    # Fill answer bin
    bin['data'] = json
    bin['sid'] = request.sid
    bin['answered'] = True
    R.connection_lock.release()


@socketio.on('message')
def on_message(json):

    # Message fields
    try:
        print(f"DEBUG on_message recv: sid={request.sid} payload={json}")
    except Exception:
        print(f"DEBUG on_message recv: sid=unknown payload={json}")

    R.connection_lock.acquire()
    room_id = get_room_id(rooms, request.sid)
    if not room_id:
        # Socket is not in any room; silently drop the message
        R.connection_lock.release()
        return
    json['name'] = rooms[room_id]['connections'][request.sid]

    # If player is not in game, or spectating, their color is grey
    if (rooms[room_id]['status'] != 'GAME') or (request.sid not in [
            p.socket_id for p in rooms[room_id]['gc'].players]):
        json['color'] = C.TEXT_COLORS['server']
    else:
        json['color'] = [p.color for p in rooms[room_id]
                         ['gc'].players if p.socket_id == request.sid][0]
    R.connection_lock.release()

    # Broadcast non-empty message
    if 'data' in json and json['data'].strip():
        json['data'] = html.escape(json['data'])
        socketio.emit('message', json, room=room_id)


@socketio.on('join')
def on_join(json):

    # Single-room mode: force the fixed lobby room id
    room_id = LOBBY_ROOM
    name = json['name']
    reconnect = json.get('reconnect', False)
    spectate = json.get('spectate', False)

    try:
        print(f"DEBUG on_join: sid={request.sid} room_id={room_id} name={name} reconnect={reconnect} spectate={spectate}")
    except Exception:
        print("DEBUG on_join: sid=unknown")

    # Tell everyone about the join
    msg = '{} has joined the room!'
    if spectate:
        msg = '{} has joined the room as a spectator!'
    elif reconnect:
        msg = '{} has rejoined the room!'
    socket_tell(msg, [name], None, room_id)

    # Create room if it doesn't exist and add player to room
    R.connection_lock.acquire()
    if room_id not in rooms:
        if spectate or reconnect:
            R.connection_lock.release()
            socketio.disconnect(request.sid)
            return
        rooms[room_id] = {'status': 'LOBBY', 'gc': None,
                          'connections': {}, 'reconnections': {}}

    # If this is a reconnection event, change player's socket id and AI status
    # in game context
    if reconnect:
        del rooms[room_id]['reconnections'][name]
        player = [p for p in rooms[room_id]
                  ['gc'].players if p.user_id == name][0]
        player.socket_id = request.sid
        player.ai = False

    # Add new player to room
    rooms[room_id]['connections'][request.sid] = name
    join_room(room_id)
    R.connection_lock.release()

    # Emit welcome message to new player
    msg = 'Welcome to Shadow Hunters Room: ' + room_id
    if spectate:
        msg = 'You are now spectating Shadow Hunters Room: ' + room_id
    elif reconnect:
        msg = 'You\'ve rejoined your game in Shadow Hunters Room: ' + room_id
    socket_tell(msg, [], None, room_id, client=(request.sid,))

    # Tell player about other room members
    members = [x for x in rooms[room_id]['connections'].values() if x != name]
    msg = 'There\'s no one else here!'
    if members:
        msg = 'Other players in the room: ' + ', '.join(members)
    if not reconnect:
        socket_tell(msg, [], None, room_id, client=(request.sid,))

    # Broadcast updated member list to everyone in the room
    emit_member_list(room_id)


@socketio.on('disconnect')
def on_disconnect():

    # Get room_id, name, and game context
    room_id = get_room_id(rooms, request.sid)
    if not room_id:
        # Socket was not in any room; nothing to clean up
        return
    name = rooms[room_id]['connections'][request.sid]
    gc = rooms[room_id]['gc']
    socket_tell('{} has left the room', [name], gc, room_id)

    # Remove user from the room, gracefully handling duplicate disconnects
    R.connection_lock.acquire()
    if request.sid in rooms[room_id]['connections']:
        rooms[room_id]['connections'].pop(request.sid)

    # Close room if it is now empty, or replace player with AI if it's in game
    if not rooms[room_id]['connections'].keys():

        # Close the room
        if gc and [p for p in gc.players if p.socket_id == request.sid]:
            [p for p in gc.players if p.socket_id == request.sid][0].ai = True
            gc.tell_h = lambda x, y, *z: 0
            gc.show_h = lambda x, *y: 0
            gc.update_h = lambda: 0
        socketio.close_room(room_id)
        if room_id in rooms:
            rooms.pop(room_id)
        R.connection_lock.release()

    elif gc and not gc.game_over:

        # If disconnected person was spectating, or dead, or if the game is
        # over, don't swap them for an AI
        player_in_game = [p for p in gc.players if p.socket_id == request.sid]
        if not player_in_game or player_in_game[0].state == C.PlayerState.Dead:
            R.connection_lock.release()
            emit_member_list(room_id)
            return

        # Swap player for AI
        player_in_game[0].ai = True
        rooms[room_id]['reconnections'][player_in_game[0].user_id] = 'cookie'
        R.connection_lock.release()
        emit_member_list(room_id)
        socket_tell('A computer player has taken their place!',
                    [], gc, room_id)

    else:

        # Always release lock!
        R.connection_lock.release()
        emit_member_list(room_id)


if __name__ == '__main__':
    # In production, use the PORT provided by the platform (Railway)
    port = int(os.getenv('PORT', 5000))
    # Disable debug in production
    socketio.run(app, debug=False, host="0.0.0.0", port=port)
