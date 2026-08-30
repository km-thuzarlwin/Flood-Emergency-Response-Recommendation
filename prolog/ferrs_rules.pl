:- encoding(utf8).   % source holds em-dashes / § — read as UTF-8 regardless of OS locale

:- module(ferrs_rules,
          [ assess/2,                        % +Facts:dict, -Result:dict  (semidet; fails => no guess)
            severity/2,
            severity_reason/2,
            gauge_percent/2,
            base_band/2,
            recommended_action/2,
            required_capability/2,
            required_capabilities/2,
            required_shelter_capability/2,
            required_shelter_capabilities/2,
            clear_case_facts/0
          ]).

/** <module> FERRS reasoning module

Rule base transcribed from Handoffs/04-Prolog-Reasoning-Module.md (master spec §7).
No machine learning anywhere — this is the whole reasoning path (NFR-2).

The blocks marked "VERBATIM" below are copied unchanged from doc 4; do not edit them
to make a test pass (NFR-8 / CLAUDE.md operating rules) — change the spec first.

Input facts for the single township under assessment are declared `thread_local`
(decision logged 2026-08-29): each library(http/thread_httpd) worker thread sees
only the facts it asserted for its own request, so the doc-4 rules — which consult
global predicates — run completely unmodified and stay correct under concurrency.
*/

:- use_module(library(apply)).
:- use_module(library(lists)).

:- thread_local
    township_gauge_reading/2,
    township_gauge_station/2,
    gauge_danger_level/2,
    embankment_status/2,
    terrain/2,
    local_rainfall/2,
    road_status/2,
    injured_survivors/2.

% The atom used as the Township key for the one township in a request.
subject(t).

% ======================================================================
% 7.1  Severity — VERBATIM from doc 4
% ======================================================================
gauge_percent(Township, Percent) :-
    township_gauge_reading(Township, Reading),
    township_gauge_station(Township, Station),
    gauge_danger_level(Station, Danger),
    Percent is round(100 * Reading / Danger).

base_band(Percent, low)     :- Percent < 70.
base_band(Percent, moderate):- Percent >= 70,  Percent < 100.
base_band(Percent, high)    :- Percent >= 100, Percent < 115.
base_band(Percent, severe)  :- Percent >= 115.

raise(low, moderate). raise(moderate, high). raise(high, severe). raise(severe, severe).
at_least(Band, moderate, moderate) :- member(Band, [low]).
at_least(Band, moderate, Band)     :- \+ member(Band, [low]).

severity(Township, severe) :- embankment_status(Township, breached), !.
severity(Township, Severity) :-
    gauge_percent(Township, Percent),
    base_band(Percent, Base0),
    ( terrain(Township, low_lying) -> raise(Base0, Base1) ; Base1 = Base0 ),
    ( local_rainfall(Township, very_heavy) -> at_least(Base1, moderate, Severity) ; Severity = Base1 ).
% ======================================================================

%!  severity_reason(+Township, -Reason) is det.
%   Lets the UI distinguish an embankment override from a gauge-derived rating
%   (doc 6 §13.2 / FR-11). The override token matches doc 5 §12.2 exactly.
severity_reason(Township, embankment_breach_override) :-
    embankment_status(Township, breached), !.
severity_reason(_Township, gauge_derived).

% ======================================================================
% 7.2  Recommended action — deterministic from severity (doc 4 table)
% ======================================================================
recommended_action(severe,   'Evacuate immediately').
recommended_action(high,     'Prepare to evacuate — evacuate vulnerable groups first, stage resources').
recommended_action(moderate, 'Heightened monitoring — increase reporting frequency, alert on-call responder').
recommended_action(low,      'Routine monitoring').

% ======================================================================
% 7.3  Required capabilities — VERBATIM from doc 4
% ======================================================================
required_capability(Township, motorized) :- road_status(Township, impassable).
required_capability(Township, motorized) :- severity(Township, severe).
required_capability(Township, medical_support) :- injured_survivors(Township, yes).
required_capabilities(Township, Set) :-
    findall(C, required_capability(Township, C), List), list_to_set(List, Set).

