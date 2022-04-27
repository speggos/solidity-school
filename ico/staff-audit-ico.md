https://github.com/ShipyardDAO/student.speggos/tree/aeccee6f2e1653da6c2c2843a38bb458159e7b23/ico

Audited By: Diana

# General Comments

Great job! You stuck to the spec and everything looks nice and clean. 


# Design Exercise

Great response! A claimTokens function that calculates the % of time passed will work nicely. Great job thinking about a cliff too! Consider thinking about if different people had different vesting schedules (different vesting length, different beginning days, etc) 


# Issues

**[L-1]** Dangerous Phase Transitions

If the 'progressPhase' function is called twice, a phase can accidentally 
be skipped. There are a few situations where this might occur:

1. Front-end client code malfunction calling the function twice.
2. Human error double-clicking a button on the interface on accident.
3. Repeat invocations with intent - Uncertainty around whether or not a 
transaction went through, or having a delay before a transaction processes, 
are common occurrences on Ethereum today.

Consider refactoring this function by adding an input parameter that 
specifies either the expected current phase, or the expected phase to 
transition to.


**[Technical Mistake]** Adding whitelisted addresses 1 by 1 is very gas
inefficient

Each Ethereum transaction has an initial fixed cost of 21_000 gas, which
is in addition to the cost of executing computation and storing variables
in the contract. By only allowing a single whitelisted address to be added
per function call, this is going to waste a lot of gas compared to a function
which takes in an array of whitelisted addresses and adds them in a single
transaction.


**[Q-1]** Leaving hardhat/console.sol in production project

Your contract imports hardhat/console.sol, which is a development package.

Consider removing hardhat/console.sol from your production code.


**[Q-2]** Needless setting of storage variables' initial values

This is not needed (and wastes gas) because every variable type has a 
default value it gets set to upon declaration. 

```
bool public taxTransfers;     // will be initialized to false
uint public totalInvestment;  // will be initialized to 0
Phase public currentPhase;    // will be initialized to Phase.SEED
bool public paused;           // will be initialized to false
```
Consider not setting initial values for storage variables that would
otherwise be equal to their default values.


**[Q-3]** Unchanged variables should be marked immutable

Your contract includes storage variables that are not updated by any functions
and do not change. For these cases, you can save gas and improve readability
by marking these variables `immutable`.

Compared to regular state variables, the gas costs of `immutable` 
variables are much lower. `Immutable` variables are 
evaluated once at construction time and their value is copied to all the 
places in the code where they are accessed.

Consider marking unchanged storage variables as `immutable`.


# Nitpicks

- If you were to deploy the contracts to mainnet you would want to eventually delete the import "hardhat/console.sol"


# Score

| Reason | Score |
|-|-|
| Late                       | - |
| Unfinished features        | - |
| Extra features             | - |
| Vulnerability              | 1 |
| Unanswered design exercise | - |
| Insufficient tests         | - |
| Technical mistake          | 1 |

Total: 2

Great job!
