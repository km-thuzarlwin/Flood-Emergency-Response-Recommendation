/*  Doc 8 §18.1 (unit) + §18.6 (property-based) tests for the FERRS rule base.
    Run:  swipl prolog/run_tests.pl        (from the repo root)
*/

:- use_module('../ferrs_rules').
:- use_module(library(lists)).
:- use_module(library(apply)).

% ---- helpers -------------------------------------------------------------

% tc(+Overrides, -Result): assess a case built from safe defaults + Overrides.
% Defaults: elevated terrain, moderate rainfall, intact embankment, road open,
% no injuries — i.e. nothing that perturbs the gauge band on its own.
tc(Overrides, Result) :-
    Base = _{ township_id: "t",
              embankment_status: "intact",
              terrain: "elevated",
              local_rainfall: "moderate",
              road_status: "open",
              injured_survivors: false },
    foldl(put_override, Overrides, Base, Facts),
    assess(Facts, Result).

put_override(Key-Value, D0, D) :- put_dict(Key, D0, Value, D).

% reading that yields exactly Percent against a 1000 cm danger level
pct(Percent, reading(R)) :- R is Percent * 10.

srank(low, 0). srank(moderate, 1). srank(high, 2). srank(severe, 3).
rrank("light", 0). rrank("moderate", 1). rrank("heavy", 2). rrank("very_heavy", 3).

sev(Overrides, Severity) :- tc(Overrides, R), Severity = R.severity.

% ========================================================================
:- begin_tests(rule_units).
% ========================================================================

% ---- 7.1 gauge-band boundaries (69/70/99/100/114/115) -------------------
test('band  <70  -> low',      [true(S == low)])      :- sev([gauge_reading_cm-690,  danger_level_cm-1000], S).
test('band  =70  -> moderate', [true(S == moderate)]) :- sev([gauge_reading_cm-700,  danger_level_cm-1000], S).
test('band  =99  -> moderate', [true(S == moderate)]) :- sev([gauge_reading_cm-990,  danger_level_cm-1000], S).
test('band =100  -> high',     [true(S == high)])     :- sev([gauge_reading_cm-1000, danger_level_cm-1000], S).
test('band =114  -> high',     [true(S == high)])     :- sev([gauge_reading_cm-1140, danger_level_cm-1000], S).
test('band =115  -> severe',   [true(S == severe)])   :- sev([gauge_reading_cm-1150, danger_level_cm-1000], S).

% ---- 7.1 step 3: terrain modifier --------------------------------------
test('terrain low_lying: low -> moderate', [true(S == moderate)]) :-
    sev([gauge_reading_cm-300, danger_level_cm-1000, terrain-"low_lying"], S).
test('terrain low_lying: high -> severe',  [true(S == severe)]) :-
    sev([gauge_reading_cm-1000, danger_level_cm-1000, terrain-"low_lying"], S).
test('terrain low_lying: severe stays severe (capped)', [true(S == severe)]) :-
    sev([gauge_reading_cm-1200, danger_level_cm-1000, terrain-"low_lying"], S).
test('terrain elevated: no change', [true(S == high)]) :-
    sev([gauge_reading_cm-1000, danger_level_cm-1000, terrain-"elevated"], S).

% ---- 7.1 step 4: local-rainfall floor --------------------------------
test('very_heavy floors low -> moderate', [true(S == moderate)]) :-
    sev([gauge_reading_cm-100, danger_level_cm-1000, local_rainfall-"very_heavy"], S).
test('very_heavy does not lift an already-high band', [true(S == high)]) :-
    sev([gauge_reading_cm-1000, danger_level_cm-1000, local_rainfall-"very_heavy"], S).
test('heavy rainfall is NOT a floor', [true(S == low)]) :-
    sev([gauge_reading_cm-100, danger_level_cm-1000, local_rainfall-"heavy"], S).

