# ICO Micro-Audit by Thomas Loimayr

## **[Q-1]** Gas optimization: Define variable *owner* as immutable
On line 27, ICO.sol has the following code:
```
address owner;
```
Consider: As the variable is only once set in the constructor, you could make the variable *immutable*. This whould save some gas costs when reading it.


## **[Q-2]** Gas optimization: Define variable *tokenContract* as immutable
On line 28, ICO.sol has the following code:
```
address tokenContract;
```
Consider: As the variable is only once set in the constructor, you could make the variable *immutable*. This whould save some gas costs when reading it.


## **[Q-3]** Gas optimization: Define variable *owner* as immutable
On line 8, SpaceToken.sol has the following code:
```
address owner;
```
Consider: Same as Q-1, you could make the variable *immutable* to make it more gas efficient.