required_shelter_capability(Township, medical_equipped) :- injured_survivors(Township, yes).
% ======================================================================

required_shelter_capabilities(Township, Set) :-
    findall(C, required_shelter_capability(Township, C), List), list_to_set(List, Set).

% ======================================================================
% Orchestration — assert facts, run the rules, retract. Pure (no I/O).
% ======================================================================

%!  assess(+Facts:dict, -Result:dict) is semidet.
%
%   Facts keys (values may be strings, atoms or numbers):
%     township_id, gauge_reading_cm, danger_level_cm,
%     embankment_status, terrain, local_rainfall, road_status, injured_survivors
%
%   Fails — deliberately, with no partial/guessed result (NFR-1) — when severity
%   cannot be proven from the supplied facts. The caller maps that to HTTP 422.
assess(Facts, Result) :-
    setup_call_cleanup(
        assert_case_facts(Facts),
        compute(Facts, Result),
        clear_case_facts).

compute(Facts, Result) :-
    subject(T),
    ( get_dict(township_id, Facts, TID0), TID0 \== null -> to_atom(TID0, TID) ; TID = unknown ),
    once(severity(T, Severity)),                       % fails => assess/2 fails => 422
    severity_reason(T, Reason),
    ( catch(gauge_percent(T, GP), _, fail) -> GaugePercent = GP ; GaugePercent = null ),
    ( GaugePercent == null -> BaseBand = null ; once(base_band(GaugePercent, BaseBand)) ),
    recommended_action(Severity, Action),
    required_capabilities(T, Caps),
    required_shelter_capabilities(T, ShelterCaps),
    Result = _{
        township_id:                   TID,
        severity:                      Severity,
        severity_reason:               Reason,
        gauge_percent:                 GaugePercent,
        base_band:                     BaseBand,
        recommended_action:            Action,
        required_capabilities:         Caps,
        required_shelter_capabilities: ShelterCaps
    }.

assert_case_facts(Facts) :-
    subject(T),
    clear_case_facts,
    assertz(township_gauge_station(T, s)),
    ( get_dict(gauge_reading_cm, Facts, R0), to_number(R0, R),
      get_dict(danger_level_cm, Facts, D0), to_number(D0, D), D =\= 0
    -> assertz(township_gauge_reading(T, R)),
       assertz(gauge_danger_level(s, D))
    ;  true
    ),
    assert_enum(Facts, embankment_status, intact),
    assert_enum(Facts, terrain,           elevated),
    assert_enum(Facts, local_rainfall,    moderate),
    assert_enum(Facts, road_status,       open),
    ( get_dict(injured_survivors, Facts, IV), truthy(IV)
    -> assertz(injured_survivors(T, yes))
    ;  assertz(injured_survivors(T, no))
    ).

assert_enum(Facts, Key, Default) :-
    subject(T),
    ( get_dict(Key, Facts, V0), V0 \== null -> to_atom(V0, V) ; V = Default ),
    Goal =.. [Key, T, V],
    assertz(Goal).

clear_case_facts :-
    retractall(township_gauge_reading(_,_)),
    retractall(township_gauge_station(_,_)),
    retractall(gauge_danger_level(_,_)),
    retractall(embankment_status(_,_)),
    retractall(terrain(_,_)),
    retractall(local_rainfall(_,_)),
    retractall(road_status(_,_)),
    retractall(injured_survivors(_,_)).

to_atom(A, A) :- atom(A), !.
to_atom(S, A) :- string(S), !, atom_string(A, S).
to_atom(N, A) :- number(N), !, atom_number(A, N).

to_number(N, N) :- number(N), !.
to_number(S, N) :- (atom(S) ; string(S)), atom_number(S, N).

truthy(true).
truthy("true").
truthy(yes).
truthy(1).
