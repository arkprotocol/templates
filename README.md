# Ark Protocol

Join our [discord](https://discord.gg/fVv6Mf9Wr8) and read in “mission” and “about” channels. Also visit us on [Twitter](https://twitter.com/arkprotocol).

IMPORTANT:
(c) Ark Protocol 2022
ALL rights reserved.
No copies, disclosure or forward of all data or any info provided here or by the Ark Protocol team is allowed!
In case of any doubt contact Ark Protocol on Discord or Twitter.


## Mission

> “We from Ark Protocol believe that an NFT collection should depend solely on its project value and utilities - and must be independent of any specific blockchain.”

In the long term the Ark NFT Metaverse will provide utilities for all(!) NFT holders and NFT founders on any Cosmos and IBC-supported chains.

Ark Protocol’s mission is that every NFT project should solely focus and deliver utilities for their community. The technical barriers are high and require a deep technological understanding of smart contracts and multichain interactions. For NFT projects and their limited resources these obstacles are not only distracting from their NFT mission, it also increases costs in terms of resources like hiring developers and additional time to be considered for their roadmap.

Ark Protocol aims to lower these technical barriers ideally to zero. All this will be embraced by Ark Protocol’s NFT Metaverse by providing:

> 1. Technical, low-level (though challenging) utilities
>
> This allows NFT collections for launching and listing on multiple chains.
>
> 2. Provide high-level, NFT oriented utilities like:
>
> Easy access to other marketplaces and chains, DAO, staking, DeFi and other utilities.
>
> 3. NFT Alliance
>
> All NFT projects can benefit from each other. Sharing is caring. A NFT Alliance unites all projects to one big NFT fam where all communities across all chains can contribute and provide services and utilities to others.

This is Ark Protocol’s long term mission. We know it takes time and there is a long way to go. We don’t want to reinvent the wheel. There are many other and existing projects, people and utilities of great value. We believe in collaboration. The crypto and NFT space is big enough for all of us. We can only eat one steak per day ;).

Ark Protocol does not only serve the crypto and NFT community. From the beginning we will serve for higher human goals. This is why Chauncy St John is also a team member of Ark Protocol. Starting with our first and future funds and perpetual income we will donate a certain amount to Angel Protocol - because sharing is caring!

# Development Environment

## Chains: Juno and Stargaze

TODO: https://github.com/arkprotocol/arkprotocol/issues/3

## Cargo

### workspace

There is a main Cargo.toml file in root folder. It defines a Cargo Workspace and include all members in contracts folder.

This allows like building and testing all contracts from root folder:

```bash
$ cargo build # builds all contracts (pint and pong)
$ cargo test # tests all contracts (pint and pong)
$ cargo build -p ping # builds ping contract
$ cargo test -p ping # tests ping contract
```

### Minimal Cargo Project

!!! IMPORTANT NOTE !!!
In case:

- contracts provide additional examples, then please add to minimal template
- example might be bigger it may be created in a new dedicated template project
- always use minimal template for any kind of project

For new Cargo projects please use templates/minimal.

Steps for creating a new project:
- copy minimal e.g. to contracts folder
- rename folder
- adjust some files (read below)

These files and folders are there in minimal template:
- examples
  - schema.rs: remove or uncomment, then call `cargo schema` which generates JSON files in schema folder
- src
  - error.rs: extend with custom errors
  - execute.rs: remove or add code
  - helpers.rs: add helper functions here
  - lib.rs: exports modules
  - msg.rs: add messages here
  - query.rs: remove or add code
  - state.rs: remove or add code

In case of changes on above files you might need to adjust Cargo.toml. There are example crates for dependencies and dev dependencies that can be commented out as needed.

# Tests

# Contracts

## ibc-example

TODO: https://github.com/arkprotocol/arkprotocol/issues/2

## cw721-metadata-example

TODO: https://github.com/arkprotocol/arkprotocol/issues/3

# Resources

Ark Protocol PoC
- Capstone proposal on [Google Docs](https://docs.google.com/document/d/1fdyKduM1svb0-iqm6P4qYlI_MloLVxOz1JJp638MV2E/edit#)
- Diagram 1: ["Ark NFT Multichain Mint"](https://miro.com/app/board/uXjVPagx4rA=/?share_link_id=916998647749) for launching NFTs on multiple chains
- Diagram 2: ["Ark NFT Metaverse"](https://miro.com/app/board/uXjVPbPDhnY=/?share_link_id=167610037027) for showing NFTs from multiple chains and marketplaces
- Diagram 3: ["Ark NFT Multichain Transfer"](https://miro.com/app/board/uXjVPay0O2c=/?share_link_id=545414865469) for transferring NFTs to multiple chains.

Ethan talk on IBC during HackAtom Seoul. YouTube videos with bookmark where he starts talking:
- [Talk about IBC, link plays at 1h:57m](https://www.youtube.com/watch?v=x75UobIr4qo&t=7077s)
- [IBC demo, link plays at 2h:31m](https://www.youtube.com/watch?v=x75UobIr4qo&t=9092s)
  - [cw-ibc-demo repo](https://github.com/confio/cw-ibc-demo)
  - demo is based on ezekiiel's [cw-ibc-example repo](https://github.com/ezekiiel/cw-ibc-example)