% ---- 7.1 step 5: embankment override beats everything -----------------
test('breach overrides an otherwise-low case', [true(S-Reason == severe-embankment_breach_override)]) :-
    tc([gauge_reading_cm-50, danger_level_cm-1000, embankment_status-"breached"], R),
    S = R.severity, Reason = R.severity_reason.
test('breach overrides even elevated + light rain + tiny reading', [true(S == severe)]) :-
    sev([gauge_reading_cm-0, danger_level_cm-1000, embankment_status-"breached",
         terrain-"elevated", local_rainfall-"light"], S).
test('breach with NO gauge data is still severe, percent null (NFR-1 safe)') :-
    tc([embankment_status-"breached"], R),
    R.severity == severe,
    R.gauge_percent == null,
    R.base_band == null.
test('no breach -> severity_reason is gauge_derived', [true(X == gauge_derived)]) :-
    tc([gauge_reading_cm-700, danger_level_cm-1000], R), X = R.severity_reason.

% ---- 7.2 recommended action mapping ----------------------------------
test('action: severe',   [true(A == 'Evacuate immediately')]) :-
    tc([gauge_reading_cm-1200, danger_level_cm-1000], R), A = R.recommended_action.
test('action: low',      [true(A == 'Routine monitoring')]) :-
    tc([gauge_reading_cm-100, danger_level_cm-1000], R), A = R.recommended_action.

% ---- 7.3 required_capability: firing and NOT firing -------------------
test('road impassable -> motorized required') :-
    tc([gauge_reading_cm-500, danger_level_cm-1000, road_status-"impassable"], R),
    memberchk(motorized, R.required_capabilities).
test('road open + not severe -> motorized NOT required') :-
    tc([gauge_reading_cm-500, danger_level_cm-1000, road_status-"open"], R),
    \+ memberchk(motorized, R.required_capabilities).
test('severity severe (via gauge) -> motorized required') :-
    tc([gauge_reading_cm-1500, danger_level_cm-1000, road_status-"open"], R),
    R.severity == severe,
    memberchk(motorized, R.required_capabilities).
test('injured -> medical_support + shelter medical_equipped') :-
    tc([gauge_reading_cm-500, danger_level_cm-1000, injured_survivors-true], R),
    memberchk(medical_support, R.required_capabilities),
    R.required_shelter_capabilities == [medical_equipped].
test('not injured -> no medical_support, no medical shelter') :-
    tc([gauge_reading_cm-500, danger_level_cm-1000, injured_survivors-false], R),
    \+ memberchk(medical_support, R.required_capabilities),
    R.required_shelter_capabilities == [].

% ---- fail-safe: unprovable severity, no guess (doc 8 §18.8) ----------
test('non-breach with missing gauge data is unprovable', [fail]) :-
    tc([embankment_status-"intact", terrain-"low_lying"], _).

% ---- the canonical worked example, reasoning slice (doc 7 steps 1-3, 7)
test('worked example (Lemyethna) severity/action/capabilities') :-
    tc([ township_id-"lemyethna", gauge_reading_cm-1250, danger_level_cm-1160,
         embankment_status-"breached", terrain-"low_lying", local_rainfall-"heavy",
         road_status-"impassable", injured_survivors-true ], R),
    R.severity                       == severe,
    R.severity_reason                == embankment_breach_override,
    R.gauge_percent                  == 108,
    R.base_band                      == high,
    R.recommended_action             == 'Evacuate immediately',
    R.required_capabilities          == [motorized, medical_support],
    R.required_shelter_capabilities  == [medical_equipped].

:- end_tests(rule_units).

% ========================================================================
:- begin_tests(rule_properties).
% Exhaustive over a discretised grid rather than random generation — the
% severity domain is small enough to sweep directly. (doc 8 §18.6)
% ========================================================================

readings([0, 300, 690, 700, 900, 990, 1000, 1100, 1140, 1150, 1400]).
terrains(["elevated", "low_lying"]).
rains(["light", "moderate", "heavy", "very_heavy"]).

