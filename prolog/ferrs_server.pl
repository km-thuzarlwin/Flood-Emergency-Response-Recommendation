:- module(ferrs_server, [start/1, stop/0, main/0]).

/** <module> FERRS Prolog HTTP service

Thin HTTP wrapper around ferrs_rules:assess/2. This is the only network surface of
the reasoning engine (architecture in Handoffs/02-Data-Model-and-Persistence.md).

  GET  /health            -> {"status":"ok", ...}
  POST /assess            -> assessment JSON  (see ferrs_rules:assess/2)

Fail-safe contract (NFR-1 / doc 8 §18.8): on malformed JSON, an invalid/missing
required fact, or an unprovable severity, this returns an explicit 4xx error —
never a guessed or partial assessment.

Bound to loopback only (no auth in this build — NFR-5).
*/

:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/http_json)).
:- use_module(library(lists)).
:- use_module(ferrs_rules).

:- http_handler(root(health), health_handler, [method(get)]).
:- http_handler(root(assess), assess_handler, [method(post)]).

:- dynamic running_port/1.

% ---------------------------------------------------------------------------
% Lifecycle
% ---------------------------------------------------------------------------

%!  start(+Port) is det.
start(Port) :-
    http_server(http_dispatch, [port(localhost:Port)]),
    retractall(running_port(_)),
    assertz(running_port(Port)).

%!  stop is det.
stop :-
    ( retract(running_port(Port))
    -> http_stop_server(Port, [])
    ;  true
    ).

%!  main is det.  Entry point when run as a script:  swipl prolog/ferrs_server.pl [PORT]
main :-
    ( getenv('FERRS_PROLOG_PORT', PA), atom_number(PA, P) -> true
    ; current_prolog_flag(argv, [A|_]), atom_number(A, P) -> true
    ; P = 4321
    ),
    start(P),
    format("ferrs-prolog reasoning service listening on http://localhost:~w~n", [P]),
    format("  GET  /health~n  POST /assess~n"),
    thread_get_message(_).
% Runnable entry point is prolog/serve.pl — this file stays a pure library so the
% test suite can load it without starting a server.

% ---------------------------------------------------------------------------
% Handlers
% ---------------------------------------------------------------------------

health_handler(_Request) :-
    reply_json_dict(_{ status: ok,
                       service: "ferrs-prolog",
                       rules_source: "Handoffs/04-Prolog-Reasoning-Module.md",
                       ml_used: false }).

assess_handler(Request) :-
    catch(assess_request(Request), Err, unexpected(Err)).

assess_request(Request) :-
    ( catch(http_read_json_dict(Request, In), _, fail)
    -> ( request_errors(In, Errors),
         ( Errors == []
         -> ( assess(In, Result)
            -> reply_json_dict(Result)
            ;  err(422, incomplete_assessment,
                   "severity could not be proven from the supplied facts (fail-safe: no guess)")
            )
         ;  atomic_list_concat(Errors, "; ", Msg),
            err(422, invalid_request, Msg)
         )
       )
    ;  err(400, malformed_json, "request body is not valid JSON")
    ).

unexpected(Err) :-
    message_to_string(Err, S),
    err(500, internal_error, S).

err(Code, Tag, Detail) :-
    reply_json_dict(_{ error: Tag, detail: Detail }, [status(Code)]).

% ---------------------------------------------------------------------------
% Request validation — enum / type / presence checks only.
% The reasoning itself lives in ferrs_rules.
% ---------------------------------------------------------------------------

request_errors(In, Errors) :-
    findall(E, request_error(In, E), Errors0),
    sort(Errors0, Errors).

enum_field(embankment_status, [intact, breached]).
enum_field(terrain,           [low_lying, elevated]).
enum_field(local_rainfall,    [light, moderate, heavy, very_heavy]).
enum_field(road_status,       [open, impassable]).

% required enum field missing
request_error(In, E) :-
    enum_field(Key, _),
    \+ get_dict(Key, In, _),
    format(string(E), "~w is required", [Key]).
% required enum field present but not an allowed value
request_error(In, E) :-
    enum_field(Key, Allowed),
    get_dict(Key, In, V0), V0 \== null,
    as_atom(V0, V),
    \+ memberchk(V, Allowed),
    format(string(E), "~w must be one of ~w, got ~w", [Key, Allowed, V0]).
% injured_survivors required boolean
request_error(In, "injured_survivors is required (boolean)") :-
    \+ get_dict(injured_survivors, In, _).
request_error(In, E) :-
    get_dict(injured_survivors, In, V), \+ memberchk(V, [true, false]),
    format(string(E), "injured_survivors must be true|false, got ~w", [V]).
% gauge inputs: required unless the embankment is breached (override needs no gauge)
request_error(In, E) :-
    ( get_dict(embankment_status, In, Emb) -> as_atom(Emb, EmbA) ; EmbA = intact ),
    EmbA \== breached,
    ( \+ has_number(In, gauge_reading_cm) ; \+ has_number(In, danger_level_cm) ),
    E = "gauge_reading_cm and danger_level_cm are required unless embankment_status=breached".
% gauge inputs, when present, must be physically sane (doc 8 §18.8)
request_error(In, E) :-
    get_dict(gauge_reading_cm, In, R),
    \+ ( number(R), R >= 0 ),
    format(string(E), "gauge_reading_cm must be a number >= 0, got ~w", [R]).
request_error(In, E) :-
    get_dict(danger_level_cm, In, D),
    \+ ( number(D), D > 0 ),
    format(string(E), "danger_level_cm must be a number > 0, got ~w", [D]).

has_number(In, Key) :- get_dict(Key, In, V), number(V).

as_atom(A, A) :- atom(A), !.
as_atom(S, A) :- string(S), !, atom_string(A, S).
as_atom(N, N) :- number(N).
