/*  Doc 8 §18.2-style checks at the Prolog-service boundary: the assessment must be
    reproducible end-to-end over HTTP, and every unreliable input must yield an
    explicit 4xx — never a guessed assessment (NFR-1 / doc 8 §18.8).
*/

:- use_module('../ferrs_server').
:- use_module(library(http/http_client)).
:- use_module(library(http/http_json)).

:- dynamic test_port/1.

boot :-
    ( test_port(_) -> true
    ; between(1, 20, _),
      P is 4400 + random(400),
      catch((ferrs_server:start(P), assertz(test_port(P))), _, fail), !
    ).

shutdown :-
    ( retract(test_port(_)) -> ferrs_server:stop ; true ).

url(Path, URL) :-
    test_port(P),
    format(atom(URL), "http://localhost:~w~w", [P, Path]).

post(Body, Reply, Code) :-
    url('/assess', URL),
    http_post(URL, json(Body), Reply,
              [ status_code(Code), json_object(dict),
                request_header('Accept'='application/json') ]).

:- begin_tests(prolog_service, [setup(boot), cleanup(shutdown)]).

test('GET /health is ok') :-
    url('/health', URL),
    http_get(URL, Reply, [json_object(dict)]),
    Reply.status == "ok",
    Reply.ml_used == false.

test('POST /assess reproduces the worked example (doc 7)') :-
    post(_{ township_id: "lemyethna", gauge_reading_cm: 1250, danger_level_cm: 1160,
            embankment_status: "breached", terrain: "low_lying", local_rainfall: "heavy",
            road_status: "impassable", injured_survivors: true },
         R, Code),
    Code == 200,
    R.severity                      == "severe",
    R.severity_reason               == "embankment_breach_override",
    R.gauge_percent                 == 108,
    R.base_band                     == "high",
    R.recommended_action            == "Evacuate immediately",
    R.required_capabilities         == ["motorized", "medical_support"],
    R.required_shelter_capabilities == ["medical_equipped"].

test('POST /assess: a plain moderate river case') :-
    post(_{ township_id: "yegyi", gauge_reading_cm: 1000, danger_level_cm: 1160,
            embankment_status: "intact", terrain: "elevated", local_rainfall: "moderate",
            road_status: "open", injured_survivors: false },
         R, Code),
    Code == 200,
    R.severity        == "moderate",
    R.severity_reason == "gauge_derived",
    R.required_capabilities == [].

test('POST /assess: missing required field -> 422, no assessment') :-
    post(_{ terrain: "low_lying" }, R, Code),
    Code == 422,
    get_dict(error, R, "invalid_request"),
    \+ get_dict(severity, R, _).

test('POST /assess: non-breach with no gauge data -> 422') :-
    post(_{ embankment_status: "intact", terrain: "low_lying", local_rainfall: "heavy",
            road_status: "open", injured_survivors: false },
         R, Code),
    Code == 422,
    \+ get_dict(severity, R, _).

test('POST /assess: negative gauge reading -> 422 (doc 8 §18.8)') :-
    post(_{ gauge_reading_cm: -5, danger_level_cm: 1160,
            embankment_status: "intact", terrain: "elevated", local_rainfall: "light",
            road_status: "open", injured_survivors: false },
         _R, Code),
    Code == 422.

test('POST /assess: bad enum value -> 422') :-
    post(_{ gauge_reading_cm: 500, danger_level_cm: 1160,
            embankment_status: "cracked", terrain: "elevated", local_rainfall: "light",
            road_status: "open", injured_survivors: false },
         _R, Code),
    Code == 422.

test('POST /assess: breach with no gauge still resolves to severe over HTTP') :-
    post(_{ township_id: "hinthada", embankment_status: "breached", terrain: "elevated",
            local_rainfall: "light", road_status: "open", injured_survivors: false },
         R, Code),
    Code == 200,
    R.severity == "severe",
    memberchk(R.gauge_percent, [null, @(null)]).

:- end_tests(prolog_service).
