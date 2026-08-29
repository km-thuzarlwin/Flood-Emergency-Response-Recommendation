/*  Runnable launcher for the FERRS Prolog reasoning service.

    Usage:
      swipl prolog/serve.pl                 % port 4321
      swipl prolog/serve.pl 5000            % port 5000
      FERRS_PROLOG_PORT=5000 swipl prolog/serve.pl
*/
:- use_module(ferrs_server).
:- initialization(main, main).