test('severity is non-decreasing as gauge_reading rises (other 3 inputs fixed)') :-
    readings(RS), terrains(TS), rains(RaS),
    forall(
      ( member(T, TS), member(Ra, RaS),
        member(R1, RS), member(R2, RS), R1 =< R2 ),
      ( sev([gauge_reading_cm-R1, danger_level_cm-1000, terrain-T, local_rainfall-Ra], S1),
        sev([gauge_reading_cm-R2, danger_level_cm-1000, terrain-T, local_rainfall-Ra], S2),
        srank(S1, N1), srank(S2, N2), N1 =< N2 )).

test('breaching the embankment never lowers severity') :-
    readings(RS), terrains(TS), rains(RaS),
    forall(
      ( member(T, TS), member(Ra, RaS), member(R, RS) ),
      ( sev([gauge_reading_cm-R, danger_level_cm-1000, terrain-T, local_rainfall-Ra,
             embankment_status-"intact"], S1),
        sev([gauge_reading_cm-R, danger_level_cm-1000, terrain-T, local_rainfall-Ra,
             embankment_status-"breached"], S2),
        srank(S1, N1), srank(S2, N2), N1 =< N2 )).

test('low_lying terrain never lowers severity vs elevated') :-
    readings(RS), rains(RaS),
    forall(
      ( member(Ra, RaS), member(R, RS) ),
      ( sev([gauge_reading_cm-R, danger_level_cm-1000, terrain-"elevated",  local_rainfall-Ra], S1),
        sev([gauge_reading_cm-R, danger_level_cm-1000, terrain-"low_lying", local_rainfall-Ra], S2),
        srank(S1, N1), srank(S2, N2), N1 =< N2 )).

test('worsening local_rainfall never lowers severity') :-
    readings(RS), terrains(TS), rains(RaS),
    forall(
      ( member(T, TS), member(R, RS),
        member(A, RaS), member(B, RaS), rrank(A, Na), rrank(B, Nb), Na =< Nb ),
      ( sev([gauge_reading_cm-R, danger_level_cm-1000, terrain-T, local_rainfall-A], S1),
        sev([gauge_reading_cm-R, danger_level_cm-1000, terrain-T, local_rainfall-B], S2),
        srank(S1, N1), srank(S2, N2), N1 =< N2 )).

test('severity is INVARIANT to road_status and injured_survivors') :-
    readings(RS), terrains(TS), rains(RaS),
    forall(
      ( member(T, TS), member(Ra, RaS), member(R, RS), member(Emb, ["intact","breached"]) ),
      ( sev([gauge_reading_cm-R, danger_level_cm-1000, terrain-T, local_rainfall-Ra,
             embankment_status-Emb, road_status-"open", injured_survivors-false], S1),
        sev([gauge_reading_cm-R, danger_level_cm-1000, terrain-T, local_rainfall-Ra,
             embankment_status-Emb, road_status-"impassable", injured_survivors-true], S2),
        S1 == S2 )).

test('required_capabilities is always a subset of {motorized, medical_support}') :-
    readings(RS), terrains(TS), rains(RaS),
    forall(
      ( member(T, TS), member(Ra, RaS), member(R, RS),
        member(Emb, ["intact","breached"]), member(Road, ["open","impassable"]),
        member(Inj, [true, false]) ),
      ( tc([gauge_reading_cm-R, danger_level_cm-1000, terrain-T, local_rainfall-Ra,
            embankment_status-Emb, road_status-Road, injured_survivors-Inj], Res),
        forall(member(C, Res.required_capabilities), memberchk(C, [motorized, medical_support])) )).

test('required_shelter_capabilities is [] or [medical_equipped]') :-
    readings(RS),
    forall(
      ( member(R, RS), member(Inj, [true, false]) ),
      ( tc([gauge_reading_cm-R, danger_level_cm-1000, injured_survivors-Inj], Res),
        memberchk(Res.required_shelter_capabilities, [[], [medical_equipped]]) )).

:- end_tests(rule_properties).
