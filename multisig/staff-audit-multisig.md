
<!---
student 0xMacro repo link WITH COMMIT HASH. You can get this from the training app, by viewing the submission link
--->
https://github.com/0xMacro/student.speggos/tree/01a24ede5031546839afda61e97f2e54d81953a5/multisig

Audited By: Melvillian

<!--- Remember, you can find a list of issues found by previous staff here:
https://www.notion.so/optilistic/TA-Role-and-Responsibilities-01b41500ad254ff0b48f2f3b85064cac#47ea7563f6d7429597df734d24a7a9f1
--->

# General Comments

Update (see previous text below the "---------")

1. I'm bummed, this is not up to your normal level of quality. Your deployment script doesn't work (it's calling `setOwner` on your LP contracts, which is not a function on OZ's `Ownable.sol` contract. I think you meant `transferOwnership`). You're hardhat config is vulnerable because you hardcoded in the API access token of your infura account, so it can be abused (you should expose that via an env var in `.env`). You don't access your private key correctly (it should be `process.env.DEV_PRIVATE_KEY`, but you have just `DEV_PRIVATE_KEY`). And you don't complete the main part of the project, which is to do the contract interaction with your Gnosis Safe.

Your design exercise answer is very thorough, more than anyone else in the class. Maybe you've already thought about and used this tool before? 

--------------------------------------------------------------
Hey Spencer, you added ownership and functionality to your LP contracts, but I don't see anything else from you here. I was expecting a README with the deliverables given in the project spec: https://learn.0xmacro.com/training/project-multisig/p/1

Did you forget to push?

# Design Exercise

Very well said, you captured the main tradeoffs between the 3 configurations.

One thing I would add that the 1-N config gives you ok simply everyone sharing a private key is accountability. If everyone holds a single private key, and a transaction gets made, you won't know who authorized (i.e. signed) the transaction. But in a 1-N model, each user has a separate private key, so if one of them is compromised then you'll know who it was.

This is most important for when you need plausible deniability. In the former case, imagine everyone blames you for the wallet getting hacked. You have no way to prove that it wasn't you. But in the latter case, you can easily show that the key that authorized the transaction is not your key.

# Score

Total: 7

Note: The Multisig project isn't a part of the graduation requirement scoring, so don't worry if you didn't get as good as score as you'd like.
