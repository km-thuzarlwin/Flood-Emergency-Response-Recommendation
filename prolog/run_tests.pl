/*  FERRS Phase 2 test runner.

    swipl prolog/run_tests.pl        -> runs rule units + properties + HTTP-service tests
                                        exit 0 on all-pass, 1 otherwise
*/
:- use_module(library(plunit)).

% Load the test files at load time (paths relative to this file).
:- consult('tests/test_rules.plt').
:- consult('tests/test_server.plt').

:- initialization((run_tests -> halt(0) ; halt(1)), main).
