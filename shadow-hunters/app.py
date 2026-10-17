#!/usr/bin/env python3
import random
import os
import re
import secrets
import html
import sys
import time

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

import logging
import json
from datetime import datetime, timezone

# Structured JSON logging on stdout.
class _JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            'ts': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        if record.exc_info:
            payload['exc_info'] = self.formatException(record.exc_info)
        return json.dumps(payload)

_log_handler = logging.StreamHandler()
_log_handler.setFormatter(_JsonFormatter())
game_logger = logging.getLogger('shadow-hunters')
game_logger.setLevel(os.getenv('LOG_LEVEL', 'INFO').upper())
game_logger.addHandler(_log_handler)
game_logger.propagate = False

# Room store abstraction: in-memory by default, Redis-backed metadata when
# REDIS_URL is set. The live GameContext stays bound to the local process.
class RoomStore:
    def __init__(self):
        self._rooms = {}
        self._redis = None
        redis_url = os.getenv('REDIS_URL')
        if redis_url:
            try:
                import redis as _redis  # type: ignore
                self._redis = _redis.from_url(redis_url, decode_responses=True)
                self._redis.ping()
                game_logger.info('Redis room store connected')
            except Exception:  # noqa: BLE001
                game_logger.warning('Redis unavailable; falling back to in-memory rooms')
                self._redis = None

    def __contains__(self, room_id):
        return room_id in self._rooms

    def __getitem__(self, room_id):
        return self._rooms[room_id]

    def __setitem__(self, room_id, value):
        self._rooms[room_id] = value
        self._persist(room_id)

    def __delitem__(self, room_id):
        self._rooms.pop(room_id, None)
        if self._redis:
            try:
                self._redis.delete(f'rooms:{room_id}')
            except Exception:  # noqa: BLE001
                pass

    def get(self, room_id, default=None):
        return self._rooms.get(room_id, default)

    def pop(self, room_id, default=None):
        self.__delitem__(room_id)
        return self._rooms.pop(room_id, default)

    def keys(self):
        return self._rooms.keys()

    def _persist(self, room_id):
        if not self._redis:
            return
        try:
            room = self._rooms[room_id]
            payload = {
                'status': room['status'],
                'connections': json.dumps(room['connections']),
                'reconnections': json.dumps(room.get('reconnections', {})),
            }
            self._redis.hset(f'rooms:{room_id}', mapping=payload)
        except Exception:  # noqa: BLE001
            game_logger.warning('Redis persist failed for %s', room_id)

