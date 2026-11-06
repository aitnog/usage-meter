# usage-meter

A side pane for Claude that shows live usage: subscription rate-limit windows (5-hour and 7-day) with progress bars and reset times in Taipei time, the context window fill, the session cost and a running monthly cost total kept across sessions. It shows a toast when a window passes 80% or 90%, and the 7-day window also warns at 70%. Open the pane with the /usage command. Figures refresh after each reply. Rate limits appear only on subscription accounts, and the monthly total counts only sessions where this plugin is installed.

## Install

At the prompt of a terminal session:

`/plugin install usage-meter --marketplace aitnog/usage-meter`

From a shell:

`claude plugin install usage-meter --marketplace aitnog/usage-meter`