# app config
template_dir = os.path.abspath('./templates')
static_dir = os.path.abspath('./static')
app = Flask(
    __name__, template_folder=template_dir,
    static_folder=static_dir, static_url_path='/static'
)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
socketio = SocketIO(app, async_handlers=True, async_mode='threading',
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

# Maximum seconds to wait for a human player to answer an `ask`. After that
# an automatic answer is chosen so the game loop never blocks forever.
ASK_TIMEOUT = float(os.getenv('ASK_TIMEOUT', '60'))

# Single-room mode: fixed room id and shared access code
LOBBY_ROOM = os.getenv('LOBBY_ROOM', 'shadow-hunters')
GAME_CODE = os.getenv('GAME_CODE', 'EDGAR')

# rooms are indexed by room_id, with a status, gc, and connections field
# status is LOBBY or GAME. gc is None if status is LOBBY, otherwise a
# GameContext object connections is a dict indexed by socket_id whose value is
# the username of that connection
# Backed by RoomStore (in-memory by default, Redis metadata when REDIS_URL is set).
rooms = RoomStore()

# APP ROUTES


@app.route('/')
def join():
    return render_template('join.html')


@app.route('/rules')
def rules():
    return render_template('rules.html')


@app.route('/healthz')
def healthz():
    """Health-check endpoint for load balancers / orchestrators."""
    return {'status': 'ok'}, 200


@app.route('/room', methods=['GET', 'POST'])
def room(methods=['GET', 'POST']):
    if request.method == 'POST':

        # Single-room mode: only a username is required; room_id is fixed
        username = (request.form.get('username') or '').strip()
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

    # Loop until an answer is received (with a hard timeout so a missing
    # human response can never freeze the whole game loop).
    deadline = time.time() + ASK_TIMEOUT
    auto_answered = False
    while not mailbox['answered']:
        if time.time() > deadline:
            auto_answered = True
            mailbox['answered'] = True
            mailbox['sid'] = sid
            mailbox['data'] = {'value': data['options'][0]}
            game_logger.warning(
                'ask timeout for player %s in room %s: auto-answering %r',
                player.user_id, room_id, data['options'][0],
            )
            socket_tell(
                "{} n'a pas répondu à temps : réponse automatique.",
                [player.user_id], gc, room_id)
            break
        while not mailbox['answered']:
            # If a player swaps out for an AI during an ask, the piggyback
            # agent answers for them
            if player.ai or player.socket_id != sid:
                socketio.sleep(AI_SLEEP)
                return player.agent.choose_action(
                    data['options'], player=player, gc=player.gc
                )
            # Re-check the deadline while sleeping
            if time.time() > deadline:
                break
            socketio.sleep(SOCKET_SLEEP)

        # Validate answerer and answer
        invalid_option = mailbox['data']['value'] not in data['options']
        if mailbox['sid'] != sid or invalid_option:
            mailbox['answered'] = False
        elif auto_answered:
            break

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


def socket_game_error(message, room_id=None, client=None):
    """Emit a user-facing game error so the client can show an error popup.

    `message` is shown to the player(s). If `client` is given it is a
    single-sid target, otherwise the whole room is notified.
    """
    packet = {'error': str(message)}
    if client:
        socketio.emit('game_error', packet, room=client[0])
    elif room_id:
        socketio.emit('game_error', packet, room=room_id)
    if room_id in rooms and rooms[room_id]['gc']:
        socketio.sleep(SOCKET_SLEEP)


def reset_room_to_lobby(room_id):
    """Reset a room to LOBBY state after a crash / error."""
    R.connection_lock.acquire()
    try:
        if room_id in rooms:
            rooms[room_id]['gc'] = None
            rooms[room_id]['status'] = 'LOBBY'
            rooms[room_id]['reconnections'] = {}
            rooms[room_id].pop('host_sid', None)
    finally:
        R.connection_lock.release()
    emit_member_list(room_id)

# SOCKET RECEIVERS


@socketio.on('connect')
def _on_connect():
    game_logger.debug('connect: sid=%s', request.sid)


@socketio.on('start')
def on_start(json):
    room_id = None
    try:
        # Guard against missing / malformed payload
        if not isinstance(json, dict):
            json = {}

        # Get room and players in it
        R.connection_lock.acquire()
        room_id = get_room_id(rooms, request.sid)
        if not room_id:
            R.connection_lock.release()
            return

        # Double-start guard: if a game is already running in this room,
        # ignore any additional start requests.
        if rooms[room_id]['status'] == 'GAME':
            R.connection_lock.release()
            return

        # Host-only guard: only the host may start the game.
        host_sid = rooms[room_id].get('host_sid')
        if host_sid and request.sid != host_sid:
            R.connection_lock.release()
            socket_game_error(
                "Seul l'hôte peut démarrer la partie.", client=(request.sid,))
            return

        people_in_room = rooms[room_id]['connections']
        names_and_sids = [(people_in_room[x], x) for x in people_in_room.keys()]

        # Check for false start
        n_players = max(min(int(json.get('n_players', 4)), 8), 4)
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
    except Exception as exc:  # noqa: BLE001 - keep the game alive on any crash
        game_logger.exception('on_start failed')
        if room_id:
            socket_game_error(
                "Erreur interne : la partie n'a pas pu démarrer. "
                "Réessayez depuis le lobby.", room_id=room_id)
            reset_room_to_lobby(room_id)
        else:
            socket_game_error(
                "Erreur interne : la partie n'a pas pu démarrer.",
                client=(request.sid,))


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

    # Debug
    game_logger.debug('on_message recv: sid=%s payload=%s', request.sid, json)

    # Guard against non-dict payloads
    if not isinstance(json, dict):
        game_logger.warning('on_message: non-dict payload from sid=%s', request.sid)
        return

    room_id = None
    name = 'Unknown'
    color = C.TEXT_COLORS['server']

    R.connection_lock.acquire()
    try:
        room_id = get_room_id(rooms, request.sid)
        if not room_id:
            # Socket is not in any room; silently drop the message
            return

        name = rooms[room_id]['connections'].get(request.sid, 'Unknown')

        # If player is not in game, or spectating, their color is grey
        if (rooms[room_id]['status'] != 'GAME') or (
                request.sid not in [p.socket_id for p in rooms[room_id]['gc'].players]):
            color = C.TEXT_COLORS['server']
        else:
            color = [p.color for p in rooms[room_id]
                     ['gc'].players if p.socket_id == request.sid][0]
    finally:
        R.connection_lock.release()

    # Broadcast non-empty message (HTML-escaped to prevent XSS)
    user_input = json.get('data', '')
    if user_input and str(user_input).strip():
        packet = {
            'data': html.escape(str(user_input)),
            'name': name,
            'color': color,
        }
        socketio.emit('message', packet, room=room_id)


@socketio.on('join')
def on_join(json):

    # Single-room mode: force the fixed lobby room id
    room_id = LOBBY_ROOM
    name = json['name']
    reconnect = json.get('reconnect', False)
    spectate = json.get('spectate', False)

    game_logger.debug(
        'on_join: sid=%s room_id=%s name=%s reconnect=%s spectate=%s',
        request.sid, room_id, name, reconnect, spectate,
    )

    # Tell everyone about the join
    msg = '{} has joined the room!'
    if spectate:
        msg = '{} has joined the room as a spectator!'
    elif reconnect:
        msg = '{} has rejoined the room!'
    socket_tell(msg, [name], None, room_id)

    # Create room if it doesn't exist and add player to room
    R.connection_lock.acquire()
    try:
        if room_id not in rooms:
            if spectate or reconnect:
                socketio.disconnect(request.sid)
                return
            rooms[room_id] = {'status': 'LOBBY', 'gc': None,
                              'connections': {}, 'reconnections': {}}

        # If this is a reconnection event, change player's socket id and AI status
        # in game context, then push the *current* game state so the client
        # resumes from the live position (not the snapshot captured when the
        # page was first rendered).
        if reconnect:
            rooms[room_id]['reconnections'].pop(name, None)
            if rooms[room_id]['status'] == 'GAME' and rooms[room_id]['gc'] is not None:
                found = [p for p in rooms[room_id]['gc'].players if p.user_id == name]
                if found:
                    player = found[0]
                    player.socket_id = request.sid
                    player.ai = False
                    public_state, private_state = rooms[room_id]['gc'].dump()
                    priv = [p for p in private_state if p['user_id'] == name]
                    if priv:
                        socketio.emit(
                            'game_start',
                            {'public': public_state, 'private': priv[0]},
                            room=request.sid,
                        )
                        game_logger.info(
                            'Game state restored for reconnecting player %s (sid %s)',
                            name, request.sid,
                        )
                else:
                    game_logger.warning(
                        'Reconnect for unknown player %s in room %s', name, room_id
                    )
            else:
                # Game ended / room reset: treat as a fresh spectator.
                game_logger.info(
                    'Player %s reconnected but no live game in room %s; spectating',
                    name, room_id,
                )

        # Send the current game state to anyone joining while a game is in
        # progress (spectators see public state only; reconnects were served
        # above with their private state).
        if (
            rooms[room_id]['status'] == 'GAME'
            and rooms[room_id]['gc'] is not None
            and not reconnect
        ):
            public_state, private_state = rooms[room_id]['gc'].dump()
            socketio.emit(
                'game_start',
                {'public': public_state, 'private': {}},
                room=request.sid,
            )

        # Add new player to room
        rooms[room_id]['connections'][request.sid] = name
        join_room(room_id)
    finally:
        R.connection_lock.release()

    # Determine host status: the first player to join the room is the host.
    # The host is the only player allowed to change game settings and start.
    is_host = len(rooms[room_id]['connections']) == 1
    if is_host:
        rooms[room_id]['host_sid'] = request.sid

    # Emit host status to this player so the client can show/hide settings.
    socketio.emit('host_status', {'is_host': is_host}, room=request.sid)

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
    try:
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
            # Room closed: no member list to broadcast

        elif gc and not gc.game_over:

            # If disconnected person was spectating, or dead, or if the game is
            # over, don't swap them for an AI
            player_in_game = [p for p in gc.players if p.socket_id == request.sid]
            if not player_in_game or player_in_game[0].state == C.PlayerState.Dead:
                # Player not in game or dead: just update member list
                emit_member_list(room_id)
                return

            # Swap player for AI
            player_in_game[0].ai = True
            rooms[room_id]['reconnections'][player_in_game[0].user_id] = 'cookie'
            emit_member_list(room_id)
            socket_tell('A computer player has taken their place!',
                        [], gc, room_id)

        else:

            # Spectator or game over: update member list
            emit_member_list(room_id)
    finally:
        R.connection_lock.release()


if __name__ == '__main__':
    # In production, use the PORT provided by the platform (Railway)
    port = int(os.getenv('PORT', 5000))
    # Disable debug in production
    # allow_unsafe_werkzeug is required to run WerkSocketIO under production
    # WSGI servers such as Railway's gunicorn wrapper.
    socketio.run(app, debug=False, host="0.0.0.0", port=port,
                 allow_unsafe_werkzeug=True)
